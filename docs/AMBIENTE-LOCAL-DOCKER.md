# O ambiente local em Docker

A comunidade inteira de pé na sua máquina — banco, login, arquivos, funções e o
site — sem instalar Java, sem instalar a versão certa do Node, sem `firebase
login`. Quem clona o projeto precisa de Docker e mais nada.

---

## A garantia, antes de tudo

> **O ambiente local não altera NENHUMA configuração do Firebase.**

`firebase.json`, `.firebaserc` e `base/firebase.js` são de homologação e de
produção. O container **lê** os três e não escreve em nenhum deles.

Isso é possível por causa de `base/env.js`: em `localhost`, o SDK é redirecionado
para `127.0.0.1` e **nada sai para o Google**. As chaves de produção podem
continuar carregadas no arquivo — elas simplesmente não são usadas. A única coisa
que precisa bater é o `projectId`, e ele é **lido** de `base/firebase.js` na hora
de subir.

Se subir local exigisse editar essas configurações, toda sessão de trabalho
começaria mexendo nelas e terminaria com o risco de a config de brincadeira
viajar para o ar. É o acidente que `docs/RETOMAR-AQUI.md` descreve como "o
produto seguinte escreveria no banco do vizinho" — e ele custa caro porque falha
em silêncio, no banco errado, às vezes semanas depois.

---

## Os cinco comandos

| Comando                   | O que faz                                                      |
| ------------------------- | -------------------------------------------------------------- |
| `npm run docker:subir`    | Sobe tudo. Na primeira vez constrói a imagem (alguns minutos). |
| `npm run docker:logs`     | Acompanha o que está acontecendo lá dentro.                    |
| `npm run docker:testar`   | Roda a suíte das regras do banco dentro do container.          |
| `npm run docker:derrubar` | Desliga **guardando o banco local**.                           |
| `npm run docker:zerar`    | Desliga e **apaga o banco local**. Recomeça do zero.           |

`docker:subir` fica preso no terminal mostrando os registros. Para soltar, use
`docker compose -f .docker/compose.yml up -d --build` e acompanhe com
`docker:logs`.

**Como saber que terminou de subir:** espere a moldura `All emulators ready!`
nos registros. O container aparece como `healthy` um pouco antes disso — as
Functions são as últimas a carregar, e chamar uma nesse intervalo devolve
`function does not exist`, que parece defeito e não é.

---

## Os endereços

| Endereço              | O quê                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| http://localhost:5000 | **O site.** É por aqui que se trabalha.                                |
| http://localhost:4000 | O painel dos emuladores: ver e editar o banco, as contas, os arquivos. |
| `localhost:9099`      | Login (Auth)                                                           |
| `localhost:8080`      | Banco (Firestore)                                                      |
| `localhost:9199`      | Arquivos (Storage)                                                     |
| `localhost:5001`      | Funções                                                                |

⚠️ Todas as portas são publicadas **só em `127.0.0.1`**, e isso não é enfeite: o
emulador não pede senha e aceita `Bearer owner` como dono do banco. Publicado em
`0.0.0.0`, ele ficaria alcançável por qualquer máquina da rede — o café, o hotel,
o coworking.

---

## O primeiro acesso: como virar admin no local

O banco local nasce vazio, e **quem entra primeiro num banco vazio vira admin**
(é a função `bootstrapAdmin`). No local isso é a seu favor:

1. Abra o painel: http://localhost:4000 › **Authentication** › **Add user**.
2. Crie uma conta com email e senha quaisquer — ninguém confere nada aqui.
3. Entre em http://localhost:5000/login.html com essa conta.

Pronto: essa conta é o admin da sua comunidade local, com Identidade, Avisos,
Equipe e Pagamento à mão.

---

## Onde mora o banco local

Num volume do Docker chamado `dados`, e **não** numa pasta do projeto. Dois
motivos, e os dois já custaram tempo em algum lugar:

- Pasta no projeto apareceria no `git status`, e árvore suja **barra o deploy**
  (`npm run portao`).
- Banco de brincadeira não tem por que entrar no histórico.

Ele é gravado ao desligar (`--export-on-exit`) e lido ao subir (`--import`).
Então `docker:derrubar` hoje e `docker:subir` amanhã devolvem a mesma comunidade,
com o mesmo conteúdo. Para recomeçar limpo: `npm run docker:zerar`.

---

## Quando reconstruir a imagem

Quase nunca. O projeto entra no container **vivo**: o que você salva no editor é
o que o site serve, sem reiniciar nada.

Reconstrua (`npm run docker:subir` já faz, com `--build`) quando mudar a versão
do `firebase-tools` no `package.json` — é de lá que a imagem tira a versão a
instalar, para não divergir do que o projeto declara.

Mudou `functions/package-lock.json`? Não precisa reconstruir: o container detecta
sozinho e reinstala na próxima subida.

---

## Armadilhas

### 1. Ele não sobe se você já tem emulador rodando na máquina

`npm run emu` e `npm run docker:subir` disputam as mesmas portas. O erro do
Docker é feio e não diz isso:

```
ports are not available: exposing port TCP 127.0.0.1:9199 ...
bind: Normalmente é permitida apenas uma utilização de cada endereço de soquete
```

Traduzindo: **já tem alguém ali**. Desligue o emulador nativo antes, ou o
container. Os dois fazem a mesma coisa; rode um.

### 2. O emulador de hosting não é o site: ele ignora `headers` E `ignore`

Duas partes do `firebase.json` **não valem** em `localhost:5000`, e as duas
enganam para lados opostos:

**`headers` — engana para o lado otimista.** A CSP não é aplicada (playbook,
5.2). Tudo funciona no local e pode quebrar em produção porque a política
bloqueou uma fonte, uma chamada, um vídeo. Quem prova isso é
`npm run test:medida`, que abre a casca real no Chrome com a política aplicada.
**Ambiente local verde não substitui aquela suíte.**

**`ignore` — engana para o lado pessimista.** O emulador serve arquivos que o
deploy NÃO publica. `http://localhost:5000/.docker/compose.yml` responde 200, e
mesmo assim o arquivo nunca vai ao ar.

Medido em 08/09/2026 com a própria listagem do `firebase-tools`, que é o código
que decide o que sobe:

```js
const { listFiles } = require('firebase-tools/lib/listFiles.js');
listFiles('.', require('./firebase.json').hosting.ignore);
```

Resultado: 70 arquivos publicáveis, **nenhum** dentro de `.docker/` e nenhum
começando com ponto. Se um dia precisar conferir de novo o que vai ao ar, é essa
chamada — e não o navegador apontado para o emulador.

### 3. Aponte para outro projeto sem editar `base/firebase.js`

Crie `.docker/.env` (já ignorado pelo git):

```
PROJETO_LOCAL=meu-produto-hml
```

Serve para conferir um despejo de homologação sem tocar no arquivo que vai para
produção. Sem isso, o projeto sai de `base/firebase.js`.

### 4. `functions/node_modules` do container não é a do Windows

São volumes separados de propósito: pacote instalado no Windows carrega binário
de Windows dentro, e montado no Linux ele quebra — ou, pior, funciona quase
sempre e falha num caso raro que ninguém liga ao sistema operacional.

Consequência prática: instalar dependência nova nas Functions exige subir o
container de novo, para ele reinstalar do lado de dentro.

---

## O que está dentro de `.docker/`

| Arquivo               | O quê                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `Dockerfile`          | A imagem: Node 22 (a mesma de produção), Java e `firebase-tools`.         |
| `compose.yml`         | Os serviços, as portas e os volumes.                                      |
| `entrada.mjs`         | O que roda ao subir: acha o projeto, deriva a config, liga os emuladores. |
| `dependencias.mjs`    | Instala `node_modules` do lado de dentro, só quando o lock muda.          |
| `preparar-testes.mjs` | Deixa o container pronto para `npm test`.                                 |

⚠️ **A pasta começa com ponto de propósito.** `firebase.json` publica a raiz do
projeto (`"public": "."`), e a lista `ignore` dele exclui `**/.*` e `**/.*/**`.
Chamada `docker/`, ela seria publicada junto com o site — qualquer pessoa leria a
receita da nossa infraestrutura em `https://seu-site/docker/compose.yml`. Chamada
`.docker/`, fica de fora sozinha, **sem acrescentar uma linha no `firebase.json`**
— que é config de produção, e não se mexe.

Isso foi **medido**, não suposto: ver a Armadilha 2 acima. O emulador serve
`/.docker/compose.yml` mesmo assim, e isso não quer dizer nada sobre o deploy.
