# Deploy correto — GitHub + Cloudflare Worker

## Não usar Direct Upload de Pages

O projeto não é apenas um site estático. Ele depende do Worker e do Durable Object. Publicar somente a pasta `public` faz a interface abrir, mas quebra:

- `/api/state`;
- `/api/sheets/sync`;
- `/overlay`;
- `/camera/1` a `/camera/4`;
- WebSocket;
- links do Stream Deck.

## Deploy pelo terminal

```bash
npm install
npx wrangler login
npm run check
npm run deploy
```

## Deploy automático pelo GitHub

No Cloudflare, conecte o repositório em **Workers & Pages → Workers Builds**.

```text
Build command: npm run check
Deploy command: npm run deploy
```

O Cloudflare instala as dependências antes do build.

Secret opcional:

```text
CONTROL_TOKEN
```

## Testes após publicar

Abra:

```text
https://SEU-WORKER.workers.dev/api/health
```

A resposta deve conter:

```json
{"ok":true,"version":"0.6.0"}
```

Depois abra:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio&preview=1&debug=1
```

O canto inferior deve mostrar `Overlay OK`.
