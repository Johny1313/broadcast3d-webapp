# Teste rápido da v0.8.2

1. Abra `/api/health`.
2. Confirme `version: 0.8.2` e `mediaBucket: true`.
3. Abra o painel com `?room=studio`.
4. Importe `SP05.glb`.
5. Acompanhe o progresso de upload até 100%.
6. Aguarde a mensagem com a quantidade de objetos e animações.
7. Abra `/overlay?room=studio&preview=1&debug=1`.
8. O diagnóstico deve informar `GLB OK`.
9. Clique em **Preparar**.
10. Clique em **PLAY**.
11. Confirme que todas as animações terminam e permanecem no último frame.
12. No vMix, use `/overlay?room=studio`.

## Erros comuns

### `MEDIA_BUCKET não configurado`

Crie o bucket:

```bash
npx wrangler r2 bucket create broadcast3d-media
```

Depois publique novamente.

### Upload chega a 100%, mas o GLB não aparece

Abra o link de diagnóstico com `preview=1&debug=1`. Ele exibirá o erro HTTP ou de parsing do modelo.

### `/api/health` retorna 404

O projeto foi publicado como Pages/site estático. Publique como Cloudflare Worker.


## Teste específico do PLAY

1. Abra o LIVE `/overlay?room=studio` em uma janela.
2. Em outra janela, abra o painel da mesma sala.
3. Importe/carregue o GLB e aguarde a mensagem de modelo pronto.
4. Clique em **Preparar**.
5. Clique em **PLAY**.
6. Confirme que a animação começa do frame zero no LIVE.
7. Recarregue o LIVE enquanto o estado estiver em PLAY e confirme que ele aguarda o modelo carregar antes de iniciar do zero.
8. Confirme que `/overlay?room=studio&preview=1&debug=1` mostra a cena final e não é o link usado no vMix.
