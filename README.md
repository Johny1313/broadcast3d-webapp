# Broadcast3D Cloud v0.8.5

## Novidade: upload de modelos GLB de qualquer computador

O painel agora tem **seleção de arquivo** e **arrastar/soltar**, com progresso, validação de GLB 2.0 e sincronização com overlay/vMix e outros computadores na mesma sala. **Até 12 MB sem configurar R2**; com R2 ligado, **até 48 MB por GLB**. A opção anterior de URL HTTPS do GitHub permanece funcionando. Veja [GUIA-UPLOAD-GLB.md](GUIA-UPLOAD-GLB.md) para o passo a passo.

## Histórico da versão 0.8.4

## Gráfico limpo 0–100

A versão 0.8.4 mantém o campo `indice` como escala absoluta entre 0 e 100 e remove a base própria do gráfico. As barras passam a compartilhar o mesmo chão do GLB, com controle de altura inicial, opacidade geral e opções independentes para exibir nomes e usar as imagens recebidas do Google Sheets.

## Mídia sem R2

Cole a URL direta de um asset do GitHub Release no painel de Modelo. O Worker entrega o arquivo pelo endpoint `/api/external-media`, permitindo que painel e overlay funcionem em redes diferentes sem R2.


## PLAY confiável no overlay do vMix

O overlay LIVE deve permanecer carregado no vMix usando `/overlay?room=studio`. Antes da entrada no ar, clique em **Preparar**. Ao clicar em **PLAY**, o comando é enviado pelo WebSocket, mas a contagem só começa localmente quando o GLB e o gráfico do Sheets estiverem prontos. Assim, um GLB grande não pula diretamente para o último frame.

Fluxo:

```text
Overlay LIVE carregado no vMix
→ Preparar
→ PLAY
→ GLB + gráfico iniciam no frame zero
→ cada animação termina e permanece no último frame
→ Ocultar cena para retirar do ar
```

Não use o endereço com `preview=1` no vMix. Esse link é apenas uma prévia final para conferência e não reproduz a animação ao receber PLAY.


## Seleção de linhas e colunas do Google Sheets

A leitura da planilha agora pode ser limitada por **intervalo A1** e por **mapeamento manual de colunas**.

Exemplos de intervalo:

- `A2:F20` — lê apenas as linhas 2 a 20 e as colunas A a F;
- `B:D` — lê todas as linhas, somente entre B e D;
- `3:12` — lê todas as colunas, somente entre as linhas 3 e 12;
- vazio — lê a aba inteira.

Há dois modos:

1. **Automático pelo cabeçalho**: procura `nome`, `valor`, `cor` e `imagem` dentro do intervalo selecionado.
2. **Manual por letra**: o operador informa as colunas absolutas, por exemplo nome em `B`, valor em `E`, cor em `F` e imagem em `H`.

A opção **A primeira linha do intervalo é cabeçalho** define se a primeira linha selecionada será ignorada como dado. As configurações ficam salvas por sala e também são usadas nas atualizações automáticas.

Webapp de overlay 3D transparente para vMix, com modelos GLB/OBJ, gráfico criado por Google Sheets, quatro câmeras virtuais, PLAY único e operação por Stream Deck.

## Modelos GLB e OBJ sem R2

Os modelos são publicados como assets em um GitHub Release e carregados pelo painel por URL HTTPS.

```text
GitHub Release
  └── modelo.glb
        └── /api/external-media
              └── painel e overlay carregam o mesmo arquivo
```

No painel, use **Modelo 3D principal → URL do GLB/OBJ no GitHub**. O Worker atua como proxy com suporte a `Range`, permitindo que o mesmo overlay funcione em computadores e redes diferentes.

## Fluxo operacional

1. Importe o GLB ou OBJ.
2. Aguarde `Modelo carregado e pronto para PLAY`.
3. Conecte a planilha pública do Google Sheets, quando houver gráfico adicional.
4. Ajuste luzes e câmeras virtuais.
5. Clique em **Preparar**.
6. Clique em **PLAY**.
7. No vMix, use o link LIVE como Browser Input/Overlay.

## Google Sheets

A planilha precisa estar configurada como **Qualquer pessoa com o link pode ver**.

Formato recomendado:

```text
nome,valor,cor,imagem
Candidato A,42,#3567d7,https://exemplo.com/a.png
Candidato B,35,#e34f59,https://exemplo.com/b.png
```

## URLs depois do deploy

```text
Painel:
https://SEU-WORKER.workers.dev/?room=studio

Overlay LIVE para vMix:
https://SEU-WORKER.workers.dev/overlay?room=studio

Teste visual com diagnóstico:
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

## Teste específico do Sheets

Consulte `TESTE-SHEETS-INTERVALO.md` para validar intervalo A1 e mapeamento manual.

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

O projeto deve ser publicado como **Cloudflare Worker**, não como site estático no Pages.


## v0.8.4 — Sheets/CSV habilitável e índice das barras

- Chave para habilitar ou desabilitar os dados do Google Sheets/CSV sem apagar a última leitura.
- Ao desabilitar, o gráfico gerado fica oculto e a atualização automática é interrompida.
- A coluna `indice`/`índice` controla a escala e a altura relativa das barras.
- A coluna `valor` permanece como texto exibido; se não existir, o índice também é usado como valor.
- Planilha padrão deste projeto: `https://docs.google.com/spreadsheets/d/1XiDEtcuOuW1jfj8jX1JHxFgsbtbABAgTZuhZIYsWI6w/edit?usp=sharing`.

## v0.8.4 — integração do gráfico com o chão do GLB

- Base PNG extrudada removida do gráfico.
- Controle de opacidade de 0% a 100%.
- Controle de altura inicial das barras para apoiar o gráfico sobre objetos do GLB.
- O modelo GLB não recebe mais deslocamento automático causado pela antiga base.
- Nomes opcionais, renderizados sem valores e sem boxes.
- Imagens opcionais, usando somente URLs válidas recebidas da planilha.
- Controles independentes de escala para nomes e imagens.
- PLAY preservado: barras, nomes e imagens entram uma vez e ficam no último frame.
