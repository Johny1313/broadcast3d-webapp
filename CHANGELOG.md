# Changelog

## 0.4.0

- Interface reorganizada para destacar Modelo, Câmeras, Luzes, Google Sheets, Gráfico nativo e Links.
- Importação GLB/OBJ disponível em três pontos visíveis da interface.
- Todos os clipes do GLB passam a tocar simultaneamente, usando um único relógio global.
- Removida a seleção de clipe individual.
- Adicionados play/pausa global, loop, velocidade e reinício de todas as animações no tempo zero.
- Importar GLB ou OBJ oculta automaticamente o gráfico nativo.
- O modelo passa a apoiar no chão quando o gráfico nativo está oculto.
- Importação CSV removida.
- Google Sheets passa a ser a fonte de dados do gráfico nativo.
- Leitura de planilhas públicas via endpoint `/api/sheets` no Worker.
- Atualização manual e automática com intervalo configurável.
- Colunas `nome`, `valor`, `cor` e `imagem` reconhecidas automaticamente.
- O overlay consulta o Google Sheets independentemente do painel do operador.
- Links reais `/camera/1..4` e `/cut/1..4` mantidos e destacados.
- Estado migrado para a versão 4.

## 0.3.1

- Upload GLB/OBJ promovido para uma ação rápida sempre visível.
- Link real da câmera selecionada exibido dentro do painel Câmera.
- Botão Copiar link em cada cartão de câmera.
- Janela com todos os links de câmera e corte.
- Rotas amigáveis `/camera/1..4` e `/cut/1..4`.

## 0.3.0

- Importação de modelos `.glb` e `.obj`.
- Posição, rotação e escala do modelo por sliders.
- Até oito pontos de luz.
- Quatro presets virtuais com yaw, pitch, distância, FOV e alvo XYZ.
- Base PNG transparente extrudida.
