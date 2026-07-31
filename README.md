# Broadcast3D Cloud v0.4.0

Webapp para renderizar uma cena 3D com fundo transparente sobre o PGM do vMix, usando GitHub + Cloudflare Workers.

## Fluxo principal

1. Importe um modelo **GLB** ou **OBJ**.
2. Ajuste a posição, rotação, escala e iluminação.
3. Salve os quatro enquadramentos virtuais.
4. Copie os links reais de câmera e corte para vMix/Stream Deck.
5. Conecte um Google Sheets público para atualizar o gráfico nativo opcional.

## Mudanças da versão 0.4.0

- Interface reorganizada em seis áreas claras: Modelo, Câmeras, Luzes, Sheets, Gráfico e Links.
- Upload GLB/OBJ sempre visível no topo, coluna esquerda e painel Modelo.
- Ao importar GLB ou OBJ:
  - o modelo fica visível;
  - o gráfico nativo é ocultado automaticamente;
  - o modelo é apoiado diretamente no chão;
  - o painel abre nos controles do modelo.
- Em arquivos GLB, **todos os clipes de animação são iniciados simultaneamente no tempo zero**.
- Cada clipe mantém seus próprios keyframes e duração.
- Controles globais de play/pausa, loop, velocidade e reinício no tempo zero.
- Não existe seleção de animação por camada ou por clipe.
- Importação de CSV removida da interface.
- Integração com Google Sheets por link público.
- Atualização manual ou automática, com intervalo configurável.
- Colunas reconhecidas automaticamente:
  - `nome` e `valor` — obrigatórias;
  - `cor` e `imagem` — opcionais.
- O overlay também consulta o Sheets, portanto pode atualizar mesmo sem o painel do operador aberto.
- Links amigáveis e reais:
  - `/camera/1` até `/camera/4`;
  - `/cut/1` até `/cut/4`;
  - `/program.html` para o overlay dinâmico.

## Google Sheets

A planilha precisa estar compartilhada como:

```text
Qualquer pessoa com o link → Leitor
```

Não é necessário gerar ou importar um arquivo CSV. Cole o link normal da planilha, por exemplo:

```text
https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit#gid=0
```

Estrutura recomendada:

| nome | valor | cor | imagem |
|---|---:|---|---|
| Candidato A | 42 | #3567d7 | https://.../foto-a.png |
| Candidato B | 35 | #e34f59 | https://.../foto-b.png |

O campo `imagem` deve usar uma URL HTTPS acessível publicamente.

Nesta versão, planilhas privadas com OAuth ou conta de serviço não estão implementadas.

## Modelos 3D

### GLB

Formato recomendado. Pode incluir geometria, materiais, texturas, rig, morph targets e animações no mesmo arquivo.

Ao carregar o GLB, o aplicativo cria um relógio global e reproduz todos os clipes encontrados. Clipes com durações diferentes terminam ou reiniciam conforme seus próprios tempos.

### OBJ

Importado como geometria estática. Arquivos MTL e texturas externas não são carregados automaticamente. Para preservar materiais e animações, exporte como GLB.

## Desenvolvimento local

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Painel:

```text
http://localhost:8787/?room=studio
```

Overlay dinâmico:

```text
http://localhost:8787/program.html?room=studio
```

Câmeras virtuais fixas:

```text
http://localhost:8787/camera/1?room=studio
http://localhost:8787/camera/2?room=studio
http://localhost:8787/camera/3?room=studio
http://localhost:8787/camera/4?room=studio
```

Cortes para Stream Deck:

```text
http://localhost:8787/cut/1?room=studio
http://localhost:8787/cut/2?room=studio
http://localhost:8787/cut/3?room=studio
http://localhost:8787/cut/4?room=studio
```

## Deploy no Cloudflare

```bash
npm install
npx wrangler login
npm run deploy
```

Também é possível conectar o repositório GitHub ao Cloudflare para publicar a cada push.

## vMix

Adicione o overlay como **Web Browser Input**:

```text
https://SEU-WORKER.workers.dev/program.html?room=studio
```

Use 1920×1080, áudio desativado e mantenha a entrada em um Overlay sobre o PGM.

## Stream Deck

Cada botão de câmera pode executar uma Multi Action:

1. Cortar a câmera física no vMix.
2. Abrir em segundo plano o link `/cut/N?room=studio`.

A aba **Links** gera os endereços usando o domínio, sala e chave atuais.
