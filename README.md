# CRM Base Premium — a matriz

> **Propriedade privada e segredo comercial.** Copyright © 2026 Sitacio Ossaka.
> Ver [AVISO-LEGAL.md](AVISO-LEGAL.md).

**Versão `v1.0.1` — Esta é A matriz da agência.**

Existe uma etiqueta só, e é de propósito: a que funciona. Etiqueta antiga numa
matriz é convite para alguém clonar a versão errada.

A carcaça de onde saem os produtos. Ela **não é um produto**: é tudo que todo
produto precisa e que ninguém quer escrever duas vezes.

Nasceu de uma área de membros premium que foi ao ar, vendeu e quebrou algumas
vezes. O produto saiu; ficou o que sobrevive a ele.

⚠️ **O `crm-base` antigo foi APOSENTADO** e a pasta local dele apagada, para não
haver duas matrizes. O histórico segue em `sitacioossaka-tech/crm-base`, só para
consulta — **não continue aquele repositório.**

## Como começar um produto a partir daqui

```
git clone https://github.com/sitacioossaka-tech/crm-base-premium.git meu-produto
cd meu-produto
rm -rf .git && git init          # história própria: a da matriz não é a sua
```

Depois, os passos abaixo. Os três primeiros são obrigatórios — a carcaça **não
sobe** sem eles, e é de propósito.

---

## Guia completo para começar do zero (para desenvolvedores juniores)

Este projeto já vem com a estrutura base pronta, mas ainda é necessário fazer
algumas configurações antes de poder abrir a aplicação e começar a trabalhar.

A seguir está um passo a passo simples, em ordem, para que você consiga:

- configurar o Git com SSH;
- instalar as dependências;
- configurar o projeto Firebase;
- rodar o projeto localmente;
- executar os testes;
- e entender o que fazer quando algo der errado.

### 1. Requisitos mínimos

Antes de começar, verifique se o seu computador tem tudo isso instalado:

- Git
- Node.js 22
- npm
- Visual Studio Code (opcional, mas recomendado)
- Uma conta no GitHub com acesso ao repositório

Se você não souber qual versão do Node está instalada, rode:

```powershell
node -v
npm -v
```

Se aparecer uma versão diferente da 22, instale a versão correta antes de
continuar. O projeto no `functions/package.json` exige Node 22.

### 2. Configurar Git com SSH (recomendado)

Para evitar erros de autenticação e facilitar o push, o ideal é usar SSH em vez
de HTTPS.

#### 2.1. Verificar se você já tem uma chave SSH

No PowerShell, rode:

```powershell
Get-ChildItem ~/.ssh
```

Se você já tiver arquivos como `id_ed25519.pub`, `id_rsa.pub` ou
`known_hosts`, pode reaproveitar uma chave existente. Caso contrário, siga para
criar uma nova.

#### 2.2. Criar uma nova chave SSH

```powershell
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
```

Você vai ver algo parecido com:

```text
Generating public/private ed25519 key pair.
Enter file in which to save the key (/c/Users/SeuUsuario/.ssh/id_ed25519):
```

Aperte Enter para aceitar o caminho padrão. Depois, escolha uma senha
(opcionalmente vazia) e confirme.

#### 2.3. Ver o conteúdo da chave pública

```powershell
Get-Content ~/.ssh/id_ed25519.pub
```

Isso vai mostrar uma linha começando com `ssh-ed25519 ...`.

#### 2.4. Adicionar a chave no GitHub

1. Abra o GitHub.
2. Vá em `Settings` → `SSH and GPG keys`.
3. Clique em `New SSH key`.
4. Dê um nome para a chave, por exemplo: `Meu PC - Windows`.
5. Cole o conteúdo da chave pública.
6. Salve.

#### 2.5. Testar a autenticação SSH

```powershell
ssh -T git@github.com
```

Se tudo estiver correto, você deve ver uma mensagem parecida com:

```text
Hi seu-usuario! You've successfully authenticated, but GitHub does not provide shell access.
```

Se aparecer `Permission denied (publickey)`, significa que a chave foi criada,
mas ainda não foi adicionada à conta certa do GitHub.

#### 2.6. Configurar o remote do repositório para SSH

No seu projeto, rode:

```powershell
git remote set-url origin git@github.com:Alpha-Valley-Technology/crm-base-premium.git
```

Depois, verifique:

```powershell
git remote -v
```

Você deve ver algo assim:

```text
origin  git@github.com:Alpha-Valley-Technology/crm-base-premium.git (fetch)
origin  git@github.com:Alpha-Valley-Technology/crm-base-premium.git (push)
```

#### 2.7. Testar acesso ao repositório

```powershell
git ls-remote --heads origin
```

Se esse comando funcionar, o GitHub já reconheceu sua chave e o repositório está
acessível.

### 3. Clonar o projeto

Se este for um clone novo do repositório, rode:

```powershell
git clone git@github.com:Alpha-Valley-Technology/crm-base-premium.git
```

Entre na pasta:

```powershell
cd crm-base-premium
```

> Se você estiver montando um produto novo a partir desta matriz, pode ser
> necessário iniciar um novo histórico do zero com:
>
> ```powershell
> rm -rf .git
> git init
> ```
>
> Isso é útil quando você vai transformar esta matriz em outro produto e não
> quer manter o histórico desta carcaça.

### 4. Instalar as dependências

O projeto tem duas partes: a raiz e a pasta `functions`.

Primeiro, instale as dependências da raiz:

```powershell
npm install
```

Depois, instale as dependências do backend:

```powershell
cd functions
npm install
cd ..
```

Se a instalação falhar, verifique:

- se o Node.js está na versão correta;
- se o npm está instalado;
- se você está na pasta correta;
- se a conexão com a internet está funcionando.

### 5. Configurar o projeto Firebase

Este projeto nasce com valores de demonstração. Antes de rodar, você precisa
preencher os dados reais do seu projeto Firebase.

#### 5.1. Arquivo `base/firebase.js`

Abra o arquivo `base/firebase.js` e substitua os valores de exemplo pelos dados
do seu projeto Firebase.

Esses valores ficam no console do Firebase em:

- `Configurações do projeto`
- `Seus aplicativos`
- `App web`

Você vai encontrar campos como:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `appId`

> Importante: estes dados são necessários para que o navegador possa
> inicializar o Firebase e se conectar ao projeto correto.

#### 5.2. Arquivo `.firebaserc`

Este arquivo define qual projeto será usado no deploy e nos emuladores.

Se o arquivo estiver vazio ou com dados de exemplo, ajuste o `projectId` para o
ID do seu projeto Firebase.

#### 5.3. Arquivo `config/marca.js`

Este arquivo define a identidade visual do produto, como o nome que aparece na
interface.

Edite o campo:

```js
nome: 'CRM Base Premium'
```

Troque para o nome do seu cliente ou do novo produto.

### 6. Configurar hooks do Git

Este projeto usa hooks para ajudar a manter a qualidade e evitar commits sem
checagens.

No projeto, rode:

```powershell
git config core.hooksPath .githooks
```

Isso ativa os hooks locais do repositório.

### 7. Rodar os testes

Antes de começar a escrever código no produto, vale rodar a suíte para confirmar
que a base está funcionando corretamente.

#### Testes unitários

```powershell
npm run test:unit
```

#### Testes de medida

```powershell
npm run test:medida
```

#### Testes de regras

```powershell
npm test
```

#### Rodar todos os testes de uma vez

```powershell
npm run test:tudo
```

> Os testes devem ficar verdes antes de você iniciar mudanças no produto.

### 8. Rodar o projeto localmente

Existem duas formas principais de rodar localmente.

#### 8.1. Iniciar emuladores do Firebase

```powershell
npm run serve
```

Esse comando sobe os emuladores necessários para o projeto rodar localmente,
como:

- Hosting
- Auth
- Firestore
- Functions
- Storage

#### 8.2. Rodar apenas os emuladores

```powershell
npm run emu
```

Se você precisa ver logs de execução e acompanhar os serviços em background, esse
comando pode ser útil.

### 9. Comandos úteis do projeto

Aqui estão alguns comandos que você vai usar bastante:

```powershell
npm run serve
npm run emu
npm run test:unit
npm run test:medida
npm test
npm run test:tudo
npm run portao
```

#### `npm run portao`

Esse comando é importante para o deploy. Ele valida se a árvore de arquivos está
em uma condição segura para publicar.

### 10. Rodar o projeto em browser

Depois que os emuladores estiverem ativos, abra o projeto no navegador usando a
porta local do hosting ou do emulador configurado.

O comportamento pode variar conforme a configuração do ambiente, mas a ideia é
que o app rode localmente e você consiga testar a interface e as integrações.

### 11. Dicas de troubleshooting

#### Problema: `Permission denied (publickey)`

Solução:

1. Gere a chave SSH novamente, se necessário.
2. Copie a chave pública.
3. Adicione a chave no GitHub na conta correta.
4. Teste com:

```powershell
ssh -T git@github.com
```

#### Problema: `fatal: unable to access ... 403`

Isso normalmente significa que a conta do GitHub usada no momento não tem acesso
ao repositório ou a autenticação está errada.

Solução:

- verificar o `remote` atual com `git remote -v`;
- confirmar que o `origin` está em SSH;
- confirmar que a conta GitHub tem permissão de escrita.

#### Problema: `Node.js` ou `npm` com versão errada

Use:

```powershell
node -v
npm -v
```

E ajuste a instalação para a versão correta antes de continuar.

#### Problema: `base/firebase.js` ainda vazio

O projeto nasce com valores de demonstração. Se esse arquivo não foi preenchido,
algumas telas podem quebrar ou a aplicação pode não conectar corretamente ao
Firebase.

#### Problema: a aplicação não abre localmente

Verifique:

- se os emuladores estão rodando;
- se o `projectId` está correto;
- se `base/firebase.js` foi preenchido;
- se o `npm install` foi concluído corretamente.

### 12. Boas práticas para quem vai trabalhar neste projeto

- Sempre mantenha o `git status` limpo antes de fechar a sessão.
- Faça commits pequenos e com mensagens claras.
- Leia os documentos em `docs/` antes de alterar comportamentos importantes.
- Não publique nada sem testar primeiro.
- Antes de fazer deploy, rode os testes e o portão de segurança.

### 13. Checklist rápido de primeira configuração

Se você quiser uma lista rápida do que fazer na primeira vez:

```powershell
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
Get-Content ~/.ssh/id_ed25519.pub
ssh -T git@github.com
npm install
cd functions
npm install
cd ..
# preencher base/firebase.js
# preencher .firebaserc
# ajustar config/marca.js
# ativar hooks
git config core.hooksPath .githooks
npm run test:tudo
npm run serve
```

---

## O que ela entrega, pronto

|                     |                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Entrada**         | Google e e-mail/senha. Primeiro acesso e "esqueci a senha" são o mesmo caminho.         |
| **Papéis**          | `membro`, `gestor` e `admin`, cobrados em três camadas: barra, tela e regra do banco.   |
| **Primeiro acesso** | A primeira pessoa a entrar num banco vazio vira admin. Depois, só por convite.          |
| **Equipe**          | Cadastrar, promover, desativar e remover — com o aviso de cobrança pendente já escrito. |
| **Identidade**      | Logo, cores, fontes, tema claro/escuro e imagem de entrada, tudo pelo painel.           |
| **Avisos**          | O sino, e o painel que escreve nele.                                                    |
| **Suporte**         | Botões de contato na entrada e na tela de porta fechada.                                |
| **Cofre**           | `/segredos/**` que nem o admin lê pelo navegador — só as Cloud Functions.               |
| **Módulos**         | Registro, barra lateral recolhível e roteamento por endereço (`#/modulo/aba`).          |
| **Segurança**       | CSP sem `unsafe-inline`, cabeçalhos, e três portões antes de publicar.                  |
| **Testes**          | 248 de tela · 20 de medida · 144 de regras · 82 de servidor.                            |

---

## Começando um produto novo

Nesta ordem. Os três primeiros são obrigatórios — a carcaça **não sobe** sem
eles, e é de propósito:

1. **`base/firebase.js`** — os dados do SEU projeto Firebase. Nasce vazio e
   estoura na primeira tela enquanto estiver assim.
2. **`.firebaserc`** — o projeto de deploy. Também vazio.
3. **`config/marca.js`** — o nome que aparece na tela.
4. `npm install && cd functions && npm install && cd ..`
5. `git config core.hooksPath .githooks` — liga os hooks (eles não vêm ligados
   numa cópia nova; ver `docs/DEPLOY-E-SEGURANCA.md`).
6. `npm run test:tudo` — tem que estar verde antes de você escrever a primeira
   linha do seu produto.

7. **Publique e ENTRE VOCÊ, imediatamente.** A primeira pessoa que fizer login
   num banco vazio vira admin — é o que dispensa abrir um terminal para criar o
   primeiro dono. Fechada essa janela, ela não reabre. Não mande o endereço para
   ninguém antes de fazer isso. (Detalhes em `docs/decisoes.md`.)

Depois, pendure o primeiro módulo em `modules/modulos.config.js`. O passo a
passo está no comentário no topo daquele arquivo.

---

## Leia antes de construir

| Arquivo                            | Para quê                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **`CLAUDE.md`, Bloco 00**          | Como se opera aqui: commitar por etapa, não publicar o que não está commitado, atualizar a base antes de fechar. |
| **`docs/PLAYBOOK-DA-CARCACA.md`**  | As armadilhas que custaram tempo. Leia antes, não depois.                                                        |
| **`docs/decisoes.md`**             | O que foi decidido fora do padrão, e por quê.                                                                    |
| **`docs/DEPLOY-E-SEGURANCA.md`**   | Os três portões, e a saída de emergência.                                                                        |
| **`docs/BACKUP-E-RESTAURACAO.md`** | Backup dos dados e do código — são dois, e nenhum vale sozinho.                                                  |

---

## Os comandos

```
npm run test:unit      # tela, em jsdom          (~7s)
npm run test:medida    # geometria e CSP, Chrome (~25s)
npm test               # regras, sobe emulador
npm run test:tudo      # os três acima
cd functions && npm test

npm run serve          # emuladores
npx firebase deploy    # passa pelos portões antes de subir
```
No projeto isso está documentado em AMBIENTE-LOCAL-DOCKER.md, com comandos como:

npm run docker:subir
npm run docker:logs
npm run docker:testar