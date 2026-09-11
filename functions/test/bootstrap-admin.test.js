import { test } from 'node:test';
import assert from 'node:assert';
import { bootstrapAdminCore } from '../equipe/bootstrap-admin.js';

test('cria o 1º admin quando o bootstrap atômico permite', async () => {
  let gravado = null;
  const deps = {
    bootstrapAtomico: async (uid, d) => {
      gravado = { uid, d };
      return true;
    },
  };
  const r = await bootstrapAdminCore('u1', { email: 'a@x.com', nome: 'Ana' }, deps);
  assert.equal(r.criado, true);
  assert.equal(gravado.uid, 'u1');
  assert.equal(gravado.d.papel, 'admin');
  assert.equal(gravado.d.ativo, true);
});

test('não cria quando já existe 1º admin (atômico retorna false)', async () => {
  const deps = { bootstrapAtomico: async () => false };
  const r = await bootstrapAdminCore('u2', { email: 'b@x.com' }, deps);
  assert.equal(r.criado, false);
});
