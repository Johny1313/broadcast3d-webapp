# Changelog

## 0.5.1

- Corrigido o congelamento das animações GLB no último frame.
- Cada clipe mantém seu próprio tempo final, mesmo quando as durações são diferentes.
- Ações concluídas permanecem habilitadas e pausadas, evitando retorno à pose inicial.
- O PLAY continua sem loop e o botão Preparar retorna todos os clipes ao frame zero.
- Mantida a sincronização com o gráfico gerado pelo Google Sheets.

## 0.5.0

- PLAY único para GLB e gráfico do Google Sheets.
- Todos os clipes GLB começam juntos e executam uma única vez.
- Último frame das animações permanece fixo em tela.
- Removidos controles de loop, pausa e seleção individual de clipe.
- Adicionados atraso de início e duração da animação do gráfico.
- GLB e gráfico podem ser exibidos simultaneamente.
- Adicionados botões PLAY e Preparar na barra de programa.
- Adicionados endpoints `/play`, `/reset`, `/api/play` e `/api/play/reset`.
- Links de PLAY e Preparar disponíveis para Stream Deck.
- Playback sincronizado por timestamp entre painel e overlay.
- Migração de projetos v0.4 para reexibir o gráfico anteriormente ocultado automaticamente.

## 0.4.0

- Importação GLB/OBJ destacada na interface.
- Google Sheets substituiu a importação CSV.
- Todos os clipes GLB eram iniciados simultaneamente.
- Links reais das quatro câmeras virtuais e cortes.

## 0.3.0

- Importação de modelos GLB e OBJ.
- Quatro presets virtuais.
- Pontos de luz.
- Base PNG extrudida e gráfico de barras.
