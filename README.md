# Broadcast3D Cloud v0.8.3

## Gráfico limpo 0–100

A versão 0.8.3 usa o campo `indice` como escala absoluta entre 0 e 100. A altura configurada no painel representa exatamente a linha 100. O gráfico nativo exibe somente as barras; imagens, valores e boxes foram removidos. Cada barra possui seletor de cor persistente.

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

## Correção principal: GLB SP05

O `SP05.glb` tem cerca de 32 MB, 16 malhas, aproximadamente 607 mil vértices, 18 animações e dois PNGs RGBA incorporados.

A versão anterior enviava o arquivo convertido em Base64 dentro de JSON e tentava guardar blocos grandes no Durable Object. Essa mecânica não era adequada para um GLB desse tamanho.

A v0.8.0 muda o fluxo:

```text
Navegador
  └── upload binário direto
        └── Cloudflare Worker
              └── Cloudflare R2
                    └── overlay e painel carregam o mesmo GLB
```

Implementado:

- upload binário sem Base64;
- armazenamento dos modelos e imagens no Cloudflare R2;
- progresso real de upload;
- carregamento progressivo do GLB;
- cálculo de centralização usando o último frame da animação;
- suporte a cenas que começam com objetos em escala zero;
- preservação dos materiais e PNGs transparentes do GLB;
- todas as animações começam no PLAY;
- cada animação para no próprio último frame;
- os objetos permanecem visíveis após o término;
- mensagens claras de erro no painel e no overlay de diagnóstico.

## Pré-requisito obrigatório: bucket R2

Crie uma vez o bucket:

```bash
npx wrangler login
npx wrangler r2 bucket create broadcast3d-media
```

Ou use:

```text
criar-bucket-r2.bat
```

O arquivo `wrangler.jsonc` já contém o binding:

```json
{
  "binding": "MEDIA_BUCKET",
  "bucket_name": "broadcast3d-media"
}
```

Sem o bucket, o painel abrirá, mas o upload de GLB retornará uma mensagem informando que `MEDIA_BUCKET` não está configurado.

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


## v0.8.3 — Sheets/CSV habilitável e índice das barras

- Chave para habilitar ou desabilitar os dados do Google Sheets/CSV sem apagar a última leitura.
- Ao desabilitar, o gráfico gerado fica oculto e a atualização automática é interrompida.
- A coluna `indice`/`índice` controla a escala e a altura relativa das barras.
- A coluna `valor` permanece como texto exibido; se não existir, o índice também é usado como valor.
- Planilha padrão deste projeto: `https://docs.google.com/spreadsheets/d/1XiDEtcuOuW1jfj8jX1JHxFgsbtbABAgTZuhZIYsWI6w/edit?usp=sharing`.
