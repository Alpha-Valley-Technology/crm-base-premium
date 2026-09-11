// O PAPEL DE GESTOR, no servidor.
//
// As Cloud Functions passam por cima das regras do banco — elas escrevem com
// poder de servidor. Então a conferência de papel dentro delas não é
// redundância: é a única trava naquele caminho.

import { test } from 'node:test';
import assert from 'node:assert';
import { adminsAtivosApos, motivoDoBloqueio } from '../equipe/gerir-usuario.js';
import { criarUsuarioCore } from '../equipe/criar-usuario.js';

const EQUIPE = [
  { uid: 'a1', papel: 'admin', ativo: true },
  { uid: 'a2', papel: 'admin', ativo: true },
  { uid: 'g1', papel: 'gestor', ativo: true },
  { uid: 'm1', papel: 'membro', ativo: true },
];

// ===========================================================================
// A CONTA DO "ÚLTIMO ADMINISTRADOR"
// ===========================================================================

// ⚠️ GESTOR NÃO CONTA COMO ADMINISTRADOR, e essa é a decisão que impede o
// sistema de se trancar.
//
// Rebaixar o único admin a gestor tranca tudo exatamente como rebaixá-lo a
// membro: ninguém mais alcança Equipe, Identidade e Pagamento — e não há
// caminho de volta pela tela.
test('gestor não entra na conta de administradores', () => {
  assert.equal(adminsAtivosApos(EQUIPE, 'm1', {}), 2);
  assert.equal(adminsAtivosApos(EQUIPE, 'g1', { papel: 'admin' }), 3, 'promover soma');
  assert.equal(adminsAtivosApos(EQUIPE, 'a1', { papel: 'gestor' }), 1, 'rebaixar a gestor subtrai');
});

test('rebaixar o ÚNICO admin a gestor é recusado', () => {
  const soUm = [
    { uid: 'a1', papel: 'admin', ativo: true },
    { uid: 'g1', papel: 'gestor', ativo: true },
    { uid: 'm1', papel: 'membro', ativo: true },
  ];
  const motivo = motivoDoBloqueio({
    usuarios: soUm,
    uidAlvo: 'a1',
    meuUid: 'outro',
    mudanca: { papel: 'gestor' },
  });
  assert.ok(motivo, 'tem que bloquear');
  // A mensagem precisa DIZER que gestor não substitui: numa equipe com
  // gestores, "só resta um administrador" soa resolvível promovendo um deles.
  assert.match(motivo, /gestor não substitui/i);
  assert.match(motivo, /Pagamento/i, 'e dizer o que o gestor não alcança');
});

test('com dois admins, rebaixar um a gestor é permitido', () => {
  assert.equal(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'a1',
      meuUid: 'a2',
      mudanca: { papel: 'gestor' },
    }),
    null,
  );
});

// ===========================================================================
// O PAPEL ACEITO
// ===========================================================================

test('gestor é um papel válido; papel inventado continua recusado', () => {
  assert.equal(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'm1',
      meuUid: 'a1',
      mudanca: { papel: 'gestor' },
    }),
    null,
  );

  assert.match(
    motivoDoBloqueio({
      usuarios: EQUIPE,
      uidAlvo: 'm1',
      meuUid: 'a1',
      mudanca: { papel: 'supervisor' },
    }),
    /Papel inválido/,
  );
});

test('dá para cadastrar alguém já como gestor', async () => {
  const criados = [];
  const deps = {
    criarAuthUser: async () => ({ uid: 'novo1' }),
    acharAuthUserPorEmail: async () => null,
    usuarioJaCadastrado: async () => false,
    removerAuthUser: async () => {},
    gravarUsuario: async (uid, d) => {
      criados.push({ uid, ...d });
    },
  };
  const r = await criarUsuarioCore({ nome: 'Gestora', email: 'g@x.com', papel: 'gestor' }, deps);
  assert.equal(r.uid, 'novo1');
  assert.equal(criados[0].papel, 'gestor');
});

test('papel inventado não cria conta', async () => {
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'X', email: 'x@x.com', papel: 'supervisor' }, {}),
    /papel inválido/,
  );
});
