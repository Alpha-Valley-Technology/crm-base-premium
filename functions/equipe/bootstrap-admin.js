import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import '../_lib/auth.js'; // garante que o app admin foi inicializado
import { sincronizarClaimSemDerrubar } from '../_lib/claims.js';

// Núcleo puro: delega a criação atômica do 1º admin. Retorna { criado }.
export async function bootstrapAdminCore(uid, dadosAuth, deps) {
  const criado = await deps.bootstrapAtomico(uid, {
    nome: dadosAuth.nome || dadosAuth.email,
    email: dadosAuth.email,
    papel: 'admin',
    ativo: true,
  });
  return { criado };
}

export const bootstrapAdmin = onCall({ region: 'southamerica-east1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login.');
  const db = getFirestore();
  const token = request.auth.token || {};
  const deps = {
    // Atômico: um doc-sentinela (config/_bootstrap) garante um único 1º admin,
    // sem corrida entre logins simultâneos. Só o primeiro a criar o sentinela vence.
    bootstrapAtomico: (uid, dadosAdmin) =>
      db.runTransaction(async (tx) => {
        const sentinela = db.doc('config/_bootstrap');
        const snap = await tx.get(sentinela);
        if (snap.exists) return false; // já houve um 1º admin
        tx.set(sentinela, { feito: true, por: uid, em: FieldValue.serverTimestamp() });
        tx.set(db.doc(`usuarios/${uid}`), {
          ...dadosAdmin,
          criadoPor: uid,
          criadoEm: FieldValue.serverTimestamp(),
        });
        return true;
      }),
  };
  try {
    const r = await bootstrapAdminCore(
      request.auth.uid,
      { nome: token.name, email: token.email },
      deps,
    );
    // O PRIMEIRO ADMIN também precisa do carimbo — é ele quem vai subir as
    // primeiras capas. Sem isto, o dono do sistema é o único que nunca
    // conseguiria enviar uma imagem.
    // `criado === true` é a ÚNICA condição. Quem chega depois do primeiro admin
    // recebe `criado: false` e NÃO tem cadastro nenhum — carimbar essa pessoa
    // daria a ela o Storage de administrador sem ela estar na equipe. Seria
    // trocar um defeito por um buraco.
    if (r && r.criado === true) {
      await sincronizarClaimSemDerrubar(request.auth.uid, { ativo: true, papel: 'admin' });
    }
    return r;
  } catch (e) {
    console.error('bootstrapAdmin falhou:', e);
    throw new HttpsError('internal', 'Não consegui concluir o primeiro acesso.');
  }
});
