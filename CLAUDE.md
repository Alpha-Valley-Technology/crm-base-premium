# CRM Base Premium — instruções da matriz

**Esta é a carcaça, não um produto.** Ao usá-la para construir algo, o produto
troca o que for dele — a marca, os módulos, o vocabulário dos papéis — e deixa
intacto o que é da casca. O que está escrito aqui vale para os dois.

## A base de conhecimento manda aqui

Todo desenvolvimento segue a pasta **`../docs-orientacao-agencia/`** (um nível
acima deste projeto, compartilhada por todos os produtos da agência). Comece por
`LEIA-PRIMEIRO.md`. As exceções e o que ainda falta neste projeto específico
estão em **`docs/decisoes.md`** — leia os dois antes de mexer em qualquer coisa.

A pasta não é copiada para dentro do projeto de propósito: uma cópia por produto
vira cinco versões diferentes do mesmo guia em seis meses.

---

## Antes de construir qualquer coisa: leia o playbook

**`docs/PLAYBOOK-DA-CARCACA.md`** guarda o custo de descoberta desta carcaça —
as armadilhas que só aparecem depois de prontas, e várias que **não quebram nada
visível**, que é o que as torna caras. Ele existe para o próximo produto não
repetir uma semana de tentativa e erro.

Leia **antes** de começar, não depois. E ao pisar numa armadilha nova, escreva
ela lá: é isso que impede o custo de voltar.

---

## Bloco 00 — COMO OPERAMOS (leia antes de escrever a primeira linha)

> Estas regras foram dadas pelo dono em conversa, mais de uma vez, e **não
> pegaram** — porque conversa não sobrevive ao fim da sessão. Elas estão aqui
> porque este arquivo é lido em toda sessão nova, e porque o custo de não
> tê-las já foi cobrado: cinco dias de login quebrado em produção, com o
> trabalho de uma semana inteira sem um único commit.
>
> Em 05/09/2026 o dono descreveu o efeito assim: **"a minha sensação é que
> estou atuando com outro desenvolvedor que não manteve a lógica de
> desenvolvimento usada para chegar até onde tínhamos chegado."**
>
> Ele estava certo. Sessão sem memória escrita É outro desenvolvedor.

### 1. Commite cada etapa, enquanto ela acontece

**Não ao fim do dia, não quando "estiver pronto".** Etapa concluída e testada é
etapa commitada. Um commit por assunto, e a mensagem conta o **PORQUÊ** — o
"o quê" o `git diff` já mostra. O estilo das mensagens é o que está no
histórico: português, uma frase que diz o que mudou de verdade, e o corpo
explicando a decisão para quem chegar depois.

**Isto é cobrado por máquina:** `npm run portao` (dentro do `predeploy` do
`firebase.json`) **recusa publicar com a árvore suja**. Se está no ar, está no
histórico — sempre.

### 2. Nunca publique o que não está commitado

Ver acima. Emergência com o site fora do ar se resolve com
`firebase hosting:rollback`, **nunca** burlando o portão.

### 3. Conserto vai sozinho no deploy

Melhoria, endurecimento de segurança e refatoração **não pegam carona** num
deploy de conserto. Em 04/09/2026 um cabeçalho `Cross-Origin-Opener-Policy`
que ninguém tinha pedido subiu junto de um conserto; deu erro em produção, e
**nunca se soube qual das duas mudanças causou** — porque viajaram juntas.

Melhoria não pedida se **recomenda**, com motivo e custo, e espera o "pode ir".
O dono decide rápido quando entende o custo. Ver `docs/PLAYBOOK-DA-CARCACA.md`, 2.13.

### 4. Antes de fechar a sessão, atualize a base

Nesta ordem, e sem pular:

1. **Commitar** tudo que funciona e ainda não está no histórico.
2. **`docs/PLAYBOOK-DA-CARCACA.md`** — armadilha nova vira seção nova. É
   ele que impede o custo de descoberta de voltar.
3. **`docs/decisoes.md`** — decisão fora do padrão, exceção, versão instalada.
4. **`docs/RETOMAR-AQUI.md`** — onde paramos, o que falta, e o que a próxima
   sessão precisa perguntar primeiro. É o primeiro arquivo a ler ao voltar.

### 5. Diagnostique antes de mexer

Defeito relatado: **pergunte o sintoma antes de alterar código**. Em 04/09 o
login foi consertado no escuro por várias rodadas; a mensagem de erro exata
("500. That's an error.") mudou o diagnóstico inteiro em um segundo.

E não afirme que uma mudança resolve algo sem **medir**. Ver Bloco 0.

---

## Bloco 0 — A régua: nível mundial, e nada abaixo disso

> Definido pelo dono em 29/08/2026:
>
> **"Nada além do nível mundial de competição é permitido para nós. Os níveis
> nacionais de profissional não são o alvo. Estamos criando uma área de membros
> premium, estilo Netflix, que pode atender nível mundo. Tudo que for necessário
> para atingir essa meta é o que precisa ser implementado."**
>
> E, sobre como trabalhar: **"eu te ajudo na visão de arquitetura, mas não sou
> especialista em programação — você precisa me auxiliar com o que é melhor, e
> no raciocínio também."**

**O que isso obriga, na prática:**

- **Recomendar, não listar.** Dizer qual é a melhor opção e por quê, e só então
  as alternativas. O dono traz a direção do produto; a régua técnica é
  responsabilidade de quem programa.
- **Explicar o raciocínio em português de gente**, com a consequência prática de
  cada escolha. Ele decide melhor entendendo o custo, não recebendo jargão.
- **Trazer o que não foi pedido mas o padrão exige**: estado vazio, erro,
  carregando, teclado, leitor de tela, tema escuro, celular, e o que acontece
  quando a rede falha. Entregar o mínimo e esperar que ele descubra o que faltou
  inverte os papéis — ele não tem como saber.
- **Nunca reduzir escopo em silêncio** para entregar mais rápido. Se algo ficar
  de fora, isso é dito, com o motivo.
- **"Funciona" não é o alvo.** O alvo é comparável ao melhor do mundo na
  categoria. Quando houver dúvida entre o suficiente e o excelente, é o
  excelente — e o custo entra na conversa, não na decisão silenciosa.

---

---

## Bloco 1 — Guia mestre (Parte 12)

> Todo desenvolvimento segue o **guia-mestre-codificacao.md** — doutrina,
> orçamento de peso, estrutura e estilização são regras, não sugestões. Ordem de
> trabalho: **Direção → Estrutura → Acabamento**. (1) Escolha e declare o
> Arquétipo (A1–A6, Parte 8.7), derive os tokens e a assinatura única. (2)
> Construa com a estrutura das Partes 4–6 (Padrões E1–E14; detalhes em
> `manual-engenharia-web.md`). (3) Aplique efeitos do sistema FX (Parte 7;
> catálogo completo em `manual-fx-vanilla.md`) conforme a gramática de movimento
> da Parte 8.4. Stack fixa: HTML5 semântico, CSS3 com OOCSS/BEM/@layer, JS
> vanilla em módulos ES (classes para componentes com AbortController); backend
> exclusivamente Google (Parte 10); integrações só por API/SDK oficial; zero
> dependências de runtime (exceção única documentada: Three.js para 3D real).
> Recursos fora de "Baseline amplamente disponível" exigem `@supports`/detecção
> com fallback. Referências executáveis que prevalecem em dúvida:
> `app-shell-referencia.html`, `showcase-fx-vanilla.html`,
> `design-premium-referencia.html`, `modelos-3d-vanilla.html`. Critérios de
> aceite: regra dos dois estados da Parte 11.1 (estado puro homologado em
> 100/100/100/100; estado produção com Performance ≥ 90 e 100 nas demais),
> orçamento de peso da Parte 2, zero scroll horizontal ≥ 320px, teclado 100%,
> `prefers-reduced-motion` respeitado, checklist da Parte 11 completo.
> Especifique e reporte trabalho citando códigos: ex. "A2 + E7/E8 + FX 96, 99,
> 104".

## Bloco 2 — Lei das Camadas (doutrina da fronteira, Parte 7)

> **Lei das Camadas (`doutrina-fronteira-codigo-infra.md` — autoridade nesta
> fronteira):** "infraestrutura 100% Google" refere-se à Camada 2 (Hosting,
> Auth, Firestore, Storage, Functions) e NÃO autoriza bibliotecas no browser. A
> Camada 1 (todo código baixado pelo browser) permanece 100% pura: HTML5, CSS3
> OOCSS, JS vanilla, zero SDKs — o SDK Web do Firebase é **proibido por padrão**
> no front. O browser conversa com o Google exclusivamente via `fetch`: Padrão
> **E17** (Auth REST do Identity Toolkit, Firestore REST com conversor de
> campos, URLs assinadas para Storage) ou, preferencialmente em SaaS/CRM, via
> nossos próprios endpoints em Cloud Functions com **cookie de sessão
> HttpOnly** (arquitetura BFF). SDKs oficiais do Google (`firebase-admin` etc.)
> são corretos e padrão **apenas em `functions/`** (servidor), com versões
> fixadas. Tempo real: primeiro polling via E17 com pausa em aba oculta; SDK Web
> só por exceção registrada em `docs/decisoes.md` (import modular, `import()`
> dinâmico, só na tela que precisa, peso no orçamento). Se encontrar SDK Web já
> em uso num projeto: não é retrabalho imediato — registre em `decisoes.md` e
> planeje a migração para E17/BFF na próxima iteração, salvo requisito real de
> tempo real que justifique a exceção.

> ⚠️ **Neste projeto o SDK Web ESTÁ em uso, sob a exceção de tempo real
> registrada em `docs/decisoes.md`.** Não é autorização para espalhá-lo: código
> novo que precise falar com o Google deve preferir E17/`fetch`, e a migração
> está na lista de conformidade pendente.

## Bloco 3 — Empacotamento (produtos distribuíveis, Parte 7)

> Módulos e produtos seguem os padrões **E18** (módulo distribuível) e **E19**
> (GitHub e autoinstalação) de `manual-produtos-distribuiveis.md`.

---

## O que é específico deste projeto

**Arquétipo A1 — Suíço Minimal.** Quase-branco dominante, o acento aparece
pouco, grid rígido, tudo alinhado à esquerda, movimento mínimo (300ms). O acento
é **configurável pelo cliente** (desvio registrado): a carcaça é vendida a
vários negócios. Tokens em `styles/tokens.css`.

**A REGRA DE ACESSO QUE A CARCAÇA JÁ COBRA, e que o produto herda:**

> Quem é `membro` navega e visualiza. Escrever é exceção, e cada exceção é uma
> linha que alguém teve que justificar.

Ela vale em três camadas — barra, tela e regra do banco —, e as três falham de
jeitos diferentes: a barra esconde, a tela não oferece, e **só a regra do banco
trava de verdade** (quem abre o console do navegador passa por cima das duas
primeiras). São cobradas por `test/unit/so-admin.test.js` e `test/rules/`.

⚠️ Ao dar a um membro qualquer permissão nova, leia esses dois arquivos ANTES.
A lista `PODE_GRAVAR` nasce vazia de propósito: cada linha acrescentada ali é
uma porta, e o momento de acrescentá-la é o momento de justificá-la.

**Os três papéis:** `membro` (usa), `gestor` (cuida do conteúdo) e `admin`
(marca, dinheiro e pessoas). O nível `gestor` existe mesmo com pouca coisa sob
ele — está pronto para o dia em que o produto tiver trabalho de rotina para
delegar, e as regras do banco já o conhecem. Ver `base/escopo.js`.

**Idioma:** todo código, comentário, teste e texto de tela em português do
Brasil. O dono não é programador e lê o código — é ele quem confere se o que
está escrito bate com o que foi combinado.

**Comentário explica o PORQUÊ**, nunca o quê. Decisão sem motivo escrito é
decisão que alguém desfaz em seis meses.

**Testes:** `npm run test:unit` (tela, jsdom) · `npm run test:medida`
(geometria, Chrome sem interface) · `npm test` (regras, sobe emulador) ·
`cd functions && npm test` (servidor). `npm run test:tudo` encadeia os três
primeiros. Nenhuma entrega sai com suíte vermelha.

⚠️ **jsdom não calcula layout.** Ali todo elemento tem largura zero, e
`getComputedStyle` devolve o que foi escrito, não o que o navegador resolveu.
Largura, posição, sangria, o que gruda e rolagem horizontal se provam em
`test/medida/`, que abre a casca real com as folhas reais no Chrome e mede.
Regra prática: se a pergunta é "quantos pixels?", ela não se responde em jsdom.
