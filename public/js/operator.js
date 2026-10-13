import { BroadcastRenderer } from './renderer3d.js?v=0.8.5';
import { api, cameraUrl, connectSocket, controlUrl, cutUrl, getRoom, getToken, programPreviewUrl, programUrl, setConnection, uploadMedia } from './cloud.js?v=0.8.5';

const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1XiDEtcuOuW1jfj8jX1JHxFgsbtbABAgTZuhZIYsWI6w/edit?usp=sharing';
let state = null;
let renderer = null;
let workingCamera = null;
let availableAnimations = [];
let saveTimer = null;
let toastTimer = null;
let suppressInputs = false;
let socketController = null;
let sheetTimer = null;
let sheetBusy = false;
let modelUploadBusy = false;
let maxModelUploadBytes = 12 * 1024 * 1024;

function defaultLight(index = 1) {
  return {
    id: crypto.randomUUID?.() || `light-${Date.now()}-${Math.random()}`,
    name: `Luz ${index}`,
    enabled: true,
    color: '#ffffff',
    intensity: 2.2,
    distance: 18,
    x: index % 2 ? -4 : 4,
    y: 5,
    z: 4
  };
}

function normalizeState(input) {
  const next = structuredClone(input || {});
  const previousVersion = Number(next.version || 0);
  next.version = 8;
  next.projectName ||= 'Projeto 3D - Eleições';
  next.activeCamera = Number(next.activeCamera || 1);
  next.selectedCamera = Number(next.selectedCamera || next.activeCamera || 1);
  next.outputVisible = next.outputVisible !== false;
  next.scene ||= {};
  next.scene.anchor = { x: 0, y: 0, z: 0, rotationY: 0, scale: 1, locked: true, ...(next.scene.anchor || {}) };
  next.scene.base = { imageUrl: '/assets/default-base.png', thickness: 0.32, scale: 8.5, color: '#d9e1ec', alphaThreshold: 0.18, ...(next.scene.base || {}) };
  next.scene.bars = { width: 0.9, depth: 0.78, maxHeight: 3.72, gap: 0.48, labelScale: 1, imageScale: 1.05, ...(next.scene.bars || {}) };
  next.scene.items = Array.isArray(next.scene.items) ? next.scene.items.map(item => ({ ...item, scale: Number.isFinite(Number(item.scale ?? item.indice)) ? Number(item.scale ?? item.indice) : Number(item.value || 0) })) : [];
  next.scene.lighting = { ambient: 0.58, key: 1.15, shadowOpacity: 0.28, ...(next.scene.lighting || {}) };
  next.scene.lights = Array.isArray(next.scene.lights) ? next.scene.lights : [defaultLight(1), { ...defaultLight(2), color: '#6fa8ff', x: 4, z: -2, intensity: 1.4 }];
  next.scene.model = {
    url: '', name: '', format: '', visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    animation: { speed: 1 },
    ...(next.scene.model || {})
  };
  next.scene.model.position = { x: 0, y: 0, z: 0, ...(next.scene.model.position || {}) };
  next.scene.model.rotation = { x: 0, y: 0, z: 0, ...(next.scene.model.rotation || {}) };
  next.scene.model.animation = { speed: 1, ...(next.scene.model.animation || {}) };
  next.scene.generatedGraphVisible = next.scene.generatedGraphVisible ?? true;
  if (previousVersion > 0 && previousVersion < 6 && next.scene.model.url && next.scene.generatedGraphVisible === false) next.scene.generatedGraphVisible = true;
  next.scene.graph = { opacity: 1, startHeight: 0, showNames: false, showImages: false, ...(next.scene.graph || {}) };
  next.scene.graph.opacity = Math.max(0, Math.min(1, Number(next.scene.graph.opacity ?? 1)));
  next.scene.graph.startHeight = Number(next.scene.graph.startHeight || 0);
  next.scene.graph.showNames = next.scene.graph.showNames === true;
  next.scene.graph.showImages = next.scene.graph.showImages === true;
  next.scene.playback = { mode: 'preview', startedAt: 0, playToken: 0, resetToken: 0, graphStart: 1, graphDuration: 1.4, ...(next.scene.playback || {}) };
  next.scene.dataSource = { type: 'google-sheets', enabled: true, url: DEFAULT_SHEET_URL, gid: '0', range: '', mappingMode: 'auto', firstRowHeader: true, columns: { name: 'A', value: 'B', color: 'C', image: 'D', scale: 'B' }, autoRefresh: true, refreshSeconds: 5, lastUpdated: '', lastRowCount: 0, lastError: '', lastSourceUrl: '', lastRange: '', lastMapping: null, ...(next.scene.dataSource || {}) };
  next.scene.dataSource.columns = { name: 'A', value: 'B', color: 'C', image: 'D', scale: 'B', ...(next.scene.dataSource.columns || {}) };
  next.scene.dataSource.enabled = next.scene.dataSource.enabled !== false;
  if (!String(next.scene.dataSource.url || '').trim()) next.scene.dataSource.url = DEFAULT_SHEET_URL;
  next.scene.dataSource.mappingMode = next.scene.dataSource.mappingMode === 'manual' ? 'manual' : 'auto';
  next.scene.dataSource.firstRowHeader = next.scene.dataSource.firstRowHeader !== false;
  next.scene.guideOpacity = Number(next.scene.guideOpacity ?? 0.72);

  const defaults = [
    { id: 1, name: 'Enquadramento A', yaw: 0.7, pitch: 0.38, distance: 13.5, target: [0, 1.8, 0], fov: 42, guideUrl: '' },
    { id: 2, name: 'Enquadramento B', yaw: -0.82, pitch: 0.3, distance: 14.8, target: [0, 1.7, 0], fov: 44, guideUrl: '' },
    { id: 3, name: 'Enquadramento C', yaw: 0.16, pitch: 0.16, distance: 10.1, target: [0.15, 2, 0], fov: 38, guideUrl: '' },
    { id: 4, name: 'Enquadramento D', yaw: 1.02, pitch: 0.72, distance: 16.2, target: [0, 1.25, 0], fov: 48, guideUrl: '' }
  ];
  const existing = Array.isArray(next.cameras) ? next.cameras : [];
  next.cameras = defaults.map(base => {
    const camera = existing.find(entry => Number(entry.id) === base.id) || {};
    const merged = { ...base, ...camera };
    merged.target = Array.isArray(camera.target) ? camera.target.map(Number) : [...base.target];
    return merged;
  });
  return next;
}

function showToast(message = 'Projeto salvo') {
  const toast = $('saveToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
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
  }, 320);
}

function selectedCamera() {
  return state.cameras.find(camera => camera.id === state.selectedCamera) || state.cameras[0];
}

function setNested(path, value, { save = true, render = true } = {}) {
  const parts = path.split('.');
  let target = state;
  for (let index = 0; index < parts.length - 1; index += 1) target = target[parts[index]];
  target[parts.at(-1)] = value;
  if (render) renderer.setState(state);
  renderReadouts();
  if (save) queueSave();
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
    card.innerHTML = `
      <span class="camera-index">${camera.id}</span>
      <h3>Câmera ${camera.id} — ${escapeHtml(camera.name)}</h3>
      <p>FOV ${Number(camera.fov).toFixed(1)}° · distância ${Number(camera.distance).toFixed(2)}</p>
      <div class="camera-card-actions">
        <button class="card-cut" type="button">CORTAR</button>
        <button class="card-link" type="button">COPIAR LINK</button>
      </div>`;
    card.addEventListener('click', event => {
      if (event.target.closest('button')) return;
      selectCamera(camera.id);
    });
    card.querySelector('.card-cut').addEventListener('click', event => {
      event.stopPropagation();
      cutCamera(camera.id);
    });
    card.querySelector('.card-link').addEventListener('click', event => {
      event.stopPropagation();
      copyText(cameraUrl(camera.id), `Link da câmera ${camera.id} copiado`);
    });
    strip.appendChild(card);
  });
}

function selectCamera(id, persist = true) {
  state.selectedCamera = Number(id);
  workingCamera = structuredClone(selectedCamera());
  renderer.setCamera(workingCamera);
  updateGuide(selectedCamera());
  renderCameraStrip();
  renderCameraControls();
  renderReadouts();
  updateCloudLinks();
  if (persist) queueSave();
}

async function cutCamera(id) {
  try {
    await api(`/api/cut/${id}`, { method: 'POST', body: '{}' });
  } catch (error) {
    showToast(error.message);
  }
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

function setCameraControl(id, value, suffix, digits = 1) {
  $(id).value = value;
  const numberField = $(`${id}Number`);
  if (numberField) numberField.value = Number(value).toFixed(digits);
  const output = $(`${id}Output`);
  if (output) output.textContent = `${Number(value).toFixed(digits)}${suffix}`;
}

function renderCameraControls() {
  const camera = selectedCamera();
  if (!workingCamera || workingCamera.id !== camera.id) workingCamera = structuredClone(camera);
  suppressInputs = true;
  $('cameraName').value = camera.name;
  setCameraControl('cameraYaw', workingCamera.yaw / DEG, '°', 1);
  setCameraControl('cameraPitch', workingCamera.pitch / DEG, '°', 1);
  setCameraControl('cameraDistance', workingCamera.distance, '', 2);
  setCameraControl('cameraFov', workingCamera.fov, '°', 1);
  setCameraControl('targetX', workingCamera.target[0], '', 2);
  setCameraControl('targetY', workingCamera.target[1], '', 2);
  setCameraControl('targetZ', workingCamera.target[2], '', 2);
  $('selectedCameraPill').textContent = `CAM ${camera.id}`;
  $('previewCameraName').textContent = `Câmera ${camera.id} — ${camera.name}`;
  $('guideOpacity').value = state.scene.guideOpacity;
  if ($('selectedCameraUrl')) $('selectedCameraUrl').value = cameraUrl(camera.id);
  suppressInputs = false;
}

function cameraFromControls() {
  return {
    ...workingCamera,
    yaw: Number($('cameraYaw').value) * DEG,
    pitch: Number($('cameraPitch').value) * DEG,
    distance: Number($('cameraDistance').value),
    fov: Number($('cameraFov').value),
    target: [Number($('targetX').value), Number($('targetY').value), Number($('targetZ').value)]
  };
}

function updateWorkingCameraFromControls() {
  if (suppressInputs) return;
  workingCamera = cameraFromControls();
  renderer.setCamera(workingCamera);
  renderCameraControls();
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
  $('graphOpacity').value = state.scene.graph.opacity;
  $('graphStartHeight').value = state.scene.graph.startHeight;
  $('graphShowNames').checked = state.scene.graph.showNames === true;
  $('graphShowImages').checked = state.scene.graph.showImages === true;
  $('barWidth').value = state.scene.bars.width;
  $('barDepth').value = state.scene.bars.depth;
  $('barHeight').value = state.scene.bars.maxHeight;
  $('barGap').value = state.scene.bars.gap;
  $('imageScale').value = state.scene.bars.imageScale;
  $('labelScale').value = state.scene.bars.labelScale;
  $('ambientLight').value = state.scene.lighting.ambient;
  $('keyLight').value = state.scene.lighting.key;
  $('shadowOpacity').value = state.scene.lighting.shadowOpacity;
  $('generatedGraphVisible').checked = state.scene.generatedGraphVisible !== false;
  $('graphAnimationStart').value = state.scene.playback.graphStart;
  $('graphAnimationDuration').value = state.scene.playback.graphDuration;
  renderPlaybackControls();
  renderSheetControls();
  suppressInputs = false;
  renderReadouts();
  renderBarItems();
  renderModelControls();
  renderLights();
}

function renderReadouts() {
  const pairs = [
    ['guideOpacityOutput', Number(state.scene.guideOpacity).toFixed(2)],
    ['graphOpacityOutput', `${Math.round(Number(state.scene.graph.opacity) * 100)}%`],
    ['graphStartHeightOutput', `${Number(state.scene.graph.startHeight).toFixed(2)} m`],
    ['barWidthOutput', Number(state.scene.bars.width).toFixed(2)],
    ['barDepthOutput', Number(state.scene.bars.depth).toFixed(2)],
    ['barHeightOutput', Number(state.scene.bars.maxHeight).toFixed(1)],
    ['barGapOutput', Number(state.scene.bars.gap).toFixed(2)],
    ['imageScaleOutput', Number(state.scene.bars.imageScale).toFixed(2)],
    ['labelScaleOutput', Number(state.scene.bars.labelScale).toFixed(2)],
    ['ambientLightOutput', Number(state.scene.lighting.ambient).toFixed(2)],
    ['keyLightOutput', Number(state.scene.lighting.key).toFixed(2)],
    ['shadowOpacityOutput', Number(state.scene.lighting.shadowOpacity).toFixed(2)],
    ['graphAnimationStartOutput', `${Number(state.scene.playback.graphStart).toFixed(1)} s`],
    ['graphAnimationDurationOutput', `${Number(state.scene.playback.graphDuration).toFixed(1)} s`]
  ];
  pairs.forEach(([id, value]) => { if ($(id)) $(id).textContent = value; });
  $('programCameraLabel').textContent = `CAM ${state.activeCamera}`;
  $('toggleOutputButton').textContent = state.outputVisible ? 'Ocultar cena' : 'Mostrar cena';
  const graphVisible = state.scene.generatedGraphVisible !== false && state.scene.dataSource?.enabled !== false;
  if ($('graphVisibilityPill')) $('graphVisibilityPill').textContent = graphVisible ? 'VISÍVEL' : 'OCULTO';
  if ($('graphVisibilityPill')) $('graphVisibilityPill').className = `pill ${graphVisible ? 'ready' : ''}`;
  if ($('sceneModeBadge')) {
    const hasModel = Boolean(state.scene.model.url && state.scene.model.visible);
    $('sceneModeBadge').textContent = hasModel && graphVisible ? `MODO: ${String(state.scene.model.format || 'GLB').toUpperCase()} + GRÁFICO` : hasModel ? `MODO: MODELO ${String(state.scene.model.format || '').toUpperCase()}` : graphVisible ? 'MODO: GRÁFICO NATIVO' : 'MODO: DADOS DESABILITADOS';
  }
  document.querySelectorAll('.cut-button').forEach(button => button.classList.toggle('active', Number(button.dataset.cut) === state.activeCamera));
}

function renderPlaybackControls() {
  const playback = state.scene.playback;
  const elapsed = playback.startedAt ? Math.max(0, (Date.now() - Number(playback.startedAt)) / 1000) : 0;
  const glbDuration = availableAnimations.reduce((maximum, clip) => Math.max(maximum, Number(clip.duration || 0) / Math.max(0.01, Number(state.scene.model.animation.speed || 1))), 0);
  const graphEnd = Number(playback.graphStart || 0) + Number(playback.graphDuration || 0);
  const total = Math.max(glbDuration, graphEnd);
  const status = !playback.startedAt ? 'PRONTO' : elapsed >= total ? 'FINAL FIXO' : 'REPRODUZINDO';
  if ($('playbackStatusPill')) {
    $('playbackStatusPill').textContent = status;
    $('playbackStatusPill').className = `pill ${status === 'REPRODUZINDO' ? 'ready' : ''}`;
  }
  if ($('playbackTime')) $('playbackTime').textContent = `${Math.min(elapsed, total || elapsed).toFixed(1)} / ${total.toFixed(1)} s`;
}

function renderBarItems() {
  const list = $('barItems');
  list.innerHTML = '';
  state.scene.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bar-item color-only';
    row.innerHTML = `
      <span class="bar-color-swatch" style="--bar-color:${escapeHtml(item.color || '#3b82f6')}"></span>
      <div><strong>${escapeHtml(item.name)}</strong><small>Índice ${Number(item.scale ?? item.value).toLocaleString('pt-BR')} · ${item.imageUrl ? 'imagem disponível' : 'sem imagem'}</small></div>
      <label class="bar-color-picker">Cor<input type="color" value="${escapeHtml(item.color || '#3b82f6')}"></label>
      <button class="bar-color-reset" type="button" ${item.colorLocked ? '' : 'disabled'}>Planilha</button>`;
    const colorInput = row.querySelector('input[type="color"]');
    colorInput.addEventListener('input', event => {
      item.color = event.target.value;
      item.colorLocked = true;
      row.querySelector('.bar-color-swatch').style.setProperty('--bar-color', item.color);
      row.querySelector('.bar-color-reset').disabled = false;
      renderer.setState(state);
      queueSave(`Cor de ${item.name} atualizada`);
    });
    row.querySelector('.bar-color-reset').addEventListener('click', async () => {
      item.colorLocked = false;
      queueSave(`Cor de ${item.name} liberada para a planilha`);
      await refreshGoogleSheet({ persist: true, silent: true });
    });
    list.appendChild(row);
  });
  if (!state.scene.items.length) list.innerHTML = '<span class="helper">Nenhuma barra carregada.</span>';
}

function makeInitialSvg(item) {
  const text = encodeURIComponent(String(item.name || '?').slice(0, 1).toUpperCase());
  const color = encodeURIComponent(item.color || '#3366cc');
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ccircle cx='60' cy='60' r='56' fill='${color}'/%3E%3Ctext x='60' y='75' text-anchor='middle' font-family='Arial' font-size='52' font-weight='700' fill='white'%3E${text}%3C/text%3E%3C/svg%3E`;
}


function formatSheetDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

function renderSheetControls() {
  if (!state?.scene?.dataSource) return;
  const source = state.scene.dataSource;
  const connected = Boolean(source.url);
  $('sheetDataEnabled').checked = source.enabled !== false;
  $('sheetDataEnabledQuick').checked = source.enabled !== false;
  $('sheetUrl').value = source.url || DEFAULT_SHEET_URL;
  $('sheetUrlQuick').value = source.url || DEFAULT_SHEET_URL;
  $('sheetGid').value = source.gid || '0';
  $('sheetRange').value = source.range || '';
  $('sheetMappingMode').value = source.mappingMode === 'manual' ? 'manual' : 'auto';
  $('sheetFirstRowHeader').checked = source.firstRowHeader !== false;
  $('sheetNameColumn').value = source.columns?.name || 'A';
  $('sheetValueColumn').value = source.columns?.value || 'B';
  $('sheetColorColumn').value = source.columns?.color || 'C';
  $('sheetImageColumn').value = source.columns?.image || 'D';
  $('sheetScaleColumn').value = source.columns?.scale || source.columns?.value || 'B';
  $('sheetManualMapping').hidden = source.mappingMode !== 'manual';
  $('sheetRefreshSeconds').value = Math.max(3, Number(source.refreshSeconds || 5));
  $('sheetAutoRefresh').checked = source.autoRefresh !== false;
  $('sheetLastUpdate').textContent = formatSheetDate(source.lastUpdated);
  const readRange = source.range || 'Aba inteira';
  const readMapping = source.mappingMode === 'manual'
    ? `nome ${source.columns?.name || '—'} · valor ${source.columns?.value || '—'} · índice ${source.columns?.scale || source.columns?.value || '—'} · cor ${source.columns?.color || '—'} · imagem ${source.columns?.image || '—'}`
    : 'automático por cabeçalho';
  $('sheetReadSummary').textContent = `${readRange} · ${readMapping}`;
  const enabled = source.enabled !== false;
  $('sheetConnectionPill').textContent = !enabled ? 'DESABILITADO' : connected ? 'CONECTADO' : 'DESCONECTADO';
  $('sheetConnectionPill').className = `pill ${enabled && connected ? 'ready' : ''}`;
  $('sheetStatusPill').textContent = !enabled ? 'PAUSADO' : connected ? 'CONECTADO' : 'GOOGLE SHEETS';
  $('sheetStatusPill').className = `pill ${enabled && connected ? 'ready' : ''}`;
  const rangeSummary = source.range ? ` · intervalo ${source.range}` : '';
  const mappingSummary = source.mappingMode === 'manual' ? ` · ${source.columns?.name || 'A'}/${source.columns?.value || 'B'}` : ' · colunas automáticas';
  const summary = !enabled
    ? 'Leitura desabilitada · últimos dados preservados'
    : connected
      ? `${Number(source.lastRowCount || state.scene.items.length)} linhas · GID ${source.gid || '0'}${rangeSummary}${mappingSummary}`
      : 'Nenhuma planilha conectada';
  $('sheetQuickStatus').textContent = summary;
  $('connectSheetButton').disabled = !enabled;
  $('refreshSheetButton').disabled = !enabled;
  $('connectSheetQuickButton').disabled = !enabled;
  if (!$('sheetStatus').dataset.busy) $('sheetStatus').textContent = source.lastError
    ? source.lastError
    : connected ? `Planilha configurada. ${summary}.` : 'Nenhuma planilha conectada.';

  const preview = $('sheetPreview');
  preview.innerHTML = '';
  state.scene.items.slice(0, 8).forEach(item => {
    const row = document.createElement('div');
    row.className = 'sheet-preview-row';
    row.innerHTML = `<span style="--item-color:${escapeHtml(item.color || '#3567d7')}"></span><strong>${escapeHtml(item.name)}</strong><b>${Number(item.value).toLocaleString('pt-BR')} · índice ${Number(item.scale ?? item.value).toLocaleString('pt-BR')}</b>`;
    preview.appendChild(row);
  });
  if (!state.scene.items.length) preview.innerHTML = '<span class="helper">Nenhuma linha carregada.</span>';
}

function syncSheetInputsToState() {
  const source = state.scene.dataSource;
  source.enabled = $('sheetDataEnabled').checked;
  source.url = String($('sheetUrl').value || $('sheetUrlQuick').value || DEFAULT_SHEET_URL).trim();
  source.gid = String($('sheetGid').value || '0').replace(/[^0-9]/g, '') || '0';
  source.range = String($('sheetRange').value || '').trim().toUpperCase();
  source.mappingMode = $('sheetMappingMode').value === 'manual' ? 'manual' : 'auto';
  source.firstRowHeader = $('sheetFirstRowHeader').checked;
  source.columns = {
    name: String($('sheetNameColumn').value || 'A').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    value: String($('sheetValueColumn').value || 'B').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    color: String($('sheetColorColumn').value || '').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    image: String($('sheetImageColumn').value || '').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    scale: String($('sheetScaleColumn').value || $('sheetValueColumn').value || 'B').trim().toUpperCase().replace(/[^A-Z]/g, '')
  };
  source.refreshSeconds = Math.max(3, Math.min(3600, Number($('sheetRefreshSeconds').value || 5)));
  source.autoRefresh = $('sheetAutoRefresh').checked;
}

function scheduleSheetRefresh() {
  clearInterval(sheetTimer);
  sheetTimer = null;
  const source = state?.scene?.dataSource;
  if (!source?.url || source.enabled === false || source.autoRefresh === false) return;
  const seconds = Math.max(3, Math.min(3600, Number(source.refreshSeconds || 5)));
  sheetTimer = setInterval(() => refreshGoogleSheet({ persist: false, silent: true }), seconds * 1000);
}

async function refreshGoogleSheet({ persist = true, silent = false } = {}) {
  if (sheetBusy) return;
  syncSheetInputsToState();
  const source = state.scene.dataSource;
  if (source.enabled === false) {
    if (!silent) showToast('Habilite os dados do Sheets / CSV antes de atualizar.');
    return;
  }
  if (!source.url) {
    if (!silent) showToast('Cole o link público do Google Sheets.');
    return;
  }
  sheetBusy = true;
  $('sheetStatus').dataset.busy = '1';
  $('sheetStatus').textContent = 'Lendo, validando e gerando o gráfico…';
  $('connectSheetButton').disabled = true;
  $('refreshSheetButton').disabled = true;
  try {
    const result = await api('/api/sheets/sync', {
      method: 'POST',
      body: JSON.stringify({
        source: source.url,
        gid: source.gid || '0',
        range: source.range || '',
        mappingMode: source.mappingMode || 'auto',
        firstRowHeader: source.firstRowHeader !== false,
        enabled: source.enabled !== false,
        columns: source.columns || { name: 'A', value: 'B', color: 'C', image: 'D', scale: 'B' },
        autoRefresh: source.autoRefresh !== false,
        refreshSeconds: source.refreshSeconds || 5
      })
    });
    state = normalizeState(result.state);
    state.scene.playback.mode = 'preview';
    renderer.setState(state);
    renderAll();
    $('sheetStatus').textContent = `${state.scene.items.length} linhas carregadas${state.scene.dataSource.range ? ` do intervalo ${state.scene.dataSource.range}` : ''}. O gráfico foi criado; use PLAY para enviá-lo ao overlay.`;
    if (!silent) showToast('Gráfico criado a partir do Google Sheets');
  } catch (error) {
    state.scene.dataSource.lastError = error.message;
    $('sheetStatus').textContent = error.message;
    if (!silent) showToast(error.message);
  } finally {
    delete $('sheetStatus').dataset.busy;
    $('connectSheetButton').disabled = false;
    $('refreshSheetButton').disabled = false;
    scheduleSheetRefresh();
  }
}

function renderModelControls() {
  const model = state.scene.model;
  suppressInputs = true;
  $('modelVisible').checked = Boolean(model.visible);
  if ($('modelUrlInput')) $('modelUrlInput').value = model.sourceUrl || '';
  $('modelFileName').textContent = model.name || 'Nenhum modelo carregado';
  if ($('modelQuickStatus')) $('modelQuickStatus').textContent = model.name || 'Nenhum modelo carregado';
  $('modelFormatPill').textContent = model.format ? model.format.toUpperCase() : 'VAZIO';

  const controls = [
    ['modelX', model.position.x, '', 2], ['modelY', model.position.y, '', 2], ['modelZ', model.position.z, '', 2],
    ['modelRotationX', model.rotation.x, '°', 1], ['modelRotationY', model.rotation.y, '°', 1], ['modelRotationZ', model.rotation.z, '°', 1],
    ['modelScale', model.scale, '', 2], ['modelAnimationSpeed', model.animation.speed, '×', 2]
  ];
  controls.forEach(([id, value, suffix, digits]) => {
    $(id).value = value;
    $(`${id}Output`).textContent = `${Number(value).toFixed(digits)}${suffix}`;
  });

  const list = $('animationList');
  list.innerHTML = '';
  if (!availableAnimations.length) {
    const empty = document.createElement('span');
    empty.textContent = model.format === 'obj' ? 'OBJ é estático e não possui animações.' : 'Nenhuma animação detectada.';
    list.appendChild(empty);
  } else {
    availableAnimations.forEach((clip, index) => {
      const row = document.createElement('div');
      row.className = 'animation-row';
      const name = typeof clip === 'string' ? clip : clip.name;
      const duration = typeof clip === 'object' ? Number(clip.duration || 0) : 0;
      row.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(name || `Animação ${index + 1}`)}</strong><small>${duration.toFixed(2)} s</small>`;
      list.appendChild(row);
    });
  }
  $('animationCount').textContent = `${availableAnimations.length} ${availableAnimations.length === 1 ? 'CLIPE' : 'CLIPES'}`;
  suppressInputs = false;
}
function renderLights() {
  const list = $('lightList');
  list.innerHTML = '';
  state.scene.lights.forEach((light, index) => {
    const card = document.createElement('article');
    card.className = 'light-card';
    card.innerHTML = `
      <div class="light-card-head">
        <label class="switch-row"><input data-light-field="enabled" type="checkbox" ${light.enabled !== false ? 'checked' : ''}><span>${escapeHtml(light.name || `Luz ${index + 1}`)}</span></label>
        <button class="icon-button danger-text" data-remove-light type="button" title="Remover luz">×</button>
      </div>
      <div class="light-inline"><label>Cor<input data-light-field="color" type="color" value="${light.color || '#ffffff'}"></label><label>Nome<input data-light-field="name" type="text" value="${escapeHtml(light.name || `Luz ${index + 1}`)}"></label></div>
      ${lightRange('Intensidade', 'intensity', light.intensity, 0, 10, 0.05, 2)}
      ${lightRange('Alcance', 'distance', light.distance, 1, 50, 0.1, 1)}
      ${lightRange('Posição X', 'x', light.x, -20, 20, 0.05, 2)}
      ${lightRange('Posição Y', 'y', light.y, 0, 20, 0.05, 2)}
      ${lightRange('Posição Z', 'z', light.z, -20, 20, 0.05, 2)}
    `;
    card.querySelectorAll('[data-light-field]').forEach(input => input.addEventListener('input', event => {
      const field = event.target.dataset.lightField;
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'color' || event.target.type === 'text' ? event.target.value : Number(event.target.value);
      light[field] = value;
      const output = card.querySelector(`[data-light-output="${field}"]`);
      if (output) output.textContent = Number(value).toFixed(field === 'distance' ? 1 : 2);
      renderer.setState(state);
      queueSave();
    }));
    card.querySelector('[data-remove-light]').addEventListener('click', () => {
      state.scene.lights.splice(index, 1);
      renderer.setState(state);
      renderLights();
      queueSave('Luz removida');
    });
    list.appendChild(card);
  });
  $('addLightButton').disabled = state.scene.lights.length >= 8;
}

function lightRange(label, field, value, min, max, step, digits) {
  return `<label class="range-field compact">${label}<output data-light-output="${field}">${Number(value).toFixed(digits)}</output><input data-light-field="${field}" type="range" min="${min}" max="${max}" step="${step}" value="${Number(value)}"></label>`;
}

function renderAll() {
  renderCameraStrip();
  renderCameraControls();
  renderSceneControls();
  updateGuide(selectedCamera());
  updateCloudLinks();
}

async function validateModelFile(file, extension) {
  if (extension !== 'glb') return;
  if (file.size < 20) throw new Error('GLB inválido ou incompleto.');
  const header = new DataView(await file.slice(0, 12).arrayBuffer());
  const magic = header.getUint32(0, true);
  const version = header.getUint32(4, true);
  const declaredLength = header.getUint32(8, true);
  if (magic !== 0x46546c67) throw new Error('O arquivo não possui um cabeçalho GLB válido.');
  if (version !== 2) throw new Error(`GLB versão ${version} não suportado. Use GLB 2.0.`);
  if (declaredLength !== file.size) throw new Error('O GLB está truncado ou possui tamanho interno incorreto.');
}

function setUploadFeedback(message, { error = false, progress = null } = {}) {
  const feedback = $('modelUploadFeedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.toggle('error', error);
    feedback.classList.toggle('success', !error && progress === 100);
  }
  const bar = $('modelUploadProgress');
  if (bar) {
    bar.hidden = progress == null;
    if (progress != null) bar.value = Math.max(0, Math.min(100, progress));
  }
}

async function uploadModelFromComputer(file) {
  if (!file || modelUploadBusy) return;
  try {
    if (!state) throw new Error('A sala ainda está conectando. Tente novamente após a conexão.');
    if (!/\.glb$/i.test(file.name)) throw new Error('Selecione um arquivo .glb. Modelos GLTF/OBJ continuam disponíveis via URL.');
    if (file.size > maxModelUploadBytes) throw new Error(maxModelUploadBytes > 12 * 1024 * 1024 ? 'Limite: 48 MB por GLB. Otimize o arquivo.' : 'Limite atual: 12 MB. Para GLBs maiores, ative o armazenamento R2 conforme o guia DEPLOY-CLOUDFLARE.md.');
    await validateModelFile(file, 'glb');
    modelUploadBusy = true;
    const button = $('browseModelButton');
    const leftButton = $('leftModelButton');
    button.disabled = true;
    leftButton.disabled = true;
    openPanel('model');
    setUploadFeedback(`Enviando ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)…`, { progress: 0 });
    const roomAtStart = getRoom();
    const result = await uploadMedia(file, (loaded, total) => {
      const percent = total ? Math.round(loaded / total * 100) : 0;
      setUploadFeedback(`Upload ${percent}% · ${file.name}`, { progress: Math.min(percent, 99) });
    });
    if (roomAtStart !== getRoom()) throw new Error('A sala foi alterada durante o upload. Volte à sala anterior.');
    state.scene.model.url = result.url;
    state.scene.model.sourceUrl = '';
    state.scene.model.name = file.name;
    state.scene.model.format = 'glb';
    state.scene.model.visible = true;
    state.scene.model.animation = { speed: 1 };
    state.scene.playback.mode = 'preview';
    state.scene.playback.startedAt = 0;
    state.scene.playback.resetToken = Date.now();
    availableAnimations = [];
    renderer.setState(state);
    renderAll();
    // Persiste imediatamente e publica o modelo para as outras telas via WebSocket.
    clearTimeout(saveTimer);
    await api('/api/state', { method: 'POST', body: JSON.stringify(state) });
    setUploadFeedback(`GLB enviado e compartilhado na sala ${roomAtStart}. Carregando a prévia…`, { progress: 100 });
    showToast('Modelo salvo na nuvem · disponível em outros computadores e no vMix');
  } catch (error) {
    setUploadFeedback(error.message || 'Falha no upload.', { error: true });
    showToast(error.message || 'Falha no upload.');
  } finally {
    modelUploadBusy = false;
    $('browseModelButton').disabled = false;
    $('leftModelButton').disabled = false;
    $('modelFileInput').value = '';
  }
}

function openPanel(name) {
  const tab = document.querySelector(`.tab[data-tab="${name}"]`);
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === name));
  tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

function renderCameraLinksDialog() {
  const container = $('cameraLinksDialogContent');
  if (!container || !state) return;
  container.innerHTML = '';
  state.cameras.forEach(camera => {
    const virtual = cameraUrl(camera.id);
    const cut = cutUrl(camera.id);
    const card = document.createElement('article');
    card.className = 'camera-link-dialog-card';
    card.innerHTML = `
      <div class="streamdeck-card-head"><strong>CAM ${camera.id}</strong><span>${escapeHtml(camera.name)}</span></div>
      <label>Câmera virtual fixa<input data-virtual type="text" readonly value="${escapeHtml(virtual)}"></label>
      <div class="button-row"><button data-copy-virtual class="button primary" type="button">Copiar câmera</button><button data-open-virtual class="button secondary" type="button">Abrir</button></div>
      <label>Corte / Stream Deck<input data-cut type="text" readonly value="${escapeHtml(cut)}"></label>
      <button data-copy-cut class="button secondary full" type="button">Copiar corte</button>`;
    card.querySelector('[data-copy-virtual]').addEventListener('click', () => copyText(virtual, `Link CAM ${camera.id} copiado`));
    card.querySelector('[data-open-virtual]').addEventListener('click', () => window.open(virtual, `broadcast3d-camera-${camera.id}`));
    card.querySelector('[data-copy-cut]').addEventListener('click', () => copyText(cut, `Corte CAM ${camera.id} copiado`));
    container.appendChild(card);
  });
}

function openCameraLinksDialog() {
  renderCameraLinksDialog();
  const dialog = $('cameraLinksDialog');
  if (dialog?.showModal) dialog.showModal();
  else dialog?.setAttribute('open', '');
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => openPanel(tab.dataset.tab)));
  document.querySelectorAll('[data-open-panel]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.openPanel)));
}

function bindSceneInputs() {
  const inputs = [
    ['projectName', 'projectName', 'string'],
    ['anchorX', 'scene.anchor.x', 'number'], ['anchorZ', 'scene.anchor.z', 'number'], ['anchorRotation', 'scene.anchor.rotationY', 'number'], ['anchorScale', 'scene.anchor.scale', 'number'], ['anchorLocked', 'scene.anchor.locked', 'checked'],
    ['graphOpacity', 'scene.graph.opacity', 'number'], ['graphStartHeight', 'scene.graph.startHeight', 'number'],
    ['graphShowNames', 'scene.graph.showNames', 'checked'], ['graphShowImages', 'scene.graph.showImages', 'checked'],
    ['barWidth', 'scene.bars.width', 'number'], ['barDepth', 'scene.bars.depth', 'number'], ['barHeight', 'scene.bars.maxHeight', 'number'], ['barGap', 'scene.bars.gap', 'number'],
    ['imageScale', 'scene.bars.imageScale', 'number'], ['labelScale', 'scene.bars.labelScale', 'number'],
    ['guideOpacity', 'scene.guideOpacity', 'number'],
    ['ambientLight', 'scene.lighting.ambient', 'number'], ['keyLight', 'scene.lighting.key', 'number'], ['shadowOpacity', 'scene.lighting.shadowOpacity', 'number'],
    ['modelVisible', 'scene.model.visible', 'checked'],
    ['modelX', 'scene.model.position.x', 'number'], ['modelY', 'scene.model.position.y', 'number'], ['modelZ', 'scene.model.position.z', 'number'],
    ['modelRotationX', 'scene.model.rotation.x', 'number'], ['modelRotationY', 'scene.model.rotation.y', 'number'], ['modelRotationZ', 'scene.model.rotation.z', 'number'], ['modelScale', 'scene.model.scale', 'number'],
    ['modelAnimationSpeed', 'scene.model.animation.speed', 'number'],
    ['graphAnimationStart', 'scene.playback.graphStart', 'number'], ['graphAnimationDuration', 'scene.playback.graphDuration', 'number'],
    ['generatedGraphVisible', 'scene.generatedGraphVisible', 'checked']
  ];
  inputs.forEach(([id, path, type]) => $(id).addEventListener('input', event => {
    if (suppressInputs) return;
    const value = type === 'number' ? Number(event.target.value) : type === 'checked' ? event.target.checked : event.target.value;
    setNested(path, value);
    if (id === 'guideOpacity') updateGuide(selectedCamera());
    if (id === 'generatedGraphVisible') renderReadouts();
    if (id.startsWith('model')) renderModelControls();
  }));

}

function bindCameraControls() {
  ['cameraYaw', 'cameraPitch', 'cameraDistance', 'cameraFov', 'targetX', 'targetY', 'targetZ'].forEach(id => $(id).addEventListener('input', updateWorkingCameraFromControls));

  const numberPairs = [
    ['cameraYawNumber', 'cameraYaw'], ['cameraPitchNumber', 'cameraPitch'], ['cameraDistanceNumber', 'cameraDistance'], ['cameraFovNumber', 'cameraFov']
  ];
  numberPairs.forEach(([numberId, rangeId]) => $(numberId).addEventListener('input', event => {
    if (suppressInputs) return;
    $(rangeId).value = event.target.value;
    updateWorkingCameraFromControls();
  }));

  $('previewCanvas').addEventListener('camera-change', event => {
    if (!workingCamera) return;
    workingCamera = { ...workingCamera, ...event.detail, id: selectedCamera().id, name: selectedCamera().name, guideUrl: selectedCamera().guideUrl };
    renderCameraControls();
  });

  $('saveCameraButton').addEventListener('click', () => {
    const camera = selectedCamera();
    const snapshot = renderer.getCameraSnapshot();
    Object.assign(camera, snapshot, { name: $('cameraName').value.trim() || camera.name });
    workingCamera = structuredClone(camera);
    renderCameraStrip();
    renderCameraControls();
    queueSave(`Preset da câmera ${camera.id} salvo`);
  });

  $('resetViewButton').addEventListener('click', () => selectCamera(state.selectedCamera, false));
}

function proxiedExternalUrl(source) {
  const value = String(source || '').trim();
  let url;
  try { url = new URL(value); } catch { throw new Error('Informe uma URL HTTPS válida.'); }
  if (url.protocol !== 'https:') throw new Error('A URL precisa usar HTTPS.');
  const host = url.hostname.toLowerCase();
  if (!(host === 'github.com' || host.endsWith('.github.com') || host === 'githubusercontent.com' || host.endsWith('.githubusercontent.com'))) {
    throw new Error('Use uma URL do GitHub Releases ou GitHubusercontent.');
  }
  return `/api/external-media?url=${encodeURIComponent(url.toString())}`;
}

function fileNameFromUrl(value) {
  try { return decodeURIComponent(new URL(value).pathname.split('/').filter(Boolean).at(-1) || 'modelo.glb'); }
  catch { return 'modelo.glb'; }
}

function bindUploads() {
  const fileInput = $('modelFileInput');
  const dropZone = $('modelUploadDrop');
  const chooseFile = () => { if (!modelUploadBusy) fileInput.click(); };
  $('browseModelButton').addEventListener('click', chooseFile);
  fileInput.addEventListener('change', () => uploadModelFromComputer(fileInput.files?.[0]));
  dropZone.addEventListener('click', chooseFile);
  dropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseFile(); }
  });
  for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      if (!modelUploadBusy) dropZone.classList.add('dragover');
    });
  }
  dropZone.addEventListener('dragleave', event => {
    if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    uploadModelFromComputer(event.dataTransfer?.files?.[0]);
  });

  $('guideInput').addEventListener('change', () => {
    const file = $('guideInput').files[0];
    if (!file) return;
    selectedCamera().guideUrl = URL.createObjectURL(file);
    updateGuide(selectedCamera());
    showToast('Guia carregado localmente na prévia');
  });

  $('loadModelUrlButton').addEventListener('click', () => {
    try {
      const sourceUrl = String($('modelUrlInput').value || '').trim();
      const fileName = fileNameFromUrl(sourceUrl);
      const extension = fileName.split('.').pop().toLowerCase();
      if (!['glb', 'obj'].includes(extension)) throw new Error('A URL precisa terminar em .glb ou .obj.');
      state.scene.model.url = proxiedExternalUrl(sourceUrl);
      state.scene.model.sourceUrl = sourceUrl;
      state.scene.model.name = fileName;
      state.scene.model.format = extension;
      state.scene.model.visible = true;
      state.scene.model.animation = { speed: 1 };
      state.scene.playback.mode = 'preview';
      state.scene.playback.startedAt = 0;
      state.scene.playback.resetToken = Date.now();
      availableAnimations = [];
      renderer.setState(state);
      renderAll();
      openPanel('model');
      queueSave(`${extension.toUpperCase()} carregado do GitHub · pronto para PLAY`);
    } catch (error) { showToast(error.message); }
  });

  $('removeGuideButton').addEventListener('click', () => {
    selectedCamera().guideUrl = '';
    updateGuide(selectedCamera());
    showToast('Guia removido');
  });

  $('removeModelButton').addEventListener('click', () => {
    state.scene.model = {
      url: '', sourceUrl: '', name: '', format: '', visible: true,
      position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1,
      animation: { speed: 1 }
    };
    availableAnimations = [];
    renderer.setState(state);
    renderAll();
    queueSave('Modelo removido');
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

async function copyText(text, message = 'Link copiado') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast(message);
  }
}

function updateCloudLinks() {
  const room = getRoom();
  $('programUrl').value = programUrl(room);
  if ($('programPreviewUrl')) $('programPreviewUrl').value = programPreviewUrl(room);
  $('toggleEndpoint').value = controlUrl('/api/output/toggle', room);
  if ($('playEndpoint')) $('playEndpoint').value = controlUrl('/play', room);
  if ($('resetEndpoint')) $('resetEndpoint').value = controlUrl('/reset', room);
  $('roomInput').value = room;
  $('tokenInput').value = getToken();
  $('roomBadge').textContent = `SALA ${room.toUpperCase()}`;
  if ($('selectedCameraUrl') && state) $('selectedCameraUrl').value = cameraUrl(selectedCamera().id, room);
  if ($('cameraLinksDialog')?.open) renderCameraLinksDialog();

  const container = $('streamDeckLinks');
  container.innerHTML = '';
  for (let id = 1; id <= 4; id += 1) {
    const cut = cutUrl(id, room);
    const virtual = cameraUrl(id, room);
    const camera = state?.cameras?.find(entry => entry.id === id);
    const card = document.createElement('article');
    card.className = 'streamdeck-card';
    card.innerHTML = `
      <div class="streamdeck-card-head"><strong>CAM ${id}</strong><span>${escapeHtml(camera?.name || `Enquadramento ${id}`)}</span></div>
      <label>Link de corte para Stream Deck<input data-cut-link type="text" readonly value="${escapeHtml(cut)}"></label>
      <div class="button-row"><button class="button primary mini" data-copy-cut type="button">Copiar corte</button><button class="button secondary mini" data-test-cut type="button">Testar</button></div>
      <label>Link da câmera virtual fixa<input data-camera-link type="text" readonly value="${escapeHtml(virtual)}"></label>
      <div class="button-row"><button class="button secondary mini" data-copy-camera type="button">Copiar câmera</button><button class="button secondary mini" data-open-camera type="button">Abrir</button></div>
    `;
    card.querySelector('[data-copy-cut]').addEventListener('click', () => copyText(cut, `Link de corte CAM ${id} copiado`));
    card.querySelector('[data-test-cut]').addEventListener('click', () => cutCamera(id));
    card.querySelector('[data-copy-camera]').addEventListener('click', () => copyText(virtual, `Link virtual CAM ${id} copiado`));
    card.querySelector('[data-open-camera]').addEventListener('click', () => window.open(virtual, `broadcast3d-camera-${id}`));
    container.appendChild(card);
  }
}

async function loadRoom() {
  let data;
  try { data = await api('/api/state'); }
  catch (error) { throw new Error(`Backend não encontrado. Publique como Cloudflare Worker com Durable Object, não como site estático/Pages. ${error.message}`); }
  state = normalizeState(data.state);
  renderer.setState(state);
  workingCamera = structuredClone(selectedCamera());
  renderer.setCamera(workingCamera);
  renderAll();
  scheduleSheetRefresh();
  connectEvents();
}

function bindCloudControls() {
  $('connectRoomButton').addEventListener('click', async () => {
    const room = setConnection($('roomInput').value, $('tokenInput').value);
    $('roomInput').value = room;
    try {
      await loadRoom();
      showToast(`Sala ${room} conectada`);
    } catch (error) {
      showToast(error.message);
    }
  });
}

function bindSheetControls() {
  const copyQuickToMain = () => {
    const value = String($('sheetUrlQuick').value || '').trim();
    if (value) $('sheetUrl').value = value;
  };
  $('sheetUrlQuick').addEventListener('input', copyQuickToMain);
  $('sheetUrl').addEventListener('input', () => { $('sheetUrlQuick').value = $('sheetUrl').value; });
  $('connectSheetQuickButton').addEventListener('click', async () => {
    copyQuickToMain();
    openPanel('sheets');
    await refreshGoogleSheet({ persist: true });
  });
  $('openSheetControlsButton').addEventListener('click', () => openPanel('sheets'));
  $('connectSheetButton').addEventListener('click', () => refreshGoogleSheet({ persist: true }));
  $('refreshSheetButton').addEventListener('click', () => refreshGoogleSheet({ persist: true }));
  ['sheetUrl', 'sheetGid', 'sheetRange', 'sheetMappingMode', 'sheetFirstRowHeader', 'sheetNameColumn', 'sheetValueColumn', 'sheetColorColumn', 'sheetImageColumn', 'sheetScaleColumn', 'sheetRefreshSeconds', 'sheetAutoRefresh'].forEach(id => {
    $(id).addEventListener('change', () => {
      if (!state || suppressInputs) return;
      syncSheetInputsToState();
      renderSheetControls();
      scheduleSheetRefresh();
      queueSave('Configuração do Google Sheets salva');
    });
  });
  $('sheetMappingMode').addEventListener('input', () => {
    $('sheetManualMapping').hidden = $('sheetMappingMode').value !== 'manual';
  });
  const toggleSheetEnabled = async enabled => {
    if (!state || suppressInputs) return;
    state.scene.dataSource.enabled = Boolean(enabled);
    $('sheetDataEnabled').checked = Boolean(enabled);
    $('sheetDataEnabledQuick').checked = Boolean(enabled);
    renderer.setState(state);
    renderSheetControls();
    scheduleSheetRefresh();
    queueSave(enabled ? 'Dados do Sheets / CSV habilitados' : 'Dados do Sheets / CSV desabilitados');
    if (enabled && state.scene.dataSource.url) await refreshGoogleSheet({ persist: true, silent: false });
  };
  $('sheetDataEnabled').addEventListener('change', event => toggleSheetEnabled(event.target.checked));
  $('sheetDataEnabledQuick').addEventListener('change', event => toggleSheetEnabled(event.target.checked));
}

function bindActions() {
  document.querySelectorAll('[data-cut]').forEach(button => button.addEventListener('click', () => cutCamera(Number(button.dataset.cut))));
  $('quickModelButton').addEventListener('click', () => { openPanel('model'); $('modelFileInput').click(); });
  $('leftModelButton').addEventListener('click', () => { openPanel('model'); $('modelFileInput').click(); });
  $('openModelControlsButton').addEventListener('click', () => openPanel('model'));
  $('quickSheetsButton').addEventListener('click', () => openPanel('sheets'));
  $('quickLightsButton').addEventListener('click', () => openPanel('lights'));
  $('quickLinksButton').addEventListener('click', openCameraLinksDialog);
  $('openCameraLinksButton').addEventListener('click', openCameraLinksDialog);
  $('closeCameraLinksButton').addEventListener('click', () => $('cameraLinksDialog').close());
  $('cameraLinksDialog').addEventListener('click', event => { if (event.target === $('cameraLinksDialog')) $('cameraLinksDialog').close(); });
  $('goToStreamDeckButton').addEventListener('click', () => { $('cameraLinksDialog').close(); openPanel('streamdeck'); });
  $('copySelectedCameraUrl').addEventListener('click', () => copyText(cameraUrl(selectedCamera().id), `Link da câmera ${selectedCamera().id} copiado`));
  $('openSelectedCameraUrl').addEventListener('click', () => window.open(cameraUrl(selectedCamera().id), `broadcast3d-camera-${selectedCamera().id}`));
  $('copyAllCameraLinksDialogButton').addEventListener('click', () => {
    const lines = [];
    for (let id = 1; id <= 4; id += 1) {
      lines.push(`CAM ${id} - VIRTUAL: ${cameraUrl(id)}`);
      lines.push(`CAM ${id} - CORTE: ${cutUrl(id)}`);
    }
    copyText(lines.join('\n'), 'Links das quatro câmeras copiados');
  });
  $('toggleOutputButton').addEventListener('click', async () => {
    try {
      await api('/api/output/toggle', { method: 'POST', body: '{}' });
    } catch (error) {
      showToast(error.message);
    }
  });
  $('openProgramButton').addEventListener('click', () => window.open(programUrl(), 'broadcast3d-program'));
  $('openProgramUrlButton').addEventListener('click', () => window.open(programUrl(), 'broadcast3d-program'));
  if ($('openProgramPreviewButton')) $('openProgramPreviewButton').addEventListener('click', () => window.open(programPreviewUrl(), 'broadcast3d-preview'));
  if ($('copyProgramPreviewButton')) $('copyProgramPreviewButton').addEventListener('click', () => copyText(programPreviewUrl(), 'Link de teste copiado'));
  if ($('testOverlayButton')) $('testOverlayButton').addEventListener('click', async () => {
    try {
      const result = await api('/api/overlay-check');
      showToast(`Overlay OK · ${result.itemCount} itens · CAM ${result.activeCamera}`);
      window.open(programPreviewUrl(), 'broadcast3d-preview');
    } catch (error) { showToast(`Overlay indisponível: ${error.message}`); }
  });
  $('copyProgramUrlButton').addEventListener('click', () => copyText(programUrl(), 'Link do overlay copiado'));
  $('copyToggleEndpointButton').addEventListener('click', () => copyText(controlUrl('/api/output/toggle'), 'Link de exibir/ocultar copiado'));
  $('copyPlayEndpointButton').addEventListener('click', () => copyText(controlUrl('/play'), 'Link de PLAY copiado'));
  $('copyResetEndpointButton').addEventListener('click', () => copyText(controlUrl('/reset'), 'Link de preparar copiado'));
  $('copyAllStreamDeckButton').addEventListener('click', () => {
    const lines = [];
    for (let id = 1; id <= 4; id += 1) {
      lines.push(`CAM ${id} - CORTE: ${cutUrl(id)}`);
      lines.push(`CAM ${id} - VIRTUAL: ${cameraUrl(id)}`);
    }
    lines.push(`OVERLAY DINÂMICO: ${programUrl()}`);
    lines.push(`PLAY GERAL: ${controlUrl('/play')}`);
    lines.push(`PREPARAR / RESET: ${controlUrl('/reset')}`);
    lines.push(`EXIBIR/OCULTAR: ${controlUrl('/api/output/toggle')}`);
    copyText(lines.join('\n'), 'Todos os links foram copiados');
  });

  $('exportProjectButton').addEventListener('click', () => download(`${(state.projectName || 'projeto').replace(/[^a-z0-9_-]/gi, '_')}.json`, JSON.stringify(state, null, 2)));
  $('importProjectButton').addEventListener('click', () => $('importProjectInput').click());
  $('importProjectInput').addEventListener('change', async () => {
    try {
      const next = normalizeState(JSON.parse(await $('importProjectInput').files[0].text()));
      state = next;
      availableAnimations = [];
      renderer.setState(state);
      selectCamera(state.selectedCamera || 1, false);
      renderAll();
      queueSave('Projeto importado');
    } catch {
      showToast('Projeto inválido');
    }
  });
  $('playSceneButton').addEventListener('click', async () => {
    try {
      await api('/api/play', { method: 'POST', body: '{}' });
      showToast('PLAY enviado: o overlay inicia do frame zero assim que GLB e gráfico estiverem prontos');
    } catch (error) {
      showToast(error.message);
    }
  });
  $('resetScenePlaybackButton').addEventListener('click', async () => {
    try {
      await api('/api/play/reset', { method: 'POST', body: '{}' });
      showToast('Cena preparada no tempo zero');
    } catch (error) {
      showToast(error.message);
    }
  });

  $('addLightButton').addEventListener('click', () => {
    if (state.scene.lights.length >= 8) return;
    state.scene.lights.push(defaultLight(state.scene.lights.length + 1));
    renderer.setState(state);
    renderLights();
    queueSave('Ponto de luz adicionado');
  });

  window.addEventListener('keydown', event => {
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && ['1', '2', '3', '4'].includes(event.key)) cutCamera(Number(event.key));
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && event.code === 'Space') { event.preventDefault(); $('playSceneButton').click(); }
  });
}

function connectEvents() {
  socketController?.close();
  socketController = connectSocket({
    room: getRoom(),
    onStatus: setConnectionBadge,
    onMessage(payload) {
      if (!payload?.state) return;
      state = normalizeState(payload.state);
      renderer.setState(state);
      if (payload.type === 'cut') selectCamera(state.activeCamera, false);
      else renderAll();
      scheduleSheetRefresh();
    }
  });
}

async function init() {
  $('roomInput').value = getRoom();
  $('tokenInput').value = getToken();
  renderer = new BroadcastRenderer($('previewCanvas'), { interactive: true });
  $('previewCanvas').addEventListener('model-info', event => {
    availableAnimations = event.detail.animations || [];
    renderModelControls();
    renderPlaybackControls();
  });
  $('previewCanvas').addEventListener('model-loading', event => {
    const percent = Number(event.detail?.percent || 0);
    const name = event.detail?.name || 'modelo';
    if ($('modelQuickStatus')) $('modelQuickStatus').textContent = percent > 0 ? `Carregando ${percent}% · ${name}` : `Abrindo ${name}…`;
  });
  $('previewCanvas').addEventListener('model-ready', event => {
    const detail = event.detail || {};
    const stats = detail.stats || {};
    if ($('modelQuickStatus')) $('modelQuickStatus').textContent = `${detail.name || 'Modelo'} · ${stats.meshes || 0} objetos · ${detail.animations || 0} animações`;
    showToast(`${detail.name || 'GLB'} carregado e pronto para PLAY`);
  });
  $('previewCanvas').addEventListener('model-error', event => {
    if ($('modelQuickStatus')) $('modelQuickStatus').textContent = `ERRO · ${event.detail.message}`;
    showToast(event.detail.message);
  });
  $('previewCanvas').addEventListener('playback-waiting', event => {
    const detail = event.detail || {};
    const missing = [];
    if (!detail.modelReady) missing.push('GLB');
    if (!detail.graphReady) missing.push('gráfico');
    if ($('playbackStatusPill')) $('playbackStatusPill').textContent = missing.length ? `AGUARDANDO ${missing.join(' + ').toUpperCase()}` : 'DISPARANDO';
  });
  $('previewCanvas').addEventListener('playback-started', () => {
    if ($('playbackStatusPill')) $('playbackStatusPill').textContent = 'NO AR';
  });
  $('previewCanvas').addEventListener('playback-prepared', () => {
    if ($('playbackStatusPill')) $('playbackStatusPill').textContent = 'PRONTO';
  });
  bindTabs();
  bindSceneInputs();
  bindCameraControls();
  bindUploads();
  bindCloudControls();
  bindSheetControls();
  bindActions();
  setInterval(() => { if (state) renderPlaybackControls(); }, 250);
  try {
    await loadRoom();
    try {
      const capabilities = await api('/api/health');
      if (Number.isFinite(Number(capabilities.maxUploadBytes)) && Number(capabilities.maxUploadBytes) > 0) {
        maxModelUploadBytes = Number(capabilities.maxUploadBytes);
      }
      const storage = capabilities.mediaStorage === 'cloudflare-r2' ? 'R2 na nuvem' : 'armazenamento da sala';
      const limit = Math.round(maxModelUploadBytes / (1024 * 1024));
      $('modelStorageStatus').textContent = `${storage} ativo · limite por arquivo: ${limit} MB`;
    } catch {
      $('modelStorageStatus').textContent = 'Armazenamento da sala · até 12 MB sem R2';
    }
  } catch (error) {
    setConnectionBadge('error');
    showToast(error.message);
  }
}

init();
