import { BroadcastRenderer } from './renderer3d.js?v=0.4.0';
import { api, connectSocket, getRoom } from './cloud.js?v=0.4.0';

const canvas = document.getElementById('programCanvas');
const renderer = new BroadcastRenderer(canvas, { interactive: false });
const requestedCamera = Number(new URLSearchParams(location.search).get('camera'));
const fixedCamera = [1, 2, 3, 4].includes(requestedCamera) ? requestedCamera : null;
let state = null;
let sheetTimer = null;
let sheetBusy = false;

function normalizeState(input) {
  const next = structuredClone(input || {});
  next.version = 4;
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
    animation: { play: true, loop: true, speed: 1, restartToken: 0 },
    ...(next.scene.model || {})
  };
  next.scene.model.position = { x: 0, y: 0, z: 0, ...(next.scene.model.position || {}) };
  next.scene.model.rotation = { x: 0, y: 0, z: 0, ...(next.scene.model.rotation || {}) };
  next.scene.model.animation = { play: true, loop: true, speed: 1, restartToken: 0, ...(next.scene.model.animation || {}) };
  next.scene.generatedGraphVisible = next.scene.generatedGraphVisible ?? !next.scene.model.url;
  next.scene.dataSource = { type: 'google-sheets', url: '', gid: '0', autoRefresh: true, refreshSeconds: 5, ...(next.scene.dataSource || {}) };
  next.cameras = Array.isArray(next.cameras) ? next.cameras : [];
  return next;
}

function activeCamera() {
  const id = fixedCamera || state.activeCamera || 1;
  return state.cameras.find(camera => Number(camera.id) === id) || state.cameras[0];
}

function apply(nextState) {
  state = normalizeState(nextState);
  renderer.setState(state);
  renderer.setCamera(activeCamera());
  scheduleSheetRefresh();
}

async function refreshSheet() {
  const source = state?.scene?.dataSource;
  if (sheetBusy || !source?.url) return;
  sheetBusy = true;
  try {
    const params = new URLSearchParams({ source: source.url, gid: source.gid || '0' });
    const result = await api(`/api/sheets?${params.toString()}`);
    const previous = new Map(state.scene.items.map(item => [String(item.name).trim().toLowerCase(), item]));
    state.scene.items = (result.items || []).map(item => {
      const old = previous.get(String(item.name).trim().toLowerCase());
      return { ...item, imageUrl: item.imageUrl || old?.imageUrl || '' };
    });
    renderer.setState(state);
  } catch (error) {
    console.warn('Google Sheets:', error.message);
  } finally {
    sheetBusy = false;
  }
}

function scheduleSheetRefresh() {
  clearInterval(sheetTimer);
  sheetTimer = null;
  const source = state?.scene?.dataSource;
  if (!source?.url || source.autoRefresh === false) return;
  const seconds = Math.max(3, Math.min(3600, Number(source.refreshSeconds || 5)));
  refreshSheet();
  sheetTimer = setInterval(refreshSheet, seconds * 1000);
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

init().catch(error => console.error(error));
