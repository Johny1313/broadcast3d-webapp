# Deploy com GitHub e Cloudflare

## 1. Criar o repositório GitHub

Extraia o ZIP, abra um terminal na pasta e execute:

```bash
git init
git add .
git commit -m "Versão inicial do Broadcast3D Cloud"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/broadcast3d-webapp.git
git push -u origin main
```

Também é possível criar o repositório pela interface do GitHub e enviar os arquivos pelo GitHub Desktop.

## 2. Importar o repositório no Cloudflare

No painel Cloudflare:

1. Abra **Workers & Pages**.
2. Selecione **Create application**.
3. Escolha **Import a repository**.
4. Conecte o GitHub e selecione o repositório.
5. Use o nome de Worker `broadcast3d-webapp`, igual ao campo `name` de `wrangler.jsonc`.
6. Build command: `npm run check`.
7. Deploy command: `npx wrangler deploy`.
8. Salve e faça o primeiro deploy.

O Worker publica os arquivos estáticos, a API e o Durable Object na mesma implantação.

## 3. Criar a chave de controle

No Worker publicado:

1. Abra **Settings**.
2. Entre em **Variables and Secrets**.
3. Crie um secret chamado `CONTROL_TOKEN`.
4. Use uma chave longa e aleatória.
5. Faça um novo deploy quando solicitado.

Sem esse secret, qualquer pessoa que conheça a sala pode alterar o projeto.

## 4. Abrir o sistema

Substitua o domínio pelo endereço retornado no deploy:

```text
Painel:
https://broadcast3d-webapp.SEUSUBDOMINIO.workers.dev/?room=studio

Overlay:
https://broadcast3d-webapp.SEUSUBDOMINIO.workers.dev/program.html?room=studio
```

Digite a chave apenas no painel. Ela fica armazenada localmente no navegador do operador e não é colocada no link do overlay.

## 5. Atualizações automáticas

Depois que a integração Git estiver ativa, cada push na branch de produção inicia uma nova compilação e implantação. Pull requests podem receber versões de preview conforme a configuração do Workers Builds.

## Deploy manual alternativo

```bash
npm install
npx wrangler login
npm run deploy
```

## Domínio personalizado

Após validar o `workers.dev`, configure um Custom Domain nas rotas do Worker, por exemplo:

```text
graficos.seudominio.com
```

Mantenha o painel e o overlay no mesmo domínio para evitar problemas com carregamento de imagens e WebSocket.
