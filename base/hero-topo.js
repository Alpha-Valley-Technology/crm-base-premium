// O HERO PASSANDO POR BAIXO DA FAIXA DO TOPO.
//
// ===========================================================================
// O QUE ESTAVA QUEBRADO
// ===========================================================================
//
// Na largura "de ponta a ponta", a imagem encostava no topo do conteúdo — e a
// faixa do cabeçalho, com fundo próprio, cortava ela numa linha reta. A imagem
// terminava do nada, como se a página tivesse sido montada errada.
//
// A conta é simples: sangrar para os lados sem sangrar para cima entrega meia
// promessa, e meia promessa parece defeito.
//
// ===========================================================================
// POR QUE ISTO EXIGIU MEXER NA CASCA
// ===========================================================================
//
// A grade tinha DUAS LINHAS — cabeçalho em cima, conteúdo embaixo — e elas não
// se sobrepunham. Deixar o cabeçalho transparente ali mostraria a cor de fundo
// da página, e não a imagem: não havia imagem debaixo dele.
//
// Agora o conteúdo ocupa as duas linhas e o cabeçalho fica POR CIMA, com um
// respiro do tamanho dele para as outras telas não nascerem escondidas. O
// `backdrop-filter: blur(10px)` que a faixa já tinha passou a fazer sentido:
// ele existe para desfocar o que passa por baixo, e até agora nada passava.
//
// ===========================================================================
// A FAIXA VOLTA A TER FUNDO ASSIM QUE A PESSOA ROLA
// ===========================================================================
//
// ⚠️ E ISSO NÃO É ENFEITE. Transparente sobre a imagem, ela é bonita. Sobre o
// texto do conteúdo — que é o que sobe quando a página rola —, ela vira letra
// por cima de letra, e não há cor de ícone que resolva.
//
// O corte é o fim do hero: enquanto a imagem estiver atrás, a faixa some;
// quando o conteúdo chega, ela reaparece. É a mesma decisão de todo site que
// faz isto bem, e o motivo é sempre o mesmo — legibilidade ganha de efeito.

const ATRIBUTO = 'data-hero-topo';
const ROLOU = 'data-topo-rolou';

let parar = null;

// Desliga o modo. Chamado a cada troca de tela: o hero é da Página Inicial, e
// qualquer outra tela precisa da faixa opaca de volta.
export function desligarHeroNoTopo() {
  if (parar) {
    parar();
    parar = null;
  }
  const casca = document.querySelector('.app-shell');
  if (!casca) return;
  casca.removeAttribute(ATRIBUTO);
  casca.removeAttribute(ROLOU);
}

/**
 * Liga o modo para a tela atual.
 *
 * @param {HTMLElement} hero  o elemento do hero, para medir onde ele acaba
 */
export function ligarHeroNoTopo(hero) {
  desligarHeroNoTopo();

  const casca = document.querySelector('.app-shell');
  const conteudo = document.querySelector('.app-content');
  if (!casca || !conteudo || !hero) return;

  casca.setAttribute(ATRIBUTO, 'sim');

  // `AbortController` para desligar o ouvinte de uma vez, sem guardar
  // referência de função — é o idioma que o projeto já usa nos componentes.
  const controle = new AbortController();

  const conferir = () => {
    // O ponto de virada é o FIM DA IMAGEM, e não uma distância fixa.
    //
    // Com um número cravado, hero alto solidificaria a faixa cedo demais (com
    // imagem ainda atrás dela) e hero baixo, tarde demais (com texto por baixo).
    // A altura real do elemento acerta nos dois.
    const limite = Math.max(0, hero.offsetHeight - alturaDoTopo());
    if (conteudo.scrollTop > limite) casca.setAttribute(ROLOU, 'sim');
    else casca.removeAttribute(ROLOU);
  };

  conteudo.addEventListener('scroll', conferir, {
    signal: controle.signal,
    // A leitura é de uma propriedade só e não bloqueia a rolagem; `passive`
    // deixa o navegador rolar sem esperar por este código.
    passive: true,
  });
  // Girar o celular muda a altura do hero, e o ponto de virada junto.
  window.addEventListener('resize', conferir, { signal: controle.signal, passive: true });

  conferir();
  parar = () => controle.abort();
}

// A altura da faixa, lida do CSS para não existir em dois lugares. Se ela mudar
// de tamanho um dia, este arquivo acompanha sozinho.
export function alturaDoTopo(raiz) {
  // ⚠️ DA CASCA, e não da raiz do documento: `--altura-topo` é declarada em
  // `.app-shell`, e o celular a redeclara ali mesmo (60px em vez de 52px).
  // Lendo de `documentElement`, isto cairia sempre no valor de reserva — e o
  // ponto de virada da rolagem erraria por 8px justamente no celular.
  const alvo =
    raiz || (typeof document !== 'undefined' ? document.querySelector('.app-shell') : null);
  if (!alvo || typeof getComputedStyle !== 'function') return 52;
  const valor = parseInt(getComputedStyle(alvo).getPropertyValue('--altura-topo'), 10);
  return Number.isFinite(valor) ? valor : 52;
}

// PURO. O hero deve passar por baixo da faixa?
//
// UMA PERGUNTA SÓ: a largura é "de ponta a ponta"? Se é, a faixa some.
//
// ⚠️ ISTO JÁ EXIGIU IMAGEM, E ERA ERRADO. O raciocínio era que, sem foto, o
// hero é o gradiente da marca — e gradiente escapando por baixo do cabeçalho
// pareceria cor vazada, não premium.
//
// A premissa não se sustenta. O gradiente não "escapa": ele é uma faixa
// deliberada, com fim definido, do mesmo jeito que a foto seria. Quem escolheu
// "de ponta a ponta" escolheu o destaque, e o destaque para no cabeçalho por um
// detalhe de implementação que ninguém pediu.
//
// E o custo do erro era invisível: quem ainda não subiu a foto do hero — que é
// o estado de TODO cliente white-label no primeiro dia — ligava a opção, não
// via diferença nenhuma no topo e não tinha como descobrir o porquê.
export function heroVaiAoTopo(identidade) {
  return Boolean(identidade) && identidade.heroLargura === 'sangria';
}
