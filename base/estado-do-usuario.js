// O ESTADO DE CADA PESSOA — um documento por usuário, escrito só por ela.
//
// ===========================================================================
// DE ONDE ISTO VEIO, E POR QUE MUDOU DE NOME
// ===========================================================================
//
// Isto era `base/progresso.js`, e guardava o caminho do aluno pelo catálogo:
// aulas concluídas, onde parou, percentual da trilha. Junto disso, e quase por
// acaso, guardava também a marca de quais avisos a pessoa já viu no sino.
//
// Quando o produto saiu para esta carcaça virar matriz, ficou claro que eram
// duas coisas: a trilha era do PRODUTO, e o documento por pessoa é da CARCAÇA.
// O sino precisa lembrar o que cada um já leu, e isso vale para qualquer
// produto que se construa aqui.
//
// Então ficou o documento e saiu a trilha. O nome mudou junto: uma coleção
// chamada "progresso" guardando estado de tela seria uma mentira que duraria
// anos — a próxima pessoa procuraria progresso de curso aqui dentro.
//
// ===========================================================================
// UM DOCUMENTO POR PESSOA, e não um por coisa lembrada
// ===========================================================================
//
// Com um documento por item, cada tela que precisasse do estado viraria uma
// consulta com filtro; com um documento só, é uma leitura. O que a carcaça
// guarda aqui é pequeno por natureza — marcas de leitura, preferências de
// tela — e cabe folgado no teto de 1 MB do Firestore.
//
// SÓ O DONO ESCREVE — a regra do banco confere `request.auth.uid == uid`. O
// admin lê, para o suporte conseguir responder "por que isso não aparece pra
// mim?", mas não escreve: estado que o suporte edita deixa de ser prova do que
// a pessoa fez.
//
// ⚠️ AO GUARDAR ALGO NOVO AQUI, lembre que o documento é do usuário e ele
// enxerga tudo que está dentro. Não é lugar de nota interna sobre ele.

const CAMINHO = ['dados', 'app', 'estado'];

// Devolve o estado da pessoa, ou um vazio. NUNCA estoura: sem ele a pessoa
// ainda tem que conseguir usar o sistema.
export async function lerEstado(db, firestore, uid) {
  if (!uid) return {};
  try {
    const snap = await firestore.getDoc(firestore.doc(db, ...CAMINHO, uid));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    console.warn('estado do usuário: sigo sem ele.', e && e.message);
    return {};
  }
}

export async function gravarEstado(db, firestore, uid, estado) {
  if (!uid) return;
  await firestore.setDoc(firestore.doc(db, ...CAMINHO, uid), estado, { merge: true });
}
