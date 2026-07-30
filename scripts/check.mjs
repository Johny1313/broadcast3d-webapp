import { access, readFile } from 'node:fs/promises';

const files = [
  'wrangler.jsonc',
  'src/index.js',
  'public/index.html',
  'public/program.html',
  'public/js/operator.js',
  'public/js/program.js',
  'public/js/renderer3d.js',
  'public/styles.css'
];

for (const file of files) await access(new URL(`../${file}`, import.meta.url));
const worker = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
for (const required of ['BroadcastRoom', '/api/state', 'cutMatch', '/api/ws', '/api/upload']) {
  if (!worker.includes(required)) throw new Error(`Implementação ausente: ${required}`);
}
console.log('Estrutura validada: Worker, Durable Object, WebSocket, upload e páginas estáticas.');
