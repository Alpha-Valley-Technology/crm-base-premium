# Registro de Decisões — CRM Base Premium (a matriz)

### Toda decisão fora do padrão, exceção documentada e versão instalada entra aqui.

⚠️ **ESTE REGISTRO É DA CARCAÇA.** O que está aqui vale para todo produto que
sair dela — e por isso mexer numa destas decisões é mexer em todos eles.

**As decisões do SEU produto entram embaixo, numa seção própria.** Não subam
para as de cima: o que é escolha de um negócio (o preço, o gateway, o
vocabulário, quem pode o quê) não é decisão da casca.

O produto de origem desta carcaça — uma área de membros premium com catálogo,
fórum, gamificação e venda por gateway — levou as decisões dele quando saiu.
Ficaram as que descrevem a casca.

---

## O que a carcaça entrega, e onde cada coisa mora

Isto não é decisão: é o mapa que faz as decisões abaixo terem sentido.

| O quê                   | Onde                                            | Nota                                                                 |
| ----------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Entrar (Google e senha) | `login.html` + `base/login.js` + `base/auth.js` | Primeiro acesso e "esqueci a senha" são o mesmo caminho              |
| Quem é quem             | `base/escopo.js`, `functions/_lib/claims.js`    | `membro` · `gestor` · `admin`, cobrados em três camadas              |
| Virar o primeiro dono   | `functions/equipe/bootstrap-admin.js`           | A primeira pessoa num banco vazio vira admin; depois, só por convite |
| Customizar a cara       | `modules/identidade/`                           | Logo, cores, fontes, tema, imagem da entrada, rodapé                 |
| Adicionar pessoas       | `modules/equipe/`                               | Cadastrar, promover, desativar, remover                              |
| Notificar               | `modules/avisos/` + `base/sino.js`              | O sino e o painel que escreve nele                                   |
| Suporte                 | `modules/suporte/` + `base/suporte.js`          | Dúvidas e os botões de contato                                       |
| Pagamento               | `modules/pagamento/`                            | **Vazio de propósito** — é o lugar do gateway                        |
| Guardar segredo         | `functions/_lib/cofre.js`                       | Secret Manager, lido em tempo de execução                            |

---

## O lugar do pagamento nasce vazio, e isso é decisão

**Decidido em 07/09/2026.** A carcaça não traz meio de pagamento nenhum.

O produto de origem vendia por um gateway específico, e sair dele levou junto
sete Cloud Functions, a página pública de venda, cupons, ofertas e o webhook.
Manter aquilo aqui obrigaria todo produto novo a arrancar um gateway que talvez
não fosse o dele — e arrancar é mais caro que construir, porque exige entender
o que se está removendo.

**O que ficou no lugar:** a aba, o endereço e o RACIOCÍNIO. As seis regras que
valem para qualquer gateway estão em `functions/index.js`, no bloco de
PAGAMENTO, e a ordem de montagem da tela está em `modules/pagamento/module.js`.

**A mais cara delas, para não se perder aqui:** desativar alguém no sistema NÃO
diz nada ao gateway. Sem parar a cobrança junto, o resultado é uma pessoa sem
acesso pagando todo mês — que descobre pela fatura, e a resposta dela é estorno.
`functions/equipe/gerir-usuario.js` já tem o ponto de engate marcado, e
`modules/equipe/module.js` já tem o aviso de quando o cancelamento falha.

---

## A janela do primeiro acesso, e como fechá-la

**A primeira pessoa que fizer login num banco vazio vira admin.** É o que
permite o sistema ser instalado sem ninguém abrir um terminal — e é a única
janela de exposição real que a auditoria de 08/09/2026 encontrou.

Ela é estreita e tem trava: `bootstrapAdmin` exige login, usa uma transação com
documento-sentinela (`config/_bootstrap`), e **só o primeiro caller vence** —
sem corrida entre logins simultâneos. Quem chega depois recebe `criado: false`,
não ganha cadastro e não ganha carimbo no token. Verificado atacando a
instalação publicada com uma conta comum: a função respondeu `criado: false`, e
nenhum documento foi criado.

**Mas ela existe do deploy até o seu login.** Nesse intervalo, quem souber o
endereço e entrar antes de você é o dono do sistema.

⚠️ **A defesa é operacional, e custa trinta segundos: ENTRE VOCÊ, PRIMEIRO,
logo depois do primeiro deploy.** Antes de mandar o endereço para alguém, antes
de cadastrar a equipe. Fechada a janela, ela não reabre — o sentinela é
permanente.

Se um dia o endereço vazar antes disso, o conserto é apagar `config/_bootstrap`
e o cadastro criado indevidamente, e entrar de novo.

---

## Os três campos que nascem vazios e derrubam a aplicação

**Decidido em 07/09/2026.** `base/firebase.js`, `.firebaserc` e `config/marca.js`
nascem sem valor, e o primeiro deles **estoura na primeira tela** se continuar
assim.

**Por que não herdar os do produto anterior:** a carcaça anterior fazia isso, e
um produto novo que esquecesse de trocar passava a escrever no banco do vizinho
— calado, e às vezes só descoberto semanas depois.

Vazio quebra na primeira tela, com um recado dizendo o que fazer. Herdado quebra
em silêncio, no banco errado. **Falhar alto é a escolha barata.**

---

## Os contatos nascem com número de mentira

**Decidido em 07/09/2026.** Instalação nova traz `11 90000-0000` nos dois botões
de contato da tela de entrada.

Cada botão só aparece se houver número — e sem semente, a entrada nascia sem
eles, sem nenhuma pista de que existem. Quem monta o produto não descobre um
recurso que não está na tela.

A distinção que permite apagar depois: **documento ausente** (ninguém
configurou) mostra a semente; **campo vazio** (alguém apagou) é respeitado.
Sem ela, o botão que o dono tirou voltaria na leitura seguinte, para sempre.

O número é impossível de confundir com um de verdade, de propósito: um número
plausível faria alguém publicar sem trocar, e um desconhecido receberia as
mensagens de suporte de um cliente pagante.

---

## Exceção 1 — SDK Web do Firebase na Camada 1

**Situação:** o produto foi construído sobre o SDK Web do Firebase
(`firebase-app`, `firebase-auth`, `firebase-firestore`, `firebase-storage`,
`firebase-functions`), carregado por `import()` a partir do CDN do Google. A
doutrina da fronteira o proíbe por padrão na Camada 1.

**Requisito real que sustenta a exceção:** o sino de notificações escuta
`onSnapshot` em duas coleções (`avisos` e `recados`) e acende sem recarregar a
página. Esse comportamento foi pedido explicitamente e verificado no app real —
a doutrina reconhece "tempo real contínuo" como o caso que o REST não entrega
bem (Parte 5).

**Alternativa REST avaliada:** polling encadeado de 2–5s com pausa em aba
oculta (`visibilitychange`), como manda a Parte 3-D. Ela funcionaria para o
sino, e com custo de leitura parecido. **O que ela não resolve** é o resto do
sistema, que hoje depende do SDK em toda tela: sessão, upload, chamada de
função e as ~40 leituras de coleção.

**Portanto, esta exceção NÃO é permanente.** A doutrina é clara sobre o achado
em projeto existente: _"não é retrabalho imediato — registre e planeje a
migração para E17/BFF na próxima iteração."_ O plano está abaixo, em
"Conformidade pendente".

**Condições da Parte 5 em vigor hoje:**

| Condição                                                    | Estado                                                                                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro com requisito e alternativa avaliada               | ✅ este documento                                                                                                                                                                                    |
| Import modular com `import()` dinâmico                      | ✅ parcial — dinâmico no sino, na identidade e no perfil; estático em `base/firebase.js`                                                                                                             |
| Só na tela logada, nunca no caminho crítico do site público | ✅ a carcaça é toda área logada. ⚠️ Se o seu produto criar página pública (uma tela de venda, um catálogo aberto), ela fica FORA desta exceção e segue E17 puro — `fetch` no Firestore REST, sem SDK |
| Peso no orçamento e medição em estado produção              | ❌ **não medido ainda**                                                                                                                                                                              |
| Versão fixada                                               | ✅ 11.6.1 cravada em todos os `import`                                                                                                                                                               |

---

---

## Exceção 2 — Estrutura de pastas

O guia (Parte 3) pede `public/` com `css/`, `js/core/`, `js/components/`. Esta
carcaça nasceu antes, com `base/`, `modules/`, `styles/` e `ui/` na raiz,
servidos direto pelo Hosting.

**Por que continua assim:** mover arquivo muda todo `import` de todo módulo e
todo caminho de todo teste — risco alto e valor zero para quem usa. E agora há
um motivo a mais: todo produto que sair daqui herda a estrutura, então mudá-la
depois passa a custar em todos eles de uma vez.

A equivalência conceitual existe e está mantida: `base/` = `js/core/`,
`modules/` = `js/components/`, `styles/` = `css/`.

---

---

---

## Exceção 3 — O ambiente local roda em container (08/09/2026)

Pedido do dono: subir o banco e o site na máquina **sem poder remover as
configurações do Firebase, porque elas são de homologação e de produção**.

**A decisão central: o ambiente local LÊ essas configurações e não escreve em
nenhuma delas.**

`firebase.json`, `.firebaserc` e `base/firebase.js` ficam intocados. Funciona
porque `base/env.js` já redireciona o SDK para `127.0.0.1` em `localhost` — as
chaves de produção continuam no arquivo e simplesmente não são usadas, nada sai
para o Google. A única coisa que precisa coincidir é o `projectId`, e ele é
**lido** de `base/firebase.js` na hora de subir (`.docker/entrada.mjs`).

**Por que isso importa mais do que parece:** a alternativa óbvia — editar
`base/firebase.js` para apontar ao emulador — faria toda sessão de trabalho
começar mexendo no arquivo que vai para produção. É o acidente que a matriz
inteira existe para evitar, e ele falha em silêncio, no banco errado.

### As três decisões derivadas

| Decisão                                                                   | Motivo                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A configuração do emulador é **derivada** do `firebase.json`, não copiada | O Docker exige que os emuladores escutem em `0.0.0.0`; o `firebase.json` não pode mudar. O container gera `.firebase.docker.json` a cada subida, com essa única diferença. Cópia manual divergiria no dia em que alguém mudasse uma porta                                                                             |
| A pasta se chama **`.docker/`**, com ponto                                | `firebase.json` publica a raiz (`"public": "."`) e a lista `ignore` exclui `**/.*` e `**/.*/**`. Uma pasta `docker/` iria ao ar junto com o site. Com o ponto, fica de fora **sem acrescentar uma linha no `firebase.json`** — que é config de produção. Medido com `listFiles` do `firebase-tools`, ver playbook 7.4 |
| As portas são publicadas **só em `127.0.0.1`**                            | O emulador não pede senha e aceita `Bearer owner` como dono do banco. Publicado em `0.0.0.0`, ficaria alcançável por qualquer máquina da rede. O alcance final é o mesmo de rodar `npm run emu` direto na máquina                                                                                                     |

### O que foi acrescentado além do pedido, e por quê

`npm run docker:testar` roda a suíte das regras dentro do container. **Não foi
pedido.** Entrou porque a suíte precisa de Java 21 e falha de forma confusa em
máquina com Java errado — e "não rodei a suíte de regras" é como uma regra de
acesso quebrada chega em produção. Custa um serviço no `compose.yml`, sob perfil
próprio: não sobe no dia a dia. Provado em 08/09/2026: 144 testes, 0 falhas.

⚠️ **Isto NÃO é autorização para o local divergir do ar.** O emulador de hosting
ignora `headers` e `ignore` (playbook 7.4): a CSP continua sendo provada só por
`npm run test:medida`.

Guia de uso: `docs/AMBIENTE-LOCAL-DOCKER.md`.

---

## Conformidade pendente (o que falta para bater o checklist da Parte 11)

⚠️ **ESTA LISTA É HERANÇA, e cada produto herda ela inteira.** O que estiver
pendente aqui nasce pendente em todo produto novo — por isso resolver um item
daqui vale mais do que resolvê-lo num produto só.

Em ordem de valor por esforço:

| #   | Item                                               | Padrão              | Situação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lighthouse nos dois estados                        | Parte 11.1          | **nunca medido**. É o primeiro passo, porque decide a prioridade de todo o resto — e agora vale mais: medir a carcaça vazia dá o piso de todo produto que sair dela                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2   | `@layer` no CSS                                    | E2                  | não usado; a cascata hoje depende da ordem dos `<link>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | ~~Cabeçalhos de cache/CSP no `firebase.json`~~     | Parte 10.2          | ✅ 04/09/2026 — CSP sem `unsafe-inline` (o script da entrada saiu para `base/login.js`), `frame-ancestors 'none'`, `nosniff`, Referrer-Policy, Permissions-Policy, X-Frame-Options. Provados em `test/medida/csp.test.js`, que **clica** no botão do Google antes de coletar violações. ⚠️ `https://apis.google.com` é obrigatório em `script-src` e `frame-src`: sem ele o login do Google morre com `auth/internal-error`, e só no clique                                                                                                                               |
| 4   | PWA (`manifest.webmanifest` + `sw.js`)             | E14                 | ausente. Vale para todo produto que as pessoas abrem toda semana — o ícone na tela do celular é o que separa "um site" de "um aplicativo" na cabeça de quem usa                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5   | Objetos OOCSS (`.stack`, `.cluster`, `.grid-auto`) | 5.6                 | cada tela resolve o próprio espaçamento; há repetição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 6   | Migração E17/BFF                                   | doutrina, Parte 3-B | ver Exceção 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | Estrutura de pastas                                | Parte 3             | ver Exceção 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8   | App Check                                          | Parte 10.1          | ausente — e **não é buraco de acesso**. Os dados são protegidos pelas regras do banco e pelos `assert` das Functions, e isso foi verificado ATACANDO a instalação publicada, sem login e como membro comum: toda leitura e toda escrita fora do permitido devolveu 403, e toda função devolveu PERMISSION_DENIED. O que o App Check acrescenta é outra coisa — impedir que alguém use a chave web pública para martelar o Firestore por script, queimando cota e dinheiro. É proteção de CUSTO, não de dado. Depende de uma chave reCAPTCHA que só o dono cria no console |
| 9   | ~~Backups do Firestore agendados~~                 | Parte 10.3          | ✅ 24/08/2026 — diário (7d) + semanal (14 semanas) + PITR de 7 dias + proteção contra exclusão do banco + versionamento do Storage (30d) + backup das contas de login. Procedimento de restauração em `BACKUP-E-RESTAURACAO.md`                                                                                                                                                                                                                                                                                                                                           |
| 10  | ~~Alertas de billing~~                             | Parte 10.3          | ✅ 24/08/2026 — orçamento de R$ 50/mês com aviso em 50%, 90%, 100% e projeção                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## Decisões de operação — 08/09/2026

| Data       | Decisão                                                                     | Motivo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Aprovado por |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 08/09/2026 | **A demonstração é uma instância separada, e a matriz nunca é configurada** | Preencher `base/firebase.js` na matriz para publicar faria todo produto futuro nascer apontando para a demonstração — o exato defeito que a matriz corrige. A demo é um produto feito dela, e provou de quebra que o passo a passo do README fecha                                                                                                                                                                                                                                     | dono         |
| 08/09/2026 | **A configuração da instância fica FORA da sincronização**                  | `base/firebase.js`, `.firebaserc` e `config/marca.js` são o que torna uma cópia um produto. Sincronizar a demo com a matriz sobrescrevendo esses três apagaria a instância a cada atualização                                                                                                                                                                                                                                                                                          | —            |
| 08/09/2026 | **Etiqueta com defeito se APAGA — enquanto ninguém a tiver**                | A `v1.0.0` saiu com a Identidade quebrada. A regra geral é não mexer em etiqueta publicada: mover faria duas pessoas com "v1.0.0" terem códigos diferentes. ⚠️ **Mas a regra existe para proteger quem já clonou, e o repositório é privado, tinha horas de vida e zero forks — não havia ninguém.** Apagar deixou UMA etiqueta, a que funciona; mantê-la deixaria uma armadilha para quem clonasse pelo número mais redondo. **Conferir os forks ANTES é o que separa os dois casos** | dono         |
| 08/09/2026 | **A matriz tem uma etiqueta só**                                            | Etiqueta antiga numa matriz é convite para alguém clonar a versão errada. Versão nova substitui a anterior; o histórico de como se chegou nela está nos commits, que é o lugar dele                                                                                                                                                                                                                                                                                                    | dono         |
| 08/09/2026 | **A demonstração também tem remoto privado**                                | Ela era a única pasta sem GitHub. Histórico num disco só some com a máquina, e o argumento vale para ela como vale para o resto. Varrida por credencial antes do envio: nenhuma                                                                                                                                                                                                                                                                                                        | dono         |
| 08/09/2026 | **Segurança se prova atacando, não lendo**                                  | Ver playbook 5.3. A auditoria por ataque (sem login e como membro comum) é o que separa "eu acho que está fechado" de "devolveu 403". Vale a cada entrega, não uma vez                                                                                                                                                                                                                                                                                                                 | dono         |

---

## Decisões de operação — 05/09/2026

| Data       | Decisão                                                                                       | Motivo                                                                                                                                                                                                                                                                                                                                                     | Aprovado por |
| ---------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 05/09/2026 | **Todo produto tem remoto privado no GitHub, e o histórico é varrido ANTES do primeiro push** | Histórico que vive num disco só some com a máquina. Privado, porque é código de negócio. E a varredura cobre o histórico INTEIRO, não só os commits novos: o `pre-commit` não existia (ou não estava ligado) quando os antigos nasceram, e segredo que sobe para um remoto não desce mais — apagar depois não resolve, o commit antigo continua alcançável | dono         |
| 05/09/2026 | **Portão de deploy: árvore git limpa** (`npm run portao` no `predeploy`)                      | A regra "commite cada etapa" tinha sido dada em conversa e não pegou: 29/08 a 05/09 foi ao ar sem um commit, e no apagão de 04/09 **não havia para onde voltar**. Regra escrita depende de alguém lembrar; regra de máquina, não                                                                                                                           | dono         |
| 05/09/2026 | **`test:unit` + `test:medida` no `predeploy`**                                                | O código quebrado foi ao ar por `firebase deploy`, não por commit — hook de git não guardava essa porta. Emergência se resolve por `firebase hosting:rollback`, nunca burlando o portão                                                                                                                                                                    | dono         |
| 05/09/2026 | **`core.hooksPath = .githooks` ligado**                                                       | O detector de credenciais existia desde 17/08 e **nunca tinha rodado**: `hooksPath` nunca fora configurado. Hook não ligado é pior que hook nenhum — dá sensação de proteção sem proteção                                                                                                                                                                  | dono         |
| 05/09/2026 | **Bloco 00 no `CLAUDE.md`**                                                                   | Sessão nova não lembra de conversa anterior. Regra de operação que não está em arquivo lido a cada sessão não existe                                                                                                                                                                                                                                       | dono         |
| 04/09/2026 | **COOP fica FORA** até haver medida que o justifique                                          | Foi adicionado sem ser pedido, no mesmo deploy de um conserto, e esteve no ar exatamente na janela de um erro 500 do Google no login. Nunca se soube se causou — porque duas mudanças viajaram juntas                                                                                                                                                      | dono         |

**Já conforme** (verificado nesta entrega): zero dependência além do SDK da
Exceção 1 · sem build · tokens E3 completos · `prefers-reduced-motion` (Bloco 12) · `:focus-visible` desenhado · `::selection` na marca · skip link ·
sombras em duas camadas · bordas translúcidas · uma escala de raios ·
`tabular-nums` nas contagens · estados carregando/vazio/erro/sucesso em todo
módulo de dados · shell E7 nas três faixas · elemento nativo primeiro
(`<dialog>`, `<details>`, `<form>` com Constraint Validation) · zero
`innerHTML` com dado externo · zero rolagem horizontal ≥ 320px · autoridade no
servidor (Security Rules + Functions, 636 testes).
