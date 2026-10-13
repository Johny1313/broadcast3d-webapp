// Testes de upload/releitura sem dependência de Wrangler/conta Cloudflare.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const script = src.replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject {}')
  .replace('export default {', 'const __worker = {')
  .replace('export class BroadcastRoom extends DurableObject {', 'class BroadcastRoom extends DurableObject {');
const sandbox = {
  Request, Response, Headers, Blob, ReadableStream, TextEncoder, TextDecoder, crypto,
  atob, btoa, URL, Uint8Array, DataView, ArrayBuffer, Date, Map, Set,
  structuredClone, console
};
vm.createContext(sandbox);
vm.runInContext(script + '\nthis.__api = { worker: __worker, BroadcastRoom, validatedGlbStream, readBoundedGlb };', sandbox);
const { worker, BroadcastRoom, validatedGlbStream, readBoundedGlb } = sandbox.__api;

function glbBytes() {
  const json = JSON.stringify({ asset: { version: '2.0' }, scenes: [{}], scene: 0 });
  const chunkBytes = new TextEncoder().encode(json);
  const padded = Math.ceil(chunkBytes.length / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + padded);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); // glTF
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, padded, true);
  view.setUint32(16, 0x4e4f534a, true); // JSON
  bytes.fill(32, 20);
  bytes.set(chunkBytes, 20);
  return bytes;
}
const glb = glbBytes();
function bigGlbBytes() {
  const target = 300 * 1024;
  const out = new Uint8Array(target + 20);
  const header = new DataView(out.buffer);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, out.length, true);
  header.setUint32(12, target, true);
  header.setUint32(16, 0x4e4f534a, true);
  out.fill(32, 20);
  out.set(new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' } })), 20);
  return out;
}
const bigGlb = bigGlbBytes();
const bytesEqual = (a,b) => Buffer.from(a).equals(Buffer.from(b));
class Storage {
  map = new Map();
  async get(key) { return this.map.get(key); }
  async put(key, value) { this.map.set(key, value); }
  async delete(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) this.map.delete(k); }
}
function env(withR2 = false) {
  const ctx = { storage: new Storage(), getWebSockets: () => [] };
  const room = new BroadcastRoom(ctx, {});
  const data = new Map();
  const r2 = withR2 ? {
    async put(key, body) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      data.set(key, bytes);
      return { size: bytes.byteLength };
    },
    async get(key) {
      const bytes = data.get(key);
      if (!bytes) return null;
      return { size: bytes.byteLength, body: new Blob([bytes]).stream(),
        writeHttpMetadata(h) { h.set('content-type', 'model/gltf-binary'); }, httpEtag: '"example"' };
    },
    async head(key) { const o = await this.get(key); return o ? { ...o, body: undefined } : null; },
    async delete(key) { data.delete(key); }
  } : null;
  return {
    CONTROL_TOKEN: 'test-token',
    ...(r2 ? { MEDIA_BUCKET: r2 } : {}),
    ROOMS: { getByName() { return { fetch: r => room.fetch(r) }; } },
    ASSETS: { fetch: async () => new Response('asset') },
    _storage: ctx.storage
  };
}
function uploadRequest(bytes, { type = 'scene.glb', declared = bytes.length, token = 'test-token' } = {}) {
  return new Request(`https://example.workers.dev/api/media/upload?room=studio&name=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers: { 'content-type': 'model/gltf-binary', 'x-file-size': String(declared), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: bytes
  });
}
async function testUpload(withR2) {
  const bindings = env(withR2);
  const noAuth = await worker.fetch(uploadRequest(glb, { token: '' }), bindings);
  assert.equal(noAuth.status, 401, 'Upload requer chave quando configurada');
  const valid = await worker.fetch(uploadRequest(glb), bindings);
  assert.equal(valid.status, 200, `GLB válido deve fazer upload; returned: ${await valid.clone().text()}`);
  const data = await valid.json();
  assert.equal(data.ok, true);
  assert.ok(data.url.startsWith('/api/media/'));
  assert.equal(data.storage, withR2 ? 'r2' : 'durable-object');
  const result = await worker.fetch(new Request(`https://example.workers.dev${data.url}`), bindings);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('content-type'), 'model/gltf-binary');
  assert.ok(bytesEqual(new Uint8Array(await result.arrayBuffer()), glb), 'Arquivo acessível sem blob local');
  const head = await worker.fetch(new Request(`https://example.workers.dev${data.url}`, { method: 'HEAD' }), bindings);
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get('content-length')), glb.length);
  // Exercita o armazenamento em múltiplos blocos do DO (96 KB cada).
  const larger = await worker.fetch(uploadRequest(bigGlb, { type: 'big-scene.glb' }), bindings);
  assert.equal(larger.status, 200, 'GLB multibloco grava sem erro');
  const largeMeta = await larger.json();
  const largeDownload = await worker.fetch(new Request(`https://example.workers.dev${largeMeta.url}`), bindings);
  assert.equal(largeDownload.status, 200);
  assert.ok(bytesEqual(new Uint8Array(await largeDownload.arrayBuffer()), bigGlb), 'GLB multibloco íntegro');
  const badExtension = await worker.fetch(uploadRequest(glb, { type: 'scene.obj' }), bindings);
  assert.equal(badExtension.status, 415, 'Rejeita extensões não GLB');
  const badGlb = glb.slice(); new DataView(badGlb.buffer).setUint32(4, 1, true);
  const invalid = await worker.fetch(uploadRequest(badGlb), bindings);
  assert.equal(invalid.status, 400, 'Rejeita GLB versão 1');
  const oversize = await worker.fetch(uploadRequest(glb, { declared: (withR2 ? 48 : 12) * 1024 * 1024 + 1 }), bindings);
  assert.equal(oversize.status, 413, 'Limite de armazenamento aplicado');
  const declaredTooLarge = await worker.fetch(uploadRequest(glb, { declared: glb.length + 1 }), bindings);
  assert.equal(declaredTooLarge.status, 400, 'Tamanho declarado não pode ser divergente');
}
await testUpload(false);
await testUpload(true);
const pieces = [glb.subarray(0, 5), glb.subarray(5, 9), glb.subarray(9)];
const stream = new ReadableStream({ pull(controller) { const next = pieces.shift(); next ? controller.enqueue(next) : controller.close(); } });
const output = await new Response(await validatedGlbStream(stream, glb.length)).arrayBuffer();
assert.ok(bytesEqual(new Uint8Array(output), glb), 'Cabeçalho repartido continua íntegro');
const badBody = new ReadableStream({ start(c) { c.enqueue(glb.subarray(0, 10)); c.close(); } });
await assert.rejects(() => readBoundedGlb(badBody, 12 * 1024 * 1024, glb.length), /Upload incompleto/);
console.log('OK — GLB upload autenticado, DO + R2, leitura entre computadores, HEAD, validação de cabeçalho, tamanho e stream multipartido.');
