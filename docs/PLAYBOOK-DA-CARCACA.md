# Playbook da carcaça

**O que este documento é:** o custo de descoberta desta carcaça, transformado em
instrução. Cada seção aqui é uma armadilha real — algo que pareceu certo, foi ao
ar, e cobrou horas ou dias para ser entendido.

**Como usar:** leia antes de começar, não depois. Quase tudo aqui é problema que
só aparece depois de pronto, e vários deles **não quebram nada visível** — é
essa a característica que os torna caros.

**Ao pisar numa armadilha nova, escreva ela aqui.** É isso que impede o custo de
voltar. Uma seção nova segue a forma das outras: **sintoma → causa → regra**.

---

## De onde isto veio

Esta carcaça nasceu de uma área de membros premium que foi ao ar, vendeu e
quebrou algumas vezes. Quando ela virou matriz, o produto saiu — cursos, aulas,
fórum, lives, gamificação, o gateway de pagamento — e ficou o que serve a
qualquer negócio.

Este playbook passou pela mesma separação. **O que sobrou aqui vale para
qualquer produto construído nesta base.** O que era daquele negócio (a ordem de
montar uma área de membros, as decisões sobre assinatura e checkout, o passo a
passo do gateway) ficou no projeto de origem, junto do código que o explicava.

Duas coisas não estão aqui e vale saber onde procurar:

- **As regras de operação** — commitar por etapa, não publicar o que não está
  commitado, conserto vai sozinho no deploy — estão no `CLAUDE.md`, Bloco 00.
- **O raciocínio do meio de pagamento** — preço no servidor, webhook que libera,
  cancelamento que não tira acesso — está nos comentários de
  `functions/index.js` e `modules/pagamento/module.js`, junto do lugar onde o
  próximo gateway vai entrar.

---

# Parte 1 — As armadilhas que custaram tempo

Cada uma aqui é uma história real: **sintoma → causa → regra**.

## 1.1 `100%` dentro de `calc()` mede o elemento onde a conta acontece

**Sintoma:** o hero "de ponta a ponta" parava em 1168px numa tela de 1920, em
vez de ir até a borda. Em janela pequena parecia certo.

**Causa:** a sangria era margem negativa do tamanho de uma variável definida
como `max(24px, (100% - 1120px) / 2)`. No miolo, `100%` era a área toda e a
folga dava 276px. **Dentro do hero, `100%` já era a coluna de leitura de 1120px**
— e a mesma conta dava 24px.

**Regra:** custom property com percentual é substituída como **texto**, não como
valor. Ela é recalculada em cada elemento que a usa. Para atravessar um
container, **não tente adivinhar o padding dele** — use uma grade com linhas
nomeadas:

```css
.miolo {
  display: grid;
  grid-template-columns:
    [sangria-inicio] var(--folga) [coluna-inicio] minmax(0, 1fr)
    [coluna-fim] var(--folga) [sangria-fim];
  align-content: start; /* senão a grade estica as seções */
  padding: var(--respiro) 0; /* folga é coluna, não padding */
}
.miolo > * {
  grid-column: coluna-inicio / coluna-fim;
}
[data-hero='sangria'] .hero {
  grid-column: sangria-inicio / sangria-fim;
}
```

Três conversas até alguém medir. Ver 1.9.

## 1.2 Cabeçalho flutuante quebra tudo que "gruda"

**Sintoma:** um índice lateral que "grudava" na rolagem perdia as primeiras linhas — elas ficavam atrás do cabeçalho.

**Causa:** para a imagem passar por baixo da faixa do topo, o conteúdo passou a
ocupar as duas linhas da grade e o cabeçalho a flutuar por cima. A régua do
`position: sticky` é a área visível do container que rola — e ela agora **começa
embaixo do cabeçalho**. Quem grudava em `top: 12px` grudava atrás dele.

**Regra:** ao pôr o cabeçalho por cima do conteúdo, revise **todo** `sticky`:
`top: calc(var(--altura-topo) + 12px)`. E a altura da faixa precisa ser **uma
variável só** — ela entra na conta de quatro lugares (grade, respiro do
conteúdo, subida do hero, ponto de virada da rolagem) e no celular ela muda.

## 1.3 Barra translúcida sobre nada ≠ barra translúcida sobre conteúdo

**Sintoma:** letras fantasma atravessando o cabeçalho em toda tela.

**Causa:** a faixa era `84% da cor + transparente`. Enquanto nada passava por
baixo dela, isso dava uma cor chapada. Quando ela passou a flutuar sobre o
conteúdo, os 16% viraram o texto rolando.

**Regra:** faixa opaca por padrão. Para manter o tom exato de antes, misture com
a cor do que está atrás: `color-mix(in srgb, var(--cor-topo) 84%, var(--cor-conteudo))`.
Translucidez só onde é intencional — sobre a imagem — e ela volta a ser opaca
assim que o texto chega. **Legibilidade ganha de efeito, sempre.**

## 1.4 Função que "aplica tudo" chamada com objeto parcial

**A que mais custou. Três conversas de diagnóstico.**

**Sintoma:** o hero voltava a ser um cartão sozinho. Recarregar consertava.

**Causa:** a prévia ao vivo da tela de Identidade chamava `aplicarTema()` com os
treze campos **daquela seção**. `aplicarTema` aplica a identidade inteira — todo
campo ausente virava o padrão dele. Mexer numa cor derrubava o hero, a proporção
das capas e o nome abaixo da capa. Nada ia ao banco, então ninguém ligava uma
coisa à outra.

**Regra:** função que aplica um documento inteiro **exige** o documento inteiro.
Quem chama com um recorte mistura: `aplicarTema({ ...salvo, ...doFormulario })`.
Escreva isso como teste do contrato, para a próxima pessoa saber sem descobrir.

## 1.5 Tela que grava documento inteiro apaga campo de outra tela

**Causa:** a tela de Identidade grava com `merge: false` de propósito (apagar uma
imagem precisa apagar o campo). Toda tela que guarda um campo no **mesmo
documento** precisa ser preservada ali explicitamente.

**Regra:** ao acrescentar um campo em documento compartilhado, preserve-o em
**toda** tela que grava o documento inteiro — e escreva um teste que leia o
código-fonte procurando essa linha. Aconteceu três vezes neste projeto
(`areasDesligadas`, depois `ofertaRenovacao`, `termosUrl` e `privacidadeUrl`).

## 1.6 Lista branca no banco recusa a gravação INTEIRA

**Sintoma:** "erro de permissão" ao salvar um formulário recém-preenchido, sem
dizer qual campo.

**Causa:** `hasOnly([...])` no `firestore.rules` recusa tudo se aparecer um campo
que ele não conhece. Campo novo na tela sem a linha correspondente na regra
derruba o salvamento todo.

**Regra:** campo novo = três lugares no mesmo commit (tela, lista de campos do
código, regra do banco). Escreva um teste que leia a lista de verdade e cobre as
regras contra ela — é o único jeito de a quarta rede social não nascer quebrada.

## 1.7 Identificador com nome diferente entre camadas

**Sintoma:** promover alguém a gestor tirava o acesso ao Storage dessa pessoa.

**Causa:** a lista de usuários era montada como `{ uid, ...dados }`, e o código
procurava por `u.id`. A busca falhava **sempre** e devolvia objeto vazio. Aí o
carimbo do token recebia "ativo: indefinido", que é lido como "fora da equipe".

**Regra:** `find` que devolve `undefined` silenciosamente é a classe de erro mais
cara que existe. Onde o resultado de uma busca alimenta permissão, teste que ela
**acha**, e não só que o código roda.

## 1.8 CSS não dá erro — ele desiste calado

Uma chave `}` sobrando ficou semanas no arquivo. O navegador engole e segue, e o
efeito aparece longe de onde o erro foi digitado.

**Regra:** tenha um teste que conta chaves e comentários abertos em cada folha.
Dez milissegundos, e faz pelo CSS o que `node --check` faz pelo JavaScript.

## 1.9 jsdom não calcula layout

**A causa de 1.1 ter demorado três conversas.**

Em jsdom todo elemento tem largura zero e `getComputedStyle` devolve o que foi
escrito, não o que o navegador resolveu. Nenhum teste de tela podia pegar
"o hero está 500px mais estreito do que devia".

**Regra:** **se a pergunta é "quantos pixels?", ela não se responde em jsdom.**
Monte uma suíte que abre a casca real com as folhas reais num Chrome sem
interface e mede com `getBoundingClientRect`. Ver Parte 4.

## 1.10 Script que sai do HTML leva os caminhos relativos junto — e eles mudam

**Custou o login inteiro, em produção, com a suíte verde o tempo todo.**

O `<script type="module">` embutido no `login.html` virou `base/login.js` (uma
mudança boa — é ela que permite a CSP sem `unsafe-inline`, ver 5.2). Os `import`
foram copiados sem serem recalculados: `./base/auth.js`, correto para uma página
na raiz, virou `/base/base/auth.js` para um arquivo dentro de `base/`.

**O modo de falhar é o pior possível: um módulo que leva 404 não quebra a
página, ele SOME.** O navegador desiste do grafo inteiro em silêncio. A tela
continua de pé, bonita, com todos os botões desenhados — e nenhum ligado a
coisa alguma. Sumiram os botões de Suporte e Financeiro, e as TRÊS formas de
entrar pararam de responder ao clique. Quem deslogou não conseguiu voltar.

Os testes de então liam o `login.html`, achavam os botões escritos lá, e
passavam. Ninguém estava errado — ninguém estava olhando.

**Regra — três guardas, e as três são baratas:**

1. Um teste que resolve TODO `import` relativo do front contra o disco
   (`test/unit/importacoes-existem.test.js`). Milissegundos. É o `node --check`
   dos caminhos, e teria pego isto antes do commit.
2. Um teste de navegador que reprova se a página pedir qualquer arquivo que não
   exista (`test/medida/carregamento.test.js`). Quem anota o 404 é o servidor de
   teste — do lado de fora não há o que interpretar.
3. Um teste que prove que o módulo **rodou**, e não só que baixou: uma marca que
   só o JavaScript deixa. Na entrada é o título da aba, que nasce neutro no HTML
   e é trocado pelo nome do produto. Título trocado é módulo vivo.

**E ao mover script para arquivo, releia cada `import` perguntando "relativo a
quê?".** O HTML resolve a partir da página; o módulo, a partir de si mesmo.

## 1.11 `execFileSync` congela o servidor de teste que está no mesmo processo

**Achado enquanto se escrevia o teste de 2.10, e explica flutuação antiga.**

`execFileSync` (e `spawnSync`) **param o event loop do Node** até o filho
terminar. Um servidor HTTP criado dentro do processo de teste vive nesse event
loop — logo, enquanto o navegador está aberto, **ele não atende ninguém**. O
navegador pede a página, ninguém responde, e ele desenha a página de erro dele.

E a página de erro é um DOM válido: um teste que só procure uma etiqueta lá
dentro passa contente, sem nunca ter visto o site.

Não falha sempre — o sistema operacional segura a conexão numa fila, e se o
navegador demorar o bastante para chegar na requisição, às vezes dá certo.
**"Às vezes" é o pior resultado possível num teste:** verde na máquina de quem
escreveu, vermelho na de quem herdou, e ninguém confia mais em nenhum dos dois.

**Regra:** servidor de teste roda em **processo separado** (`_servidor.js` sobe
`_servidor-filho.js` e espera a marca de pronto). E ele fala com o teste por
**arquivo**, nunca por `stdout`: o processo de teste está parado justamente
enquanto o navegador roda, e nesse tempo não escuta cano nenhum.

**E cobre a página de erro explicitamente.** O título dela é o nome do host, e o
host de teste nunca é título de página nossa — uma linha que transforma "passou
sem ver nada" em falha com recado.

## 1.12 A CSP quebra o que só é buscado no clique — e o teste não vê

**Foi ao ar junto com 2.10, e ficou escondido atrás dele.**

A política nasceu com `script-src 'self' https://www.gstatic.com`. O SDK do
Firebase busca **`https://apis.google.com/js/api.js`** para montar o popup de
entrada do Google — e busca isso **só no momento do clique**. Resultado:

```
Loading the script 'https://apis.google.com/js/api.js' violates the following
Content Security Policy directive: "script-src 'self' https://www.gstatic.com"
→ FirebaseError: auth/internal-error
```

O teste de CSP abria as três páginas, esperava, e coletava as violações. Nenhuma
delas aparecia, porque **página aberta e deixada quieta nunca pede esse
arquivo**. Verde sobre um login quebrado.

**Regra:** o Google Sign-In precisa de `https://apis.google.com` em
`script-src` **e** em `frame-src`, além de `https://*.firebaseapp.com` e
`https://accounts.google.com` em `frame-src`.

**Regra maior, que vale além deste caso:** um recurso buscado **sob interação**
é invisível para um teste que só carrega. **Se um botão dispara ida à rede, o
teste tem que apertar o botão.** O espião do `csp.test.js` hoje clica no
`#btGoogle` antes de coletar — foi o que transformou este defeito em falha com
recado, em vez de uma reclamação de cliente.

## 1.13 Cabeçalho de segurança novo não entra junto com um conserto

Em 04/09/2026, no meio do conserto de 2.10 e 2.12, foi adicionado um
`Cross-Origin-Opener-Policy: same-origin-allow-popups` que **ninguém tinha
pedido**. A justificativa parecia boa (é o valor que o Firebase recomenda), mas
o efeito prometido — fazer o SDK perceber o popup fechado — **não se confirmou
no teste**: o aviso do console continuou, porque ele vem do COOP que a Firebase
serve no domínio dela.

Ele ficou no ar das 12:42 às 13:13. Nessa exata janela apareceu um
`500. That's an error.` do Google no login. Removido o cabeçalho, o login voltou.

**Não ficou provado que o COOP causou o 500** — o login bem-sucedido só veio
quase sete horas depois, e tentativa que falha não fica registrada em lugar
nenhum. E é esse o ponto: **não deu para saber**, porque duas mudanças
diferentes viajaram no mesmo deploy.

**Regra:** conserto vai sozinho. Endurecimento de segurança é mudança própria,
com deploy próprio, depois que a tela estiver comprovadamente de pé. Misturar
os dois troca uma pergunta com resposta ("o conserto funcionou?") por uma sem
resposta ("qual das duas quebrou?").

**E a regra que vem antes dessa:** melhoria que o dono não pediu não entra em
produção junto de um incêndio. O COOP continua fora até que alguém demonstre,
com medida, o que ele resolve aqui.

---

## 1.14 Sincronizar cópia com `tar` (ou `cp`) deixa fantasma

**Sintoma:** um teste reprovou na cópia e passou no original, com a mesma
suíte e o mesmo commit.

**Causa:** a sincronização copiava arquivos, e **cópia não apaga**. Um módulo
removido no original continuava vivo na cópia — e continuava sendo carregado,
porque nada no código dizia que ele tinha morrido.

**Regra:** ao sincronizar uma cópia, a lista do que DEVE existir é `git ls-files`
do original. O que estiver na cópia e não na lista é fantasma, e some.

```
cd original && git ls-files > /tmp/devem.txt
cd copia && for f in $(find . -type f -name '*.js'); do
  grep -qxF "${f#./}" /tmp/devem.txt || echo "sobrando: $f"
done
```

E o motivo de isto ser insidioso: o fantasma **não quebra nada visível**. Ele só
volta a existir. Foi um teste de lint (classe usada sem CSS) que o denunciou —
por acidente, e não porque alguém procurava.

## 1.15 Teste com lista escrita à mão envelhece calado

**Sintoma:** depois de remover funcionalidade, um teste passou a cobrar coisas
que já não existiam — e "consertá-lo" era só apagar linhas da lista dele.

**Causa:** o teste guardava um inventário manual (os ícones que o produto usa).
Ele nunca soube o que o produto usa: ele sabia o que alguém digitou ali um dia.

**Regra:** teste de inventário PERGUNTA AO CÓDIGO, não a uma lista.

```js
// ruim — envelhece no primeiro módulo que entrar ou sair
const usados = ['casa', 'sino', 'chave', ...];

// bom — vale sozinho para todo módulo que existir
const usados = new Set(modulos.map((m) => m.icone));
for (const m of fontes.matchAll(/icone:\s*'([a-z-]+)'/g)) usados.add(m[1]);
```

⚠️ **E mantenha o cinto:** `assert.ok(usados.size >= 5)`. Uma varredura que
para de casar devolve conjunto vazio e o teste passa dizendo que está tudo bem
sem ter olhado nada. É o mesmo defeito de 1.8, com outra roupa.

## 1.16 Remover funcionalidade deixa CSS, token e ícone órfãos — e nenhum teste vê

**Sintoma:** nenhum. É esse o problema.

Depois de remover doze módulos, `modulos.css` continuava com **1631 linhas, 83%
das classes sem uso** — estilos de telas que não existiam mais. Havia um lint
para "classe usada no JS sem CSS"; **não havia o contrário.**

**Regra:** os dois sentidos precisam de guarda, e eles pegam coisas diferentes:

| Lint                     | Pega                      |
| ------------------------ | ------------------------- |
| classe no JS **sem** CSS | tela que nasce sem estilo |
| CSS **sem** classe no JS | peso morto que ninguém vê |

O segundo não pode reprovar sozinho — um seletor pode ser montado
dinamicamente. Rode-o como RELATÓRIO ao remover funcionalidade, com varredura
conservadora (qualquer literal de texto no JS conta como uso).

⚠️ **TOKENS SÃO A EXCEÇÃO, e não removê-los é a decisão certa.** `--s-7`,
`--raio-lg`, os `--z-*` são ESCALA, e escala incompleta deixa de ser escala.
Órfão de escala fica; órfão de funcionalidade sai.

⚠️ **Ícone que nomeia tela inexistente é pior que peso morto:** ele convida a
ser reusado com outro sentido, e aí a barra passa a mentir. Esses saem. O
vocabulário genérico de UI (editar, apagar, voltar, baixar) fica.

---

## 1.17 Apagar uma seção leva a linha da seção vizinha junto

**Sintoma:** "O visual do site" aparecia na Identidade com título e explicação,
e **vazia por dentro**. Tema claro/escuro, cor de destaque e fontes tinham
sumido da tela. Nenhum erro, nenhum teste vermelho, uma semana no ar.

**Causa:** ao remover a seção "Formato das capas", o corte foi feito por FAIXA
DE LINHAS — do comentário que abria o bloco até o `append` que o fechava. A
faixa engoliu a última linha da seção ANTERIOR:

```js
secaoTema.append(linhaTema, linhaCor, linhaFonte, linhaIndividual); // ← foi junto
// ---------------- O formato das capas ----------------              // ← início do alvo
```

**Por que passou:** os quatro controles continuaram sendo construídos, ligados à
prévia e **salvos no banco** ao clicar em Salvar. O código não tinha ponta
solta: eles só não estavam na tela. `importacoes-existem` não vê isso — não há
import quebrado. E nenhum teste cobrava que uma seção tivesse conteúdo.

**São dois erros diferentes, e cobrir um não cobre o outro:**

| Erro                                   | Efeito na tela        |
| -------------------------------------- | --------------------- |
| seção criada e não anexada à **caixa** | a seção inteira some  |
| seção anexada e sem nada **dentro**    | sobra um título órfão |

O segundo é pior: quem procura o ajuste ali conclui que ele foi **removido do
produto**, e vai procurar em outro lugar — ou pedir de volta uma coisa que
existe.

**Regra 1 — ao apagar por faixa de linhas, olhe a linha ANTERIOR ao início e a
SEGUINTE ao fim.** Comentário de seção é ímã: ele parece o começo do bloco, e o
que vem imediatamente antes dele costuma ser o fecho do bloco anterior.

**Regra 2 — cobre as duas coisas por teste.** Em `identidade.test.js`, os dois
testes leem o código-fonte, varrem todo `const secaoX = bloco(` e exigem que
cada uma apareça no `caixa.append` **e** receba conteúdo. Valem sozinhos para
qualquer seção que entrar depois.

---

# Parte 2 — Acesso: três camadas, e as três precisam concordar

Barra lateral → telas → regras do banco. **As regras não protegem botões, elas
protegem caminhos** — esconder um item de menu não impede ninguém de digitar o
endereço ou abrir o console.

Papéis: `membro (0) < gestor (1) < admin (2)`. O gestor existe para um caso real:
alguém que cuida do conteúdo do dia a dia (publica, edita, escreve aviso) **sem
acessar a área de pagamento**.

⚠️ Ao criar o papel do meio, o trabalho não é _trancar_ — o padrão do banco já é
negar. O trabalho é **destrancar** as coleções de conteúdo para a palavra nova, e
**garantir que as de dinheiro fiquem de fora** dessa abertura.

# Parte 3 — White-label: onde a sua marca vaza

Vendendo a plataforma a terceiros, o comprador **do cliente** nunca pode
encontrar vestígio seu. O vazamento nunca está no logo — está nos lugares onde
ninguém confere.

| Onde                                 | O que aconteceu                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Título da aba da página de pagamento | Escrito à mão. O comprador do cliente via a nossa empresa no meio do checkout dele. |
| Título da aba do login               | O mesmo, e indexável por buscador.                                                  |
| Sombra dos botões, anel de foco      | `rgba` do nosso índigo cravado. Cliente de marca laranja herdava halo roxo.         |
| CSP                                  | Se citar o id do seu projeto, quebra a instalação de todo cliente. Use curinga.     |

**Regra:** um teste que varre as folhas de estilo e o HTML procurando a sua cor e
o seu nome, ignorando comentários e a declaração do token padrão. Custa dez
linhas e fecha a categoria inteira.

**Áreas desligáveis.** Todo cliente desliga pelo menos uma (Comunidade, Ao Vivo,
Conexão, Produtos, Gamificação). Duas exigências: a barra **nasce completa e
perde itens** — falhar assim deixa a pessoa navegando no sistema inteiro em vez
de ficar sem metade dele sem explicação; e o roteador precisa **desviar** o
endereço de área desligada, senão o link guardado abre uma tela vazia.

**Dependência entre áreas.** Gamificação sem Comunidade não faz sentido. Faça a
tela desmarcar na hora, na frente da pessoa — descobrir depois que uma sumiu
sozinha é pior que a regra.

---

# Parte 4 — Como testar (o maior multiplicador)

Quatro suítes, cada uma respondendo a uma pergunta diferente.

| Suíte               | Responde                                  | Onde roda                             |
| ------------------- | ----------------------------------------- | ------------------------------------- |
| Tela                | "a lógica está certa?"                    | jsdom, rápido                         |
| **Geometria e CSP** | "quantos pixels? a política quebra algo?" | Chrome sem interface                  |
| Regras              | "o console do navegador consegue passar?" | emulador do Firestore                 |
| Servidor            | "a função faz o que promete?"             | Node puro, com dependências injetadas |

## 4.1 A suíte de medida — o que ela deve cobrir

Monte a casca real com as folhas reais, abra no Chrome sem interface e meça.
Duas decisões que evitam teste inútil:

- **`--hide-scrollbars`.** Sem isso, toda medida horizontal vem 15px menor no
  Windows e igual no Mac — o teste passa a depender do sistema de quem roda, que
  é o jeito mais rápido de virar teste ignorado.
- **Nome de host que não é `localhost`.** O código troca de endereço quando
  reconhece a máquina local (fala com o emulador). Testar por lá aprova coisas
  que quebram em produção. Use `--host-resolver-rules=MAP teste.exemplo 127.0.0.1`.
- **Falhe alto quando não achar navegador.** Teste de medida que se desliga
  sozinho vira suíte verde que não mediu nada — e ninguém percebe, porque verde
  é o que se espera ver.

## 4.2 Prove que o teste pega o defeito

Depois de escrever um teste de guarda, **quebre o código de propósito** e
confirme que ele falha. Neste projeto, um dos três testes novos passou verde
numa mutação real: ele procurava `rgba(...)`, e o navegador devolve `color-mix`
no formato novo `color(srgb 1 1 1 / 0.84)`. O teste atestava algo que não estava
conferindo — o pior estado possível de um teste.

## 4.3 Testes de guarda que valem copiar

Estes não testam funcionalidade: impedem uma **categoria** de defeito de voltar.

- Toda folha de estilo com chaves equilibradas e comentários fechados
- Todo tipo de aviso (`avisar('x')`) tem uma cor `.aviso--x` correspondente
- Todo botão criado no JS tem regra de cor (um `<button>` não herda `color`)
- Toda classe usada no JS tem regra em algum CSS
- A nossa marca e a nossa cor não aparecem em lugar nenhum
- Zero rolagem horizontal de 320px a 2560px
- A CSP não bloqueia nada nas páginas de entrada, membros e pagamento
- Quem gruda desconta a altura do cabeçalho
- As listas brancas do banco conhecem todos os campos que as telas gravam

## 4.4 Como escrever o código para ele ser testável

**Separe a decisão da tela.** Toda função que decide algo (esta pessoa pode
cancelar? este cupom vale? qual a validade nova?) vira função pura, sem DOM e sem
banco. Isso é o que permite provar as regras em milissegundos.

**Injete as dependências nas funções de servidor.** Um núcleo que recebe
`{ lerUsuario, gravar, cancelarNoGateway }` se prova sem rede — inclusive os
caminhos tortos ("e se o gateway cair no meio?"), que são justamente os que
ninguém testa à mão.

---

# Parte 5 — Segurança: o mínimo antes do primeiro cliente

## 5.1 Cabeçalhos

O mais importante é `frame-ancestors 'none'` + `X-Frame-Options: DENY`. Sem
eles, **qualquer site embute a sua área de membros num quadro invisível e colhe
os cliques de quem já pagou** — numa área paga, isso é a conta de outra pessoa
sendo operada por um estranho.

Some `nosniff`, `Referrer-Policy` (o endereço da tela carrega id de curso, aula e
pedido) e `Permissions-Policy`. HSTS o Firebase Hosting já manda.

## 5.2 CSP: escreva o HTML pensando nela desde o começo

**Nenhuma página pode ter `<script>` embutido.** Um script dentro do HTML obriga
a política a liberar `unsafe-inline`, e isso desliga justamente a parte que
protege. Extrair depois é retrabalho barato, mas é retrabalho.

**Verifique num navegador, não lendo.** O emulador de hosting do Firebase
**ignora** o bloco de cabeçalhos — conferir por lá dá falso positivo. E o modo de
falhar da CSP é o pior possível: ela não dá erro de sintaxe, só bloqueia algo — a
fonte da marca, a chamada que confere o cupom — e a tela quebra só em produção,
só para quem já pagou.

## 5.3 Prove a segurança ATACANDO, e não lendo

Em 08/09/2026 o dono leu, num registro, que um item de segurança era "um risco
que só mudou de data" e respondeu: **"eu preciso de algo direito."**

Ele estava certo, e o defeito não era o item — era a frase. Ela tratava um
endurecimento como se fosse buraco, e deixava o suposto buraco sem nome nem
medida. **Adjetivo no lugar de fato.**

**Regra: não afirme que está fechado. Ataque, e mostre o código de resposta.**
São dois papéis, e o segundo é o que importa:

**1. Sem login,** com a chave web pública (que é pública mesmo — vai para todo
navegador):

```
curl "https://firestore.googleapis.com/v1/projects/SEU-PROJETO/databases/(default)/documents/usuarios?key=CHAVE"
curl -X POST -d '{"data":{}}' "https://REGIAO-SEU-PROJETO.cloudfunctions.net/FUNCAO"
```

**2. LOGADO COMO MEMBRO COMUM** — e este é o teste de verdade, porque o atacante
provável não é um estranho, é alguém que já entrou. Crie a conta pela API,
tente ESCALAR, e apague a conta depois:

```
curl -X POST -d '{"email":"...","password":"...","returnSecureToken":true}'   "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=CHAVE"
# com o idToken: promover o próprio cadastro, ler a lista de usuários,
# trocar a identidade, escrever aviso para todos, ler o cofre
```

**O que se espera ver:** `403` em toda leitura e escrita fora do permitido,
`PERMISSION_DENIED` em toda função. Qualquer `200` inesperado é o achado.

⚠️ **E CONFIRA O QUE "PASSOU" REALMENTE FEZ.** Na auditoria daqui,
`bootstrapAdmin` respondeu sem erro — `{criado: false}`. Parecia ter passado.
Só olhando o banco (`usuarios/{uid}` não existe) é que se prova que nada foi
criado. **Resposta sem erro não é permissão concedida, e resposta com erro não
é a única prova de que está trancado.**

⚠️ **SEPARE "BURACO DE ACESSO" DE "ABUSO DE CUSTO".** Quem protege o DADO são
as regras do banco e os `assert` das Functions. O App Check protege outra coisa:
impedir que alguém use a chave pública para martelar o Firestore por script,
queimando cota. Chamar o segundo de "risco de segurança" faz o dono perder
confiança no sistema inteiro por causa de uma palavra errada.

## 5.4 Varreduras que valem rodar antes de entregar

Todas dão resposta em segundos e cada uma já achou algo em algum projeto:

- Imports relativos que não resolvem
- Exports que ninguém importa (inclui HTML na busca, ou dá falso positivo)
- Funções publicadas que nenhuma tela chama — **achamos um endpoint de IA aberto
  a qualquer membro, sem teto de tamanho nem de chamadas, na conta do projeto**.
  Veio da base de referência com um comentário "apague quando não precisar".
- `innerHTML` com interpolação
- Links `target="_blank"` sem `rel="noopener"`
- Toda coleção usada pela tela tem regra própria no banco
- Cabeçalhos de segurança presentes na resposta de verdade
- **A lista do que o deploy publica de verdade** — `listFiles` do próprio
  `firebase-tools`, ver 7.4. O navegador apontado para o emulador NÃO responde
  essa pergunta: ele serve o que o deploy exclui.

## 5.5 A chave do gateway

Mora no **Secret Manager**, nunca no banco — o banco entra em backup diário, e
essa chave saca dinheiro. Guarde ao lado apenas a **pista** (últimos quatro
caracteres), para a tela poder dizer qual é sem poder devolvê-la.

**Quem instala não é programador.** A chave é colada **no painel**, não no
terminal. Ao salvar: valida no gateway → confere a chave PIX → gera o token do
webhook → **guarda** → só então registra o webhook. Guardar antes de registrar é
o que impede o gateway de ficar com um token que você não conhece.

---

# Parte 6 — Doutrina de código desta carcaça

Vale além da área de membros.

**Camada 1 (navegador) é vanilla puro.** HTML, CSS e JS em módulos ES. SDK no
front só por exceção registrada. O navegador fala com o Google por `fetch`, ou
por endpoints próprios.

**A página pública de pagamento tem SDK zero.** Ela é a página de quem ainda não
é ninguém — carregar meio megabyte de biblioteca para mostrar um formulário e um
QR é perder venda por lentidão. Firestore por REST, com um conversor de campos.

**Comentário explica o PORQUÊ, nunca o quê.** Decisão sem motivo escrito é
decisão que alguém desfaz em seis meses. Todo `⚠️` deste projeto marca uma
armadilha real que alguém já pisou.

**Português do Brasil em tudo** — código, comentário, teste e tela. O dono lê o
código e não é programador.

**Nenhuma entrega sai com suíte vermelha.**

---

# Parte 7 — O ambiente local em Docker

Quatro armadilhas medidas em 08/09/2026, ao empacotar os emuladores. Três delas
**não quebram nada visível** — que é o que as torna caras. O guia de uso está em
`docs/AMBIENTE-LOCAL-DOCKER.md`.

## 7.1 O emulador não guarda o banco com SIGTERM — só com SIGINT

`--export-on-exit` promete gravar o banco ao desligar. Ele grava no caminho do
**Ctrl+C**, que é SIGINT. O Docker manda **SIGTERM**.

O resultado do primeiro teste: `docker compose down`, volume vazio, **e nenhuma
mensagem de erro**. O trabalho da tarde inteira desaparece em silêncio, e a
pessoa só descobre no dia seguinte, ao subir e achar tudo em branco.

**A regra:** quem recebe o sinal do Docker traduz para SIGINT antes de repassar.
Está em `.docker/entrada.mjs`, na função `encerrar()`.

E há um segundo degrau: o processo 1 do container é o ponto de entrada, não o
`firebase`. Sem repassar sinal nenhum, o Docker mata tudo de uma vez e nem o
SIGINT acontece.

## 7.2 `--export-on-exit` não pode apontar para o ponto de montagem

Corrigido o sinal, o despejo passou a acontecer — e a falhar:

```
Export failed: EBUSY: resource busy or locked, rmdir '/dados'
```

O `firebase` **apaga a pasta de destino** antes de gravar. Ponto de montagem de
volume não se apaga. A correção é despejar numa **subpasta** do volume
(`/dados/despejo`), que é pasta comum e pode ser apagada e recriada.

⚠️ Esta falha, ao menos, aparece na tela. A da 7.1 não.

## 7.3 `firebase-tools` 15 exige Java 21 — e recusa tarde

O Debian das imagens `node:22-bookworm` traz Java 17 no repositório padrão. Com
ele, o `firebase-tools` instala as dependências, anuncia os emuladores, e **só
então** desliga tudo:

```
Error: firebase-tools no longer supports Java version before 21.
```

Como falha depois de dois minutos de saída bonita, parece defeito do projeto e
não de versão. A imagem copia o Java da imagem oficial do Temurin
(`COPY --from=eclipse-temurin:21-jre`), o que também prende a versão: ninguém
descobre num dia qualquer que o repositório mudou de número por baixo.

## 7.4 O emulador de hosting ignora `ignore` — e serve o que o deploy exclui

Já sabíamos que ele ignora `headers` (5.2). Ele ignora a lista `ignore` também.

`http://localhost:5000/.docker/compose.yml` responde **200**, e o arquivo **não
vai ao ar**. Ou seja: o emulador engana para os dois lados — otimista nos
cabeçalhos, pessimista no que publica. Olhar o navegador não responde nem uma
pergunta nem a outra.

**Quem responde é o próprio código que decide o que sobe:**

```js
const { listFiles } = require('firebase-tools/lib/listFiles.js');
listFiles('.', require('./firebase.json').hosting.ignore);
```

Rodado na matriz em 08/09/2026: 70 arquivos publicáveis. **Vale rodar antes de
uma entrega** — a lista da raiz cabe na tela, e é onde aparece o que ninguém
queria publicar. Ver 5.4.

---
