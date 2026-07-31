# Deploy correto — GitHub + Cloudflare Worker + R2

## 1. Criar o bucket R2 uma única vez

Pelo terminal:

```bash
npm install
npx wrangler login
npx wrangler r2 bucket create broadcast3d-media
```

Também é possível criar no Dashboard:

```text
R2 Object Storage → Create bucket → broadcast3d-media
```

## 2. Publicar o Worker

```bash
npm run check
npm run deploy
```

O Worker utiliza:

- Static Assets;
- Durable Object para estado e WebSocket;
- R2 para GLB, OBJ, PNG e imagens;
- proxy para Google Sheets.

Não publique apenas a pasta `public` como Pages.

## 3. Deploy automático pelo GitHub

Conecte o repositório em **Workers & Pages → Workers Builds**.

```text
Build command: npm run check
Deploy command: npm run deploy
```

O bucket R2 precisa existir antes do primeiro deploy automático.

Secret opcional:

```text
CONTROL_TOKEN
```

## 4. Testes

Abra:

```text
https://SEU-WORKER.workers.dev/api/health
```

Resposta esperada:

```json
{
  "ok": true,
  "version": "0.8.2",
  "mediaBucket": true
}
```

Depois teste:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio&preview=1&debug=1
```
