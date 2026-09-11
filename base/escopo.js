// Quais PROJETOS uma pessoa alcança.
//
// "Projeto" aqui é o que o produto quiser: uma clínica, uma obra, um site, um
// radar de notícias. A Base não sabe e não precisa saber — ela só sabe que
// existe uma lista de coisas, e que cada pessoa alcança algumas delas. É isso
// que impede o dado de um cliente de aparecer na tela do outro.
//
// Dois eixos independentes: o PAPEL diz o que a pessoa pode fazer; esta lista
// diz ONDE ela faz. Sem lista (campo ausente ou null) = todos os projetos. É
// assim que o dono continua vendo tudo, e é o que valia para todo mundo antes
// disto existir — nenhum cadastro antigo quebra sozinho.
//
// O gêmeo deste arquivo vive em functions/_lib/escopo.js. São dois pacotes que
// sobem separados (o site e as Cloud Functions), então não dá para importar um
// do outro. Mexeu aqui, mexa lá — e há teste dos dois lados cobrando isso.

import { ESCOPO } from '../config/marca.js';

// Do lado do site, `usuario.projetos` é sempre o alcance da pessoa —
// independente de como o banco guarda isso. Quem traduz é `base/auth.js`, no
// único ponto que lê o documento cru; a função `listarUsuarios` entrega no
// mesmo formato. Aqui não existe nome de campo gravado.
export function alcanceDe(usuario) {
  return usuario ? usuario.projetos : undefined;
}

export function vejoTodosOsProjetos(usuario) {
  return !Array.isArray(alcanceDe(usuario));
}

export function alcancaProjeto(usuario, projetoId) {
  if (!usuario) return false;
  if (vejoTodosOsProjetos(usuario)) return true;
  return alcanceDe(usuario).includes(projetoId);
}

// Responsável é mais restrito que quem só alcança, de propósito.
//
// Administrador é responsável por qualquer projeto que alcance. Membro só onde
// está marcado — membro sem projeto marcado participa, mas não responde por
// ele. Cada produto decide o que "responder" significa: no editorial é pôr post
// no ar; em outro pode ser fechar um contrato.
//
// A decisão de verdade é a do servidor (functions/_lib/escopo.js); esta cópia
// existe só para a tela não oferecer um botão que vai ser recusado.
export function ehResponsavelPeloProjeto(usuario, projetoId) {
  if (!usuario || usuario.ativo === false || !projetoId) return false;
  if (usuario.papel === 'admin') return alcancaProjeto(usuario, projetoId);
  const lista = alcanceDe(usuario);
  return Array.isArray(lista) && lista.includes(projetoId);
}

// O `in` do Firestore aceita no máximo 30 valores por consulta. Passar disso
// não devolve menos resultado: devolve erro. Por isso a consulta é fatiada.
export const LIMITE_IN = 30;

export function fatiar(lista, tamanho = LIMITE_IN) {
  const fatias = [];
  for (let i = 0; i < (lista || []).length; i += tamanho) {
    fatias.push(lista.slice(i, i + tamanho));
  }
  return fatias;
}

// ---------- Como buscar respeitando o alcance ----------
//
// Recebem o `db` por parâmetro em vez de importar: assim dá pra testar sem
// Firebase, e qualquer módulo usa o mesmo caminho.

// Os projetos da pessoa. Quem alcança todos faz a listagem normal; os demais
// buscam um a um, porque a regra do banco recusa uma listagem geral e os IDs já
// estão na mão. Projeto excluído que continua na lista de alguém vira null e
// some daqui — não é erro, é um cadastro que envelheceu.
//
// QUAL coleção é a dos projetos vem do produto (config/marca.js). A Base não
// tem palpite: produto sem projetos declarados simplesmente não tem escopo.
export async function projetosDoUsuario(db, usuario) {
  if (!ESCOPO.colecao) return [];
  if (vejoTodosOsProjetos(usuario)) return db.listar(ESCOPO.colecao);
  const achados = await Promise.all(alcanceDe(usuario).map((id) => db.ler(ESCOPO.colecao, id)));
  return achados.filter(Boolean);
}

// Registros de uma coleção que pertence a um projeto. `campo` é o nome do campo
// que aponta para o projeto — cada módulo tem o seu (`radarId`, `clinicaId`).
export function listarComEscopo(db, usuario, colecao, campo) {
  if (vejoTodosOsProjetos(usuario)) return db.listar(colecao);
  return db.listarOnde(colecao, campo, alcanceDe(usuario));
}
