// Os avisos do sino: o que a equipe quer que todo mundo veja.
//
// NÃO SÃO "fulano respondeu você". Aviso pessoal tem outro dono e outra régua —
// misturar os dois faria a equipe ver a caixa de recado de cada membro, e faria
// o recado da equipe competir com conversa de fórum pelo mesmo espaço.
//
// SETE, e não "todos". A lista do sino é para dar uma olhada em pé, não para
// ler o histórico da comunidade. Passando de sete, ela vira uma tela dentro de
// um popup — e aí ninguém lê nenhum.

export const QUANTOS = 7;

export function ultimosAvisos(avisos, quantos = QUANTOS) {
  return [...(avisos || [])]
    .filter((a) => a && a.visivel !== false)
    .sort((a, b) => (Number(b.emMs) || 0) - (Number(a.emMs) || 0))
    .slice(0, quantos);
}

// O PONTO VERMELHO É UM CARIMBO DE TEMPO, e não uma lista de lidos.
//
// Guardar "quais avisos eu já vi" cresce para sempre e obriga a limpar. Guardar
// QUANDO abri o sino pela última vez resolve o mesmo problema com um número: o
// que é mais novo que isso, eu não vi.
//
// Quem nunca abriu (`undefined`) tem tudo como não lido — é o certo: ela acabou
// de chegar e os avisos são exatamente o que ela precisa ver.
export function naoLidos(avisos, vistosEmMs) {
  const corte = Number(vistosEmMs) || 0;
  return ultimosAvisos(avisos).filter((a) => (Number(a.emMs) || 0) > corte);
}

export function temNaoLido(avisos, vistosEmMs) {
  return naoLidos(avisos, vistosEmMs).length > 0;
}

export function validarAviso({ titulo, corpo }) {
  const t = String(titulo || '').trim();
  if (!t) return 'Escreva o aviso.';
  if (t.length > 120) return 'Aviso muito longo (máximo 120). Use o texto de apoio para o resto.';
  if (String(corpo || '').length > 2000) return 'Texto de apoio muito longo.';
  return null;
}

export function novoAviso({ titulo, corpo, linkUrl }, agoraMs) {
  return {
    titulo: String(titulo).trim(),
    corpo: String(corpo || '').trim(),
    linkUrl: String(linkUrl || '').trim(),
    emMs: agoraMs,
    visivel: true,
  };
}
