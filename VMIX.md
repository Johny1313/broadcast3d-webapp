# vMix — uso como overlay sobre o PGM

## Entrada principal

```text
Add Input → Web Browser
```

Use o link LIVE:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio
```

Configuração:

```text
1920 × 1080
Áudio desativado
Entrada usada como Overlay sobre o PGM
```

O link LIVE fica transparente quando a cena está preparada. O conteúdo aparece quando o operador dispara o PLAY.

## Teste antes de adicionar ao vMix

Use no Chrome ou Edge:

```text
https://SEU-WORKER.workers.dev/overlay?room=studio&preview=1&debug=1
```

Esse link ignora o estado de preparação e mostra o resultado final para conferência.

## Câmeras virtuais

```text
/camera/1?room=studio
/camera/2?room=studio
/camera/3?room=studio
/camera/4?room=studio
```

## Stream Deck

```text
/cut/1?room=studio&token=SUA_CHAVE
/cut/2?room=studio&token=SUA_CHAVE
/cut/3?room=studio&token=SUA_CHAVE
/cut/4?room=studio&token=SUA_CHAVE
/play?room=studio&token=SUA_CHAVE
/reset?room=studio&token=SUA_CHAVE
```

## Google Sheets

A conexão e a validação acontecem no painel do operador. Quando a leitura é concluída, os itens são salvos no estado da sala e enviados ao overlay por WebSocket.

## Sequência de operação do PLAY

1. Mantenha o Browser Input carregado com `/overlay?room=studio`.
2. Clique em **Preparar** no painel antes de colocar o gráfico no ar.
3. Ative o Browser Input no Overlay do vMix.
4. Clique em **PLAY**.
5. Após a entrada, os elementos permanecem no último frame.
6. Use **Ocultar cena** para retirar o gráfico.
7. Para repetir, use **Preparar** e depois **PLAY** novamente.

O endereço com `preview=1&debug=1` serve somente para conferência visual e não deve ser usado como input de programa.
