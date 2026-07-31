import { BroadcastRenderer } from './renderer3d.js';
import { api, connectSocket, getRoom } from './cloud.js';

const canvas = document.getElementById('programCanvas');
const renderer = new BroadcastRenderer(canvas, { interactive: false });
const requestedCamera = Number(new URLSearchParams(location.search).get('camera'));
const fixedCamera = [1, 2, 3, 4].includes(requestedCamera) ? requestedCamera : null;
let state = null;

function normalizeState(input) {
  const next = structuredClone(input || {});
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
    animation: { clipName: '', play: true, loop: true, speed: 1 },
    ...(next.scene.model || {})
  };
  next.scene.model.position = { x: 0, y: 0, z: 0, ...(next.scene.model.position || {}) };
  next.scene.model.rotation = { x: 0, y: 0, z: 0, ...(next.scene.model.rotation || {}) };
  next.scene.model.animation = { clipName: '', play: true, loop: true, speed: 1, ...(next.scene.model.animation || {}) };
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
