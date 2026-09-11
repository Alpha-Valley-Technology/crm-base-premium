import { test } from 'node:test';
import assert from 'node:assert';
import { validarModulo, construirMenu } from '../../base/registry.js';

const mod = (over = {}) => ({
  id: 'x',
  nome: 'X',
  icone: '🔧',
  menu: { grupo: 'Geral', ordem: 1 },
  acesso: 'membro',
  montarTela() {},
  ...over,
});

test('validarModulo aceita manifesto válido', () => {
  assert.doesNotThrow(() => validarModulo(mod()));
});

test('validarModulo rejeita sem id', () => {
  assert.throws(() => validarModulo(mod({ id: undefined })), /id/);
});

test('validarModulo rejeita sem montarTela', () => {
  assert.throws(() => validarModulo(mod({ montarTela: undefined })), /montarTela/);
});

test('construirMenu agrupa e ordena, e esconde módulo admin de membro', () => {
  const mods = [
    mod({ id: 'b', nome: 'B', menu: { grupo: 'Geral', ordem: 2 } }),
    mod({ id: 'a', nome: 'A', menu: { grupo: 'Geral', ordem: 1 } }),
    mod({ id: 'z', nome: 'Z', acesso: 'admin', menu: { grupo: 'Admin', ordem: 1 } }),
  ];
  const menuMembro = construirMenu(mods, 'membro');
  assert.deepEqual(
    menuMembro.map((g) => g.grupo),
    ['Geral'],
  ); // grupo Admin some
  assert.deepEqual(
    menuMembro[0].itens.map((i) => i.id),
    ['a', 'b'],
  ); // ordenado

  const menuAdmin = construirMenu(mods, 'admin');
  assert.deepEqual(
    menuAdmin.map((g) => g.grupo),
    ['Geral', 'Admin'],
  );
});

test('construirMenu devolve atalhos vazios quando o módulo não declara', () => {
  const menu = construirMenu([mod()], 'admin');
  assert.deepEqual(menu[0].itens[0].atalhos, []);
});

test('construirMenu devolve os atalhos do módulo', () => {
  const m = mod({
    menu: {
      grupo: 'Conteúdo',
      ordem: 1,
      atalhos: [
        { sub: 'adicionar', nome: 'Adicionar', icone: '➕' },
        { sub: 'kanban', nome: 'Conteúdos', icone: '📅' },
      ],
    },
  });
  const menu = construirMenu([m], 'membro');
  assert.deepEqual(
    menu[0].itens[0].atalhos.map((a) => a.sub),
    ['adicionar', 'kanban'],
  );
  assert.equal(menu[0].itens[0].atalhos[0].nome, 'Adicionar');
});

test('construirMenu esconde atalho de admin quando o usuário é membro', () => {
  const m = mod({
    menu: {
      grupo: 'Conteúdo',
      ordem: 1,
      atalhos: [
        { sub: 'adicionar', nome: 'Adicionar', icone: '➕', admin: true },
        { sub: 'kanban', nome: 'Conteúdos', icone: '📅' },
      ],
    },
  });
  assert.deepEqual(
    construirMenu([m], 'membro')[0].itens[0].atalhos.map((a) => a.sub),
    ['kanban'],
  );
  assert.deepEqual(
    construirMenu([m], 'admin')[0].itens[0].atalhos.map((a) => a.sub),
    ['adicionar', 'kanban'],
  );
});

test('validarModulo rejeita atalho sem sub', () => {
  const m = mod({ menu: { grupo: 'G', ordem: 1, atalhos: [{ nome: 'Sem sub' }] } });
  assert.throws(() => validarModulo(m), /atalho/i);
});

// --- Módulo que existe na rota mas não no menu ---
//
// "Notificações" saiu da barra lateral: o sino no topo à direita é o caminho
// dela, e repetir o item no menu seria dizer a mesma coisa duas vezes. Mas o
// endereço `#/notificacoes` tem que continuar existindo — é para lá que o sino
// leva, e é o que alguém colou num link.
//
// `menu.oculto` some do menu SEM tirar o módulo do roteador. Grupo e ordem
// continuam obrigatórios de propósito: no dia em que ele voltar para a barra,
// volta para o lugar certo, e não para o fim de uma lista qualquer.

test('módulo com menu.oculto não entra no menu', () => {
  const menu = construirMenu(
    [
      { id: 'a', nome: 'A', icone: 'casa', menu: { grupo: 'G', ordem: 1 }, acesso: 'membro' },
      {
        id: 'sino',
        nome: 'Notificações',
        icone: 'sino',
        menu: { grupo: 'G', ordem: 2, oculto: true },
        acesso: 'membro',
      },
    ],
    'membro',
  );
  assert.deepEqual(
    menu[0].itens.map((i) => i.id),
    ['a'],
  );
});

test('um grupo que só tinha itens ocultos não sobra vazio no menu', () => {
  const menu = construirMenu(
    [
      { id: 'a', nome: 'A', icone: 'casa', menu: { grupo: 'Fica', ordem: 1 }, acesso: 'membro' },
      {
        id: 'sino',
        nome: 'N',
        icone: 'sino',
        menu: { grupo: 'Some', ordem: 1, oculto: true },
        acesso: 'membro',
      },
    ],
    'membro',
  );
  assert.deepEqual(
    menu.map((g) => g.grupo),
    ['Fica'],
    'grupo vazio desenharia um bloco sem nada dentro, e o CSS do rodapé se perderia',
  );
});

test('oculto continua exigindo grupo e ordem — para poder voltar ao lugar certo', () => {
  assert.throws(
    () =>
      validarModulo({
        id: 'x',
        nome: 'X',
        icone: 'sino',
        acesso: 'membro',
        menu: { oculto: true },
        montarTela() {},
      }),
    /menu/,
  );
});
