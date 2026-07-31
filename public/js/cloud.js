const ROOM_KEY = 'broadcast3d.room';
const TOKEN_KEY = 'broadcast3d.controlToken';

function sanitizeRoom(value) {
  const room = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(room) ? room : 'studio';
}

export function getRoom() {
  const params = new URLSearchParams(location.search);
  return sanitizeRoom(params.get('room') || localStorage.getItem(ROOM_KEY) || 'studio');
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setConnection(room, token) {
  const nextRoom = sanitizeRoom(room);
  localStorage.setItem(ROOM_KEY, nextRoom);
  localStorage.setItem(TOKEN_KEY, String(token || '').trim());
  const url = new URL(location.href);
  url.searchParams.set('room', nextRoom);
  url.searchParams.delete('token');
  history.replaceState(null, '', url);
  return nextRoom;
}

export function withRoom(path, room = getRoom()) {
  const url = new URL(path, location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function programUrl(room = getRoom(), options = {}) {
  const url = new URL('/overlay', location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  if (options.preview) url.searchParams.set('preview', '1');
  if (options.debug) url.searchParams.set('debug', '1');
  return url.toString();
}

export function programPreviewUrl(room = getRoom()) {
  return programUrl(room, { preview: true, debug: true });
}


export function fixedProgramUrl(cameraId, room = getRoom()) {
  const id = Math.max(1, Math.min(4, Number(cameraId) || 1));
  const url = new URL('/overlay', location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  url.searchParams.set('camera', String(id));
  return url.toString();
}

export function cameraUrl(cameraId, room = getRoom()) {
  const id = Math.max(1, Math.min(4, Number(cameraId) || 1));
  const url = new URL(`/camera/${id}`, location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  return url.toString();
}

export function cutUrl(cameraId, room = getRoom(), token = getToken()) {
  const id = Math.max(1, Math.min(4, Number(cameraId) || 1));
  const url = new URL(`/cut/${id}`, location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

export function controlUrl(path, room = getRoom(), token = getToken()) {
  const url = new URL(path, location.origin);
  url.searchParams.set('room', sanitizeRoom(room));
  if (token) url.searchParams.set('token', token);
  return url.toString();
}


function mediaContentType(file) {
  const name = String(file?.name || '').toLowerCase();
  if (file?.type) return file.type;
  if (name.endsWith('.glb')) return 'model/gltf-binary';
  if (name.endsWith('.gltf')) return 'model/gltf+json';
  if (name.endsWith('.obj')) return 'text/plain; charset=utf-8';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export function uploadMedia(file, onProgress) {
  if (!(file instanceof Blob)) return Promise.reject(new Error('Arquivo inválido.'));
  const token = getToken();
  const url = new URL('/api/media/upload', location.origin);
  url.searchParams.set('room', getRoom());
  url.searchParams.set('name', String(file.name || 'arquivo'));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url.toString());
    xhr.responseType = 'json';
    xhr.setRequestHeader('content-type', mediaContentType(file));
    xhr.setRequestHeader('x-file-size', String(file.size || 0));
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    });
    xhr.addEventListener('load', () => {
      const payload = xhr.response && typeof xhr.response === 'object'
        ? xhr.response
        : (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300 && payload?.url) resolve(payload);
      else reject(new Error(payload?.error || `Falha no upload (${xhr.status || 0}).`));
    });
    xhr.addEventListener('error', () => reject(new Error('Falha de rede durante o upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelado.')));
    xhr.send(file);
  });
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('content-type') && options.body != null) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(withRoom(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}

export function connectSocket({ onMessage, onStatus, room = getRoom() }) {
  let closed = false;
  let socket = null;
  let retry = 700;
  let retryTimer = null;
  let pingTimer = null;

  const notify = (status) => onStatus?.(status);

  const connect = () => {
    if (closed) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/api/ws?room=${encodeURIComponent(sanitizeRoom(room))}`;
    notify('connecting');
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      retry = 700;
      notify('open');
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
      }, 20000);
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'pong') onMessage?.(payload);
      } catch { /* ignora mensagens não JSON */ }
    });
    socket.addEventListener('close', () => {
      clearInterval(pingTimer);
      if (closed) return;
      notify('closed');
      retryTimer = setTimeout(connect, retry);
      retry = Math.min(retry * 1.7, 8000);
    });
    socket.addEventListener('error', () => notify('error'));
  };

  connect();

  return {
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      try { socket?.close(); } catch {}
    }
  };
}
