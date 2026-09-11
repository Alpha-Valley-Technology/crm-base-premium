import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readdirSync, readFileSync } from 'node:fs';
import { icone, existeIcone, ICONES } from '../../ui/icones.js';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;

test('icone devolve um SVG que herda a cor do texto', () => {
  const svg = icone('chave');
  assert.equal(svg.tagName.toLowerCase(), 'svg');
  // currentColor é o que faz o ícone acender junto com o item ativo do menu.
  assert.equal(svg.getAttribute('stroke'), 'currentColor');
  assert.equal(svg.getAttribute('fill'), 'none');
  assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
  assert.equal(
    svg.getAttribute('aria-hidden'),
    'true',
    'é decorativo, não deve ser lido em voz alta',
  );
});

test('icone respeita o tamanho pedido', () => {
  const p = icone('usuario', 32);
  assert.equal(p.getAttribute('width'), '32');
  assert.equal(p.getAttribute('height'), '32');
  assert.equal(icone('usuario').getAttribute('width'), '18', 'padrão é 18');
});

test('icone desenha as formas do ícone pedido', () => {
  const usuario = icone('usuario');
  assert.equal(usuario.querySelectorAll('circle').length, 1, 'a cabeça');
  assert.equal(usuario.querySelectorAll('path').length, 1, 'os ombros');

  const mais = icone('mais');
  assert.equal(mais.querySelectorAll('line').length, 2, 'duas barras cruzadas');
});

test('nome desconhecido cai no ícone neutro em vez de quebrar a tela', () => {
  const svg = icone('nao-existe-esse-icone');
  assert.equal(svg.tagName.toLowerCase(), 'svg');
  assert.equal(svg.querySelectorAll('circle').length, 1);
  assert.equal(existeIcone('nao-existe-esse-icone'), false);
});

// ⚠️ LÊ OS MÓDULOS DE VERDADE, e não uma lista escrita à mão.
//
// A lista fixa que existia aqui envelheceu no dia em que o produto saiu desta
// carcaça: ela continuava cobrando ícones de telas que já não existiam, e teria
// que ser editada por quem removesse ou acrescentasse qualquer módulo — que é
// exatamente o tipo de manutenção que ninguém lembra de fazer.
//
// Agora o teste pergunta ao código quais ícones ele pede, e confere só esses.
// Ele passa a valer sozinho para todo módulo que o seu produto pendurar.
test('todo ícone pedido pelos módulos existe no conjunto', async () => {
  const { default: modulos } = await import('../../modules/modulos.config.js');
  const fontes = readdirSync('modules', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(`modules/${d.name}`)
        .filter((f) => f.endsWith('.js'))
        .map((f) => readFileSync(`modules/${d.name}/${f}`, 'utf8')),
    )
    .join(' ');

  const usados = new Set(modulos.map((m) => m.icone));
  for (const m of fontes.matchAll(/icone:\s*'([a-z-]+)'/g)) usados.add(m[1]);

  assert.ok(usados.size >= 5, 'a varredura precisa encontrar os ícones de verdade');
  for (const nome of usados) {
    assert.equal(existeIcone(nome), true, `falta o ícone "${nome}"`);
    assert.ok(icone(nome).children.length > 0, `o ícone "${nome}" está vazio`);
  }
});

test('nenhum ícone vem com desenho vazio ou atributo perdido', () => {
  for (const nome of Object.keys(ICONES)) {
    for (const forma of icone(nome).children) {
      const atributos = [...forma.attributes].map((a) => a.name);
      assert.ok(atributos.length > 0, `${nome}: forma sem atributo nenhum`);
      assert.ok(!atributos.includes('tag'), `${nome}: "tag" vazou como atributo do SVG`);
    }
  }
});
