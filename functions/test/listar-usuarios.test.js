import { test } from 'node:test';
import assert from 'node:assert';
import { mapearUsuarios } from '../equipe/listar-usuarios.js';
import { alcanceParaOBanco } from '../_lib/escopo.js';

test('mapearUsuarios devolve campos públicos e o id', () => {
  const docs = [
    {
      id: 'u1',
      data: () => ({ nome: 'Ana', email: 'a@x.com', papel: 'admin', ativo: true, criadoPor: 'u1' }),
    },
  ];
  const r = mapearUsuarios(docs);
  assert.deepEqual(r, [
    { uid: 'u1', nome: 'Ana', email: 'a@x.com', papel: 'admin', ativo: true, projetos: null },
  ]);
});

// Cadastro antigo não tem o campo de alcance. Se ele viesse como `undefined`, a
// tela não saberia distinguir "cuida de todos" de "campo esqueceu de vir" —
// e o Firestore nem aceita undefined. Ausente vira null, que é "todos".
test('quem não tem lista vem como null, não como campo faltando', () => {
  const docs = [
    { id: 'antigo', data: () => ({ nome: 'A', email: 'a@x.com', papel: 'membro', ativo: true }) },
    {
      id: 'novo',
      data: () => ({
        nome: 'B',
        email: 'b@x.com',
        papel: 'membro',
        ativo: true,
        ...alcanceParaOBanco(['b1']),
      }),
    },
  ];
  const r = mapearUsuarios(docs);
  assert.equal(r[0].projetos, null);
  assert.deepEqual(r[1].projetos, ['b1']);
});
