# Teste rápido da v0.8.4

1. Abra `/api/health`.
2. Confirme `version: 0.8.4` e `mediaStorage: github-release-url`.
3. Abra o painel com `?room=studio`.
4. Cole a URL do GLB publicado em um GitHub Release.
5. Aguarde a mensagem com a quantidade de objetos e animações.
6. Abra `/overlay?room=studio&debug=1`.
7. O diagnóstico deve informar `GLB OK`.
8. Clique em **Preparar**.
9. Clique em **PLAY**.
10. Confirme que as animações terminam e permanecem no último frame.
11. No vMix, use `/overlay?room=studio`, sem `preview=1`.

## Teste do gráfico integrado ao GLB

1. Carregue um GLB com piso, mapa ou plataforma.
2. Ative o gráfico e ajuste **Altura inicial das barras** até encostar no objeto do GLB.
3. Ajuste a opacidade para 50% e confirme que as barras continuam animando.
4. Ative e desative **Exibir nomes**.
5. Ative **Usar imagens da planilha** e confirme que somente itens com URL válida recebem imagem.
6. Ajuste separadamente a escala dos nomes e das imagens.
7. Clique em **Preparar** e depois em **PLAY**.

## Erros comuns

### O GLB não abre

Confirme que o arquivo foi anexado a um GitHub Release e que a URL termina em `.glb` ou `.obj`.

### `/api/health` retorna 404

O projeto foi publicado como Pages/site estático. Publique como Cloudflare Worker.

### O PLAY funciona no painel, mas não no overlay

Confirme que ambos usam a mesma sala e que o link do vMix não contém `preview=1`.
