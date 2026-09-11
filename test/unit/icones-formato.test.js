import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// O conjunto de icones espera LISTA de figuras. Um icone escrito como texto
// (markup solto) faz o desenhador percorrer as letras uma a uma: nao sai
// desenho, e o botao aparece vazio. Aconteceu com o sanduiche.
test('todo icone e uma lista de figuras, nunca texto', async () => {
  const { ICONES_PARA_TESTE } = await import('../../ui/icones.js').then((m) => ({
    ICONES_PARA_TESTE: m.ICONES_PARA_TESTE,
  }));
  assert.ok(ICONES_PARA_TESTE, 'ui/icones.js precisa exportar o conjunto para conferencia');
  for (const [nome, formas] of Object.entries(ICONES_PARA_TESTE)) {
    assert.ok(Array.isArray(formas), `o icone "${nome}" nao e uma lista`);
    assert.ok(formas.length, `o icone "${nome}" esta vazio`);
    for (const f of formas) {
      assert.equal(typeof f, 'object', `o icone "${nome}" tem figura que nao e objeto`);
      assert.ok(f.tag, `uma figura de "${nome}" esta sem tag`);
    }
  }
});

// O sanduiche herda a cor por currentColor; se alguem fixar branco no CSS ele
// some no cabecalho claro. Foi o que o dono viu.
test('o sanduiche usa a cor da marca, nao uma cor fixa', () => {
  const css = readFileSync(new URL('../../styles/base.css', import.meta.url), 'utf8');
  const bloco = css.slice(css.indexOf('.app-sanduiche {'));
  const regra = bloco.slice(0, bloco.indexOf('}'));
  assert.match(regra, /color:\s*var\(--cor-principal\)/, 'o sanduiche tem que usar a cor da marca');
  assert.doesNotMatch(regra, /color:\s*(#fff|white)/i);
});
