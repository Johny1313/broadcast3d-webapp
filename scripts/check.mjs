import { access, readFile } from 'node:fs/promises';

const files = [
  'wrangler.jsonc', 'src/index.js', 'public/index.html', 'public/program.html',
  'public/version.json', 'public/js/operator.js', 'public/js/program.js',
  'public/js/renderer3d.js', 'public/js/cloud.js', 'public/styles.css',
  'README.md', 'VMIX.md', 'streamdeck/play-geral.bat', 'streamdeck/preparar-cena.bat'
];
for (const file of files) await access(new URL(`../${file}`, import.meta.url));

const worker = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
for (const required of [
  'BroadcastRoom', '/api/state', '/api/ws', '/api/upload', '/api/sheets',
  '/api/play', '/api/play/reset', "version: '0.5.0'", 'state.version = 5',
  'scene.playback', 'state.scene.playback.startedAt = now'
]) if (!worker.includes(required)) throw new Error(`Implementação ausente no Worker: ${required}`);

const renderer = await readFile(new URL('../public/js/renderer3d.js', import.meta.url), 'utf8');
for (const required of [
  'GLTFLoader', 'AnimationMixer', 'LoopOnce', 'clampWhenFinished = true',
  'applyPlaybackState', 'applyGraphAnimation', 'graphStart', 'graphDuration',
  'this.mixer.setTime', 'modelDuration'
]) if (!renderer.includes(required)) throw new Error(`Playback 3D ausente: ${required}`);
for (const removed of ['LoopRepeat', 'animation.loop === false', 'modelAnimationLoop']) {
  if (renderer.includes(removed)) throw new Error(`Loop antigo ainda presente no renderer: ${removed}`);
}

const operator = await readFile(new URL('../public/js/operator.js', import.meta.url), 'utf8');
for (const required of [
  'playSceneButton', 'resetScenePlaybackButton', "api('/api/play'", "api('/api/play/reset'",
  'graphAnimationStart', 'graphAnimationDuration', "controlUrl('/play')", "controlUrl('/reset')"
]) if (!operator.includes(required)) throw new Error(`Controle ausente: ${required}`);
for (const removed of ['modelAnimationPlay', 'modelAnimationLoop', 'restartAnimationsButton', 'state.scene.generatedGraphVisible = false']) {
  if (operator.includes(removed)) throw new Error(`Controle antigo ainda presente: ${removed}`);
}

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
for (const required of [
  'v0.5.0', '▶ PLAY', 'Preparar', 'graphAnimationStart', 'graphAnimationDuration',
  'PLAY geral — GLB + gráfico', 'último frame'
]) if (!html.includes(required)) throw new Error(`Elemento de interface ausente: ${required}`);

const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
for (const route of ['/api/*', '/camera/*', '/cut/*', '/play', '/reset']) {
  if (!wrangler.includes(route)) throw new Error(`Rota não encaminhada ao Worker: ${route}`);
}

console.log('Broadcast3D v0.5.0 validado: PLAY único, GLB sem loop com último frame fixo e atraso configurável do gráfico Sheets.');
