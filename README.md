# Broadcast3D Cloud v0.3.0

Webapp para gerar gráficos 3D transparentes sobre o PGM do vMix, publicado com GitHub + Cloudflare Workers.

## Novidades desta versão

- Importação de **GLB** com materiais, texturas e animações incorporadas.
- Importação de **OBJ** como geometria estática.
- Controle de reprodução, loop, velocidade e seleção de clipe de animação GLB.
- Posição, rotação e escala do modelo 3D por sliders.
- Até 8 pontos de luz ajustáveis por cor, intensidade, alcance e posição XYZ.
- Controle de luz ambiente, luz principal e sombra de contato.
- Presets das quatro câmeras virtuais controlados por sliders de yaw, pitch, distância, FOV e alvo XYZ.
- Campos numéricos de precisão para yaw, pitch, distância e FOV.
- Links reais gerados automaticamente para Stream Deck após o deploy.
- Link fixo de cada câmera virtual e link de corte de cada preset.
- Botões para copiar, testar e abrir cada link.
- Upload de mídia ampliado para até 48 MB.

## Formatos 3D

### GLB

É o formato recomendado. Pode conter em um único arquivo:

- geometria;
- materiais;
- texturas;
- esqueleto;
- animações.

### OBJ

Nesta versão, OBJ é importado somente como geometria estática. Arquivos MTL e texturas externas não são carregados em conjunto. Para preservar materiais e animações, converta para GLB.

## Estrutura

```text
public/
├── index.html              painel do operador
├── program.html            overlay transparente para vMix
├── js/
│   ├── operator.js
│   ├── program.js
│   ├── cloud.js
│   └── renderer3d.js       Three.js + GLTFLoader + OBJLoader
└── assets/
src/
└── index.js                Worker + Durable Object
```

## Desenvolvimento local

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:8787/?room=studio
```

Overlay:

```text
http://localhost:8787/program.html?room=studio
```

## Deploy no Cloudflare

```bash
npm install
npx wrangler login
npm run deploy
```

Também é possível conectar o repositório no painel **Workers & Pages** para publicar automaticamente a cada push no GitHub.

## vMix

Adicione o overlay como **Web Browser Input**:

```text
https://SEU-WORKER.workers.dev/program.html?room=studio
```

Use 1920×1080, áudio desativado e mantenha o Browser Input em um Overlay sobre o PGM.

## Stream Deck

Na aba **Stream Deck**, o painel gera os endereços usando o domínio real em que o app está aberto.

Para cada câmera:

- `Link de corte`: ativa o preset virtual no overlay dinâmico.
- `Link da câmera virtual fixa`: abre o overlay travado naquele preset.

No Stream Deck, use a ação **Website** e ative a execução de GET em segundo plano para o link de corte.

## Observação sobre o Three.js

O projeto fixa o Three.js na versão `0.185.1` através de import map, evitando mudanças inesperadas de versão durante a operação.
