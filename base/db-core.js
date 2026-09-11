// Helpers puros do serviço de banco. Não importam Firebase.
export function caminhoColecao(colecao) {
  if (typeof colecao !== 'string' || colecao.includes('/') || !colecao.trim()) {
    throw new Error('nome de coleção invalido');
  }
  // 4 segmentos no doc final (dados/app/<colecao>/<id>) = documento válido no Firestore.
  return ['dados', 'app', colecao];
}

// Marcador de timestamp resolvido pelo servicos.js real (serverTimestamp).
export const MARCA_TEMPO = Symbol('serverTimestamp');

export function montarRegistro(dados, uid) {
  return { ...dados, criadoPor: uid, criadoEm: MARCA_TEMPO };
}
