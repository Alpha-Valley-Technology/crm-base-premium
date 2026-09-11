# Deploy e Segurança — CRM Base

Este arquivo resume o que fazer pra colocar a Base no ar e as notas de segurança
que vieram do review final da branch.

## ✅ O que já está pronto e testado

A Base foi construída e **validada no navegador de verdade** (emuladores + Playwright):
login (email/senha) → criação segura do 1º admin no servidor → shell com menu filtrado
por papel → módulos → chamada de IA pelo servidor (chave protegida) → banco → gestão de
equipe (cadastrar e listar membros). Testes: 17/17 (unit) · 8/8 (regras) · 9/9 (functions).

Módulos que já vêm: **Gerador de Texto** (exemplo/receita) e **Equipe** (admin cadastra membros).

---

## 🚀 Passos de deploy (você executa, com o Claude guiando) — Task 16

> Precisa do plano **Blaze** (já contratado).

1. **Login no Firebase CLI:** `npx firebase login` (num terminal do Claude Code, use `! npx firebase login` — o `!` roda o comando na sua sessão, e o login é interativo).
2. **Criar o projeto** no console (https://console.firebase.google.com) e pegar o Project ID.
3. **Trocar o `demo-crm-base` pelo ID real** em `.firebaserc`.
4. **Ativar no console:** Authentication (Google + Email/senha), Firestore, Storage, plano Blaze.
5. **Ativar a Gemini API** (Google AI Studio) e gerar uma **API key** real.
6. **Registrar o app web** no console e colar a config real em `base/firebase.js`
   (substituindo os valores `demo-*`; use o **storageBucket exato** que o console mostrar).
7. **Guardar a chave do Gemini:** `npx firebase functions:secrets:set GEMINI_KEY` (cole a chave).
8. **Publicar:** `npx firebase deploy --only firestore:rules,storage,functions,hosting`.
9. **Smoke test no ar:** abra a URL de Hosting, faça login (você vira o 1º admin),
   gere um texto (agora com Gemini real) e cadastre um membro.

> `functions/.secret.local` (chave demo do emulador) é ignorado pelo git — não vai pro deploy.

---

## ⚠️ Nota de segurança OBRIGATÓRIA — antes de usar o Storage (arquivos/imagens)

**Hoje o Storage não é usado por nenhum módulo** (por isso não é um bloqueador do v1).
Mas a regra atual do Storage libera **qualquer conta autenticada** (`request.auth != null`).
Como o login com Google aceita qualquer conta Google, alguém de fora poderia ler/gravar
arquivos **mesmo sem ser da equipe** (a regra do Storage não consegue consultar o Firestore
pra checar se a pessoa é membro).

**Antes de construir o primeiro módulo que usa Storage** (ex.: imagem de capa do blog no
Motor Editorial), é OBRIGATÓRIO endurecer isso com **custom claims**:

1. Ao criar um usuário (`criarUsuario`) e o 1º admin (`bootstrapAdmin`), marcar um claim
   no token: `admin.auth().setCustomUserClaims(uid, { equipe: true })`.
2. Trocar `storage.rules` para exigir esse claim:
   `allow read, write: if request.auth != null && request.auth.token.equipe == true;`
3. Lembrar que o token precisa ser renovado (re-login) pra receber o claim, e que
   desativar um membro deve remover o claim.

_(O Firestore NÃO tem esse problema — `/dados/**` já exige `ehDaEquipe()`, que checa o doc
de usuário ativo. Só o Storage precisa dos custom claims.)_

---

## 📦 Deploy dos módulos

Cada módulo traz suas próprias exigências de deploy — credencial a criar, segredo
a guardar, API a ativar — e a documentação delas mora **com o módulo**, não aqui.
Isto é da Base, e a Base não sabe quais módulos você montou.

Depois de montar, procure em `docs/` uma pasta com o nome do módulo. Exemplo: com
o módulo Editorial, o deploy da conexão com o Blogger fica em
`docs/editorial/DEPLOY-DO-MODULO.md`, e a operação do blog (do primeiro post até o
AdSense) em `docs/editorial/GUIA-MONETIZACAO-E-BOAS-PRATICAS.md`.

O `FALTA-CONFIGURAR.md` que o montador gera na raiz do produto lista o que cada
módulo pediu — comece por ele.

---

## Itens menores aceitáveis pro v1 (registrados, não bloqueiam)

- `npm audit` acusa vulnerabilidades em dependências de **desenvolvimento** (firebase-tools/admin) — não vão pro navegador.
- Regras de `/dados/app/**` não obrigam `criadoPor`/`criadoEm` (o cliente sempre grava; endurecer depois).
- Lógica de filtro por papel duplicada em `registry.construirMenu` e `app.js` (idênticas hoje; risco de drift).
- `ui.form/modal/aviso` sem teste dedicado; `pacote firebase` de dev é 11.10 enquanto o front usa CDN 11.6.1.
- Vários nits cosméticos (typo "invalido", `for..in`, etc.).

Detalhes completos por tarefa ficam em `docs/superpowers/` (planos e specs) **no
repositório onde a Base foi construída** — hoje o `crm-editorial`. Esses arquivos
são histórico de construção e o montador não os leva para produtos novos.

---

## Se alguém apagar dados: como voltar no tempo

O banco tem **recuperação no tempo ligada, com 7 dias de janela**. Dá para
enxergar — e restaurar — o banco como ele estava em qualquer momento dos últimos
7 dias, com precisão de minuto.

A trilha de auditoria diz _quem_ apagou. Isto é o que **traz de volta**. São
coisas diferentes e você precisa das duas.

### 1. Descobrir o que aconteceu e quando

Abra **Configurações › Auditoria** no sistema. Ali está quem fez o quê e a que
horas. Anote o horário de ANTES do estrago.

### 2. Olhar o banco naquele momento (sem mexer em nada)

```bash
gcloud firestore databases describe --database='(default)' --project=SEU-PROJETO \
  --format="value(earliestVersionTime)"
```

Isso mostra até que ponto no passado dá para voltar. Não pode ser mais antigo
que isso.

### 3. Restaurar

O jeito seguro é exportar o passado para um banco NOVO e conferir antes de
trocar — restaurar por cima do que está no ar é apagar o presente:

```bash
gcloud firestore export gs://SEU-BUCKET/resgate \
  --snapshot-time=2026-08-04T18:30:00Z --project=SEU-PROJETO
```

Depois importe no banco de resgate, confira, e só então decida o que trazer
de volta para produção.

> **A janela é de 7 dias.** Passou disso, não tem volta. É por isso que a
> auditoria precisa ser olhada cedo, não quando alguém sentir falta.

### O que a recuperação NÃO cobre

- **O que já saiu para um serviço de fora.** Conteúdo que um módulo publicou em
  outra plataforma vive lá, não aqui. Restaurar o banco não republica nem
  despublica nada — veja a documentação do módulo para o que vale em cada caso.
- **Arquivos no Storage.** A janela vale para o banco de dados.
- **Segredos no Secret Manager.** Lá a proteção é o versionamento próprio dele.

---

## Onde o código mora

**A matriz nasce SEM remoto**, de propósito: ela é cópia de um projeto que
tinha um, e um `git push` distraído iria para o repositório daquele produto.

Ao começar um produto, crie o remoto dele — **privado** — e só então empurre:

```
gh repo create <nome-do-produto> --private --source=. --remote=origin --push
```

⚠️ **ANTES DO PRIMEIRO PUSH, VARRA O HISTÓRICO INTEIRO** por credencial, e não
só os commits novos. Segredo que sobe para um remoto não desce mais: apagar
depois não resolve, porque o commit antigo continua alcançável. O `pre-commit`
cuida do que vem daqui para frente; o histórico herdado nunca passou por ele.

⚠️ **Nada de segredo entra aqui.** Chave de gateway, token de webhook e afins
moram no **Secret Manager** do Google (`functions/_lib/cofre.js`), lidos em
tempo de execução. O que está no repositório é a `apiKey` web do Firebase, que
não é segredo: ela identifica o projeto e é entregue a todo navegador — quem
protege os dados são as regras do Firestore e o login.

O `pre-commit` varre cada commit por credencial. Antes do primeiro envio, os 63
commits do histórico foram varridos de uma vez: nada real encontrado.

## Os dois portões: um para o repositório, outro para o site

**Eles guardam portas diferentes, e nenhum substitui o outro.** Em 04/09/2026 o
login ficou cinco dias quebrado em produção sem nunca ter passado por um commit:
foi direto pelo `firebase deploy`. Um hook de git não teria visto nada.

| Portão          | Onde vive              | Quando roda                         | O que cobra                            |
| --------------- | ---------------------- | ----------------------------------- | -------------------------------------- |
| `pre-commit`    | `.githooks/pre-commit` | antes de cada commit                | credencial entrando no histórico       |
| `pre-push`      | `.githooks/pre-push`   | antes de cada push                  | `npm run test:unit` (~7s)              |
| **`predeploy`** | **`firebase.json`**    | **antes de cada `firebase deploy`** | **`test:unit` + `test:medida` (~35s)** |

⚠️ **Os hooks de git precisam ser LIGADOS em cada cópia do repositório:**

```
git config core.hooksPath .githooks
```

Sem essa linha eles ficam no repositório sem nunca rodar — foi o que aconteceu
aqui: o detector de credenciais existia desde 17/08 e nunca tinha executado uma
única vez. **Hook não ligado é pior que hook nenhum**, porque dá a sensação de
proteção sem a proteção.

O `predeploy` NÃO precisa ser ligado: ele mora no `firebase.json` e vale para
quem quer que rode o deploy, em qualquer máquina.

**Saída de emergência:** se a suíte reprovar e o site estiver fora do ar, o
caminho não é burlar o portão — é `firebase hosting:rollback`, que volta para a
versão anterior sem passar por ele.

**Por que a suíte de medida está no portão de deploy e não no de push:** ela abre
o Chrome e leva ~25s. É cara demais para cada push e barata demais para deixar de
fora do que vai ao ar — e é ela que pega a CSP bloqueando o login do Google, que
nenhum teste de jsdom enxerga.

## Cabeçalhos de segurança (novo)

Ficam em `firebase.json`, no bloco `headers` com `source: "**"`. O emulador de
hosting **ignora esse bloco** — conferir por lá dá falso positivo. Quem prova
que a política não quebra nada é `npm run test:medida`, que sobe as três páginas
com a política de verdade num Chrome sem interface e coleta as violações.

| Cabeçalho                         | Por que                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`         | De onde o navegador pode executar código. `frame-ancestors 'none'` impede que o sistema seja embutido em outro site — sem isso, qualquer página carrega o seu produto num quadro invisível e colhe os cliques de quem está logado. |
| `X-Frame-Options: DENY`           | A mesma trava, para navegador antigo que ignora CSP.                                                                                                                                                                               |
| `X-Content-Type-Options: nosniff` | O navegador para de adivinhar o tipo do arquivo.                                                                                                                                                                                   |
| `Referrer-Policy`                 | O endereço interno da tela não vaza para sites de fora. Ele costuma carregar identificadores do que a pessoa estava vendo.                                                                                                         |
| `Permissions-Policy`              | Câmera, microfone e localização desligados: nada aqui usa.                                                                                                                                                                         |

`Strict-Transport-Security` já vem do próprio Firebase Hosting.

⚠️ **A política não pode citar o nosso projeto.** Ela vai junto no white-label:
os endereços do Google entram por curinga (`https://*.googleapis.com`), nunca
com o id da nossa instalação. Há teste cobrando isso.

⚠️ **Nenhuma página pode ter `<script>` embutido.** Foi por isso que o script
da tela de entrada virou `base/login.js`. Um script dentro do HTML obriga a
política a liberar `unsafe-inline`, e `unsafe-inline` desliga justamente a parte
que protege.

---

## Antes de vender para o primeiro cliente

- [ ] Gateway em **produção**, e não em sandbox. Todo gateway tem os dois
      ambientes, e o padrão de desenvolvimento tem que ser o de mentira — é a
      trava mais barata contra cobrar o cartão de gente de verdade enquanto se
      programa
- [ ] Chave de produção colada **no painel**, nunca no terminal nem no chat
- [ ] Meio de recebimento configurado na conta do gateway (chave PIX, conta
      bancária). ⚠️ Costuma ser BLOQUEIO, não aviso: sem ele o gateway recusa
      criar a cobrança, e a mensagem não diz isso
- [ ] Um pagamento real de R$ 1 de ponta a ponta, e o acesso liberado
- [ ] Aba Pagamento → **Depois da venda**: oferta de renovação escolhida, termos
      de uso e política de privacidade preenchidos
- [ ] `config/marca.js` com o nome do cliente
- [ ] `base/firebase.js` e `base/oferta-publica.js` apontando para o projeto do
      cliente (o id aparece nos dois; é o único lugar duplicado)
