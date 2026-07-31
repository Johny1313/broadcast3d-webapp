# Deploy — Cloudflare Workers + GitHub

## Requisitos

- Conta Cloudflare.
- Repositório GitHub.
- Node.js 20 ou superior para teste local.

## Publicação pelo terminal

```bash
npm install
npx wrangler login
npm run check
npm run deploy
```

O projeto publica:

- arquivos estáticos da pasta `public`;
- Worker da pasta `src`;
- Durable Object `BroadcastRoom`;
- WebSocket da sala;
- armazenamento dos projetos e uploads;
- proxy de leitura do Google Sheets em `/api/sheets`.

## Publicação automática pelo GitHub

Conecte o repositório no painel do Cloudflare Workers Builds.

Comandos:

```text
Build command: npm run check
Deploy command: npm run deploy
```

Cadastre o secret opcional:

```text
CONTROL_TOKEN
```

Quando o secret estiver ativo, os links de corte incluem `token=` automaticamente no painel.

## URLs após o deploy

Painel:

```text
https://SEU-WORKER.workers.dev/?room=studio
```

Overlay:

```text
https://SEU-WORKER.workers.dev/program.html?room=studio
```

Câmera fixa:

```text
https://SEU-WORKER.workers.dev/camera/1?room=studio
```

Corte Stream Deck:

```text
https://SEU-WORKER.workers.dev/cut/1?room=studio
```

## Google Sheets

A planilha precisa estar visível para qualquer pessoa com o link. A leitura é feita pelo Worker e não requer chave de API nesta versão.
