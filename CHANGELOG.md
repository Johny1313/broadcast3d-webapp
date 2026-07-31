# Changelog

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
