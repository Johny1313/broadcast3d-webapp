# Broadcast3D Cloud v0.5.0

Webapp de overlay 3D transparente para vMix, publicado por GitHub e Cloudflare Workers.

## Principais recursos

- Importação de GLB animado e OBJ estático, até 48 MB.
- Quatro câmeras virtuais com enquadramentos independentes.
- Google Sheets como fonte do gráfico nativo.
- Base PNG extrudada, barras, imagens e textos.
- Pontos de luz configuráveis.
- Saída `program.html` com alpha transparente para o Browser Input do vMix.
- Links de corte, câmeras, PLAY e preparação para Stream Deck.

## Playback unificado

O botão **PLAY** controla a cena completa:

1. Todos os clipes do GLB começam juntos no tempo zero.
2. Cada clipe respeita os keyframes e a duração definidos no arquivo.
3. Não há loop.
4. Ao terminar, o último frame permanece fixo em tela.
5. O gráfico do Google Sheets entra no mesmo PLAY.
6. O início da entrada do gráfico pode ser atrasado de `0` a `15` segundos.
7. A duração da entrada do gráfico pode ser ajustada de `0,2` a `8` segundos.

O botão **Preparar** retorna o GLB e o gráfico ao tempo zero. A barra de espaço também dispara o PLAY quando nenhum campo de texto está selecionado.

GLB e gráfico podem permanecer visíveis simultaneamente. Projetos da versão 0.4, nos quais o gráfico era ocultado automaticamente ao importar GLB, são migrados para a nova mecânica.

## Google Sheets

A planilha deve estar compartilhada como **qualquer pessoa com o link pode ver**.

Colunas reconhecidas:

| Coluna | Obrigatória | Uso |
|---|---|---|
| `nome` | Sim | Nome do item |
| `valor` | Sim | Altura da barra |
| `cor` | Não | Cor hexadecimal |
| `imagem` | Não | URL HTTPS pública |

Exemplo:

```text
nome,valor,cor,imagem
Candidato A,42,#3567d7,https://exemplo.com/a.png
Candidato B,35,#e34f59,https://exemplo.com/b.png
```

## URLs após o deploy

```text
Painel:
https://SEU-WORKER.workers.dev/?room=studio

Overlay dinâmico para vMix:
https://SEU-WORKER.workers.dev/program.html?room=studio

Câmeras virtuais fixas:
https://SEU-WORKER.workers.dev/camera/1?room=studio
https://SEU-WORKER.workers.dev/camera/2?room=studio
https://SEU-WORKER.workers.dev/camera/3?room=studio
https://SEU-WORKER.workers.dev/camera/4?room=studio

PLAY geral:
https://SEU-WORKER.workers.dev/play?room=studio&token=SUA_CHAVE

Preparar no tempo zero:
https://SEU-WORKER.workers.dev/reset?room=studio&token=SUA_CHAVE
```

## vMix

Adicione `program.html` como **Web Browser Input**, em 1920×1080, e use a entrada como overlay sobre o PGM. O app não recebe vídeo e não utiliza NDI.

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

## Observações

- GLB é o formato recomendado para animações e texturas incorporadas.
- OBJ é estático e pode perder materiais que dependam de MTL e texturas externas.
- O deploy efetivo deve ser validado na conta Cloudflare e no Browser Input do computador de transmissão.
