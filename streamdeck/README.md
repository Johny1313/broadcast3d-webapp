# Stream Deck

A aba **Links** do painel gera links reais usando o domínio atual, a sala e a chave.

Exemplo:

```text
https://SEU-WORKER.workers.dev/cut/1?room=studio&token=SUA_CHAVE
```

No Stream Deck, use uma ação Website configurada para executar o GET em segundo plano.

Fluxo recomendado por botão:

1. Cortar a câmera física no vMix.
2. Executar o link `/cut/N` do Broadcast3D.

Os arquivos BAT desta pasta são exemplos para operação local e devem ter domínio, sala e chave ajustados antes do uso.


## PLAY geral

Use a ação Website em segundo plano com:

- `https://SEU-DOMINIO/play?room=studio&token=SUA_CHAVE`
- `https://SEU-DOMINIO/reset?room=studio&token=SUA_CHAVE`

O PLAY inicia o GLB e o gráfico do Google Sheets juntos. O reset prepara ambos no tempo zero.
