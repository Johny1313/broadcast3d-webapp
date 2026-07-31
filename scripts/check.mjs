import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

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
  '/api/overlay-check', '/api/media/upload', 'MEDIA_BUCKET', "version: '0.8.2'", 'state.version = 8', "playback.mode = 'playing'",
  "playback.mode = 'prepared'", 'googleSheetCandidates', 'detectDelimiter', 'parseA1Range', 'normalizeSheetReadConfig', 'range:', 'mappingMode'
]) if (!worker.includes(required)) throw new Error(`Implementação ausente no Worker: ${required}`);



const helperStart = worker.indexOf('function detectDelimiter');
const helperEnd = worker.indexOf('\nfunction sheetIdentity', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('Bloco de leitura do Sheets não encontrado.');
const context = {};
vm.createContext(context);
vm.runInContext(`${worker.slice(helperStart, helperEnd)}\nthis.__sheets={parseCsvRows,rowsToItems,parseA1Range};`, context);
const { parseCsvRows, rowsToItems, parseA1Range } = context.__sheets;
const assert = (condition, message) => { if (!condition) throw new Error(`Teste do Sheets falhou: ${message}`); };
const manualRows = parseCsvRows('ignorar,ignorar,ignorar,ignorar,ignorar,ignorar,ignorar,ignorar\nID,Nome,X,Valor,Cor,X,X,Imagem\n1,Ana,x,42,#112233,x,x,https://example.com/a.png\n2,Beto,x,35,#445566,x,x,https://example.com/b.png');
const manual = rowsToItems(manualRows, { range: 'B2:H4', mappingMode: 'manual', firstRowHeader: true, columns: { name: 'B', value: 'D', color: 'E', image: 'H', scale: 'D' } });
assert(manual.items.length === 2 && manual.items[0].name === 'Ana' && manual.items[0].value === 42, 'mapeamento manual B/D/E/H');
assert(manual.mapping.nameColumn === 'B' && manual.mapping.valueColumn === 'D' && manual.mapping.scaleColumn === 'D', 'letras absolutas das colunas');
const automatic = rowsToItems(parseCsvRows('nome,valor,indice,cor\nA,100,1,#111111\nB,200,3,#222222\nC,300,2,#333333'), { range: 'A1:D3', mappingMode: 'auto', firstRowHeader: true });
assert(automatic.items.length === 2 && automatic.items[1].name === 'B' && automatic.items[1].scale === 3, 'índice controla escala da barra');
const withoutHeader = rowsToItems(parseCsvRows('A,10\nB,20\nC,30'), { range: '1:2', mappingMode: 'manual', firstRowHeader: false, columns: { name: 'A', value: 'B', color: '', image: '', scale: 'B' } });
assert(withoutHeader.items.length === 2, 'intervalo sem cabeçalho');
assert(parseA1Range('B:D').startColumn === 1 && parseA1Range('B:D').endColumn === 4, 'intervalo somente de colunas');
assert(parseA1Range('3:12').startRow === 2 && parseA1Range('3:12').endRow === 12, 'intervalo somente de linhas');

const renderer = await readFile(new URL('../public/js/renderer3d.js', import.meta.url), 'utf8');
for (const required of ['GLTFLoader','LoopOnce','clampWhenFinished = true','applyGraphAnimation','Number.POSITIVE_INFINITY','action.paused = finished','model-loading','model-ready','setFromObject(root, true)', 'tryStartPendingPlayback', 'localPlaybackStartedAt', "mode === 'final-preview'", 'playback-waiting', 'playback-started']) {
  if (!renderer.includes(required)) throw new Error(`Renderer incompleto: ${required}`);
}

const operator = await readFile(new URL('../public/js/operator.js', import.meta.url), 'utf8');
for (const required of ["api('/api/sheets/sync'", 'programPreviewUrl', '/api/overlay-check', 'Backend não encontrado', 'uploadMedia', 'sheetRange', 'sheetMappingMode', 'sheetNameColumn', 'sheetDataEnabled', 'sheetScaleColumn']) {
  if (!operator.includes(required)) throw new Error(`Operador incompleto: ${required}`);
}

const wrangler = await readFile(
  new URL('../wrangler.jsonc', import.meta.url),
  'utf8'
);

for (const route of [
  '/api/*',
  '/camera/*',
  '/cut/*',
  '/play',
  '/reset',
  '/overlay'
]) {
  if (!wrangler.includes(route)) {
    throw new Error(`Rota ausente: ${route}`);
  }
}

console.log('Broadcast3D v0.8.2 validado: PLAY aguarda GLB/gráfico, inicia no frame zero com relógio local, mantém último frame e preserva Sheets/CSV.');
