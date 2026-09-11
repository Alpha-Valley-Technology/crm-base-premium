import { test } from 'node:test';
import assert from 'node:assert';
import { criarUsuarioCore } from '../equipe/criar-usuario.js';
import { alcanceParaOBanco } from '../_lib/escopo.js';

function depsFake() {
  const criados = [];
  return {
    criados,
    criarAuthUser: async ({ email }) => ({ uid: 'uid-' + email }),
    gravarUsuario: async (uid, dados) => {
      criados.push({ uid, dados });
    },
  };
}

test('criarUsuarioCore cria a conta e o cadastro', async () => {
  const deps = depsFake();
  const r = await criarUsuarioCore({ nome: 'Ana', email: 'ana@x.com', papel: 'membro' }, deps);
  assert.equal(r.uid, 'uid-ana@x.com');
  assert.equal(r.email, 'ana@x.com', 'devolve o email pra tela dizer por onde a pessoa entra');
  assert.equal(deps.criados[0].dados.papel, 'membro');
  assert.equal(deps.criados[0].dados.ativo, true);
});

test('criarUsuarioCore não cria senha nem link de acesso', async () => {
  // A entrada é só com Google. Gerar senha aqui seria criar credencial que
  // ninguém usa — e antes o link era só escrito no log, sem chegar a ninguém.
  const deps = depsFake();
  let tentou = false;
  deps.gerarLinkAcesso = async () => {
    tentou = true;
    return 'x';
  };
  deps.enviarEmail = async () => {
    tentou = true;
  };
  await criarUsuarioCore({ nome: 'Ana', email: 'ana@x.com', papel: 'membro' }, deps);
  assert.equal(tentou, false);
});

test('criarUsuarioCore rejeita email inválido', async () => {
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'X', email: 'nao-email', papel: 'membro' }, depsFake()),
    /email/,
  );
});

test('criarUsuarioCore rejeita papel inválido', async () => {
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'X', email: 'x@x.com', papel: 'chefe' }, depsFake()),
    /papel/,
  );
});

test('criarUsuarioCore faz rollback do usuário de auth se a gravação falhar', async () => {
  const deps = depsFake();
  deps.gravarUsuario = async () => {
    throw new Error('firestore caiu');
  };
  let removido = null;
  deps.removerAuthUser = async (uid) => {
    removido = uid;
  };
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'Ana', email: 'ana@x.com', papel: 'membro' }, deps),
    /firestore caiu/,
  );
  assert.equal(removido, 'uid-ana@x.com');
});

// ---------- Login órfão: o bug que travava todo cadastro ----------
//
// Entrar com o Google cria a conta de LOGIN mesmo quando o acesso é negado.
// Quem tentava entrar antes de ser cadastrado ficava com login sem cadastro —
// e aí o cadastro falhava com "email já existe" para sempre. O dono bateu
// nisso de verdade com autorecorretoradeseguros@gmail.com.

function depsComLoginOrfao({ jaNaEquipe = false } = {}) {
  const deps = depsFake();
  deps.removidos = [];
  deps.criarAuthUser = async () => {
    const e = new Error('email exists');
    e.code = 'auth/email-already-exists';
    throw e;
  };
  deps.acharAuthUserPorEmail = async () => ({ uid: 'uid-que-ja-existia' });
  deps.usuarioJaCadastrado = async () => jaNaEquipe;
  deps.removerAuthUser = async (uid) => {
    deps.removidos.push(uid);
  };
  return deps;
}

test('quem já tentou entrar é adotado, não recusado', async () => {
  const deps = depsComLoginOrfao();
  const r = await criarUsuarioCore(
    { nome: 'Auto RE', email: 'auto@x.com', papel: 'membro', projetos: [] },
    deps,
  );
  assert.equal(r.uid, 'uid-que-ja-existia', 'reaproveita o login que já existia');
  assert.equal(r.adotado, true);
  assert.equal(deps.criados[0].uid, 'uid-que-ja-existia');
  // O documento gravado usa o nome de campo do BANCO, que a Base isola em
  // `alcanceParaOBanco`. Aqui se confere o que foi gravado de fato.
  assert.deepEqual(deps.criados[0].dados, {
    ...deps.criados[0].dados,
    ...alcanceParaOBanco([]),
  });
});

test('login E cadastro existindo, aí sim é repetido de verdade', async () => {
  const deps = depsComLoginOrfao({ jaNaEquipe: true });
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'Ana', email: 'ana@x.com', papel: 'membro' }, deps),
    (e) => e.ehDuplicado === true,
  );
  assert.equal(deps.criados.length, 0);
});

// Apagar um login que já existia tiraria da pessoa o acesso à conta Google
// dela dentro do projeto. Só se desfaz o que ESTA chamada criou.
test('falha ao gravar não apaga um login adotado', async () => {
  const deps = depsComLoginOrfao();
  deps.gravarUsuario = async () => {
    throw new Error('banco fora');
  };
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'A', email: 'a@x.com', papel: 'membro' }, deps),
    /banco fora/,
  );
  assert.deepEqual(deps.removidos, [], 'não pode apagar login que não foi criado aqui');
});

test('falha ao gravar apaga o login que ESTA chamada criou', async () => {
  const deps = depsFake();
  deps.removidos = [];
  deps.removerAuthUser = async (uid) => {
    deps.removidos.push(uid);
  };
  deps.gravarUsuario = async () => {
    throw new Error('banco fora');
  };
  await assert.rejects(
    () => criarUsuarioCore({ nome: 'A', email: 'a@x.com', papel: 'membro' }, deps),
    /banco fora/,
  );
  assert.deepEqual(deps.removidos, ['uid-a@x.com'], 'não deixa login órfão para trás');
});
