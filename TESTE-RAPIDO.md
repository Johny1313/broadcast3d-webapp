# Teste rápido v0.8.5 (upload direto)

1. Publique a nova versão com `npm run deploy` e confirme `/api/health` (`version: 0.8.5`, `maxUploadBytes: 12582912`). Para R2, use `npm run deploy:r2` e confira `maxUploadBytes: 50331648`.
2. Abra a sala no computador A, clique em **Selecionar arquivo .GLB**, selecione um GLB 2.0 pequeno e aguarde 100%.
3. Confirme que o modelo aparece na prévia. Abra o overlay da **mesma sala** em outro computador; ele deve abrir o mesmo modelo.
4. Use **Preparar**, **PLAY**, corte de câmeras, materiais/iluminação e dados do Sheets como antes.
5. Teste um GLB malformado (deve apresentar erro) e um arquivo maior que o limite do armazenamento (deve apresentar erro claro).
6. Recarregue os dois navegadores: o modelo deve continuar salvo e visível.

---

## Teste anterior da v0.8.4

1. Abra `/api/health`.
2. Confirme `version: 0.8.5` e `mediaStorage: durable-object-small-glb` (sem R2).
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
