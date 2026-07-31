# Uso no vMix

## Overlay principal

Adicione uma entrada:

```text
Add Input → Web Browser
```

URL:

```text
https://SEU-WORKER.workers.dev/program.html?room=studio
```

Configuração recomendada:

```text
1920 × 1080
Áudio desativado
Fundo transparente
```

Mantenha essa entrada em um Overlay sobre o PGM.

## Quatro câmeras virtuais

O overlay dinâmico usa a perspectiva ativa da sala. Os links de corte são:

```text
/cut/1?room=studio
/cut/2?room=studio
/cut/3?room=studio
/cut/4?room=studio
```

As saídas fixas, úteis para conferência, são:

```text
/camera/1?room=studio
/camera/2?room=studio
/camera/3?room=studio
/camera/4?room=studio
```

## GLB animado

Ao importar um GLB, o gráfico nativo é ocultado e todas as animações incorporadas começam juntas no tempo zero. O botão de reinício envia um novo estado para a sala e reinicia também o overlay do vMix.

## Google Sheets

O overlay consulta a planilha pública no intervalo configurado. Assim, os dados do gráfico nativo opcional continuam atualizando mesmo que o painel do operador seja fechado.


## PLAY da cena

O overlay permanece aberto no vMix. Para iniciar simultaneamente o GLB e o gráfico do Google Sheets, use:

```text
https://SEU-WORKER.workers.dev/play?room=studio&token=SUA_CHAVE
```

Para retornar ambos ao tempo zero:

```text
https://SEU-WORKER.workers.dev/reset?room=studio&token=SUA_CHAVE
```

As animações não entram em loop e o último frame permanece na tela.
