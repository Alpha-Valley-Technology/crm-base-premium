// Carimbo de "é da equipe" no próprio token de login.
//
// POR QUE ISTO EXISTE. A regra do Storage precisa saber se quem está enviando
// arquivo é da equipe. A primeira versão consultava o Firestore de dentro da
// regra do Storage (`firestore.exists(...)`). Funciona em produção, mas o
// emulador não confirma — e regra de segurança que não dá pra provar em teste é
// esperança, não trava. Aqui o dado viaja no próprio token: a regra lê
// `request.auth.token.equipe`, sem consultar nada, e o teste prova.
//
// De quebra sai mais barato: cada envio de arquivo deixa de custar uma leitura
// no banco.
//
// LIMITE HONESTO: o token da pessoa só carrega o carimbo novo quando é
// renovado (até uma hora). Para tirar acesso na hora, quem manda é
// `revokeRefreshTokens`, que a desativação já faz — o carimbo é a segunda
// camada, não a única.

import { getAuth } from 'firebase-admin/auth';

// `ativo` false, ou pessoa removida, tira o carimbo.
// Os três papéis, e a ordem importa: qualquer coisa fora desta lista vira
// `membro`. É o padrão seguro — papel estragado no banco não pode virar
// permissão, e o pior que pode acontecer é alguém perder acesso que tinha.
const PAPEIS = ['admin', 'gestor', 'membro'];

// `auth` é injetável só para o teste: a regra de leitura abaixo já custou um
// defeito calado (ver `test/claim-do-papel.test.js`), e provar essa regra não
// deveria exigir subir o Firebase inteiro.
export async function sincronizarClaim(uid, { ativo, papel } = {}, auth = null) {
  if (!uid) return;
  // ⚠️ `ativo === true`, E NÃO `ativo !== false`. Quem chega sem saber se a
  // pessoa está ativa é carimbado como FORA da equipe — o lado seguro do erro.
  // Quem chama é que precisa mandar o valor de verdade.
  const marca =
    ativo === true
      ? { equipe: true, papel: PAPEIS.includes(papel) ? papel : 'membro' }
      : { equipe: false };
  await (auth || getAuth()).setCustomUserClaims(uid, marca);
}

// Nunca derruba a ação principal: o cadastro no banco é a verdade, o carimbo é
// cópia. Se falhar, reclama alto — a próxima alteração daquela pessoa reconcilia.
export async function sincronizarClaimSemDerrubar(uid, dados, auth = null) {
  try {
    await sincronizarClaim(uid, dados, auth);
  } catch (e) {
    console.error('CLAIM NAO SINCRONIZOU (a ação seguiu) para', uid, e);
  }
}
