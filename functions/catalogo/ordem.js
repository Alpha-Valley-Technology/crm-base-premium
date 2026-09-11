// A ordem dos itens do catálogo. Lógica pura — roda em teste sem Firebase.
//
// POR QUE DE 10 EM 10, e não 1, 2, 3.
//
// Com passo 1, encaixar um item entre o 2 e o 3 obriga a reescrever todos os
// seguintes. Numa comunidade com centenas de aulas isso é uma gravação em lote
// a cada arrastada, e duas pessoas mexendo ao mesmo tempo se atropelam.
//
// Com passo 10 sobra espaço: quem entra no meio recebe a MÉDIA dos vizinhos
// (25 entre 20 e 30) e ninguém mais é tocado.
//
// POR QUE ISSO NÃO MORA NO NAVEGADOR.
//
// A próxima posição depende do que já existe. Dois administradores criando ao
// mesmo tempo leem a mesma lista e calculam a mesma posição — e nascem dois
// itens empatados, que aparecem em ordem aleatória. No servidor a conta é uma
// só.

export const PASSO = 10;

// A posição de quem entra no fim da fila.
export function proximaOrdem(itens) {
  const ordens = (itens || [])
    .map((i) => (typeof i.ordem === 'number' ? i.ordem : 0))
    .filter((n) => Number.isFinite(n));
  if (!ordens.length) return PASSO;
  return Math.max(...ordens) + PASSO;
}

// A posição de quem entra ENTRE dois vizinhos. `null` de um lado significa
// ponta da lista.
export function ordemEntre(anterior, seguinte) {
  const a = typeof anterior === 'number' ? anterior : null;
  const b = typeof seguinte === 'number' ? seguinte : null;
  if (a === null && b === null) return PASSO;
  if (a === null) return b - PASSO;
  if (b === null) return a + PASSO;
  return (a + b) / 2;
}

// A lista inteira renumerada. Usada quando o admin arrasta e solta: em vez de
// calcular o encaixe, o navegador manda a ordem final e o servidor grava.
//
// Renumerar tudo aqui é de propósito. É a única operação que DESFAZ o acúmulo
// de casas decimais que o `ordemEntre` cria com o tempo (25, 22.5, 21.25…).
export function ordensRenumeradas(ids) {
  return (ids || []).map((id, i) => ({ id, ordem: (i + 1) * PASSO }));
}
