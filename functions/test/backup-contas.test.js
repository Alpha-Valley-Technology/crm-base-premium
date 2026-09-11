// O backup das contas de login.
//
// O backup do Firestore guarda o CADASTRO da pessoa; sem este, a conta que a
// deixa entrar não está em lugar nenhum. Some a conta e o cadastro continua lá,
// intacto e inútil.

import { test } from 'node:test';
import assert from 'node:assert';
import {
  contaParaBackup,
  listarTodasAsContas,
  nomeDoArquivo,
  exportarContas,
} from '../backup/exportar-contas.js';

const conta = (uid, extra = {}) => ({
  uid,
  email: `${uid}@x.com`,
  displayName: `Nome ${uid}`,
  emailVerified: true,
  disabled: false,
  metadata: { creationTime: 'Mon, 01 Jan 2026 00:00:00 GMT', lastSignInTime: '' },
  providerData: [{ providerId: 'password' }],
  ...extra,
});

// ⚠️ SENHA NÃO ENTRA. Nem a senha, nem o hash, nem o sal.
//
// Guardar isso num balde de arquivos é trocar um risco raro (o Google perder
// contas) por um risco permanente: um arquivo com o segredo de todo mundo
// esperando alguém achar.
test('o backup NÃO leva senha, hash nem sal', () => {
  const bruto = conta('a1', {
    passwordHash: 'nao-deveria-sair-daqui',
    passwordSalt: 'nem-isto',
    customClaims: { papel: 'admin' },
  });
  const salvo = contaParaBackup(bruto);
  const texto = JSON.stringify(salvo);
  assert.equal(/nao-deveria-sair-daqui|nem-isto/.test(texto), false);
  assert.deepEqual(Object.keys(salvo).sort(), [
    'criadaEm',
    'desativada',
    'email',
    'nome',
    'provedores',
    'uid',
    'ultimaEntrada',
    'verificado',
  ]);
});

// Sem saber COMO a pessoa entra, a restauração não sabe a quem mandar convite
// de senha e a quem só pedir para entrar de novo com o Google.
test('o backup leva por onde a pessoa entra', () => {
  const comGoogle = contaParaBackup(
    conta('g', {
      providerData: [{ providerId: 'google.com' }],
    }),
  );
  assert.deepEqual(comGoogle.provedores, ['google.com']);
  assert.deepEqual(contaParaBackup(conta('s')).provedores, ['password']);
});

test('conta sem nome ou sem e-mail não estoura o backup', () => {
  const magra = contaParaBackup({ uid: 'x' });
  assert.equal(magra.email, '');
  assert.equal(magra.nome, '');
  assert.deepEqual(magra.provedores, []);
  assert.equal(magra.criadaEm, '');
});

// O Firebase entrega no máximo mil por vez. Parar na primeira página deixaria
// de fora todo mundo a partir do milésimo — e ninguém notaria até o dia do
// resgate.
test('a lista percorre TODAS as páginas, e não só a primeira', async () => {
  const paginas = {
    undefined: { users: [conta('a'), conta('b')], pageToken: 'p2' },
    p2: { users: [conta('c')], pageToken: 'p3' },
    p3: { users: [conta('d')], pageToken: undefined },
  };
  const auth = { listUsers: async (_, token) => paginas[String(token)] };
  const contas = await listarTodasAsContas(auth);
  assert.deepEqual(
    contas.map((c) => c.uid),
    ['a', 'b', 'c', 'd'],
  );
});

// Uma pasta por dia, com a data no nome: para achar "o de antes de ontem" sem
// abrir nenhum arquivo.
test('o arquivo é nomeado pela data, com zero à esquerda', () => {
  assert.equal(nomeDoArquivo(Date.UTC(2026, 0, 5)), 'backup-contas/2026-01-05.json');
  assert.equal(nomeDoArquivo(Date.UTC(2026, 11, 31)), 'backup-contas/2026-12-31.json');
});

test('a exportação grava o arquivo com o aviso junto', async () => {
  const gravado = [];
  const bucket = {
    file: (nome) => ({
      save: async (conteudo, opcoes) => {
        gravado.push({ nome, conteudo, opcoes });
      },
    }),
  };
  const auth = { listUsers: async () => ({ users: [conta('a'), conta('b')] }) };

  const quantas = await exportarContas({ auth, bucket, agora: Date.UTC(2026, 7, 24) });
  assert.equal(quantas, 2);
  assert.equal(gravado.length, 1);
  assert.equal(gravado[0].nome, 'backup-contas/2026-08-24.json');

  const dados = JSON.parse(gravado[0].conteudo);
  assert.equal(dados.quantas, 2);
  assert.equal(dados.contas.length, 2);
  // O aviso viaja JUNTO do arquivo: quem o abrir daqui a um ano precisa saber
  // que a senha não está ali, antes de contar com ela.
  assert.match(dados.aviso, /[Ss]em senhas/);

  // Ler uma versão velha do arquivo de resgate no dia do resgate seria o pior
  // momento possível para um cache acertar.
  assert.equal(gravado[0].opcoes.metadata.cacheControl, 'no-store');
});
