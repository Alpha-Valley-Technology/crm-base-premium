import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { montarSidebar, marcarAtivo } from '../../base/sidebar.js';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;

const menu = [
  {
    grupo: 'Conteúdo',
    itens: [
      {
        id: 'editorial',
        nome: 'Editorial',
        icone: '📝',
        atalhos: [
          { sub: 'adicionar', nome: 'Adicionar Blogger', icone: '➕' },
          { sub: 'keywords', nome: 'Pesquisa Keywords', icone: '🔍' },
        ],
      },
    ],
  },
];

test('montarSidebar cria o item do módulo e um link por ferramenta', () => {
  const nav = document.createElement('nav');
  const links = montarSidebar(menu, nav);
  assert.equal(nav.querySelectorAll('.menu-item').length, 1);
  assert.equal(nav.querySelectorAll('.menu-subitem').length, 2);
  assert.equal(links.get('editorial').getAttribute('href'), '#/editorial');
  assert.equal(links.get('editorial/keywords').getAttribute('href'), '#/editorial/keywords');
  assert.match(links.get('editorial/keywords').textContent, /Pesquisa Keywords/);
});

test('montarSidebar não cria sub-itens quando o módulo não tem atalhos', () => {
  const nav = document.createElement('nav');
  montarSidebar(
    [{ grupo: 'Geral', itens: [{ id: 'x', nome: 'X', icone: '🔧', atalhos: [] }] }],
    nav,
  );
  assert.equal(nav.querySelectorAll('.menu-subitem').length, 0);
});

test('marcarAtivo acende a ferramenta e destaca o módulo dono', () => {
  const nav = document.createElement('nav');
  const links = montarSidebar(menu, nav);
  marcarAtivo(links, 'editorial', 'keywords');
  assert.ok(links.get('editorial/keywords').classList.contains('ativo'));
  assert.ok(!links.get('editorial/adicionar').classList.contains('ativo'));
  assert.ok(links.get('editorial').classList.contains('ativo-pai'));
  assert.ok(!links.get('editorial').classList.contains('ativo'));
});

test('marcarAtivo acende o módulo quando não há ferramenta na rota', () => {
  const nav = document.createElement('nav');
  const links = montarSidebar(menu, nav);
  marcarAtivo(links, 'editorial', null);
  assert.ok(links.get('editorial').classList.contains('ativo'));
  assert.ok(!links.get('editorial').classList.contains('ativo-pai'));
});

test('marcarAtivo cai no módulo quando a ferramenta não existe no menu', () => {
  const nav = document.createElement('nav');
  const links = montarSidebar(menu, nav);
  marcarAtivo(links, 'editorial', 'ferramenta-que-nao-existe');
  assert.ok(links.get('editorial').classList.contains('ativo'));
});

// --- Gaveta: as ferramentas só aparecem no módulo em que você está ---

const menuDoisModulos = [
  {
    grupo: 'Conteúdo',
    itens: [
      {
        id: 'editorial',
        nome: 'Editorial',
        icone: '📝',
        atalhos: [{ sub: 'keywords', nome: 'Pesquisa Keywords', icone: '🔍' }],
      },
    ],
  },
  {
    grupo: 'Vendas',
    itens: [
      {
        id: 'crm',
        nome: 'CRM',
        icone: '💼',
        atalhos: [{ sub: 'leads', nome: 'Leads', icone: '🎯' }],
      },
    ],
  },
];

test('a gaveta de ferramentas nasce fechada e só abre no módulo ativo', () => {
  const nav = document.createElement('nav');
  const links = montarSidebar(menuDoisModulos, nav);

  const gavetas = nav.querySelectorAll('.menu-sub');
  assert.equal(gavetas.length, 2);
  for (const g of gavetas) assert.ok(!g.classList.contains('aberta'), 'nasce fechada');

  marcarAtivo(links, 'editorial', 'keywords');
  assert.ok(links.gavetas.get('editorial').classList.contains('aberta'));
  assert.ok(
    !links.gavetas.get('crm').classList.contains('aberta'),
    'o outro módulo fica recolhido',
  );
  assert.ok(links.get('editorial').classList.contains('aberto'), 'a seta do módulo aberto vira');

  marcarAtivo(links, 'crm', 'leads');
  assert.ok(
    !links.gavetas.get('editorial').classList.contains('aberta'),
    'fecha ao sair do módulo',
  );
  assert.ok(links.gavetas.get('crm').classList.contains('aberta'));
});

test('a barra lateral desenha ícone, não emoji', () => {
  const nav = document.createElement('nav');
  montarSidebar(menu, nav);
  const svgs = nav.querySelectorAll('svg.icone');
  assert.equal(svgs.length, 3, 'um no módulo e um por ferramenta');
  // currentColor é o que faz o ícone acender junto com o item.
  assert.equal(svgs[0].getAttribute('stroke'), 'currentColor');
  assert.ok(!/\p{Extended_Pictographic}/u.test(nav.textContent), 'não sobrou emoji no menu');
});

test('o rótulo de seção aparece na transição e só nela', () => {
  const comSecoes = [
    {
      grupo: 'Conteúdo',
      itens: [
        {
          id: 'editorial',
          nome: 'Editorial',
          icone: 'documento',
          atalhos: [
            { sub: 'a', nome: 'Trabalho 1', icone: 'gerar' },
            { sub: 'b', nome: 'Trabalho 2', icone: 'gerar' },
            { sub: 'c', nome: 'Ajuste 1', icone: 'chave', secao: 'Configurações' },
            { sub: 'd', nome: 'Ajuste 2', icone: 'usuario', secao: 'Configurações' },
          ],
        },
      ],
    },
  ];
  const nav = document.createElement('nav');
  montarSidebar(comSecoes, nav);

  const secoes = nav.querySelectorAll('.menu-secao');
  assert.equal(secoes.length, 1, 'um rótulo só, não um por ferramenta');
  assert.equal(secoes[0].textContent, 'Configurações');

  // O rótulo entra ANTES da primeira ferramenta da seção.
  const filhos = [...nav.querySelector('.menu-sub').children];
  assert.equal(filhos[2].className, 'menu-secao');
  assert.equal(filhos[3].getAttribute('href'), '#/editorial/c');
});

test('sem seção declarada, nenhum rótulo é desenhado', () => {
  const nav = document.createElement('nav');
  montarSidebar(menu, nav);
  assert.equal(nav.querySelectorAll('.menu-secao').length, 0);
});

test('módulo sem ferramentas não ganha seta nem gaveta', () => {
  const nav = document.createElement('nav');
  montarSidebar(
    [{ grupo: 'Geral', itens: [{ id: 'x', nome: 'X', icone: '🔧', atalhos: [] }] }],
    nav,
  );
  assert.equal(nav.querySelectorAll('.menu-sub').length, 0);
  assert.equal(nav.querySelectorAll('.menu-seta').length, 0);
});

// --- Grupo sem rótulo ---
//
// A área de membros tem duas fileiras de itens (a navegação em cima, a conta
// embaixo) e NENHUM título entre elas. A base sempre desenhava o título do
// grupo, então o desenho da comunidade pedia dois rótulos que ninguém quer.
//
// Grupo cujo nome começa com "_" é separador invisível: agrupa e ordena, mas
// não escreve nada na tela. Continua sendo nome distinto — dois grupos com
// nome vazio virariam um só lá no construirMenu.

test('grupo com nome iniciado por _ não desenha rótulo', () => {
  const nav = document.createElement('nav');
  montarSidebar(
    [
      {
        grupo: '_topo',
        itens: [{ id: 'inicio', nome: 'Página Inicial', icone: 'casa', atalhos: [] }],
      },
      {
        grupo: '_rodape',
        itens: [{ id: 'perfil', nome: 'Meu Perfil', icone: 'usuario', atalhos: [] }],
      },
    ],
    nav,
  );
  assert.equal(nav.querySelectorAll('.menu-grupo').length, 0, 'nenhum rótulo desenhado');
  assert.equal(nav.querySelectorAll('.menu-item').length, 2, 'mas os dois itens estão lá');
});

test('grupo com nome de verdade continua desenhando o rótulo', () => {
  const nav = document.createElement('nav');
  montarSidebar(
    [{ grupo: 'Conteúdo', itens: [{ id: 'x', nome: 'X', icone: 'livro', atalhos: [] }] }],
    nav,
  );
  assert.equal(nav.querySelectorAll('.menu-grupo').length, 1);
  assert.equal(nav.querySelector('.menu-grupo').textContent, 'Conteúdo');
});

test('o grupo invisível ganha classe própria, para o CSS empurrar a conta para baixo', () => {
  const nav = document.createElement('nav');
  montarSidebar(
    [
      { grupo: '_topo', itens: [{ id: 'a', nome: 'A', icone: 'casa', atalhos: [] }] },
      { grupo: '_rodape', itens: [{ id: 'b', nome: 'B', icone: 'usuario', atalhos: [] }] },
    ],
    nav,
  );
  const blocos = nav.querySelectorAll('.menu-bloco');
  assert.equal(blocos.length, 2, 'um bloco por grupo');
  assert.ok(blocos[1].classList.contains('menu-bloco--rodape'), 'o último grupo é o rodapé');
});
