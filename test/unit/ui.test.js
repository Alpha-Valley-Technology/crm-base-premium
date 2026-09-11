import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;

const { ui } = await import('../../ui/ui.js');

test('ui.botao cria <button class="btn"> com texto e onclick', () => {
  let clicado = false;
  const b = ui.botao('Salvar', () => {
    clicado = true;
  });
  assert.equal(b.tagName, 'BUTTON');
  assert.ok(b.classList.contains('btn'));
  assert.equal(b.textContent, 'Salvar');
  b.click();
  assert.equal(clicado, true);
});

test('ui.tabela monta cabeçalho e linhas', () => {
  const t = ui.tabela(['Nome', 'Email'], [{ Nome: 'Ana', Email: 'a@x.com' }]);
  assert.equal(t.tagName, 'TABLE');
  assert.equal(t.querySelectorAll('th').length, 2);
  assert.equal(t.querySelectorAll('tbody tr').length, 1);
  assert.equal(t.querySelector('tbody td').textContent, 'Ana');
});

test('ui.campo cria label + input e devolve o input', () => {
  const { wrapper, input } = ui.campo('Assunto', 'text');
  assert.ok(wrapper.querySelector('label').textContent.includes('Assunto'));
  assert.equal(input.tagName, 'INPUT');
});

test('ui.limpar esvazia um elemento', () => {
  const div = document.createElement('div');
  div.innerHTML = '<span>x</span>';
  ui.limpar(div);
  assert.equal(div.children.length, 0);
});
