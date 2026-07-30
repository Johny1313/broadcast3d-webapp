import { BroadcastRenderer } from './renderer3d.js';
import { api, connectSocket, controlUrl, getRoom, getToken, programUrl, setConnection } from './cloud.js';

const $ = id => document.getElementById(id);
let state = null;
let renderer = null;
let workingCamera = null;
let saveTimer = null;
let toastTimer = null;
let suppressInputs = false;
let socketController = null;

function showToast(message = 'Projeto salvo') {
  const toast = $('saveToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function setConnectionBadge(status) {
  const badge = $('connectionBadge');
  const map = {
    open: ['Cloudflare conectado', 'status-badge status-ok'],
    connecting: ['Conectando', 'status-badge'],
    closed: ['Reconectando', 'status-badge'],
    error: ['Falha de conexão', 'status-badge status-error']
  };
  const [label, className] = map[status] || map.connecting;
  badge.textContent = label;
  badge.className = className;
}

function queueSave(message) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await api('/api/state', { method: 'POST', body: JSON.stringify(state) });
      showToast(message || 'Projeto salvo na nuvem');
    } catch (error) {
      showToast(error.message);
    }
  }, 300);
}

function selectedCamera() {
  return state.cameras.find(camera => camera.id === state.selectedCamera) || state.cameras[0];
}

function setNested(path, value) {
  const parts = path.split('.');
  let target = state;
  for (let index = 0; index < parts.length - 1; index += 1) target = target[parts[index]];
  target[parts.at(-1)] = value;
  renderer.setState(state);
  renderReadouts();
  queueSave();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
}

function renderCameraStrip() {
  const strip = $('cameraStrip');
  strip.innerHTML = '';
  state.cameras.forEach(camera => {
    const card = document.createElement('article');
    card.className = `camera-card${camera.id === state.activeCamera ? ' active' : ''}${camera.id === state.selectedCamera ? ' selected' : ''}`;
    card.innerHTML = `<span class="camera-index">${camera.id}</span><h3>Câmera ${camera.id} — ${escapeHtml(camera.name)}</h3><p>FOV ${Math.round(camera.fov)}° · distância ${camera.distance.toFixed(1)}</p><button class="card-cut" type="button">CORTAR</button>`;
    card.addEventListener('click', event => {
      if (event.target.closest('.card-cut')) return;
      selectCamera(camera.id);
    });
    card.querySelector('.card-cut').addEventListener('click', event => {
      event.stopPropagation();
      cutCamera(camera.id);
    });
    strip.appendChild(card);
  });
}

function selectCamera(id, persist = true) {
  state.selectedCamera = id;
  const camera = selectedCamera();
  workingCamera = structuredClone(camera);
  renderer.setCamera(workingCamera);
  updateGuide(camera);
  renderAll();
  if (persist) queueSave();
}

async function cutCamera(id) {
  try { await api(`/api/cut/${id}`, { method: 'POST', body: '{}' }); }
  catch (error) { showToast(error.message); }
}

function updateGuide(camera) {
  const guide = $('guideImage');
  if (camera?.guideUrl) {
    guide.src = camera.guideUrl;
    guide.style.display = 'block';
    guide.style.opacity = String(state.scene.guideOpacity ?? 0.72);
  } else {
    guide.removeAttribute('src');
    guide.style.display = 'none';
  }
}

function renderCameraControls() {
  const camera = selectedCamera();
  if (!workingCamera || workingCamera.id !== camera.id) workingCamera = structuredClone(camera);
  suppressInputs = true;
  $('cameraName').value = camera.name;
  $('cameraYaw').value = (workingCamera.yaw / Math.PI * 180).toFixed(1);
  $('cameraPitch').value = (workingCamera.pitch / Math.PI * 180).toFixed(1);
  $('cameraDistance').value = workingCamera.distance.toFixed(2);
  $('cameraFov').value = workingCamera.fov.toFixed(1);
  $('targetX').value = workingCamera.target[0].toFixed(2);
  $('targetY').value = workingCamera.target[1].toFixed(2);
  $('targetZ').value = workingCamera.target[2].toFixed(2);
  $('selectedCameraPill').textContent = `CAM ${camera.id}`;
  $('previewCameraName').textContent = `Câmera ${camera.id} — ${camera.name}`;
  $('guideOpacity').value = state.scene.guideOpacity;
  suppressInputs = false;
}

function renderSceneControls() {
  suppressInputs = true;
  $('projectName').value = state.projectName || '';
  $('anchorX').value = state.scene.anchor.x;
  $('anchorZ').value = state.scene.anchor.z;
  $('anchorRotation').value = state.scene.anchor.rotationY;
  $('anchorScale').value = state.scene.anchor.scale;
  $('anchorLocked').checked = state.scene.anchor.locked;
  $('lockBadge').textContent = state.scene.anchor.locked ? 'TRAVADO' : 'EDIÇÃO';
  $('baseThickness').value = state.scene.base.thickness;
  $('baseScale').value = state.scene.base.scale;
  $('alphaThreshold').value = state.scene.base.alphaThreshold;
  $('baseColor').value = state.scene.base.color;
  $('barWidth').value = state.scene.bars.width;
  $('barDepth').value = state.scene.bars.depth;
  $('barHeight').value = state.scene.bars.maxHeight;
  $('barGap').value = state.scene.bars.gap;
  $('imageScale').value = state.scene.bars.imageScale;
  $('labelScale').value = state.scene.bars.labelScale;
  suppressInputs = false;
  renderReadouts();
  renderBarItems();
}

function renderReadouts() {
  const pairs = [
    ['guideOpacityOutput', Number(state.scene.guideOpacity).toFixed(2)],
    ['baseThicknessOutput', `${Number(state.scene.base.thickness).toFixed(2)} m`],
    ['baseScaleOutput', `${Number(state.scene.base.scale).toFixed(1)} m`],
    ['alphaThresholdOutput', `${Math.round(Number(state.scene.base.alphaThreshold) * 100)}%`],
    ['barWidthOutput', Number(state.scene.bars.width).toFixed(2)],
    ['barDepthOutput', Number(state.scene.bars.depth).toFixed(2)],
    ['barHeightOutput', Number(state.scene.bars.maxHeight).toFixed(1)],
    ['barGapOutput', Number(state.scene.bars.gap).toFixed(2)],
    ['imageScaleOutput', Number(state.scene.bars.imageScale).toFixed(2)],
    ['labelScaleOutput', Number(state.scene.bars.labelScale).toFixed(2)]
  ];
  pairs.forEach(([id, value]) => $(id).textContent = value);
  $('programCameraLabel').textContent = `CAM ${state.activeCamera}`;
  $('toggleOutputButton').textContent = state.outputVisible ? 'Ocultar gráfico' : 'Mostrar gráfico';
  document.querySelectorAll('.cut-button').forEach(button => button.classList.toggle('active', Number(button.dataset.cut) === state.activeCamera));
}

function renderBarItems() {
  const list = $('barItems');
  list.innerHTML = '';
  state.scene.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bar-item';
    const preview = item.imageUrl || makeInitialSvg(item);
    row.innerHTML = `<img class="bar-thumb" src="${preview}" alt=""><div><strong>${escapeHtml(item.name)}</strong><small>Valor ${item.value} · ${item.color}</small></div><button type="button">Imagem</button><input type="file" accept="image/png,image/jpeg,image/webp" hidden>`;
    const input = row.querySelector('input');
    row.querySelector('button').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        item.imageUrl = await uploadFile(file);
        renderer.setState(state);
        renderBarItems();
        queueSave('Imagem atualizada');
      } catch (error) { showToast(error.message); }
    });
    list.appendChild(row);
  });
}

function makeInitialSvg(item) {
  const text = encodeURIComponent(String(item.name || '?').slice(0, 1).toUpperCase());
  const color = encodeURIComponent(item.color || '#3366cc');
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ccircle cx='60' cy='60' r='56' fill='${color}'/%3E%3Ctext x='60' y='75' text-anchor='middle' font-family='Arial' font-size='52' font-weight='700' fill='white'%3E${text}%3C/text%3E%3C/svg%3E`;
}

function renderAll() {
  renderCameraStrip();
  renderCameraControls();
  renderSceneControls();
  updateGuide(selectedCamera());
  updateCloudLinks();
}

async function uploadFile(file) {
  if (file.size > 12 * 1024 * 1024) throw new Error('Arquivo maior que 12 MB.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const result = await api('/api/upload', { method: 'POST', body: JSON.stringify({ name: file.name, dataUrl }) });
  return result.url;
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab.dataset.tab));
  }));
}

function bindSceneInputs() {
  const inputs = [
    ['projectName', 'projectName', 'string'], ['anchorX', 'scene.anchor.x', 'number'], ['anchorZ', 'scene.anchor.z', 'number'], ['anchorRotation', 'scene.anchor.rotationY', 'number'], ['anchorScale', 'scene.anchor.scale', 'number'], ['anchorLocked', 'scene.anchor.locked', 'checked'],
    ['baseThickness', 'scene.base.thickness', 'number'], ['baseScale', 'scene.base.scale', 'number'], ['alphaThreshold', 'scene.base.alphaThreshold', 'number'], ['baseColor', 'scene.base.color', 'string'],
    ['barWidth', 'scene.bars.width', 'number'], ['barDepth', 'scene.bars.depth', 'number'], ['barHeight', 'scene.bars.maxHeight', 'number'], ['barGap', 'scene.bars.gap', 'number'], ['imageScale', 'scene.bars.imageScale', 'number'], ['labelScale', 'scene.bars.labelScale', 'number'], ['guideOpacity', 'scene.guideOpacity', 'number']
  ];
  inputs.forEach(([id, path, type]) => $(id).addEventListener('input', event => {
    if (suppressInputs) return;
    const value = type === 'number' ? Number(event.target.value) : type === 'checked' ? event.target.checked : event.target.value;
    setNested(path, value);
    if (id === 'guideOpacity') updateGuide(selectedCamera());
  }));
}

function updateWorkingCameraFromFields() {
  if (suppressInputs || !workingCamera) return;
  workingCamera.yaw = Number($('cameraYaw').value) * Math.PI / 180;
  workingCamera.pitch = Number($('cameraPitch').value) * Math.PI / 180;
  workingCamera.distance = Number($('cameraDistance').value);
  workingCamera.fov = Number($('cameraFov').value);
  workingCamera.target = [Number($('targetX').value), Number($('targetY').value), Number($('targetZ').value)];
  renderer.setCamera(workingCamera);
}

function bindCameraInputs() {
  ['cameraYaw', 'cameraPitch', 'cameraDistance', 'cameraFov', 'targetX', 'targetY', 'targetZ'].forEach(id => $(id).addEventListener('input', updateWorkingCameraFromFields));
  $('cameraName').addEventListener('input', () => {
    selectedCamera().name = $('cameraName').value;
    renderCameraStrip();
    queueSave();
  });
  $('saveCameraButton').addEventListener('click', () => {
    const camera = selectedCamera();
    const snapshot = renderer.getCameraSnapshot();
    Object.assign(camera, snapshot, { name: $('cameraName').value });
    workingCamera = structuredClone(camera);
    renderAll();
    queueSave(`Câmera ${camera.id} salva`);
  });
  $('resetViewButton').addEventListener('click', () => selectCamera(state.selectedCamera, false));
  renderer.canvas.addEventListener('camera-change', event => {
    workingCamera = { ...workingCamera, ...event.detail, id: state.selectedCamera, name: selectedCamera().name };
    renderCameraControls();
  });
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV sem linhas de dados.');
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const nameIndex = Math.max(0, headers.findIndex(header => ['nome', 'name', 'categoria', 'candidato'].includes(header)));
  const valueIndex = headers.findIndex(header => ['valor', 'value', 'percentual', 'porcentagem', 'votos'].includes(header));
  const colorIndex = headers.findIndex(header => ['cor', 'color'].includes(header));
  if (valueIndex < 0) throw new Error('Inclua uma coluna valor.');
  const palette = ['#3567d7', '#10a9a6', '#7650a8', '#e9781b', '#d34b63', '#44a96c', '#c9a431', '#4f75a8'];
  return lines.slice(1).map((line, index) => {
    const columns = line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, ''));
    const name = columns[nameIndex] || `Item ${index + 1}`;
    const value = Number(String(columns[valueIndex] || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const existing = state.scene.items.find(item => item.name.toLowerCase() === name.toLowerCase());
    return {
      id: existing?.id || `${Date.now()}-${index}`,
      name,
      value,
      color: columns[colorIndex] || existing?.color || palette[index % palette.length],
      imageUrl: existing?.imageUrl || ''
    };
  }).slice(0, 12);
}

function bindFiles() {
  $('csvInput').addEventListener('change', async () => {
    try {
      const file = $('csvInput').files[0];
      if (!file) return;
      state.scene.items = parseCsv(await file.text());
      renderer.setState(state);
      renderAll();
      queueSave('CSV importado');
    } catch (error) { showToast(error.message); }
  });
  $('baseInput').addEventListener('change', async () => {
    const file = $('baseInput').files[0];
    if (!file) return;
    try {
      state.scene.base.imageUrl = await uploadFile(file);
      renderer.setState(state);
      queueSave('Base PNG atualizada');
    } catch (error) { showToast(error.message); }
  });
  $('guideInput').addEventListener('change', async () => {
    const file = $('guideInput').files[0];
    if (!file) return;
    try {
      selectedCamera().guideUrl = await uploadFile(file);
      updateGuide(selectedCamera());
      queueSave('Guia salvo');
    } catch (error) { showToast(error.message); }
  });
  $('removeGuideButton').addEventListener('click', () => {
    selectedCamera().guideUrl = '';
    updateGuide(selectedCamera());
    queueSave('Guia removido');
  });
}

function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateCloudLinks() {
  const room = getRoom();
  $('programUrl').value = programUrl(room);
  for (let id = 1; id <= 4; id += 1) {
    const element = $(`cutEndpoint${id}`);
    if (element) element.textContent = controlUrl(`/api/cut/${id}`, room);
  }
  $('toggleEndpoint').textContent = controlUrl('/api/output/toggle', room);
  $('roomInput').value = room;
  $('tokenInput').value = getToken();
  $('roomBadge').textContent = `SALA ${room.toUpperCase()}`;
}

async function loadRoom() {
  const data = await api('/api/state');
  state = data.state;
  renderer.setState(state);
  workingCamera = structuredClone(selectedCamera());
  renderer.setCamera(workingCamera);
  renderAll();
  connectEvents();
}

function bindCloudControls() {
  $('connectRoomButton').addEventListener('click', async () => {
    const room = setConnection($('roomInput').value, $('tokenInput').value);
    $('roomInput').value = room;
    try {
      await loadRoom();
      showToast(`Sala ${room} conectada`);
    } catch (error) { showToast(error.message); }
  });
}

function bindActions() {
  document.querySelectorAll('[data-cut]').forEach(button => button.addEventListener('click', () => cutCamera(Number(button.dataset.cut))));
  document.querySelectorAll('[data-api-cut]').forEach(button => button.addEventListener('click', () => cutCamera(Number(button.dataset.apiCut))));
  $('toggleOutputButton').addEventListener('click', async () => {
    try { await api('/api/output/toggle', { method: 'POST', body: '{}' }); }
    catch (error) { showToast(error.message); }
  });
  $('openProgramButton').addEventListener('click', () => window.open(programUrl(), 'broadcast3d-program'));
  $('copyProgramUrlButton').addEventListener('click', () => {
    $('programUrl').focus();
    $('programUrl').select();
    showToast('Link selecionado');
  });
  $('exportProjectButton').addEventListener('click', () => download(`${(state.projectName || 'projeto').replace(/[^a-z0-9_-]/gi, '_')}.json`, JSON.stringify(state, null, 2)));
  $('importProjectButton').addEventListener('click', () => $('importProjectInput').click());
  $('importProjectInput').addEventListener('change', async () => {
    try {
      const next = JSON.parse(await $('importProjectInput').files[0].text());
      state = next;
      renderer.setState(state);
      selectCamera(state.selectedCamera || 1, false);
      renderAll();
      queueSave('Projeto importado');
    } catch { showToast('Projeto inválido'); }
  });
  $('downloadCsvButton').addEventListener('click', () => download('exemplo-grafico.csv', 'nome;valor;cor\nIndústria;128;#3567d7\nVarejo;198;#10a9a6\nServiços;256;#7650a8\nTecnologia;312;#e9781b', 'text/csv'));
  window.addEventListener('keydown', event => {
    if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && ['1', '2', '3', '4'].includes(event.key)) cutCamera(Number(event.key));
  });
}

function connectEvents() {
  socketController?.close();
  socketController = connectSocket({
    room: getRoom(),
    onStatus: setConnectionBadge,
    onMessage(payload) {
      if (!payload?.state) return;
      state = payload.state;
      renderer.setState(state);
      if (payload.type === 'cut') selectCamera(state.activeCamera, false);
      else renderAll();
    }
  });
}

async function init() {
  $('roomInput').value = getRoom();
  $('tokenInput').value = getToken();
  renderer = new BroadcastRenderer($('previewCanvas'), { interactive: true });
  bindTabs();
  bindSceneInputs();
  bindCameraInputs();
  bindFiles();
  bindActions();
  bindCloudControls();
  await loadRoom();
}

init().catch(error => {
  document.body.innerHTML = `<pre style="padding:24px;color:white;white-space:pre-wrap">${escapeHtml(error.stack || error.message)}</pre>`;
});
