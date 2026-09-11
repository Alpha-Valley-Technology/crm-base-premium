import { test } from 'node:test';
import assert from 'node:assert';
import { adminsAtivosApos, motivoDoBloqueio } from '../equipe/gerir-usuario.js';

const EQUIPE = [
  { uid: 'a1', nome: 'Admin Um', papel: 'admin', ativo: true },
  { uid: 'a2', nome: 'Admin Dois', papel: 'admin', ativo: true },
  { uid: 'm1', nome: 'Redator', papel: 'membro', ativo: true },
  { uid: 'm2', nome: 'Inativo', papel: 'admin', ativo: false },
];
const SO_UM_ADMIN = [
  { uid: 'a1', nome: 'Único', papel: 'admin', ativo: true },
  { uid: 'm1', nome: 'Redator', papel: 'membro', ativo: true },
];

test('adminsAtivosApos conta só admin ativo', () => {
  assert.equal(adminsAtivosApos(EQUIPE, 'nenhum', {}), 2, 'a2 e a1; o inativo não conta');
});

test('adminsAtivosApos enxerga o efeito de rebaixar, desativar e remover', () => {
  assert.equal(adminsAtivosApos(EQUIPE, 'a1', { papel: 'membro' }), 1);
  assert.equal(adminsAtivosApos(EQUIPE, 'a1', { ativo: false }), 1);
  assert.equal(adminsAtivosApos(EQUIPE, 'a1', { remover: true }), 1);
  // Promover alguém aumenta a conta.
  assert.equal(adminsAtivosApos(EQUIPE, 'm1', { papel: 'admin' }), 3);
  // Reativar um admin desativado também.
  assert.equal(adminsAtivosApos(EQUIPE, 'm2', { ativo: true }), 3);
});

test('deixa alterar outra pessoa quando sobra admin', () => {
  assert.equal(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'a1',
      meuUid: 'a2',
      mudanca: { papel: 'membro' },
    }),
    null,
  );
  assert.equal(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'm1',
      meuUid: 'a2',
      mudanca: { papel: 'admin' },
    }),
    null,
  );
  assert.equal(
    motivoDoBloqueio({ usuarios: EQUIPE, uidAlvo: 'm1', meuUid: 'a2', mudanca: { remover: true } }),
    null,
  );
});

test('NÃO deixa o sistema ficar sem administrador ativo', () => {
  for (const mudanca of [{ papel: 'membro' }, { ativo: false }, { remover: true }]) {
    const motivo = motivoDoBloqueio({
      usuarios: SO_UM_ADMIN,
      uidAlvo: 'a1',
      meuUid: 'm1',
      mudanca,
    });
    assert.match(
      motivo,
      /única pessoa com acesso de administrador/i,
      `deveria bloquear: ${JSON.stringify(mudanca)}`,
    );
  }
});

test('ninguém mexe na própria conta', () => {
  const motivo = motivoDoBloqueio({
    usuarios: EQUIPE,
    uidAlvo: 'a1',
    meuUid: 'a1',
    mudanca: { remover: true },
  });
  assert.match(motivo, /própria conta/i);
});

test('recusa alvo que não existe ou não foi informado', () => {
  assert.match(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'fantasma',
      meuUid: 'a1',
      mudanca: { remover: true },
    }),
    /não está mais na equipe/i,
  );
  assert.match(
    motivoDoBloqueio({ usuarios: EQUIPE, uidAlvo: '', meuUid: 'a1', mudanca: {} }),
    /qual pessoa/i,
  );
});

test('recusa papel inventado', () => {
  assert.match(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'm1',
      meuUid: 'a1',
      mudanca: { papel: 'chefe' },
    }),
    /papel inválido/i,
  );
});

test('o último admin ativo pode ser mexido se outro for promovido antes', () => {
  const depois = [
    ...SO_UM_ADMIN.filter((u) => u.uid !== 'm1'),
    { uid: 'm1', papel: 'admin', ativo: true },
  ];
  assert.equal(
    motivoDoBloqueio({ usuarios: depois, uidAlvo: 'a1', meuUid: 'm1', mudanca: { remover: true } }),
    null,
  );
});
