# Broadcast3D Cloud v0.6.0

Webapp de overlay 3D transparente para vMix, com GLB/OBJ, gráfico criado por Google Sheets, quatro câmeras virtuais e operação por Stream Deck.

## Correções desta versão

- O link do overlay agora usa a rota direta `/overlay`, sem redirecionamento.
- Existe um link separado de teste: `/overlay?room=studio&preview=1&debug=1`.
- O teste mostra a cena final e informa sala, câmera e quantidade de itens carregados.
- A importação do Google Sheets agora acontece no Worker e salva o gráfico na sala antes de atualizar o overlay.
- O parser aceita CSV separado por vírgula, ponto e vírgula ou tabulação.
- Há fallback entre os endpoints `export`, `gviz` e `pub` do Google Sheets.
- A planilha pode usar `nome` e `valor`; quando esses títulos não existem, o app tenta identificar automaticamente a coluna de texto e a coluna numérica.
- A prévia do operador mostra o resultado final imediatamente. O overlay LIVE continua transparente até o comando PLAY.

## Fluxo correto

1. Cole o link público do Google Sheets.
2. Clique em **Conectar**.
3. Confirme a mensagem `Gráfico criado a partir do Google Sheets`.
4. Abra **Links reais**.
5. Use **Testar backend + abrir overlay**.
6. Adicione o link **Overlay LIVE** ao Browser Input do vMix.
7. Use **Preparar** e depois **PLAY**.

## Google Sheets

A planilha precisa estar configurada como **Qualquer pessoa com o link pode ver**.

Formato recomendado:

```text
nome,valor,cor,imagem
Candidato A,42,#3567d7,https://exemplo.com/a.png
Candidato B,35,#e34f59,https://exemplo.com/b.png
```

Campos:

- `nome`: texto da barra;
- `valor`: altura da barra;
- `cor`: hexadecimal opcional;
- `imagem`: URL HTTPS pública opcional.

## URLs depois do deploy

```text
Painel:
https://SEU-WORKER.workers.dev/?room=studio

Overlay LIVE para vMix:
https://SEU-WORKER.workers.dev/overlay?room=studio

Teste visual do overlay:
https://SEU-WORKER.workers.dev/overlay?room=studio&preview=1&debug=1

Câmeras virtuais fixas:
https://SEU-WORKER.workers.dev/camera/1?room=studio
https://SEU-WORKER.workers.dev/camera/2?room=studio
https://SEU-WORKER.workers.dev/camera/3?room=studio
https://SEU-WORKER.workers.dev/camera/4?room=studio

PLAY:
https://SEU-WORKER.workers.dev/play?room=studio&token=SUA_CHAVE

Preparar:
https://SEU-WORKER.workers.dev/reset?room=studio&token=SUA_CHAVE
```

## Importante sobre o Cloudflare

Este projeto precisa ser publicado como **Cloudflare Worker**, porque usa:

- Worker API;
- Durable Object;
- WebSocket;
- armazenamento da sala;
- proxy do Google Sheets.

Não publique apenas a pasta `public` como Cloudflare Pages ou site estático. Nesse modo a interface abre, mas os links, o estado e o Google Sheets não funcionam.

## Desenvolvimento

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run check
npm run dev
```

Deploy:

```bash
npm run deploy
```
