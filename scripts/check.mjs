import { access, readFile } from 'node:fs/promises';

const files = [
  'wrangler.jsonc',
  'src/index.js',
  'public/index.html',
  'public/program.html',
  'public/js/operator.js',
  'public/js/program.js',
  'public/js/renderer3d.js',
  'public/js/cloud.js',
  'public/styles.css'
];

for (const file of files) await access(new URL(`../${file}`, import.meta.url));

const worker = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
for (const required of ['BroadcastRoom', '/api/state', 'cutMatch', '/api/ws', '/api/upload', 'MAX_MEDIA_BYTES', 'scene.model', 'scene.lights']) {
  if (!worker.includes(required)) throw new Error(`Implementação ausente: ${required}`);
}

const renderer = await readFile(new URL('../public/js/renderer3d.js', import.meta.url), 'utf8');
for (const required of ['GLTFLoader', 'OBJLoader', 'AnimationMixer', 'PointLight', 'ShadowMaterial']) {
  if (!renderer.includes(required)) throw new Error(`Recurso 3D ausente: ${required}`);
}

const operator = await readFile(new URL('../public/js/operator.js', import.meta.url), 'utf8');
for (const required of ['fixedProgramUrl', 'copyAllStreamDeckButton', 'modelInput', 'addLightButton', 'cameraYaw']) {
  if (!operator.includes(required)) throw new Error(`Controle ausente: ${required}`);
}

console.log('Estrutura validada: Cloudflare, WebSocket, GLB/OBJ, animações, luzes, sliders e links Stream Deck.');
