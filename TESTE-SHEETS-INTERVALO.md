# Teste — linhas e colunas do Google Sheets

## Planilha de exemplo

Monte uma aba com esta estrutura:

```text
A        B          C      D       E        F
ID       Candidato  Nota   Valor   Cor      Imagem
1        Ana        x      42      #3567d7 https://.../ana.png
2        Beto       x      35      #e34f59 https://.../beto.png
3        Cris       x      18      #10a9a6 https://.../cris.png
```

## Leitura manual

1. Cole o link público da planilha.
2. Informe o GID da aba.
3. Em **Linhas e colunas — intervalo A1**, use `B1:F4`.
4. Selecione **Manual por letra da coluna**.
5. Marque **A primeira linha do intervalo é cabeçalho**.
6. Configure:
   - Nome: `B`
   - Valor: `D`
   - Cor: `E`
   - Imagem: `F`
7. Clique em **Conectar e ler**.

Resultado esperado: três itens, usando somente as linhas 2 a 4 e as colunas B, D, E e F.

## Leitura automática

Use uma tabela com cabeçalhos `nome`, `valor`, `cor` e `imagem`, selecione um intervalo como `A1:D10` e mantenha **Automática pelo cabeçalho**.

## Intervalos aceitos

- `A2:F20` — linhas e colunas delimitadas;
- `B:D` — somente as colunas B a D;
- `3:12` — somente as linhas 3 a 12;
- vazio — aba inteira.
