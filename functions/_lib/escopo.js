// Quais PROJETOS uma pessoa alcança — lado servidor.
//
// "Projeto" aqui é o que o produto quiser: uma clínica, uma obra, um site, um
// radar de notícias. A Base não sabe e não precisa saber.
//
// Gêmeo de base/escopo.js. Os dois sobem em pacotes diferentes (site e Cloud
// Functions), então a duplicação é do deploy, não descuido. Mexeu num, mexa no
// outro; há teste dos dois lados.
//
// Aqui mora também a régua de RESPONSABILIDADE, que só existe de verdade no
// servidor: a tela pode esconder o botão, mas quem decide é isto.

// O NOME DO CAMPO GRAVADO no cadastro de cada pessoa.
//
// Ele nasceu no primeiro produto feito nesta Base, que era de blogs, e continua
// com esse nome por um motivo prático: renomear campo gravado é migração de
// dados num produto que já está no ar, e o ganho seria puramente estético.
//
// Esta constante existe justamente para o nome antigo aparecer UMA VEZ e não
// vazar para o resto. Todo o código da Base fala em "projeto".
const CAMPO_ALCANCE = 'blogs';

export function alcanceDe(usuario) {
  return usuario ? usuario[CAMPO_ALCANCE] : undefined;
}

// Como a lista vai para o banco. Quem grava usa isto em vez de montar o objeto
// à mão, para o nome do campo continuar preso à constante acima.
export function alcanceParaOBanco(projetos) {
  return { [CAMPO_ALCANCE]: projetos };
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
// ele. Cada produto decide o que "responder" significa: pôr algo no ar, fechar
// um contrato, autorizar um gasto. É a trava antiga ("só admin faz o que pesa")
// preservada sem transformar o dono em gargalo.
export function ehResponsavelPeloProjeto(usuario, projetoId) {
  if (!usuario || usuario.ativo === false || !projetoId) return false;
  if (usuario.papel === 'admin') return alcancaProjeto(usuario, projetoId);
  const lista = alcanceDe(usuario);
  return Array.isArray(lista) && lista.includes(projetoId);
}

// Aceita o que veio da tela e devolve o que pode ir pro banco.
// `null` = todos os projetos. Lista = só esses, sem repetido e sem lixo.
// Devolve `{ erro }` quando não dá pra confiar no que chegou.
export function normalizarAlcance(valor, idsValidos) {
  if (valor === undefined || valor === null) return { projetos: null };
  if (!Array.isArray(valor)) return { erro: 'Diga onde essa pessoa atua.' };

  // Lista vazia é estado legítimo: "cadastrado, mas ainda sem projeto" — o caso
  // de quem entra na equipe antes de o projeto existir. Quem impede a escolha
  // ACIDENTAL é a tela, que exige marcar uma das três opções; aqui só se
  // verifica se o que chegou é válido.
  const limpos = [...new Set(valor.map((v) => String(v || '').trim()).filter(Boolean))];
  if (!limpos.length) return { projetos: [] };

  if (Array.isArray(idsValidos)) {
    const sumido = limpos.find((id) => !idsValidos.includes(id));
    if (sumido) {
      return {
        erro: 'Um dos itens escolhidos não existe mais. Recarregue a página e tente de novo.',
      };
    }
  }
  return { projetos: limpos };
}
