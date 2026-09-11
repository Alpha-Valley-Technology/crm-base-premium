// A BARRA RECOLHIDA, no desktop.
//
// O que se cobra aqui é o que não aparece num diff: que o nome do item tem
// elemento próprio (sem isso, recolher esconde o ícone junto), que a sigla sai
// legível de qualquer marca, e que a preferência não derruba a tela quando o
// navegador recusa guardar dados.

import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://x.test/' });
globalThis.document = dom.window.document;
globalThis.window = dom.window;

const { sigla, imagemCompacta, ligarRecolher, lerPreferencia, gravarPreferencia } =
  await import('../../base/barra-recolhida.js');
const { montarSidebar } = await import('../../base/sidebar.js');
const { construirMenu } = await import('../../base/registry.js');
const { default: modulos } = await import('../../modules/modulos.config.js');

// ===========================================================================
// A LINHA QUE TORNOU ISTO POSSÍVEL
// ===========================================================================

// ⚠️ O nome era um nó de texto solto ao lado do ícone, dentro do mesmo `<span>`.
// Com a barra recolhida, o CSS não teria como esconder SÓ o nome — esconder o
// pai levaria o ícone junto, e a barra estreita ficaria vazia.
test('cada item do menu tem o nome em elemento próprio, separado do ícone', () => {
  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, 'admin'), nav);

  const itens = [...nav.querySelectorAll('.menu-item')];
  // A matriz nasce com o pe da barra apenas: Meu Perfil, Suporte e
  // Administracao. Produto novo pendura os dele em cima, e este teste passa a
  // cobrir todos sem precisar mudar.
  assert.ok(itens.length >= 3, 'o menu precisa ter itens para este teste valer');

  for (const item of itens) {
    const nome = item.querySelector('.menu-nome');
    assert.ok(nome, `item sem .menu-nome: "${item.textContent.trim()}"`);
    assert.ok(nome.textContent.trim(), 'o .menu-nome está vazio');
    // O ícone tem que ser IRMÃO do nome, e não estar dentro dele — senão some
    // junto quando o nome for escondido.
    assert.ok(
      item.querySelector('.menu-rotulo > svg, .menu-rotulo > .icone'),
      'o ícone precisa ser filho direto do rótulo, fora do nome',
    );
  }
});

// Com a barra estreita, ícone sem dica é adivinhação.
test('todo item leva o nome como dica do navegador', () => {
  const nav = document.createElement('nav');
  montarSidebar(construirMenu(modulos, 'admin'), nav);
  for (const item of nav.querySelectorAll('.menu-item')) {
    const nome = item.querySelector('.menu-nome').textContent.trim();
    assert.equal(item.getAttribute('title'), nome);
  }
});

// ===========================================================================
// A SIGLA
// ===========================================================================

test('a sigla é a inicial de cada parte da marca', () => {
  assert.equal(sigla('NINJA', 'DIGITAL', 'Produto'), 'ND');
  assert.equal(sigla('Comunidade Ninja Digital', '', 'Produto'), 'CN');
  assert.equal(sigla('Ninja', '', 'Produto'), 'N');
});

// "Escola de Ninjas" é "EN", não "EDN": palavra de ligação não vira inicial.
test('preposição não entra na sigla', () => {
  assert.equal(sigla('Escola de Ninjas', '', 'x'), 'EN');
  assert.equal(sigla('Casa do Código', '', 'x'), 'CC');
});

test('sem marca escrita, a sigla vem do nome do produto', () => {
  assert.equal(sigla('', '', 'Comunidade Ninja Digital'), 'CN');
  assert.equal(sigla(null, undefined, 'Tensaikai'), 'T');
});

// Três letras não cabem em 40px com peso 800.
test('a sigla nunca passa de duas letras, e nunca fica vazia', () => {
  assert.equal(sigla('Um Dois Tres Quatro', '', 'x').length, 2);
  assert.equal(sigla('', '', ''), '•');
  assert.equal(sigla('   ', '  ', '  '), '•');
});

// ===========================================================================
// A IMAGEM COMPACTA
// ===========================================================================

// O favicon já nasce desenhado para ser lido em 16px. Um logo horizontal
// espremido num quadrado vira borrão — que é o erro comum aqui.
test('o favicon ganha do logo no espaço de 40px', () => {
  const segura = (u) => typeof u === 'string' && u.startsWith('https://');
  assert.equal(
    imagemCompacta({ faviconUrl: 'https://a/f.png', logoUrl: 'https://a/l.png' }, segura),
    'https://a/f.png',
  );
  assert.equal(imagemCompacta({ logoUrl: 'https://a/l.png' }, segura), 'https://a/l.png');
  assert.equal(imagemCompacta({}, segura), null);
  assert.equal(imagemCompacta(null, segura), null);
  // URL insegura não vira imagem: a mesma régua do resto da identidade.
  assert.equal(imagemCompacta({ faviconUrl: 'javascript:alert(1)' }, segura), null);
});

// ===========================================================================
// O BOTÃO
// ===========================================================================

function montarCasca() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  const botao = document.createElement('button');
  shell.appendChild(botao);
  return { shell, botao };
}

test('o botão alterna a classe da casca e conta o estado a quem lê tela', () => {
  const { shell, botao } = montarCasca();
  ligarRecolher(shell, botao, null);

  assert.equal(shell.classList.contains('app-shell--recolhida'), false);
  assert.equal(botao.getAttribute('aria-expanded'), 'true');

  botao.dispatchEvent(new dom.window.Event('click'));
  assert.equal(shell.classList.contains('app-shell--recolhida'), true);
  assert.equal(botao.getAttribute('aria-expanded'), 'false');
  assert.match(botao.getAttribute('aria-label'), /Expandir/);

  botao.dispatchEvent(new dom.window.Event('click'));
  assert.equal(shell.classList.contains('app-shell--recolhida'), false);
  assert.match(botao.getAttribute('aria-label'), /Recolher/);
});

// O ícone aponta para onde a barra VAI, não para onde ela está.
test('o ícone do botão troca junto com o estado', () => {
  const { shell, botao } = montarCasca();
  const pedidos = [];
  const falso = (nome) => {
    pedidos.push(nome);
    return document.createElement('span');
  };
  ligarRecolher(shell, botao, falso);
  botao.dispatchEvent(new dom.window.Event('click'));
  assert.deepEqual(pedidos, ['recolher', 'expandir']);
});

test('a escolha é lembrada entre visitas', () => {
  // Zera o que os testes anteriores deixaram: preferencia guardada e
  // compartilhada entre eles e um teste que depende da ordem de execucao.
  gravarPreferencia(false);
  const { shell, botao } = montarCasca();
  ligarRecolher(shell, botao, null);
  botao.dispatchEvent(new dom.window.Event('click'));
  assert.equal(lerPreferencia(), true);

  // Uma casca nova nasce já recolhida, como a pessoa deixou.
  const outra = montarCasca();
  ligarRecolher(outra.shell, outra.botao, null);
  assert.equal(outra.shell.classList.contains('app-shell--recolhida'), true);

  gravarPreferencia(false);
  assert.equal(lerPreferencia(), false);
});

// Janela anônima e navegador com dados de site bloqueados ESTOURAM ao tocar em
// `localStorage`. Uma preferência de largura de menu não pode derrubar a tela.
test('navegador que recusa guardar dados não quebra a tela', () => {
  const real = Object.getOwnPropertyDescriptor(dom.window, 'localStorage');
  Object.defineProperty(dom.window, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('bloqueado');
    },
  });
  try {
    assert.equal(lerPreferencia(), false);
    assert.doesNotThrow(() => gravarPreferencia(true));
    const { shell, botao } = montarCasca();
    assert.doesNotThrow(() => ligarRecolher(shell, botao, null));
  } finally {
    Object.defineProperty(dom.window, 'localStorage', real);
  }
});

// ===========================================================================
// O CSS EXISTE, E SÓ NO DESKTOP
// ===========================================================================

// A classe solta no celular deixaria a gaveta aberta com 64px de largura.
test('a barra recolhida é uma regra de desktop, nunca de celular', () => {
  const css = readFileSync('styles/base.css', 'utf8');
  const bloco = css.match(
    /\.app-shell--recolhida\s*\{[\s\S]*?grid-template-columns:\s*64px\s*1fr\s*;/,
  );
  assert.ok(bloco, 'falta a regra que troca a coluna da grade');

  // A regra tem que estar DENTRO de uma media query de largura mínima.
  const i = bloco.index;
  const antes = css.slice(0, i);
  const ultimaMedia = antes.lastIndexOf('@media');
  assert.match(css.slice(ultimaMedia, ultimaMedia + 40), /min-width:\s*1025px/);
});

test('recolhida esconde o nome do item, e não o ícone', () => {
  const css = readFileSync('styles/base.css', 'utf8');
  assert.match(css, /\.app-shell--recolhida\s+\.menu-nome\s*\{[\s\S]*?display:\s*none\s*;/);

  const i = css.indexOf('.app-shell--recolhida .menu-rotulo {');
  assert.ok(i > 0, 'falta o bloco do rótulo recolhido');
  const bloco = css.slice(i, css.indexOf('}', i) + 1);
  assert.doesNotMatch(bloco, /display:\s*none/);
});

// ===========================================================================
// A PASTILHA NA BORDA
// ===========================================================================

// Ela fica em cima da linha que separa a barra do conteúdo, metade de cada
// lado. Isso só funciona pendurada na CASCA: a barra tem `overflow-y: auto`,
// que recorta qualquer filho passando da largura dela.
test('o botão é posicionado sobre a borda, e não dentro da barra', () => {
  const css = readFileSync('styles/base.css', 'utf8');
  const regra = css.slice(css.indexOf('.app-recolher {'));
  const corpo = regra.slice(0, regra.indexOf('}'));

  assert.match(corpo, /position:\s*absolute/);
  assert.match(corpo, /left:\s*248px/, 'tem que nascer na borda da barra aberta');
  assert.match(corpo, /transform:\s*translateX\(-50%\)/, 'metade de cada lado');
  // Acima da faixa do topo, que é z-index 20.
  assert.match(corpo, /z-index:\s*2[1-9]|z-index:\s*[3-9]\d/);

  assert.match(
    css,
    /\.app-shell \{[^}]*position: relative/,
    'a casca precisa ser a referência de posicionamento',
  );
});

// ⚠️ O LUGAR NÃO MUDA, SÓ A SETA. A referência é a borda, e a borda existe nas
// duas larguras. Botão que anda de canto obriga o olho a procurar de novo a
// cada clique — e este é um botão que se usa várias vezes ao dia.
test('recolher move o botão junto com a borda, e não muda mais nada nele', () => {
  const css = readFileSync('styles/base.css', 'utf8');
  const i = css.indexOf('.app-shell--recolhida .app-recolher');
  assert.ok(i > 0, 'falta a regra que acompanha a borda');
  const regra = css.slice(i, css.indexOf('}', i) + 1);

  assert.match(regra, /left:\s*64px/);
  // Nada de `top`, `transform` ou `order` — se algo mais mudasse, o botão
  // trocaria de lugar em vez de acompanhar a borda.
  assert.doesNotMatch(regra, /top:|transform:|right:|order:/);
});

// ⚠️ ELE FLUTUA EM CIMA DA LINHA DIVISORIA, entao o fundo dele nao pode ser
// translucido em estado nenhum.
//
// No tema escuro `--cor-hover` e `color-mix(... transparent)` — correto para
// elemento apoiado sobre fundo opaco, errado para este. Usado como `background`
// simples, a borda da barra atravessava o botao no hover. O dono viu.
test('o botao nunca fica transparente, nem parado nem sob o mouse', () => {
  const css = readFileSync('styles/base.css', 'utf8');

  const parado = css.slice(css.indexOf('.app-recolher {'));
  assert.match(
    parado.slice(0, parado.indexOf('}')),
    /background:\s*var\(--cor-fundo\)/,
    'parado, o fundo tem que ser a cor solida do fundo',
  );

  const i = css.indexOf('.app-recolher:hover {');
  assert.ok(i > 0);
  const hover = css.slice(i, css.indexOf('}', i));
  assert.match(
    hover,
    /background-color:\s*var\(--cor-fundo\)/,
    'o hover precisa manter uma camada solida embaixo',
  );
  assert.match(
    hover,
    /background-image:\s*linear-gradient\(var\(--cor-hover\)/,
    'e pintar o tom por cima, sem trocar o fundo',
  );
  assert.doesNotMatch(
    hover,
    /(^|[^-])background:\s*var\(--cor-hover\)/,
    'o tom translucido sozinho deixa a linha da borda atravessar o botao',
  );
});
