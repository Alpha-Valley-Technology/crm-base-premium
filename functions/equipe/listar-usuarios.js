import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { assertAdmin } from '../_lib/auth.js';
import { alcanceDe } from '../_lib/escopo.js';

// Núcleo puro: seleciona só campos públicos (nunca vaza campos internos futuros).
export function mapearUsuarios(docs) {
  return docs.map((d) => {
    const u = d.data();
    return {
      uid: d.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      ativo: u.ativo,
      // Cadastro antigo não tem o campo. Ausente vira null, que é como o resto
      // do sistema escreve "alcança todos os projetos".
      projetos: alcanceDe(u) === undefined ? null : alcanceDe(u),
    };
  });
}

export const listarUsuarios = onCall({ region: 'southamerica-east1' }, async (request) => {
  await assertAdmin(request.auth);
  try {
    const snap = await getFirestore().collection('usuarios').get();
    return { usuarios: mapearUsuarios(snap.docs) };
  } catch (e) {
    console.error('listarUsuarios falhou:', e);
    throw new HttpsError('internal', 'Não consegui carregar a equipe agora.');
  }
});
