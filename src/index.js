import { DurableObject } from 'cloudflare:workers';

const MAX_STATE_BYTES = 1_800_000;
const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const MEDIA_CHUNK_BYTES = 1_250_000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function defaultState() {
  return {
    version: 2,
    projectName: 'Projeto 3D - Eleições',
    activeCamera: 1,
    selectedCamera: 1,
    outputVisible: true,
    scene: {
      anchor: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1, locked: true },
      base: {
        imageUrl: '/assets/default-base.png',
        thickness: 0.32,
        scale: 8.5,
        color: '#d9e1ec',
        alphaThreshold: 0.18
      },
      bars: {
        width: 0.9,
        depth: 0.78,
        maxHeight: 4.8,
        gap: 0.48,
        labelScale: 1,
        imageScale: 1.05
      },
      items: [
        { id: 'industria', name: 'Indústria', value: 128, color: '#3567d7', imageUrl: '' },
        { id: 'varejo', name: 'Varejo', value: 198, color: '#10a9a6', imageUrl: '' },
        { id: 'servicos', name: 'Serviços', value: 256, color: '#7650a8', imageUrl: '' },
        { id: 'tecnologia', name: 'Tecnologia', value: 312, color: '#e9781b', imageUrl: '' }
      ],
      lighting: { ambient: 0.58, key: 1.15 },
      guideOpacity: 0.72
    },
    cameras: [
      { id: 1, name: 'Enquadramento A', yaw: 0.7, pitch: 0.38, distance: 13.5, target: [0, 1.8, 0], fov: 42, guideUrl: '' },
      { id: 2, name: 'Enquadramento B', yaw: -0.82, pitch: 0.3, distance: 14.8, target: [0, 1.7, 0], fov: 44, guideUrl: '' },
      { id: 3, name: 'Enquadramento C', yaw: 0.16, pitch: 0.16, distance: 10.1, target: [0.15, 2, 0], fov: 38, guideUrl: '' },
      { id: 4, name: 'Enquadramento D', yaw: 1.02, pitch: 0.72, distance: 16.2, target: [0, 1.25, 0], fov: 48, guideUrl: '' }
    ]
  };
}

function sanitizeRoom(value) {
  const room = String(value || 'studio').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(room)) return null;
  return room;
}

function getBearer(request) {
  const authorization = request.headers.get('authorization') || '';
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return new URL(request.url).searchParams.get('token') || '';
}

function canWrite(request, env) {
  const expected = String(env.CONTROL_TOKEN || '').trim();
  if (!expected) return true;
  return getBearer(request) === expected;
}

function routeToRoom(request, env, room) {
  const stub = env.ROOMS.getByName(room);
  return stub.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        service: 'broadcast3d-cloudflare',
        realtime: 'durable-object-websocket',
        storage: 'durable-object-sqlite',
        authRequired: Boolean(String(env.CONTROL_TOKEN || '').trim())
      });
    }

    if (url.pathname.startsWith('/api/')) {
      const room = sanitizeRoom(url.searchParams.get('room'));
      if (!room) return json({ ok: false, error: 'Sala inválida. Use letras, números, hífen ou underline.' }, 400);

      const isWrite =
        request.method !== 'GET' && request.method !== 'HEAD' ||
        /^\/api\/cut\/(1|2|3|4)$/.test(url.pathname) ||
        url.pathname === '/api/output/toggle';

      if (isWrite && !canWrite(request, env)) {
        return json({ ok: false, error: 'Chave de controle inválida.' }, 401, { 'www-authenticate': 'Bearer' });
      }

      return routeToRoom(request, env, room);
    }

    return env.ASSETS.fetch(request);
  }
};

export class BroadcastRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async getState() {
    const stored = await this.ctx.storage.get('state');
    if (stored && typeof stored === 'object') return stored;
    const initial = defaultState();
    await this.ctx.storage.put('state', initial);
    return initial;
  }

  async saveState(state, eventType = 'state') {
    const serialized = JSON.stringify(state);
    if (new TextEncoder().encode(serialized).byteLength > MAX_STATE_BYTES) {
      throw new Error('O projeto excedeu o limite de estado. Reduza a quantidade de dados ou imagens incorporadas.');
    }
    await this.ctx.storage.put('state', state);
    this.broadcast({ type: eventType, state });
  }

  broadcast(payload) {
    const message = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(message); } catch { /* conexão será removida pelo runtime */ }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/api/ws') {
      if (request.headers.get('upgrade') !== 'websocket') {
        return json({ ok: false, error: 'Upgrade WebSocket obrigatório.' }, 426);
      }
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'state', state: await this.getState() }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (pathname === '/api/state' && request.method === 'GET') {
      return json({ ok: true, state: await this.getState() });
    }

    if (pathname === '/api/state' && request.method === 'POST') {
      try {
        const state = await request.json();
        if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Estado inválido.');
        await this.saveState(state, 'state');
        return json({ ok: true });
      } catch (error) {
        return json({ ok: false, error: error.message || 'Estado inválido.' }, 400);
      }
    }

    const cutMatch = pathname.match(/^\/api\/cut\/(1|2|3|4)$/);
    if (cutMatch && (request.method === 'POST' || request.method === 'GET')) {
      const state = await this.getState();
      const id = Number(cutMatch[1]);
      state.activeCamera = id;
      state.selectedCamera = id;
      state.outputVisible = true;
      await this.saveState(state, 'cut');
      return json({ ok: true, activeCamera: id });
    }

    if (pathname === '/api/output/toggle' && (request.method === 'POST' || request.method === 'GET')) {
      const state = await this.getState();
      state.outputVisible = !state.outputVisible;
      await this.saveState(state, 'state');
      return json({ ok: true, outputVisible: state.outputVisible });
    }

    if (pathname === '/api/upload' && request.method === 'POST') {
      try {
        const body = await request.json();
        const match = String(body.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/s);
        if (!match) throw new Error('Arquivo inválido.');
        const bytes = decodeBase64(match[2]);
        if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error('Arquivo maior que 12 MB.');
        const assetId = crypto.randomUUID();
        const chunks = Math.ceil(bytes.byteLength / MEDIA_CHUNK_BYTES);
        for (let index = 0; index < chunks; index += 1) {
          const start = index * MEDIA_CHUNK_BYTES;
          const end = Math.min(start + MEDIA_CHUNK_BYTES, bytes.byteLength);
          const part = bytes.slice(start, end);
          await this.ctx.storage.put(`media:${assetId}:chunk:${index}`, part.buffer);
        }
        const metadata = {
          id: assetId,
          name: String(body.name || 'arquivo').slice(0, 160),
          type: String(match[1] || 'application/octet-stream').slice(0, 120),
          size: bytes.byteLength,
          chunks,
          uploadedAt: new Date().toISOString()
        };
        await this.ctx.storage.put(`media:${assetId}:meta`, metadata);
        const room = new URL(request.url).searchParams.get('room') || 'studio';
        return json({ ok: true, url: `/api/media/${assetId}?room=${encodeURIComponent(room)}`, size: bytes.byteLength, type: metadata.type });
      } catch (error) {
        return json({ ok: false, error: error.message || 'Falha no upload.' }, 400);
      }
    }

    const mediaMatch = pathname.match(/^\/api\/media\/([a-f0-9-]{36})$/i);
    if (mediaMatch && (request.method === 'GET' || request.method === 'HEAD')) {
      const assetId = mediaMatch[1];
      const metadata = await this.ctx.storage.get(`media:${assetId}:meta`);
      if (!metadata) return new Response('Arquivo não encontrado.', { status: 404 });
      const headers = {
        'content-type': metadata.type,
        'content-length': String(metadata.size),
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff'
      };
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
      const output = new Uint8Array(metadata.size);
      let offset = 0;
      for (let index = 0; index < metadata.chunks; index += 1) {
        const chunk = await this.ctx.storage.get(`media:${assetId}:chunk:${index}`);
        if (!chunk) return new Response('Arquivo corrompido.', { status: 500 });
        const bytes = new Uint8Array(chunk);
        output.set(bytes, offset);
        offset += bytes.byteLength;
      }
      return new Response(output, { status: 200, headers });
    }

    if (mediaMatch && request.method === 'DELETE') {
      const assetId = mediaMatch[1];
      const metadata = await this.ctx.storage.get(`media:${assetId}:meta`);
      if (!metadata) return json({ ok: true, deleted: false });
      const keys = [`media:${assetId}:meta`];
      for (let index = 0; index < metadata.chunks; index += 1) keys.push(`media:${assetId}:chunk:${index}`);
      await this.ctx.storage.delete(keys);
      return json({ ok: true, deleted: true });
    }

    return json({ ok: false, error: 'Rota não encontrada.' }, 404);
  }

  webSocketMessage(socket, message) {
    if (String(message) === 'ping') socket.send(JSON.stringify({ type: 'pong', at: Date.now() }));
  }

  webSocketClose() {}
  webSocketError() {}
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
