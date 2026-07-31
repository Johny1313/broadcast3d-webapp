# Teste rápido após o deploy

1. Abra `/api/health` e confirme `version: 0.6.0`.
2. Abra o painel com `?room=studio`.
3. Cole uma planilha pública com colunas `nome` e `valor`.
4. Clique em **Conectar**.
5. Confirme a quantidade de linhas no painel.
6. Abra **Links reais → Testar backend + abrir overlay**.
7. O link de teste deve mostrar `Overlay OK` no canto inferior.
8. No vMix, use o link LIVE `/overlay?room=studio`.
9. Clique em **Preparar** e depois **PLAY**.

Se `/api/health` retornar 404, o projeto foi publicado como Pages/site estático. Refazer o deploy como Cloudflare Worker.
