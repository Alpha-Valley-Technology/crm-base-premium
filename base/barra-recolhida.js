// RECOLHER A BARRA LATERAL, no desktop.
//
// ===========================================================================
// O QUE ISTO NÃO FAZ
// ===========================================================================
//
// Não mexe no celular. Abaixo de 1024px a barra já é gaveta, com sanduíche e
// véu — recolher uma gaveta não significa nada. O botão nem existe lá.
//
// Não abre sozinha quando o mouse passa perto. Barra que expande no hover é o
// tipo de coisa que atrapalha mais do que ajuda: quem recolheu, recolheu de
// propósito, e a barra pulando de largura enquanto a pessoa mira um botão do
// conteúdo é ruído puro.
//
// ===========================================================================
// COMO ELA FUNCIONA
// ===========================================================================
//
// A casca já é uma grade (`grid-template-columns: 248px 1fr`). Recolher é
// trocar a primeira coluna por 64px, e o resto se reposiciona sozinho. Toda a
// mudança visual é CSS pendurado numa classe; este arquivo só decide quando a
// classe entra e sai, e lembra da escolha.

const CHAVE = 'cnd.barra-recolhida';

// PURO. A sigla que aparece no lugar do logo escrito quando a barra encolhe.
//
// A REGRA É A INICIAL DE CADA PARTE, no máximo duas letras. "NINJA" + "DIGITAL"
// vira "ND"; "Clinica Nova Vida" numa parte só vira "CN". Três letras
// não cabem em 40px com peso 800, e uma só é ambígua demais entre produtos da
// mesma agência — que é exatamente o caso de quem vende este sistema.
export function sigla(parte1, parte2, nomeDoProduto) {
  const partes = [parte1, parte2].map((p) => String(p || '').trim()).filter(Boolean);

  const fonte = partes.length ? partes : [String(nomeDoProduto || '').trim()];

  const letras = fonte
    .join(' ')
    .split(/[\s\-—·]+/)
    .filter(Boolean)
    // Palavra de ligação não vira inicial: "Escola de Ninjas" é "EN", não "EDN".
    .filter((palavra) => !['de', 'da', 'do', 'e', 'a', 'o'].includes(palavra.toLowerCase()))
    .map((palavra) => palavra[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return letras || '•';
}

// PURO. Qual imagem representa a marca no espaço de 40px.
//
// O FAVICON GANHA DO LOGO, e não é preferência estética: favicon já é desenhado
// para ser lido em 16px. Um logo horizontal espremido num quadrado vira borrão
// — que é o que acontece na maioria dos painéis que fazem isto errado.
export function imagemCompacta(identidade, ehUrlSegura) {
  if (!identidade) return null;
  if (ehUrlSegura(identidade.faviconUrl)) return identidade.faviconUrl;
  if (ehUrlSegura(identidade.logoUrl)) return identidade.logoUrl;
  return null;
}

// A escolha sobrevive ao recarregar. `try` porque navegador em janela anônima,
// ou com dados de site bloqueados, ESTOURA ao tocar em `localStorage` — e uma
// preferência de largura de menu não pode derrubar a tela inteira.
export function lerPreferencia() {
  try {
    return window.localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function gravarPreferencia(recolhida) {
  try {
    window.localStorage.setItem(CHAVE, recolhida ? '1' : '0');
  } catch {
    /* sem memória: a escolha vale só para esta visita */
  }
}

// Liga o botão. `criarIcone` é injetado para este arquivo não depender da
// biblioteca de ícones — o que o deixa testável sem DOM de verdade.
export function ligarRecolher(shell, botao, criarIcone) {
  if (!shell || !botao) return null;

  const aplicar = (recolhida) => {
    shell.classList.toggle('app-shell--recolhida', recolhida);
    botao.setAttribute('aria-expanded', String(!recolhida));
    botao.setAttribute('aria-label', recolhida ? 'Expandir o menu' : 'Recolher o menu');
    botao.title = recolhida ? 'Expandir o menu' : 'Recolher o menu';
    // O ícone aponta para onde a barra VAI, não para onde ela está: é assim que
    // se lê um botão de ação, e é o que evita a dúvida de meio segundo.
    if (criarIcone) {
      botao.replaceChildren(criarIcone(recolhida ? 'expandir' : 'recolher', 16));
    }
  };

  let recolhida = lerPreferencia();
  aplicar(recolhida);

  botao.addEventListener('click', () => {
    recolhida = !recolhida;
    aplicar(recolhida);
    gravarPreferencia(recolhida);
  });

  return { aplicar, estaRecolhida: () => recolhida };
}
