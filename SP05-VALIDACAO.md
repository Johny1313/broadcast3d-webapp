# Validação do arquivo SP05.glb

Arquivo inspecionado durante a correção da v0.7.0.

## Estrutura

```text
Formato: GLB 2.0
Tamanho: 33.396.672 bytes
Cenas: 1
Nós: 18
Malhas: 16
Vértices aproximados: 607.167
Triângulos aproximados: 362.084
Materiais: 4
Imagens PNG incorporadas: 2
Animações: 18
Extensões obrigatórias: nenhuma
```

## Transparência

As duas imagens estão incorporadas ao GLB como PNG RGBA. Os materiais correspondentes usam:

```text
alphaMode: BLEND
doubleSided: true
```

A v0.7.0 mantém esses materiais e desativa a escrita de profundidade nos materiais de mistura, evitando retângulos opacos e problemas comuns de sobreposição.

## Animação

A cena começa com vários objetos em escala zero. Por isso, a centralização não pode ser calculada apenas no frame inicial.

A v0.7.0:

1. carrega todas as 18 animações;
2. avalia temporariamente o último frame;
3. calcula o centro e o chão pela pose final;
4. retorna ao frame zero;
5. aguarda o PLAY;
6. congela cada clipe no respectivo último frame.

## Teste de transporte

O arquivo completo foi enviado e recuperado pela nova rota simulada de R2, mantendo exatamente os 33.396.672 bytes e o cabeçalho GLB original.
