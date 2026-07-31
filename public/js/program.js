import { BroadcastRenderer } from './renderer3d.js?v=0.8.2';
import { api, connectSocket, getRoom } from './cloud.js?v=0.8.2';

const canvas = document.getElementById('programCanvas');
const renderer = new BroadcastRenderer(canvas, { interactive: false });
const params = new URLSearchParams(location.search);
const pathCamera = Number((location.pathname.match(/^\/camera\/(1|2|3|4)\/?$/) || [])[1]);
const requestedCamera = Number(params.get('camera') || pathCamera);
const fixedCamera = [1, 2, 3, 4].includes(requestedCamera) ? requestedCamera : null;
const forcePreview = params.get('preview') === '1';
const debugMode = params.get('debug') === '1';
let state = null;
let debugNode = null;

function normalizeState(input) {
  const next = structuredClone(input || {});
  const previousVersion = Number(next.version || 0);
  next.version = 8;
  next.activeCamera = Number(next.activeCamera || 1);
  next.outputVisible = next.outputVisible !== false;
  next.scene ||= {};
  next.scene.anchor = { x: 0, y: 0, z: 0, rotationY: 0, scale: 1, locked: true, ...(next.scene.anchor || {}) };
  next.scene.base = { imageUrl: '/assets/default-base.png', thickness: 0.32, scale: 8.5, color: '#d9e1ec', alphaThreshold: 0.18, ...(next.scene.base || {}) };
  next.scene.bars = { width: 0.9, depth: 0.78, maxHeight: 4.8, gap: 0.48, labelScale: 1, imageScale: 1.05, ...(next.scene.bars || {}) };
  next.scene.items = Array.isArray(next.scene.items) ? next.scene.items : [];
  next.scene.lighting = { ambient: 0.58, key: 1.15, shadowOpacity: 0.28, ...(next.scene.lighting || {}) };
  next.scene.lights = Array.isArray(next.scene.lights) ? next.scene.lights : [];
  next.scene.model = {
    url: '', name: '', format: '', visible: true,
    position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1,
    animation: { speed: 1 },
    ...(next.scene.model || {})
  };
  next.scene.model.position = { x: 0, y: 0, z: 0, ...(next.scene.model.position || {}) };
  next.scene.model.rotation = { x: 0, y: 0, z: 0, ...(next.scene.model.rotation || {}) };
  next.scene.model.animation = { speed: 1, ...(next.scene.model.animation || {}) };
  next.scene.generatedGraphVisible = next.scene.generatedGraphVisible ?? true;
  if (previousVersion > 0 && previousVersion < 6 && next.scene.model.url && next.scene.generatedGraphVisible === false) next.scene.generatedGraphVisible = true;
  next.scene.playback = { mode: 'preview', startedAt: 0, playToken: 0, resetToken: 0, graphStart: 1, graphDuration: 1.4, ...(next.scene.playback || {}) };
  next.scene.dataSource = { type: 'google-sheets', url: '', gid: '0', range: '', mappingMode: 'auto', firstRowHeader: true, columns: { name: 'A', value: 'B', color: 'C', image: 'D' }, autoRefresh: true, refreshSeconds: 5, lastUpdated: '', lastRowCount: 0, lastError: '', lastSourceUrl: '', lastRange: '', lastMapping: null, ...(next.scene.dataSource || {}) };
  next.scene.dataSource.columns = { name: 'A', value: 'B', color: 'C', image: 'D', ...(next.scene.dataSource.columns || {}) };
  next.cameras = Array.isArray(next.cameras) ? next.cameras : [];
  return next;
}

function activeCamera() {
  const id = fixedCamera || state.activeCamera || 1;
  return state.cameras.find(camera => Number(camera.id) === id) || state.cameras[0];
}

function showDebug(message, error = false) {
  if (!debugMode) return;
  if (!debugNode) {
    debugNode = document.createElement('div');
    debugNode.className = 'overlay-debug';
    document.body.appendChild(debugNode);
  }
  debugNode.textContent = message;
  debugNode.dataset.error = error ? '1' : '0';
}

canvas.addEventListener('model-loading', event => {
  const percent = Number(event.detail?.percent || 0);
  showDebug(percent > 0 ? `Carregando GLB ${percent}%` : 'Abrindo GLB…');
});
canvas.addEventListener('model-ready', event => {
  const detail = event.detail || {};
  showDebug(`GLB OK · ${detail.stats?.meshes || 0} objetos · ${detail.animations || 0} animações`);
});
canvas.addEventListener('model-error', event => {
  showDebug(`ERRO GLB: ${event.detail?.message || 'falha desconhecida'}`, true);
});

canvas.addEventListener('playback-waiting', event => {
  const detail = event.detail || {};
  const missing = [];
  if (!detail.modelReady) missing.push('GLB');
  if (!detail.graphReady) missing.push('gráfico');
  showDebug(missing.length ? `PLAY recebido · aguardando ${missing.join(' + ')}` : 'PLAY recebido…');
});
canvas.addEventListener('playback-started', () => {
  showDebug(`PLAY NO AR · sala ${getRoom()} · CAM ${activeCamera()?.id || 1}`);
});
canvas.addEventListener('playback-prepared', () => {
  showDebug(`PREPARADO · sala ${getRoom()} · CAM ${activeCamera()?.id || 1}`);
});

function apply(nextState) {
  state = normalizeState(nextState);
  if (forcePreview) {
    state.scene.playback.mode = 'final-preview';
    state.scene.playback.startedAt = 0;
  }
  renderer.setState(state);
  renderer.setCamera(activeCamera());
  showDebug(`Overlay OK · sala ${getRoom()} · CAM ${activeCamera()?.id || 1} · ${state.scene.items.length} itens`);
}

async function init() {
  const data = await api('/api/state');
  apply(data.state);
  connectSocket({
    room: getRoom(),
    onMessage(payload) {
      if (payload?.state) apply(payload.state);
    }
  });
}

init().catch(error => { console.error(error); showDebug(`ERRO: ${error.message || error}`, true); });
