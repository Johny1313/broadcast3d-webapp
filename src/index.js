import { DurableObject } from 'cloudflare:workers';

const MAX_STATE_BYTES = 1_800_000;
const MAX_MEDIA_BYTES = 48 * 1024 * 1024;
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
    version: 6,
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
      lighting: { ambient: 0.58, key: 1.15, shadowOpacity: 0.28 },
      lights: [
        { id: 'light-key-left', name: 'Luz lateral', enabled: true, color: '#ffffff', intensity: 2.2, distance: 18, x: -4, y: 5, z: 4 },
        { id: 'light-fill-right', name: 'Preenchimento', enabled: true, color: '#6fa8ff', intensity: 1.4, distance: 18, x: 4, y: 5, z: -2 }
      ],
      model: {
        url: '', name: '', format: '', visible: true,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        animation: { speed: 1 }
      },
      generatedGraphVisible: true,
      playback: { mode: 'preview', startedAt: 0, playToken: 0, resetToken: 0, graphStart: 1, graphDuration: 1.4 },
      dataSource: {
        type: 'google-sheets',
        url: '',
        gid: '0',
        autoRefresh: true,
        refreshSeconds: 5,
        lastUpdated: '',
        lastRowCount: 0,
        lastError: '',
        lastSourceUrl: ''
      },
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

function normalizeState(input) {
  const defaults = defaultState();
  const state = structuredClone(input && typeof input === 'object' ? input : defaults);
  const previousVersion = Number(state.version || 0);
  state.version = 6;
  state.projectName ||= defaults.projectName;
  state.activeCamera = Number(state.activeCamera || 1);
  state.selectedCamera = Number(state.selectedCamera || state.activeCamera || 1);
  state.outputVisible = state.outputVisible !== false;
  state.scene ||= {};
  state.scene.anchor = { ...defaults.scene.anchor, ...(state.scene.anchor || {}) };
  state.scene.base = { ...defaults.scene.base, ...(state.scene.base || {}) };
  state.scene.bars = { ...defaults.scene.bars, ...(state.scene.bars || {}) };
  state.scene.items = Array.isArray(state.scene.items) ? state.scene.items : structuredClone(defaults.scene.items);
  state.scene.lighting = { ...defaults.scene.lighting, ...(state.scene.lighting || {}) };
  state.scene.lights = Array.isArray(state.scene.lights) ? state.scene.lights : structuredClone(defaults.scene.lights);
  state.scene.model = { ...defaults.scene.model, ...(state.scene.model || {}) };
  state.scene.model.position = { ...defaults.scene.model.position, ...(state.scene.model.position || {}) };
  state.scene.model.rotation = { ...defaults.scene.model.rotation, ...(state.scene.model.rotation || {}) };
  state.scene.model.animation = { ...defaults.scene.model.animation, ...(state.scene.model.animation || {}) };
  state.scene.generatedGraphVisible = state.scene.generatedGraphVisible ?? true;
  if (previousVersion > 0 && previousVersion < 6 && state.scene.model.url && state.scene.generatedGraphVisible === false) state.scene.generatedGraphVisible = true;
  state.scene.playback = { ...defaults.scene.playback, ...(state.scene.playback || {}) };
  state.scene.dataSource = { ...defaults.scene.dataSource, ...(state.scene.dataSource || {}) };
  state.scene.guideOpacity = Number(state.scene.guideOpacity ?? defaults.scene.guideOpacity);
  const cameras = Array.isArray(state.cameras) ? state.cameras : [];
  state.cameras = defaults.cameras.map(base => {
    const current = cameras.find(camera => Number(camera.id) === base.id) || {};
    return { ...base, ...current, target: Array.isArray(current.target) ? current.target.map(Number) : [...base.target] };
  });
  return state;
}


function detectDelimiter(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/).find(line => line.trim()) || '';
  const candidates = [',', ';', '\t'];
  const counts = new Map(candidates.map(candidate => [candidate, 0]));
  let quoted = false;
  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    if (char === '"' && firstLine[index + 1] === '"' && quoted) { index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && counts.has(char)) counts.set(char, counts.get(char) + 1);
  }
  return candidates.sort((a, b) => counts.get(b) - counts.get(a))[0] || ',';
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  row.push(field);
  if (row.some(value => String(value).trim() !== '')) rows.push(row);
  return rows.filter(current => current.some(value => String(value).trim() !== ''));
}

function normalizeHeader(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9%]+/g, '_').replace(/^_|_$/g, '');
}

function parseNumber(value) {
  let raw = String(value ?? '').trim().replace(/\s/g, '').replace(/%/g, '');
  if (!raw) return NaN;
  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) raw = raw.replace(/\./g, '').replace(',', '.');
    else raw = raw.replace(/,/g, '');
  } else if (raw.includes(',')) raw = raw.replace(',', '.');
  raw = raw.replace(/[^0-9+\-.eE]/g, '');
  return Number(raw);
}

function inferColumn(rows, excluded = new Set(), mode = 'text') {
  const columnCount = Math.max(0, ...rows.map(row => row.length));
  let best = -1;
  let score = -1;
  for (let column = 0; column < columnCount; column += 1) {
    if (excluded.has(column)) continue;
    const values = rows.slice(1).map(row => String(row[column] ?? '').trim()).filter(Boolean);
    if (!values.length) continue;
    const numeric = values.filter(value => Number.isFinite(parseNumber(value))).length;
    const currentScore = mode === 'number' ? numeric / values.length : (values.length - numeric) / values.length;
    if (currentScore > score) { score = currentScore; best = column; }
  }
  return best;
}

function rowsToItems(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('A planilha precisa ter cabeçalho e pelo menos uma linha de dados.');
  const headers = rows[0].map(normalizeHeader);
  const find = names => headers.findIndex(header => names.includes(header));
  let nameIndex = find(['nome', 'name', 'item', 'categoria', 'candidato', 'rotulo', 'label', 'titulo', 'descricao']);
  let valueIndex = find(['valor', 'value', 'total', 'percentual', 'porcentagem', 'percent', '%', 'resultado', 'quantidade', 'numero', 'pontuacao', 'score', 'dados']);
  const colorIndex = find(['cor', 'color', 'hex', 'colour']);
  const imageIndex = find(['imagem', 'image', 'imagem_url', 'image_url', 'foto', 'icone', 'icon', 'avatar', 'photo']);
  if (valueIndex < 0) valueIndex = inferColumn(rows, new Set(), 'number');
  if (nameIndex < 0) nameIndex = inferColumn(rows, new Set(valueIndex >= 0 ? [valueIndex] : []), 'text');
  if (nameIndex < 0 || valueIndex < 0 || nameIndex === valueIndex) {
    throw new Error('Não encontrei as colunas de nome e valor. Use os cabeçalhos nome e valor, ou deixe a primeira coluna como texto e a segunda como número.');
  }
  const palette = ['#3567d7', '#10a9a6', '#7650a8', '#e9781b', '#d54b63', '#3b9d5d'];
  const items = rows.slice(1).filter(row => row.some(cell => String(cell || '').trim() !== '')).map((row, index) => {
    const name = String(row[nameIndex] || '').trim();
    const value = parseNumber(row[valueIndex]);
    if (!name || !Number.isFinite(value)) return null;
    const rawColor = colorIndex >= 0 ? String(row[colorIndex] || '').trim() : '';
    const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : palette[index % palette.length];
    const imageUrl = imageIndex >= 0 ? String(row[imageIndex] || '').trim() : '';
    return {
      id: `${normalizeHeader(name) || 'item'}-${index}`,
      name,
      value,
      color,
      imageUrl: /^https:\/\//i.test(imageUrl) ? imageUrl : ''
    };
  }).filter(Boolean).slice(0, 32);
  if (!items.length) throw new Error('A planilha foi lida, mas nenhuma linha válida foi encontrada. Verifique se nome e valor estão preenchidos.');
  return { headers, items, mapping: { nameIndex, valueIndex, colorIndex, imageIndex } };
}

function sheetIdentity(source, requestedGid = '0') {
  const raw = String(source || '').trim();
  if (!raw) throw new Error('Cole o link público do Google Sheets.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Link do Google Sheets inválido.'); }
  const allowed = ['docs.google.com', 'docs.googleusercontent.com'];
  if (!allowed.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error('Use um link do Google Sheets.');
  const hashGid = (url.hash.match(/gid=(\d+)/) || [])[1] || '';
  const preferredGid = String(requestedGid || '').trim();
  const gid = String((preferredGid && preferredGid !== '0' ? preferredGid : '') || url.searchParams.get('gid') || hashGid || '0').replace(/[^0-9]/g, '') || '0';
  const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pub/);
  const standard = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!published && !standard) throw new Error('Não foi possível identificar o ID da planilha.');
  return { url, gid, publishedId: published?.[1] || '', spreadsheetId: standard?.[1] || '' };
}

function googleSheetCandidates(source, requestedGid = '0') {
  const identity = sheetIdentity(source, requestedGid);
  const candidates = [];
  if (/output=csv|format=csv|tqx=out%3Acsv|tqx=out:csv/i.test(identity.url.toString())) candidates.push(new URL(identity.url));
  if (identity.spreadsheetId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${identity.spreadsheetId}/export`);
    exportUrl.searchParams.set('format', 'csv');
    exportUrl.searchParams.set('gid', identity.gid);
    candidates.push(exportUrl);
    const gvizUrl = new URL(`https://docs.google.com/spreadsheets/d/${identity.spreadsheetId}/gviz/tq`);
    gvizUrl.searchParams.set('tqx', 'out:csv');
    gvizUrl.searchParams.set('gid', identity.gid);
    candidates.push(gvizUrl);
  }
  if (identity.publishedId) {
    const publishedUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${identity.publishedId}/pub`);
    publishedUrl.searchParams.set('output', 'csv');
    publishedUrl.searchParams.set('single', 'true');
    publishedUrl.searchParams.set('gid', identity.gid);
    candidates.push(publishedUrl);
  }
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.toString();
    if (!seen.has(key)) { seen.add(key); unique.push(candidate); }
  }
  return { ...identity, candidates: unique };
}

async function fetchGoogleSheet(source, gid) {
  const identity = googleSheetCandidates(source, gid);
  const attempts = [];
  for (const target of identity.candidates) {
    try {
      const response = await fetch(target, {
        redirect: 'follow',
        headers: {
          accept: 'text/csv,text/plain;q=0.9,*/*;q=0.1'
        }
      });
      const text = await response.text();
      attempts.push({ endpoint: target.pathname, status: response.status, contentType: response.headers.get('content-type') || '' });
      if (!response.ok) continue;
      if (/<!doctype html|<html/i.test(text) || /sign in|request access|solicitar acesso/i.test(text)) continue;
      const parsed = rowsToItems(parseCsvRows(text));
      return { ...parsed, sourceUrl: target.toString(), gid: identity.gid, attempts };
    } catch (error) {
      attempts.push({ endpoint: target.pathname, status: 0, error: error.message || 'falha de rede' });
    }
  }
  const statusText = attempts.map(attempt => `${attempt.endpoint}: ${attempt.status || attempt.error}`).join(' | ');
  throw new Error(`Não foi possível ler a planilha. Confirme “Qualquer pessoa com o link pode ver” e o GID da aba. ${statusText}`.trim());
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
        version: '0.6.0',
        realtime: 'durable-object-websocket',
        storage: 'durable-object-sqlite',
        authRequired: Boolean(String(env.CONTROL_TOKEN || '').trim())
      });
    }


    if (url.pathname === '/api/sheets' && request.method === 'GET') {
      try {
        const source = url.searchParams.get('source') || '';
        const gid = url.searchParams.get('gid') || '0';
        const result = await fetchGoogleSheet(source, gid);
        return json({ ok: true, ...result, fetchedAt: new Date().toISOString() });
      } catch (error) {
        return json({ ok: false, error: error.message || 'Falha ao ler o Google Sheets.' }, 400);
      }
    }

    const cameraRoute = url.pathname.match(/^\/camera\/(1|2|3|4)\/?$/);
    if (cameraRoute) {
      const assetUrl = new URL('/program.html', url.origin);
      return env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET', headers: request.headers }));
    }

    if (url.pathname === '/overlay' || url.pathname === '/program') {
      const assetUrl = new URL('/program.html', url.origin);
      return env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET', headers: request.headers }));
    }

    if (url.pathname === '/api/overlay-check') {
      const room = sanitizeRoom(url.searchParams.get('room') || 'studio') || 'studio';
      try {
        const stateResponse = await routeToRoom(new Request(`${url.origin}/api/state?room=${encodeURIComponent(room)}`), env, room);
        const statePayload = await stateResponse.json();
        return json({ ok: true, version: '0.6.0', room, hasState: Boolean(statePayload?.state), activeCamera: statePayload?.state?.activeCamera || 1, itemCount: statePayload?.state?.scene?.items?.length || 0 });
      } catch (error) {
        return json({ ok: false, error: error.message || 'Falha ao validar overlay.' }, 500);
      }
    }

    const friendlyCutRoute = url.pathname.match(/^\/cut\/(1|2|3|4)\/?$/);
    if (friendlyCutRoute) {
      const room = sanitizeRoom(url.searchParams.get('room') || 'studio');
      if (!room) return json({ ok: false, error: 'Sala inválida.' }, 400);
      if (!canWrite(request, env)) return json({ ok: false, error: 'Chave de controle inválida.' }, 401);
      const rewrittenUrl = new URL(`/api/cut/${friendlyCutRoute[1]}`, url.origin);
      rewrittenUrl.searchParams.set('room', room);
      const rewritten = new Request(rewrittenUrl.toString(), { method: 'GET', headers: request.headers });
      return routeToRoom(rewritten, env, room);
    }

    if (url.pathname === '/play' || url.pathname === '/reset') {
      const room = sanitizeRoom(url.searchParams.get('room') || 'studio');
      if (!room) return json({ ok: false, error: 'Sala inválida.' }, 400);
      if (!canWrite(request, env)) return json({ ok: false, error: 'Chave de controle inválida.' }, 401);
      const targetPath = url.pathname === '/play' ? '/api/play' : '/api/play/reset';
      const rewrittenUrl = new URL(targetPath, url.origin);
      rewrittenUrl.searchParams.set('room', room);
      const rewritten = new Request(rewrittenUrl.toString(), { method: 'GET', headers: request.headers });
      return routeToRoom(rewritten, env, room);
    }

    if (url.pathname.startsWith('/api/')) {
      const room = sanitizeRoom(url.searchParams.get('room'));
      if (!room) return json({ ok: false, error: 'Sala inválida. Use letras, números, hífen ou underline.' }, 400);

      const isWrite =
        request.method !== 'GET' && request.method !== 'HEAD' ||
        /^\/api\/cut\/(1|2|3|4)$/.test(url.pathname) ||
        url.pathname === '/api/output/toggle' ||
        url.pathname === '/api/play' ||
        url.pathname === '/api/play/reset' ||
        url.pathname === '/api/sheets/sync';

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
    if (stored && typeof stored === 'object') {
      const normalized = normalizeState(stored);
      if (JSON.stringify(normalized) !== JSON.stringify(stored)) await this.ctx.storage.put('state', normalized);
      return normalized;
    }
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

    if (pathname === '/api/sheets/sync' && (request.method === 'POST' || request.method === 'GET')) {
      try {
        const state = await this.getState();
        let body = {};
        if (request.method === 'POST') body = await request.json().catch(() => ({}));
        const source = String(body.source || state.scene.dataSource.url || '').trim();
        const gid = String(body.gid || state.scene.dataSource.gid || '0').replace(/[^0-9]/g, '') || '0';
        const result = await fetchGoogleSheet(source, gid);
        const previous = new Map(state.scene.items.map(item => [String(item.name).trim().toLowerCase(), item]));
        state.scene.items = result.items.map(item => {
          const old = previous.get(String(item.name).trim().toLowerCase());
          return { ...item, imageUrl: item.imageUrl || old?.imageUrl || '' };
        });
        state.scene.generatedGraphVisible = true;
        state.scene.dataSource = {
          ...state.scene.dataSource,
          type: 'google-sheets',
          url: source,
          gid: result.gid || gid,
          autoRefresh: body.autoRefresh ?? state.scene.dataSource.autoRefresh,
          refreshSeconds: Math.max(3, Math.min(3600, Number(body.refreshSeconds || state.scene.dataSource.refreshSeconds || 5))),
          lastUpdated: new Date().toISOString(),
          lastRowCount: state.scene.items.length,
          lastError: '',
          lastSourceUrl: result.sourceUrl || ''
        };
        state.scene.playback.mode = 'preview';
        state.scene.playback.startedAt = 0;
        await this.saveState(state, 'sheets');
        return json({ ok: true, state, items: state.scene.items, mapping: result.mapping, sourceUrl: result.sourceUrl, attempts: result.attempts });
      } catch (error) {
        const state = await this.getState();
        state.scene.dataSource.lastError = error.message || 'Falha ao sincronizar planilha.';
        await this.ctx.storage.put('state', state);
        return json({ ok: false, error: state.scene.dataSource.lastError }, 400);
      }
    }

    if (pathname === '/api/state' && request.method === 'GET') {
      return json({ ok: true, state: await this.getState() });
    }

    if (pathname === '/api/state' && request.method === 'POST') {
      try {
        const state = await request.json();
        if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Estado inválido.');
        await this.saveState(normalizeState(state), 'state');
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

    if (pathname === '/api/play' && (request.method === 'POST' || request.method === 'GET')) {
      const state = await this.getState();
      const now = Date.now();
      state.scene.playback.mode = 'playing';
      state.scene.playback.startedAt = now;
      state.scene.playback.playToken = now;
      state.outputVisible = true;
      await this.saveState(state, 'play');
      return json({ ok: true, startedAt: now });
    }

    if (pathname === '/api/play/reset' && (request.method === 'POST' || request.method === 'GET')) {
      const state = await this.getState();
      state.scene.playback.mode = 'prepared';
      state.scene.playback.startedAt = 0;
      state.scene.playback.resetToken = Date.now();
      await this.saveState(state, 'reset');
      return json({ ok: true });
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
        const match = String(body.dataUrl || '').match(/^data:([^;]*);base64,(.+)$/s);
        if (!match) throw new Error('Arquivo inválido.');
        const bytes = decodeBase64(match[2]);
        if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error('Arquivo maior que 48 MB.');
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
