// Gestão de quem já está na equipe: mudar papel, desativar/reativar e remover.
//
// A regra que manda em tudo aqui: NUNCA pode sobrar zero administrador ativo.
// Sem admin, ninguém entra pra consertar — e como o primeiro login numa base
// sem usuários vira admin (ver bootstrapAdmin), a porta ficaria aberta pra
// qualquer conta Google. Por isso a trava mora no servidor, não na tela.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { assertAdmin } from '../_lib/auth.js';
import { normalizarAlcance, alcanceParaOBanco } from '../_lib/escopo.js';
import { ESCOPO_SERVIDOR } from '../_lib/produto.js';
import { sincronizarClaimSemDerrubar } from '../_lib/claims.js';
//
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

const REGIAO = 'southamerica-east1';

// ---------- Partes puras (testáveis sem banco) ----------

// Quantos admins ativos sobram DEPOIS da mudança.
// `mudanca`: { papel?, ativo? } ou { remover: true }.
export function adminsAtivosApos(usuarios, uidAlvo, mudanca = {}) {
  return (usuarios || []).filter((u) => {
    if (u.uid !== uidAlvo) return u.papel === 'admin' && u.ativo === true;
    if (mudanca.remover) return false;
    const papel = mudanca.papel === undefined ? u.papel : mudanca.papel;
    const ativo = mudanca.ativo === undefined ? u.ativo : mudanca.ativo;
    return papel === 'admin' && ativo === true;
  }).length;
}

// Devolve a mensagem do impedimento, ou null se pode seguir. Puro.
export function motivoDoBloqueio({ usuarios, uidAlvo, meuUid, mudanca }) {
  if (!uidAlvo) return 'Diga qual pessoa você quer alterar.';
  if (uidAlvo === meuUid)
    return 'Você não pode alterar a própria conta. Peça para outro administrador.';

  const alvo = (usuarios || []).find((u) => u.uid === uidAlvo);
  if (!alvo) return 'Essa pessoa não está mais na equipe.';

  if (mudanca.papel !== undefined && !['membro', 'gestor', 'admin'].includes(mudanca.papel)) {
    return 'Papel inválido.';
  }

  // ⚠️ A CONTA CONTINUA SENDO SÓ DE ADMIN, e isso é a decisão.
  //
  // Gestor NÃO conta como administrador aqui. Rebaixar o único admin a gestor
  // tranca o sistema exatamente como rebaixá-lo a membro: ninguém mais alcança
  // Equipe, Identidade e Pagamento — e não há caminho de volta pela tela.
  //
  // A mensagem diz "administrador" de propósito: numa equipe com gestores, quem
  // lê "só resta um" precisa saber que gestor não resolve.
  if (adminsAtivosApos(usuarios, uidAlvo, mudanca) < 1) {
    return (
      'Esta é a única pessoa com acesso de ADMINISTRADOR ativo — e gestor não substitui, ' +
      'porque gestor não alcança Equipe, Identidade nem Pagamento. Promova outro ' +
      'administrador antes, senão ninguém consegue mais administrar o sistema.'
    );
  }
  return null;
}

// ---------- Funções publicadas ----------

async function carregarEquipe() {
  const snap = await getFirestore().collection('usuarios').get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export const atualizarUsuario = onCall({ region: REGIAO }, async (request) => {
  const eu = await assertAdmin(request.auth);
  const { uid, papel, ativo, projetos } = request.data || {};
  const mudanca = {};
  if (papel !== undefined) mudanca.papel = papel;
  if (ativo !== undefined) mudanca.ativo = ativo === true;
  // Onde a pessoa atua. `null` = todos. A coleção dos projetos é do PRODUTO
  // (functions/_lib/produto.js); sem ela declarada, não há o que conferir.
  if (projetos !== undefined) {
    let idsValidos = null;
    if (ESCOPO_SERVIDOR.colecao) {
      const snap = await getFirestore().collection(`dados/app/${ESCOPO_SERVIDOR.colecao}`).get();
      idsValidos = snap.docs.map((d) => d.id);
    }
    const escopo = normalizarAlcance(projetos, idsValidos);
    if (escopo.erro) throw new HttpsError('invalid-argument', escopo.erro);
    Object.assign(mudanca, alcanceParaOBanco(escopo.projetos));
  }
  if (!Object.keys(mudanca).length) {
    throw new HttpsError('invalid-argument', 'Não veio nenhuma alteração.');
  }

  try {
    const usuarios = await carregarEquipe();
    const bloqueio = motivoDoBloqueio({
      usuarios,
      uidAlvo: uid,
      meuUid: request.auth.uid,
      mudanca,
    });
    if (bloqueio) throw new HttpsError('failed-precondition', bloqueio);

    await getFirestore().doc(`usuarios/${uid}`).update(mudanca);

    // O carimbo segue o cadastro. Mudou de papel ou foi desativado, o token
    // tem que dizer o mesmo — senão a pessoa perde (ou mantém) o Storage sem
    // relação com o que a tela mostra.
    // ⚠️ `u.uid`, E NÃO `u.id`. `carregarEquipe` monta `{ uid, ...dados }` —
    // não existe `id` nesses objetos, então esta busca devolvia `undefined`
    // SEMPRE, e `atual` era um objeto vazio em toda alteração.
    //
    // O estrago era silencioso e sério: mudar só o PAPEL de alguém fazia
    // `atual.ativo` valer `undefined`, e `sincronizarClaim` lê isso como
    // "não está ativo" — carimbando `equipe: false` no token da pessoa.
    //
    // Ou seja: promover um membro a gestor tirava dele o acesso ao Storage,
    // que é justamente a ferramenta do cargo. O banco dizia uma coisa, o
    // token dizia outra, e nada na tela explicava por que a publicação de
    // aula parou de funcionar.
    const atual = usuarios.find((u) => u.uid === uid) || {};
    await sincronizarClaimSemDerrubar(uid, {
      ativo: 'ativo' in mudanca ? mudanca.ativo : atual.ativo,
      papel: 'papel' in mudanca ? mudanca.papel : atual.papel,
    });

    // Desativado não deve conseguir usar sessão que já estava aberta.
    if (mudanca.ativo === false) {
      await getAuth().revokeRefreshTokens(uid);
    }

    // ⚠️ QUANDO HOUVER GATEWAY, A COBRANÇA PRECISA PARAR AQUI.
    //
    // Esta é a armadilha mais cara desta função, e ela não é óbvia: a
    // assinatura vive no gateway, e fechar o acesso aqui não diz NADA a ele.
    // No mês seguinte a cobrança sai igual — e o resultado é uma pessoa sem
    // acesso nenhum pagando todo mês. Ela descobre pela fatura, e a resposta
    // é estorno.
    //
    // DEPOIS do bloqueio, e nunca antes: se o gateway estiver fora do ar, a
    // pessoa fica de fora mesmo assim e a tela avisa para cancelar à mão. O
    // contrário deixaria alguém dentro porque um sistema de terceiro caiu.
    //
    // O retorno já carrega o campo `cobranca` de propósito — a tela de Equipe
    // lê ele para dizer se conseguiu ou não. Quem ligar o gateway preenche
    // aqui, e a tela funciona sem mudar.
    return { ok: true, cobranca: null };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error('atualizarUsuario falhou:', e, '| quem pediu:', eu && eu.email);
    throw new HttpsError('internal', 'Não consegui alterar agora. Tente de novo.');
  }
});

export const removerUsuario = onCall({ region: REGIAO }, async (request) => {
  await assertAdmin(request.auth);
  const { uid } = request.data || {};

  try {
    const usuarios = await carregarEquipe();
    const bloqueio = motivoDoBloqueio({
      usuarios,
      uidAlvo: uid,
      meuUid: request.auth.uid,
      mudanca: { remover: true },
    });
    if (bloqueio) throw new HttpsError('failed-precondition', bloqueio);

    // Primeiro tira o acesso, depois o cadastro: se falhar no meio, a pessoa
    // fica sem login em vez de ficar com login e sem registro.
    try {
      await getAuth().deleteUser(uid);
    } catch (e) {
      // Conta de login já não existia — segue e limpa o cadastro.
      if (!e || e.code !== 'auth/user-not-found') throw e;
    }
    // ⚠️ QUANDO HOUVER GATEWAY, A COBRANÇA PARA **ANTES** DO CADASTRO SUMIR.
    //
    // Esta é a última chance de saber qual era a assinatura: apagado o
    // documento, o número dela some junto, e o gateway continua cobrando de
    // alguém que nem existe mais aqui. Não há como consertar depois — só
    // procurando na conta do gateway, um por um.
    await getFirestore().doc(`usuarios/${uid}`).delete();
    return { ok: true, cobranca: null };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error('removerUsuario falhou:', e);
    throw new HttpsError('internal', 'Não consegui remover agora. Tente de novo.');
  }
});
