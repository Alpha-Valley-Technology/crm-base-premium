// A PRÉVIA DA IDENTIDADE NÃO PODE APAGAR O QUE ELA NÃO EDITA.
//
// ===========================================================================
// O ESTRAGO QUE ISTO EXISTE PARA IMPEDIR
// ===========================================================================
//
// `aplicarTema` aplica a identidade INTEIRA: cores, fontes, tema, proporção das
// capas, nome abaixo da capa e a largura do hero. Ela é assim de propósito — é
// a função que dá a cara certa à tela no carregamento.
//
// A prévia da seção de Identidade chamava essa mesma função com o objeto do
// FORMULÁRIO, que tem só os campos daquela seção. Todo campo ausente virava o
// padrão dele — em silêncio, sem tocar no banco.
//
// Na prática: bastava mexer numa cor para o hero "de ponta a ponta" voltar a
// ser um cartão, e as capas em pé voltarem a ser deitadas. Recarregar
// consertava, então ninguém ligava uma coisa à outra: a pessoa configurava o
// hero, ia ajustar uma cor, voltava para a Página Inicial e via o hero
// encolhido sem nenhuma pista do motivo.

import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;
globalThis.window = dom.window;

const { aplicarTema } = await import('../../base/identidade.js');

// A identidade como o dono configurou.
// ⚠️ `corTopo` É O CAMPO QUE IMPORTA AQUI: ele está salvo e a seção do
// formulário NÃO o edita. É por ele que dá para ver `aplicarTema` derrubando o
// que não veio no objeto — que é o contrato que este arquivo documenta.
const SALVA = {
  corDestaque: '#4f46e5',
  tema: 'claro',
  corTopo: '#111827',
};

// O que o formulário da seção devolve: só o que ELA edita.
const DO_FORMULARIO = {
  corDestaque: '#c2410c',
  tema: 'escuro',
  fonteTitulo: 'sistema',
  fonteTexto: 'sistema',
};

// ===========================================================================
// O COMPORTAMENTO DE `aplicarTema`, ESCRITO PARA NÃO SURPREENDER NINGUÉM
// ===========================================================================

// ⚠️ ELA NÃO É "MESCLA", É "APLICA". Este teste não cobra um defeito: ele
// documenta o contrato, para que a próxima pessoa que a chamar com meio objeto
// saiba o que vai acontecer.
test('aplicarTema com objeto parcial derruba o que não veio nele', () => {
  const raiz = dom.window.document.createElement('div');
  aplicarTema(SALVA, raiz);

  assert.equal(raiz.style.getPropertyValue('--cor-topo'), '#111827');

  aplicarTema(DO_FORMULARIO, raiz);
  assert.equal(
    raiz.style.getPropertyValue('--cor-topo'),
    '',
    'a cor do topo sumiu porque não veio no objeto — e é por isso que quem ' +
      'chama precisa misturar com o que está salvo',
  );
});

test('misturado com o que está salvo, nada se perde', () => {
  const raiz = dom.window.document.createElement('div');
  aplicarTema({ ...SALVA, ...DO_FORMULARIO }, raiz);

  // O que a prévia edita, muda.
  assert.equal(raiz.getAttribute('data-tema'), 'escuro');
  assert.equal(raiz.style.getPropertyValue('--cor-principal'), '#c2410c');

  // O que ela não edita, fica.
  assert.equal(raiz.style.getPropertyValue('--cor-topo'), '#111827');
});

// ===========================================================================
// E A CHAMADA DE VERDADE
// ===========================================================================

// O teste acima prova a regra; este prova que a tela a segue. Sem ele, a
// correção some no primeiro refatoramento e o estrago volta calado.
test('a prévia da Identidade mistura com o que já está salvo', () => {
  const fonte = readFileSync('modules/identidade/module.js', 'utf8');
  const i = fonte.indexOf('function previa()');
  assert.ok(i > 0, 'a função da prévia sumiu ou mudou de nome');
  const corpo = fonte.slice(i, i + 1800);

  assert.match(
    corpo,
    /\{\s*\.\.\.atual,\s*\.\.\.comoEstaAgora\(\)\s*\}/,
    'a prévia voltou a aplicar só os campos do formulário: ' +
      'mexer numa cor derruba o hero e a proporção das capas',
  );
});
