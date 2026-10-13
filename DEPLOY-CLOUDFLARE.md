# Deploy Broadcast3D v0.8.5 — upload GLB no navegador

Deploy **padrão**: `npm install && npm run deploy` (GLB até 12 MB salvo no Durable Object da sala, sem R2).

Deploy **com Cloudflare R2** (GLB até 48 MB): crie no painel R2 o bucket `broadcast3d-media` (ou `npx wrangler r2 bucket create broadcast3d-media`) e execute `npm run deploy:r2`. O binding MEDIA_BUCKET já consta em `wrangler.r2.jsonc`. Preserve o nome do Worker para não perder o estado.

Depois do deploy, confira `/api/health` e o valor de `mediaStorage` (`durable-object-small-glb` ou `cloudflare-r2`). Configure `CONTROL_TOKEN` com `npx wrangler secret put CONTROL_TOKEN` para restringir alterações da sala.

Veja **GUIA-UPLOAD-GLB.md** para etapas, limites e troubleshooting.

---

## Histórico (v0.8.4)

## Deploy legado — GitHub + Cloudflare Worker

## Arquitetura

- Static Assets para painel e overlay;
- Durable Object com SQLite para estado das salas;
- WebSocket para sincronização entre operador e vMix;
- GitHub Releases para GLB, OBJ e mídia externa;
- proxy do Worker para Google Sheets e assets do GitHub.

R2 é opcional: o upload direto de GLB pequeno funciona sem ele.

## Deploy automático

Conecte o repositório em **Workers & Pages → Workers Builds**.

```text
Build command: npm run check
Deploy command: npm run deploy
Root directory: /
```

Secret opcional:

```text
CONTROL_TOKEN
```

## Testes

Abra:

```text
https://SEU-WORKER.workers.dev/api/health
```

Resposta esperada:

```json
{
  "ok": true,
  "version": "0.8.5",
  "mediaStorage": "durable-object-small-glb"
}
```

Painel:

```text
https://SEU-WORKER.workers.dev/?room=studio
```

Overlay LIVE:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio
```

Diagnóstico:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio&debug=1
```
