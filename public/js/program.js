import { BroadcastRenderer } from './renderer3d.js';
import { api, connectSocket, getRoom } from './cloud.js';

const canvas = document.getElementById('programCanvas');
const renderer = new BroadcastRenderer(canvas, { interactive: false });
let state = null;

function apply(next) {
  state = next;
  renderer.setState(state);
  const camera = state.cameras.find(item => item.id === state.activeCamera) || state.cameras[0];
  renderer.setCamera(camera);
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

init().catch(error => console.error('Falha ao iniciar a saída:', error));
