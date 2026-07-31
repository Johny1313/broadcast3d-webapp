# Changelog

## 0.8.2

- Corrigido o PLAY do painel que podia chegar ao overlay antes do GLB terminar de carregar.
- O overlay agora mantém o comando pendente e começa no frame zero somente quando GLB e gráfico estiverem prontos.
- O tempo da animação passou a ser local ao renderer, evitando saltos para o último frame por atraso de rede ou carregamento.
- O link `preview=1&debug=1` foi separado como prévia final e não é usado para reprodução ao vivo.
- Adicionados estados de diagnóstico: PREPARADO, aguardando GLB/gráfico e PLAY NO AR.
- PLAY repetido reinicia todas as animações do zero sem exigir recarregar o overlay.

## 0.8.1

- Adicionada opção para habilitar/desabilitar Google Sheets/CSV.
- Ao desabilitar, a leitura automática para e o gráfico gerado é ocultado sem apagar os dados.
- Adicionado mapeamento automático/manual da coluna `indice` como escala das barras.
- Configurada a planilha padrão do projeto.

## 0.8.0

- Campo de intervalo A1 para limitar linhas e colunas do Google Sheets.
- Modo automático por cabeçalho e modo manual por letras de coluna.
- Configuração independente das colunas de nome, valor, cor e imagem.
- Opção para considerar ou não a primeira linha do intervalo como cabeçalho.
- Persistência da seleção por sala e uso da mesma configuração no auto-refresh.
- Mensagens de erro específicas para intervalo vazio ou coluna fora da seleção.

## 0.7.0

- Corrigido o upload de GLBs grandes, incluindo `SP05.glb`.
- Upload deixou de usar Base64/JSON e passou a enviar binário diretamente.
- Arquivos de mídia agora são armazenados no Cloudflare R2.
- Adicionado progresso real de upload e carregamento.
- Centralização do modelo passa a usar a pose final das animações.
- Preservados materiais e PNGs transparentes incorporados ao GLB.
- Planos transparentes não geram mais sombras retangulares.
- Mensagens de diagnóstico foram adicionadas ao painel e ao overlay de teste.
- Limite do estado do Durable Object corrigido para permanecer abaixo do limite por valor.

## 0.6.0

- Corrigida a rota do overlay para responder diretamente em `/overlay`.
- Adicionado overlay de teste com `preview=1&debug=1`.
- Adicionado diagnóstico `/api/overlay-check`.
- Google Sheets agora é sincronizado e persistido por `/api/sheets/sync`.
- Adicionados fallbacks `export`, `gviz` e `pub`.
- Parser aceita vírgula, ponto e vírgula e tabulação.
- Detecção automática de colunas de nome e valor.
- O operador mostra a cena final enquanto o overlay LIVE aguarda o PLAY.
- Mensagem explícita quando o projeto foi publicado como site estático em vez de Worker.
- Validação passou a executar `node --check` em todos os JavaScripts.

## 0.5.1

- GLB congelado no último frame após o término das animações.
