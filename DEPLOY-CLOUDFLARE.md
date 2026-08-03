# Deploy correto — GitHub + Cloudflare Worker

## Arquitetura

- Static Assets para painel e overlay;
- Durable Object com SQLite para estado das salas;
- WebSocket para sincronização entre operador e vMix;
- GitHub Releases para GLB, OBJ e mídia externa;
- proxy do Worker para Google Sheets e assets do GitHub.

Não é necessário ativar R2.

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
  "version": "0.8.4",
  "mediaStorage": "github-release-url"
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
