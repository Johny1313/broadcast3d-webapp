# Uso como overlay no vMix

## Entrada do overlay

No vMix:

1. Selecione **Add Input**.
2. Escolha **Web Browser**.
3. Cole o endereço:

```text
https://SEU-DOMINIO/program.html?room=studio
```

4. Use a resolução do projeto, normalmente 1920 × 1080.
5. Desative áudio dessa entrada.
6. Mantenha a entrada como Overlay sobre o PGM.

A página possui fundo transparente e mostra somente a base PNG, barras, textos e imagens.

## Operação das quatro câmeras

A relação deve ser fixa:

```text
Câmera física 1 → perspectiva virtual 1
Câmera física 2 → perspectiva virtual 2
Câmera física 3 → perspectiva virtual 3
Câmera física 4 → perspectiva virtual 4
```

Calibre cada preset usando um frame da respectiva câmera como guia e salve o enquadramento.

## Stream Deck

Use uma Multi Action para cada câmera:

1. Ação vMix para cortar a câmera física.
2. Ação System/Open apontando para o BAT correspondente em `streamdeck`.

Edite nos BAT:

```bat
set BASE_URL=https://SEU-DOMINIO
set ROOM=studio
set TOKEN=SUA_CHAVE
```

## Transições

Com o gráfico no ar, use CUT entre as câmeras. Em uma dissolvência, o PGM mistura dois enquadramentos físicos enquanto o overlay só consegue exibir uma perspectiva virtual.
