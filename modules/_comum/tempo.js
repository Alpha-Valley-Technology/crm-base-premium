// TEMPO EM PALAVRAS.
//
// ⚠️ ESTA FUNÇÃO MORAVA DENTRO DE UM MÓDULO DE PRODUTO (`inicio/secoes.js`),
// junto do que montava a vitrine e o feed da área de membros. Quando o produto
// saiu para esta carcaça virar matriz, ela quase saiu junto — e ela não é do
// produto, é de qualquer tela que mostre "quando isso aconteceu".
//
// Fica a regra: utilitário que dois módulos usam mora em `_comum`, não no
// primeiro módulo que precisou dele. Enterrado dentro de um produto, ele some
// no dia em que aquele produto for removido.

// "há 2 dias" diz mais que "18/08/2026" numa lista: quem lê quer saber se é
// novo, não a data exata. `agora` entra por parâmetro para o teste não
// depender do relógio.
export function quandoFoi(emMs, agora = Date.now()) {
  const ms = agora - (Number(emMs) || 0);
  if (!emMs || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  const meses = Math.floor(d / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}
