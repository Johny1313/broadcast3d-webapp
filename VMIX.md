# Uso no vMix

## Overlay dinâmico

No vMix:

1. `Add Input`.
2. `Web Browser`.
3. Cole o endereço mostrado em **Overlay dinâmico para vMix**.
4. Configure 1920 × 1080.
5. Desative áudio.
6. Use o input em Overlay 1, 2, 3 ou 4 sobre o PGM.

O fundo do `program.html` é transparente.

## Quatro perspectivas

O mesmo objeto fica fixo no espaço 3D. Cada preset salva uma câmera virtual independente:

- CAM 1 — enquadramento A;
- CAM 2 — enquadramento B;
- CAM 3 — enquadramento C;
- CAM 4 — enquadramento D.

O Stream Deck deve realizar duas ações no mesmo botão:

1. cortar a câmera física no vMix;
2. executar o link de corte do mesmo número no Broadcast3D.

## Links fixos

Também são gerados quatro links `program.html?camera=N`. Eles mantêm uma perspectiva específica, independentemente do corte ativo, e servem para teste ou para criar quatro Browser Inputs separados.

## Transições

Para manter a correspondência de perspectiva durante o gráfico, priorize CUT entre câmeras. Uma dissolvência mistura duas imagens físicas enquanto o overlay dinâmico utiliza apenas uma perspectiva por vez.
