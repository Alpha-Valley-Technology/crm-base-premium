import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

// A BARRA LATERAL DA COMUNIDADE, cobrada de verdade.
//
// Isto não monta um menu de mentira: importa `modules/modulos.config.js` — o
// arquivo que o app carrega — e passa pelo mesmo `construirMenu` e
// `montarSidebar` que rodam no navegador. Menu remontado à mão no teste é
// exatamente o erro que já fez aprovar um app quebrado aqui.
//
// O que se cobra é a ORDEM e QUEM VÊ O QUÊ. As duas coisas são invisíveis num
// diff: trocar dois números de `ordem` não quebra nada, não estoura em lugar
// nenhum, e a barra amanhece diferente da que foi desenhada.

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;

const { default: modulos } = await import('../../modules/modulos.config.js');
const { construirMenu, validarModulo } = await import('../../base/registry.js');
const { montarSidebar } = await import('../../base/sidebar.js');
const { existeIcone } = await import('../../ui/icones.js');

// Trilhas NÃO está aqui: virou a ordem em que o conteúdo é servido, dentro de
// Cursos. Duas portas para o mesmo conteúdo criam a dúvida "clico em qual?".
// ⚠️ VAZIA NA MATRIZ, E É O PONTO. A carcaça não traz tela de produto nenhuma:
// o que ela entrega é entrar, sair, quem é quem, a marca, a equipe, o suporte e
// o lugar do pagamento. Produto novo pendura os módulos dele aqui em cima, e
// acrescenta o nome nesta lista — que é o que transforma "criei um arquivo" em
// "decidi mudar a navegação".
const NAVEGACAO = [];
// Notificações NÃO está aqui, e nem existe mais como tela: o sino abre um
// painel embaixo dele mesmo (base/sino.js). Aviso é coisa de olhar em pé —
// levar a pessoa a uma página para dizer "nada de novo" gasta um clique e uma
// troca de contexto por nenhuma informação.
const CONTA_MEMBRO = ['Meu Perfil', 'Suporte'];

function nomesNaTela(papel) {
  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, papel), nav);
  // `.menu-rotulo`, e não o item inteiro: quem tem sub-itens carrega a seta ▸
  // dentro do link, e ela entraria no nome.
  return [...nav.querySelectorAll('.menu-item .menu-rotulo')].map((a) => a.textContent.trim());
}

test('todo módulo plugado passa na validação da carcaça', () => {
  for (const m of modulos) validarModulo(m);
});

test('a barra do membro sai na ordem desenhada, e sem o painel de equipe', () => {
  assert.deepEqual(nomesNaTela('membro'), [...NAVEGACAO, ...CONTA_MEMBRO]);
});

test('o admin vê a mesma barra, com Administração no fim do rodapé', () => {
  assert.deepEqual(nomesNaTela('admin'), [...NAVEGACAO, ...CONTA_MEMBRO, 'Administração']);
});

test('só admin alcança a Administração — e ela é a única restrita', () => {
  const soAdmin = modulos.filter((m) => m.acesso === 'admin').map((m) => m.id);
  // Marca, dinheiro e pessoas. É a lista inteira da razão de o papel existir.
  assert.deepEqual(soAdmin.sort(), ['administracao', 'equipe', 'identidade', 'pagamento']);

  // ⚠️ O NÍVEL `gestor` FICA, mesmo com um só ocupante. Ele existe para o dia
  // em que um produto tiver trabalho de rotina para delegar — e as regras do
  // banco já o conhecem. Apagá-lo agora obrigaria a reinventá-lo depois, e
  // regra de acesso reinventada é regra de acesso escrita com pressa.
  const soGestor = modulos.filter((m) => m.acesso === 'gestor').map((m) => m.id);
  assert.deepEqual(soGestor.sort(), ['avisos']);
  assert.ok(!nomesNaTela('membro').includes('Administração'));
});

// A CASCA NÃO MUDA, MUDA O CONTEÚDO DA DIREITA — inclusive para o admin.
//
// A Configuração chegou a pendurar as ferramentas como sub-itens na barra. Isso
// fazia a navegação crescer quando quem entrava era dono: duas barras
// diferentes para o mesmo sistema. As ferramentas voltaram para dentro da tela.
test('a Administração não pendura ferramenta nenhuma na barra lateral', () => {
  const conf = modulos.find((m) => m.id === 'administracao');
  assert.equal(
    conf.menu.atalhos,
    undefined,
    'ferramenta de admin vive DENTRO da tela, nas abas — não na barra do membro',
  );

  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, 'admin'), nav);
  assert.equal(
    nav.querySelectorAll('.menu-subitem').length,
    0,
    'nenhum sub-item na barra: nem para admin',
  );
  assert.equal(
    nav.querySelectorAll('.menu-seta').length,
    0,
    'e nenhuma seta de gaveta, que prometeria uma escolha que não está ali',
  );
});

test('Equipe existe na rota, mas não na barra', () => {
  assert.equal(modulos.find((x) => x.id === 'equipe').menu.oculto, true);
  const naBarra = nomesNaTela('admin');
  assert.ok(!naBarra.includes('Equipe'));
});

// A tela de Notificações foi REMOVIDA, e não só escondida. Rota que ninguém
// alcança é código morto, e código morto engana quem lê depois.
test('não existe mais módulo de Notificações', () => {
  assert.equal(
    modulos.find((m) => m.id === 'notificacoes'),
    undefined,
  );
});

// O ALUNO SÓ ALCANÇA A VERSÃO DE ALUNO — e não é só o menu que garante isso.
//
// Esconder item de menu é maquiagem: quem digita o endereço passa por cima. O
// roteador recebe a lista JÁ FILTRADA por papel (base/app.js), então `#/
// configuracao` na barra de endereços de um aluno cai na primeira área dele, e
// não na tela de administração.
//
// A trava de verdade continua sendo a regra do banco e o `assertAdmin` das
// funções de servidor. Isto aqui é a terceira camada: não oferecer, e não abrir.
test('aluno que digita o endereço da administração NÃO chega nela', () => {
  const doAluno = modulos.filter((m) => m.acesso === 'membro');
  assert.ok(
    !doAluno.some((m) => m.id === 'administracao'),
    'a lista que o roteador do aluno recebe não pode conter a administração',
  );

  const porId = new Map(doAluno.map((m) => [m.id, m]));
  const alvo = porId.get('administracao') || doAluno[0];
  assert.equal(alvo.id, 'perfil', 'endereço desconhecido cai na primeira área do aluno');
});

test('a navegação e a conta ficam em blocos separados, sem título nenhum', () => {
  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, 'admin'), nav);

  assert.equal(
    nav.querySelectorAll('.menu-grupo').length,
    0,
    'a barra foi desenhada como lista corrida: rótulo aqui é palavra inventada',
  );

  // ⚠️ UM BLOCO POR GRUPO QUE TEM ITEM. Na matriz, com a navegação vazia,
  // sobra só o bloco da conta — e isso é o comportamento certo: um bloco vazio
  // desenharia uma divisória separando nada de coisa alguma.
  //
  // A conta é COBRADA SEMPRE, e a navegação só quando existe. Assim este teste
  // continua valendo no dia em que um produto pendurar as telas dele: ele
  // passa a cobrar dois blocos sozinho, sem ninguém lembrar de vir aqui.
  const blocos = [...nav.querySelectorAll('.menu-bloco')];
  assert.equal(blocos.length, NAVEGACAO.length ? 2 : 1);

  const conta = blocos[blocos.length - 1];
  assert.ok(
    conta.classList.contains('menu-bloco--rodape'),
    'sem esta classe o CSS não prega a conta no pé da barra',
  );
  assert.equal(
    conta.querySelectorAll('.menu-item').length,
    CONTA_MEMBRO.length + 1,
    'a conta traz Meu Perfil, Suporte e — para quem é admin — Administração',
  );

  if (NAVEGACAO.length) {
    assert.equal(blocos[0].querySelectorAll('.menu-item').length, NAVEGACAO.length);
  }
});

test('cada item leva ao próprio endereço', () => {
  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, 'admin'), nav);
  const enderecos = [...nav.querySelectorAll('.menu-item')].map((a) => a.getAttribute('href'));
  assert.deepEqual(enderecos, ['#/perfil', '#/suporte', '#/administracao']);
});

test('todo ícone pedido por um módulo existe — senão a barra sai com bolinha', () => {
  for (const m of modulos) {
    assert.equal(
      existeIcone(m.icone),
      true,
      `o módulo "${m.id}" pede um ícone que não existe: "${m.icone}"`,
    );
  }
});

test('nenhum id de módulo repetido — o roteador guarda por id e um comeria o outro', () => {
  const ids = modulos.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

// --- As telas ---

test('toda área abre uma tela, e nenhuma abre vazia', async () => {
  for (const m of modulos) {
    // As ferramentas de administração falam com o Firebase e têm teste
    // próprio; Meu Perfil também. Sobram as telas que se montam sozinhas.
    if (['equipe', 'identidade', 'avisos', 'pagamento', 'administracao', 'perfil'].includes(m.id))
      continue;
    const caixa = document.createElement('div');
    await m.montarTela(caixa, {});
    assert.ok(
      caixa.textContent.includes(m.nome),
      `a tela de "${m.id}" não diz onde a pessoa chegou`,
    );
    assert.ok(caixa.querySelector('.card'), `a tela de "${m.id}" abriu sem conteúdo nenhum`);
  }
});

// ⚠️ AS TELAS DO PRODUTO SAÍRAM DAQUI quando esta carcaça virou matriz.
//
// Eram os testes da Página Inicial, de Cursos e de Produtos Validados — telas
// de uma ÁREA DE MEMBROS, não da casca. Saíram junto com os módulos delas.
//
// O que sobrou neste arquivo é o que vale para qualquer produto construído
// aqui: a ordem da barra, quem alcança o quê, o endereço de cada item, o sino,
// e a ordem de montagem da carcaça.
//
// Tela nova de produto ganha arquivo de teste próprio, e não uma seção aqui:
// foi a mistura das duas coisas num arquivo só que fez este teste crescer para
// 460 linhas cobrindo dois assuntos diferentes.

// --- A carcaça, na ordem certa (mesma classe de erro do shell.test.js) ---

const appjs = () => readFileSync(new URL('../../base/app.js', import.meta.url), 'utf8');

test('a marca do cabeçalho só é pendurada DEPOIS de o cabeçalho existir', () => {
  const s = appjs();
  assert.ok(
    s.indexOf('class="app-header"') < s.indexOf("querySelector('.app-header')"),
    'procurar o cabeçalho antes de criá-lo estoura e derruba a montagem inteira',
  );
});

test('o logo entra na barra ANTES dos itens do menu', () => {
  const s = appjs();
  assert.ok(
    s.indexOf("criarMarca('app-logo')") < s.indexOf('montarSidebar(menu, sidebar)'),
    'depois do montarSidebar o logo cairia no meio da lista, não no topo',
  );
});

// --- O sino ---

const { criarSino, marcarNotificacoes } = await import('../../base/sino.js');

// BOTÃO, e não link: ele abre um painel aqui mesmo, não navega. Link que não
// navega confunde quem usa leitor de tela e quem clica com o botão do meio.
test('o sino é um botão que abre painel, e nasce APAGADO', () => {
  const sino = criarSino();
  assert.equal(sino.tagName, 'BUTTON');
  assert.equal(sino.getAttribute('aria-haspopup'), 'dialog');
  assert.ok(sino.querySelector('svg.icone'), 'sem ícone não há sino');

  const ponto = sino.querySelector('.app-sino-ponto');
  assert.ok(ponto, 'o ponto tem que existir desde o começo, só escondido');
  assert.equal(
    ponto.hidden,
    true,
    'sino aceso sem ter o que mostrar ensina a pessoa a ignorar o sino',
  );
});

test('o ponto acende e apaga pela mesma tomada', () => {
  const caixa = document.createElement('div');
  caixa.appendChild(criarSino());

  marcarNotificacoes(true, caixa);
  assert.equal(caixa.querySelector('.app-sino-ponto').hidden, false);

  marcarNotificacoes(false, caixa);
  assert.equal(caixa.querySelector('.app-sino-ponto').hidden, true);
});

test('quem não enxerga a bolinha recebe o aviso em texto', () => {
  const ponto = criarSino().querySelector('.app-sino-ponto');
  assert.equal(ponto.getAttribute('role'), 'status');
  assert.match(ponto.getAttribute('aria-label'), /não lidas/);
});

test('o sino é montado DEPOIS de o cabeçalho existir', () => {
  const s = appjs();
  assert.ok(
    s.indexOf('class="app-header"') < s.indexOf('criarSino()'),
    'pendurar o sino antes de a faixa existir estoura e derruba a montagem',
  );
});

test('o ponto vermelho NÃO tem animação — nem no CSS', () => {
  const css = readFileSync(new URL('../../styles/base.css', import.meta.url), 'utf8');
  const regra = (css.match(/^\.app-sino-ponto \{[^}]*\}/m) || [])[0];
  assert.ok(regra, 'a regra do ponto sumiu');
  assert.ok(
    !/animation|@keyframes/.test(regra),
    'bolinha que pisca sem parar vira papel de parede e mantém o navegador desenhando à toa',
  );
});

// ---------------------------------------------------------------------------
// ONDE CADA FERRAMENTA MORA — e por que isto precisa de teste
// ---------------------------------------------------------------------------
//
// ⚠️ MOVER UMA ABA DE ÁREA NÃO QUEBRA NADA. É esse o problema.
//
// Em 07/09/2026 "Avisos" saiu da Configuração e entrou na Administração, por
// decisão do dono. A suíte inteira continuou verde: 702 testes, nenhum deles
// olhando para onde as abas moram. Uma decisão de produto — qual ferramenta é
// rotina e qual é decisão rara — não tinha guarda nenhuma.
//
// É a mesma classe de erro que a `ordem` da barra: some no diff, não estoura em
// lugar nenhum, e a tela amanhece diferente da que foi desenhada. A diferença é
// que aqui a consequência é de acesso, não de gosto: a Configuração é do
// gestor, a Administração é do administrador. Trocar uma aba de lugar troca
// quem consegue usá-la.
//
// Lê o código-fonte porque as listas são internas aos módulos, e exportá-las só
// para o teste ver seria furar o encapsulamento pelo motivo errado.

const abasDe = (area) =>
  [
    ...readFileSync(new URL(`../../modules/${area}/module.js`, import.meta.url), 'utf8').matchAll(
      /\{\s*sub:\s*'([^']+)'/g,
    ),
  ].map((m) => m[1]);

test('a Administração guarda o que fala com a base inteira, e o caixa por último', () => {
  assert.deepEqual(
    abasDe('administracao'),
    ['identidade', 'avisos', 'equipe', 'pagamento'],
    'identidade e avisos falam com a base inteira; depois quem cuida, e o caixa',
  );

  const ferramentas = abasDe('administracao');
  assert.equal(
    ferramentas[ferramentas.length - 1],
    'pagamento',
    'a aba que move dinheiro não pode ser a primeira que o dedo encontra',
  );
});

// ⚠️ NENHUMA FERRAMENTA EM DUAS ÁREAS AO MESMO TEMPO.
//
// Duas portas para a mesma tela é a dúvida "clico em Configuração ou em
// Administração?", que quem administra tem toda vez — e é o mesmo motivo pelo
// qual "Trilhas" não virou item de menu neste produto.
test('nenhuma ferramenta aparece duas vezes na mesma área', () => {
  const abas = abasDe('administracao');
  assert.equal(
    new Set(abas).size,
    abas.length,
    'aba repetida: duas portas para a mesma tela é a dúvida "clico em qual?"',
  );
});
