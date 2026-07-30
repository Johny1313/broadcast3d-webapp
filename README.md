# Broadcast3D Cloud Webapp

Webapp para gerar um gráfico 3D ancorado no chão e usá-lo como **overlay transparente sobre o PGM do vMix**.

A aplicação não lê câmeras, não recebe NDI e não processa o PGM. Ela mantém quatro perspectivas virtuais calibradas manualmente e troca a visualização do mesmo objeto 3D quando o operador corta entre as câmeras físicas.

## Recursos desta versão

- Quatro presets de câmera independentes.
- Objeto único fixo no chão.
- Importação de CSV com `nome`, `valor` e `cor`.
- Base criada a partir de PNG transparente com extrusão.
- Imagem ilustrativa independente para cada barra.
- Controle de largura, profundidade, altura e espaçamento das barras.
- Saída WebGL com fundo transparente para vMix.
- Sincronização em tempo real entre painel e overlay por WebSocket.
- Salas independentes por parâmetro `room`.
- Persistência no Durable Object do Cloudflare.
- Upload de imagens dividido em blocos no armazenamento do Durable Object.
- Endpoints para Stream Deck.
- Estrutura pronta para GitHub e deploy automático no Cloudflare Workers.

## Arquitetura

```text
GitHub
  └─ push na branch main
       └─ Cloudflare Workers Builds
            ├─ arquivos estáticos: painel + overlay
            ├─ Worker: API e autenticação
            └─ Durable Object por sala
                 ├─ estado do projeto
                 ├─ quatro câmeras
                 ├─ imagens enviadas
                 └─ WebSockets conectados

vMix PGM
  +
Web Browser Input: /program.html?room=studio
  =
Saída final com gráfico 3D
```

## Desenvolvimento local

Requisitos:

- Node.js 20 ou superior.
- Conta Cloudflare apenas para o deploy; o desenvolvimento local funciona com a simulação do Wrangler.

```bash
npm install
npm run dev
```

Abra:

```text
Painel:  http://localhost:8787/?room=studio
Overlay: http://localhost:8787/program.html?room=studio
```

## Proteção do painel

A chave é opcional no desenvolvimento. Para ativá-la, crie `.dev.vars` a partir de `.dev.vars.example`:

```env
CONTROL_TOKEN=uma-chave-longa-e-aleatoria
```

No Cloudflare, cadastre o mesmo valor como secret `CONTROL_TOKEN`. O overlay continua podendo ler o estado, mas alterações e cortes exigem a chave.

## Deploy

Consulte [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md).

## vMix

Consulte [VMIX.md](VMIX.md).

## CSV

```csv
nome;valor;cor
Candidato A;42;#3567d7
Candidato B;35;#10a9a6
Candidato C;17;#7650a8
Candidato D;6;#e9781b
```

O aplicativo aceita vírgula ou ponto e vírgula como separador e limita o gráfico a 12 barras.

## Limites atuais

- A perspectiva não é lida das câmeras; cada câmera usa um preset virtual salvo.
- Trocas de câmera com o gráfico no ar devem usar CUT. Durante uma dissolvência, apenas uma perspectiva virtual fica ativa.
- Cada arquivo enviado pode ter até 12 MB.
- O render depende de WebGL 2 no Web Browser Input do vMix.
- Como o estado está na nuvem, a operação depende de conexão com a internet. Para redundância, a mesma base pode ser executada localmente com `npm run dev`.
