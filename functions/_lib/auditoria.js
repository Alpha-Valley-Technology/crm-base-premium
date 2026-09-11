// Trilha de auditoria: quem fez o quê, quando, sobre qual coisa.
//
// Existe porque sem ela não há como responder a pergunta que sempre aparece
// depois — "quem apagou isso?", "quando essa pessoa ganhou acesso?", "quem
// publicou esse post?". Log de nuvem não serve: expira, não é consultável pelo
// dono, e some junto se alguém apagar o projeto.
//
// REGRAS DA TRILHA
//
// 1. Só o servidor escreve. A regra do banco é `allow write: if false` — nem o
//    admin escreve pelo navegador. Trilha que o auditado pode editar não é
//    trilha.
// 2. Ninguém apaga, nem o servidor. Não existe função que remova registro.
// 3. NUNCA guarda credencial. Chave, token e senha não entram nem no `detalhe`
//    — só o fato de terem sido trocados.
// 4. Em ação destrutiva, o registro é gravado ANTES de destruir. Se a trilha
//    falhar, a destruição não acontece: prefiro a ação recusada à ação
//    invisível.

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const COLECAO = 'auditoria';

// Guarda o registro. LANÇA se não conseguir — quem chama decide se isso derruba
// a ação (destrutiva: sim) ou só reclama no log (o resto).
export async function registrar(dados, db = getFirestore()) {
  const { quem, acao, alvo } = dados || {};
  if (!acao) throw new Error('auditoria sem acao');
  await db.collection(COLECAO).add({
    em: FieldValue.serverTimestamp(),
    emMs: Date.now(),
    uid: (quem && quem.uid) || '',
    email: (quem && quem.email) || '',
    papel: (quem && quem.papel) || '',
    acao,
    alvo: alvo || '',
    projetoId: dados.projetoId || '',
    detalhe: dados.detalhe || {},
  });
}

// Para ação NÃO destrutiva: registra, e se a trilha falhar reclama alto mas
// deixa a ação seguir. Derrubar uma publicação porque a auditoria piscou seria
// trocar um problema pequeno por um grande.
export async function registrarSemDerrubar(dados, db = getFirestore()) {
  try {
    await registrar(dados, db);
  } catch (e) {
    console.error('AUDITORIA FALHOU (a ação seguiu):', dados && dados.acao, e);
  }
}

// Quem pediu, no formato que a trilha guarda. `usuario` é o que os asserts de
// auth devolvem; `auth.uid` vem do request.
export function autor(auth, usuario) {
  return {
    uid: (auth && auth.uid) || '',
    email: (usuario && usuario.email) || '',
    papel: (usuario && usuario.papel) || '',
  };
}
