// Os recados PESSOAIS: "responderam você", "sua resposta resolveu".
//
// ---------------------------------------------------------------------------
// POR QUE ISTO NÃO É UM AVISO, e por que os dois nunca se misturam.
// ---------------------------------------------------------------------------
//
// Aviso é da EQUIPE para TODO MUNDO ("live de quinta, 20h"). Recado é de UMA
// pessoa para OUTRA ("o João respondeu sua pergunta"). Eles têm dono diferente,
// dura diferente e régua diferente:
//
//   • O aviso é escrito pelo admin; o recado nasce de quem participa.
//   • O aviso o admin apaga para todo mundo; o recado só o destinatário apaga.
//   • O aviso todo membro lê; o recado SÓ o destinatário lê — nem o admin.
//
// Guardar os dois na mesma coleção faria a equipe enxergar a caixa de recado de
// cada membro, e faria o recado de conversa competir com o aviso de live pelo
// mesmo espaço. São duas coleções, duas regras e DUAS LISTAS no painel do sino,
// cada uma com o seu título. Aparecem no mesmo lugar porque o lugar de olhar é
// um só; o que está dentro continua separado.
//
// ---------------------------------------------------------------------------
// O RECADO NÃO CARREGA TEXTO LIVRE.
// ---------------------------------------------------------------------------
//
// Ele guarda o TIPO e para onde leva. A frase é montada aqui, na tela. Se o
// texto viesse gravado, quem escreve o recado (qualquer membro) teria um canal
// para mandar a frase que quisesse direto para o sino de outra pessoa — um
// megafone privado sem moderação. Do jeito que está, o pior que alguém
// consegue mandar é o próprio nome, que já aparece no fórum de qualquer jeito.

export const QUANTOS = 7;

export const TIPOS = {
  resposta: { verbo: 'respondeu sua pergunta' },
  aceita: { verbo: 'marcou sua resposta como a que resolveu' },
};

export function novoRecado({ tipo, paraUid, postId, postTitulo, comentarioId }, usuario, agoraMs) {
  return {
    tipo: TIPOS[tipo] ? tipo : 'resposta',
    paraUid: String(paraUid),
    deUid: usuario.uid,
    deNome: String(usuario.nome || '').slice(0, 100),
    postId: String(postId),
    postTitulo: String(postTitulo || '').slice(0, 200),
    comentarioId: String(comentarioId || ''),
    emMs: agoraMs,
  };
}

export function ultimosRecados(recados, quantos = QUANTOS) {
  return [...(recados || [])]
    .filter((r) => r && r.tipo)
    .sort((a, b) => (Number(b.emMs) || 0) - (Number(a.emMs) || 0))
    .slice(0, quantos);
}

// O mesmo carimbo de tempo que vale para os avisos vale aqui: um número só diz
// "o que é mais novo que isto, eu não vi". Dois carimbos separados obrigariam a
// pessoa a abrir o sino duas vezes para apagar a mesma bolinha.
export function temRecadoNovo(recados, vistosEmMs) {
  const corte = Number(vistosEmMs) || 0;
  return ultimosRecados(recados).some((r) => (Number(r.emMs) || 0) > corte);
}

// A frase, montada na hora. `deNome` vazio vira "Alguém" — recado sem sujeito
// ("respondeu sua pergunta") parece erro de sistema.
export function textoDoRecado(recado) {
  const t = TIPOS[recado && recado.tipo] || TIPOS.resposta;
  const quem = String((recado && recado.deNome) || '').trim() || 'Alguém';
  return {
    titulo: `${quem} ${t.verbo}`,
    apoio: String((recado && recado.postTitulo) || '').trim(),
    // Leva ao POST, e não a uma caixa de entrada.
    //
    // Responder dentro do sino guardaria a resposta num canto onde só duas
    // pessoas a leem — e as outras cinquenta com a mesma dúvida perderiam
    // exatamente o que faz um fórum valer: a conversa ficar de pé para quem
    // chegar depois. O recado avisa; a conversa continua onde ela é pública.
    href: `#/comunidade/post/${(recado && recado.postId) || ''}`,
  };
}
