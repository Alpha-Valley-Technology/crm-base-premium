import { test } from 'node:test';
import assert from 'node:assert';
import { caminhoColecao, montarRegistro } from '../../base/db-core.js';

test('caminhoColecao prefixa com dados/app/', () => {
  assert.deepEqual(caminhoColecao('exemplos'), ['dados', 'app', 'exemplos']);
});

test('caminhoColecao rejeita nome com barra', () => {
  assert.throws(() => caminhoColecao('a/b'), /invalido/);
});

test('montarRegistro injeta criadoPor e mantém dados', () => {
  const r = montarRegistro({ texto: 'oi' }, 'uid1');
  assert.equal(r.texto, 'oi');
  assert.equal(r.criadoPor, 'uid1');
  assert.ok('criadoEm' in r);
});
