import { access, readFile } from 'node:fs/promises';

const files = [
  'wrangler.jsonc',
  'src/index.js',
  'public/index.html',
  'public/program.html',
  'public/version.json',
  'public/js/operator.js',
  'public/js/program.js',
  'public/js/renderer3d.js',
  'public/js/cloud.js',
  'public/styles.css',
  'README.md',
  'VMIX.md'
];

for (const file of files) await access(new URL(`../${file}`, import.meta.url));

const worker = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
for (const required of [
  'BroadcastRoom', '/api/state', '/api/ws', '/api/upload', '/api/sheets',
  'fetchGoogleSheet', 'googleSheetCsvUrl', 'rowsToItems',
  'MAX_MEDIA_BYTES', 'scene.model', 'scene.lights', 'cameraRoute', 'friendlyCutRoute',
  "version: '0.4.0'", 'state.version = 4'
]) {
  if (!worker.includes(required)) throw new Error(`Implementação ausente no Worker: ${required}`);
}

const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
for (const route of ['/api/*', '/camera/*', '/cut/*']) {
  if (!wrangler.includes(route)) throw new Error(`Rota não encaminhada ao Worker: ${route}`);
}

const renderer = await readFile(new URL('../public/js/renderer3d.js', import.meta.url), 'utf8');
for (const required of [
  'GLTFLoader', 'OBJLoader', 'AnimationMixer', 'PointLight', 'ShadowMaterial',
  'activeActions', 'this.modelAnimations.map', 'restartAnimations()',
  'generatedGraphVisible', 'supportHeight'
]) {
  if (!renderer.includes(required)) throw new Error(`Recurso 3D ausente: ${required}`);
}
if (renderer.includes('currentClipName') || renderer.includes('modelAnimationClip')) {
  throw new Error('A seleção de clipe individual ainda está presente.');
}

const operator = await readFile(new URL('../public/js/operator.js', import.meta.url), 'utf8');
for (const required of [
  'cameraUrl', 'cutUrl', 'quickModelButton', 'openCameraLinksDialog',
  'modelInput', 'addLightButton', 'cameraYaw', 'selectedCameraUrl',
  'refreshGoogleSheet', 'scheduleSheetRefresh', 'sheetUrl',
  'state.scene.generatedGraphVisible = false', 'animation.restartToken = Date.now()'
]) {
  if (!operator.includes(required)) throw new Error(`Controle ausente: ${required}`);
}
for (const removed of ['csvInput', 'quickCsvButton', 'downloadCsvButton', 'modelAnimationClip']) {
  if (operator.includes(removed)) throw new Error(`Controle antigo ainda presente: ${removed}`);
}

const program = await readFile(new URL('../public/js/program.js', import.meta.url), 'utf8');
for (const required of ['refreshSheet', 'scheduleSheetRefresh', '/api/sheets', 'generatedGraphVisible']) {
  if (!program.includes(required)) throw new Error(`Overlay sem atualização do Sheets: ${required}`);
}

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
for (const required of [
  'v0.4.0', 'IMPORTAR GLB OU OBJ', 'Google Sheets',
  'Reproduzir todas as animações', 'restartAnimationsButton',
  'Links reais das câmeras virtuais', 'cameraLinksDialog', 'selectedCameraUrl',
  'generatedGraphVisible'
]) {
  if (!html.includes(required)) throw new Error(`Elemento de interface ausente: ${required}`);
}
for (const removed of ['csvInput', 'modelAnimationClip']) {
  if (html.includes(removed)) throw new Error(`Elemento antigo ainda presente no HTML: ${removed}`);
}

console.log('Broadcast3D v0.4.0 validado: GLB com todos os clipes simultâneos, Google Sheets, gráfico nativo oculto ao importar modelo, quatro câmeras e links reais.');
