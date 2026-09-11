import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { assertAdmin } from '../_lib/auth.js';
import { normalizarAlcance, alcanceParaOBanco } from '../_lib/escopo.js';
import { ESCOPO_SERVIDOR } from '../_lib/produto.js';
import { sincronizarClaimSemDerrubar } from '../_lib/claims.js'; //
// ⚠️ O CARIMBO `equipe` NO TOKEN É O QUE LIBERA O STORAGE.
//
// `storage.rules` recusa envio de arquivo sem `request.auth.token.equipe`, e o
// carimbo só existe se alguém chamar `sincronizarClaim`. Ele ficou escrito e
// nunca chamado: a regra estava certa, a ligação não existia, e NINGUÉM
// conseguia enviar imagem — nem o dono. O teste da regra não pegou porque
// carimba o token à mão para provar a regra.
//
// Toda função que muda quem é da equipe (entrou, mudou de papel, foi desativada,
// foi removida) tem que sincronizar aqui.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Erro de validação (mensagem já é leiga e PODE ir pro cliente).
function erroValidacao(msg) {
  const e = new Error(msg);
  e.ehValidacao = true;
  return e;
}

// Núcleo puro com dependências injetadas.
//
// A entrada no sistema é só com Google, então aqui NÃO se cria senha nem se
// gera link de primeiro acesso. Basta a conta existir com o email certo: como
// o projeto usa "uma conta por email", quando a pessoa entrar com o Google
// dela o login cai nesta mesma conta e o cadastro casa.
export async function criarUsuarioCore(dados, deps) {
  const { nome, email, papel, projetos } = dados || {};
  if (!nome || !nome.trim()) throw erroValidacao('nome obrigatório');
  if (!EMAIL_RE.test(email || '')) throw erroValidacao('email inválido');
  if (!['membro', 'gestor', 'admin'].includes(papel)) throw erroValidacao('papel inválido');

  // Onde a pessoa atua. `null` = todos. Validado ANTES de criar a conta de
  // login: melhor recusar do que deixar login órfão pra trás.
  const idsValidos = deps.listarProjetoIds ? await deps.listarProjetoIds() : null;
  const escopo = normalizarAlcance(projetos, idsValidos);
  if (escopo.erro) throw erroValidacao(escopo.erro);

  // Entrar com o Google cria a conta de login MESMO quando o acesso é negado.
  // Então quem tentou entrar antes de ser cadastrado já tem login — e, sem o
  // resgate abaixo, virava impossível de cadastrar: o Google respondia "email
  // já existe" e a tela dizia "já está cadastrado", que era mentira.
  let uid;
  let adotado = false;
  try {
    ({ uid } = await deps.criarAuthUser({ email, displayName: nome }));
  } catch (e) {
    if (!e || e.code !== 'auth/email-already-exists') throw e;
    const existente = await deps.acharAuthUserPorEmail(email);
    if (!existente) throw e;
    // Login existe E cadastro existe: aí sim é gente repetida de verdade.
    if (await deps.usuarioJaCadastrado(existente.uid)) {
      const dup = new Error('Esse email já está cadastrado.');
      dup.ehDuplicado = true;
      throw dup;
    }
    uid = existente.uid;
    adotado = true;
  }

  try {
    await deps.gravarUsuario(uid, {
      nome,
      email,
      papel,
      ativo: true,
      ...alcanceParaOBanco(escopo.projetos),
    });
  } catch (e) {
    // Rollback: evita usuário de auth órfão (criado, mas sem doc/sem acesso).
    // Só do que ESTA chamada criou — apagar um login que já existia tiraria da
    // pessoa o acesso a tudo que ela tem no Google.
    if (!adotado && deps.removerAuthUser) {
      try {
        await deps.removerAuthUser(uid);
      } catch {
        /* rollback best-effort */
      }
    }
    throw e;
  }
  return { uid, email, adotado };
}

export const criarUsuario = onCall({ region: 'southamerica-east1' }, async (request) => {
  await assertAdmin(request.auth);
  const deps = {
    // A coleção dos projetos é do PRODUTO (functions/_lib/produto.js). Sem
    // ela declarada, não há o que conferir — e a Base não chuta um nome.
    listarProjetoIds: ESCOPO_SERVIDOR.colecao
      ? async () => {
          const snap = await getFirestore()
            .collection(`dados/app/${ESCOPO_SERVIDOR.colecao}`)
            .get();
          return snap.docs.map((d) => d.id);
        }
      : null,
    criarAuthUser: (d) => getAuth().createUser(d),
    acharAuthUserPorEmail: (e) =>
      getAuth()
        .getUserByEmail(e)
        .catch(() => null),
    usuarioJaCadastrado: async (uid) => (await getFirestore().doc(`usuarios/${uid}`).get()).exists,
    removerAuthUser: (uid) => getAuth().deleteUser(uid),
    gravarUsuario: async (uid, d) => {
      await getFirestore()
        .doc(`usuarios/${uid}`)
        .set({
          ...d,
          criadoPor: request.auth.uid,
          criadoEm: FieldValue.serverTimestamp(),
        });
      await sincronizarClaimSemDerrubar(uid, { ativo: d.ativo, papel: d.papel });
    },
  };
  try {
    return await criarUsuarioCore(request.data, deps);
  } catch (e) {
    // Só mensagens de validação (leigas, marcadas) podem ir pro cliente.
    if (e && e.ehValidacao) throw new HttpsError('invalid-argument', e.message);
    // Repetido de verdade: já tem login E já está na equipe.
    if (e && (e.ehDuplicado || e.code === 'auth/email-already-exists')) {
      throw new HttpsError('already-exists', 'Essa pessoa já está na equipe.');
    }
    // Qualquer outro erro: loga cru no servidor, devolve mensagem genérica leiga.
    console.error('criarUsuario falhou:', e);
    throw new HttpsError('internal', 'Não consegui cadastrar agora. Tente de novo.');
  }
});
