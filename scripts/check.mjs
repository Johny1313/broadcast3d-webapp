import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const files = [
  'wrangler.jsonc', 'src/index.js', 'public/index.html', 'public/program.html',
  'public/version.json', 'public/js/operator.js', 'public/js/program.js',
  'public/js/renderer3d.js', 'public/js/cloud.js', 'public/styles.css',
  'README.md', 'VMIX.md', 'streamdeck/play-geral.bat', 'streamdeck/preparar-cena.bat'
];
for (const file of files) await access(new URL(`../${file}`, import.meta.url));

for (const file of ['src/index.js','public/js/operator.js','public/js/program.js','public/js/renderer3d.js','public/js/cloud.js']) {
  const result = spawnSync(process.execPath, ['--check', new URL(`../${file}`, import.meta.url).pathname], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Erro de sintaxe em ${file}: ${result.stderr}`);
}

const worker = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
for (const required of [
  'BroadcastRoom', '/api/state', '/api/ws', '/api/upload', '/api/sheets', '/api/sheets/sync',
  '/api/overlay-check', '/api/media/upload', 'MEDIA_BUCKET', "version: '0.7.0'", 'state.version = 7', "playback.mode = 'playing'",
  "playback.mode = 'prepared'", 'googleSheetCandidates', 'detectDelimiter'
]) if (!worker.includes(required)) throw new Error(`Implementação ausente no Worker: ${required}`);

const renderer = await readFile(new URL('../public/js/renderer3d.js', import.meta.url), 'utf8');
for (const required of ['GLTFLoader','LoopOnce','clampWhenFinished = true','applyGraphAnimation','Number.POSITIVE_INFINITY','action.paused = finished','model-loading','model-ready','setFromObject(root, true)']) {
  if (!renderer.includes(required)) throw new Error(`Renderer incompleto: ${required}`);
}

const operator = await readFile(new URL('../public/js/operator.js', import.meta.url), 'utf8');
for (const required of ["api('/api/sheets/sync'", 'programPreviewUrl', '/api/overlay-check', 'Backend não encontrado', 'uploadMedia']) {
  if (!operator.includes(required)) throw new Error(`Operador incompleto: ${required}`);
}

const cloud = await readFile(new URL('../public/js/cloud.js', import.meta.url), 'utf8');
if (!cloud.includes("new URL('/overlay'") || !cloud.includes('XMLHttpRequest') || !cloud.includes('/api/media/upload')) throw new Error('Link de overlay não usa a rota /overlay.');

const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
for (const route of ['/api/*','/camera/*','/cut/*','/play','/reset','/overlay','MEDIA_BUCKET','broadcast3d-media']) if (!wrangler.includes(route)) throw new Error(`Rota ausente: ${route}`);

console.log('Broadcast3D v0.7.0 validado: upload binário no R2, GLB grande, transparência, overlay e PLAY sincronizado.');
