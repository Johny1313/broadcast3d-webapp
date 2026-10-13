# Broadcast3D v0.8.5 — importar GLB diretamente de qualquer computador

O upload é feito **pelo navegador**, não por um caminho do PC do operador. Um arquivo local é enviado ao armazenamento persistente da sala Cloudflare; o estado salvo compartilha a URL no overlay do vMix e em outras máquinas que acessarem **o mesmo Worker e a mesma sala**.

## Funcionamento imediato, sem R2 (arquivos de até 12 MB)

1. Faça deploy deste ZIP como **Cloudflare Worker** com `npm install && npm run deploy` ou com o fluxo GitHub/Workers Builds já existente.
2. Acesse `https://SEU-WORKER.workers.dev/?room=studio` em qualquer computador conectado à internet.
3. No painel Modelo, clique em **Selecionar arquivo .GLB** ou arraste o GLB para o campo. Espere concluir **100%** e a confirmação de modelo salvo.
4. No segundo computador, abra a mesma URL de painel ou `https://SEU-WORKER.workers.dev/overlay?room=studio` (no vMix, use o overlay **sem** `preview=1`).
5. O upload fica salvo no Durable Object daquela sala e continua acessível após atualizar o navegador.

Apenas **GLB 2.0**, arquivo único com geometrias/texturas incorporadas. Não dependa de arquivos externos `.bin`, `.jpg` etc. O modelo deve conter os recursos necessários dentro do GLB. Arquivos OBJ continuam aceitos **por URL GitHub** como antes.

### Arquivos maiores: Cloudflare R2 até 48 MB

**Uma configuração por conta/Worker**, não por computador:

1. No Cloudflare, ative R2 (sujeito a regras/limites do plano) e crie o bucket chamado `broadcast3d-media`, ou execute `npx wrangler r2 bucket create broadcast3d-media` após `npx wrangler login`.
2. Faça deploy com `npm run deploy:r2`. Este comando usa `wrangler.r2.jsonc`, com o binding `MEDIA_BUCKET` já configurado para o mesmo Worker `broadcast3d-webapp`.
3. Confirme em `https://SEU-WORKER.workers.dev/api/health`: `"mediaStorage":"cloudflare-r2"` e `"maxUploadBytes":50331648`.
4. Reabra/recarregue o painel. O limite exibido será de 48 MB.

**Importante:** ao trocar de armazenamento da sala para R2, arquivos antigos já enviados ao Durable Object **continuam funcionando**. Não exclua a sala/Worker original; mantenha o mesmo nome de Worker/DO para conservar o estado anterior.

## Privacidade e acesso

- Configure um segredo de controle: `npx wrangler secret put CONTROL_TOKEN`, e informe-o no campo **Chave** do painel. O segredo **deve ficar no servidor**, nunca no HTML/JavaScript.
- Sem `CONTROL_TOKEN`, uploads e modificações da sala ficam abertos a qualquer pessoa que conheça o endereço; configure a chave antes de liberar a URL publicamente.
- As URLs dos arquivos são acessíveis pela sala sem autenticação para que o overlay carregue no vMix. Portanto, **não use GLBs confidenciais sem proteção adicional** (como autenticação via Cloudflare Access).
- Os arquivos ficam armazenados na infraestrutura Cloudflare vinculada ao Worker publicado; abrir `file://` ou iniciar um site estático não garante sincronização.

## Diagnóstico

- Erro **12 MB**: você está usando o armazenamento padrão. Ative R2 para aumentar a capacidade.
- Erro **chave inválida (401)**: insira a mesma chave do segredo `CONTROL_TOKEN` no painel e clique Conectar.
- Erro **GLB inválido**: reexporte como **glTF Binary (.glb), versão 2**, incorporando texturas, com cabeçalho/tamanho válidos.
- Upload conclui mas o modelo não aparece: abra `/overlay?room=studio&debug=1` e verifique erro de GLB. Confirme que o link do upload responde a 200 e possui `content-type: model/gltf-binary`.
- O modelo não aparece em outra máquina: verifique **origem do Worker**, **nome da sala** e se o upload concluiu e o estado foi salvo. O renderizador usa uma URL de nuvem, não `blob:` ou caminho de disco.
- `npm run check` faz verificações de integridade e testes de cabeçalho/stream do GLB via `node scripts/test-glb-upload.mjs`.

Nota: este pacote foi validado estaticamente e com testes unitários. **O deploy real na sua conta Cloudflare e o teste end-to-end multi-PC/vMix dependem das credenciais e infraestrutura da sua conta.**

## Exemplo para testar

Incluímos `samples/cubo-exemplo.glb`, um pequeno cubo com material azul e geometrias incorporadas, para testar a seleção de arquivos antes de usar seus próprios modelos.

**Windows:** use `deploy-cloudflare.bat` para o modo 12 MB, ou crie o bucket e use `deploy-cloudflare-r2.bat` para o modo 48 MB.
