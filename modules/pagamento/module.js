// PAGAMENTO: a aba onde se configura como o dinheiro entra.
//
// ===========================================================================
// ⚠️ ELA ESTÁ VAZIA, E O ENDEREÇO EXISTE DE PROPÓSITO
// ===========================================================================
//
// Esta carcaça nasceu de um produto que vendia por um gateway específico
// (Asaas). Quando virou matriz, o gateway saiu inteiro — chave, cobrança,
// cupons, ofertas, webhook e a página pública de venda. O que ficou foi o
// LUGAR: a aba, o endereço e o desenho da tela.
//
// É o padrão desta casa: área nova nasce com a tela em construção, e o endereço
// dela existe desde o primeiro dia. Assim o meio de pagamento entra depois sem
// mexer na navegação, sem mexer na Administração e sem gente usando o sistema
// perceber que algo se moveu.
//
// ===========================================================================
// O QUE MONTAR AQUI, E EM QUE ORDEM
// ===========================================================================
//
// A ordem abaixo é A DE CAUSA, e não a de importância — quem abrir esta tela
// pela primeira vez lê de cima para baixo e faz na sequência certa sem ninguém
// explicar:
//
//   1. CONEXÃO   a chave do gateway, colada pelo painel. Sem ela, oferta
//                nenhuma cobra. Ver `functions/_lib/cofre.js`: a chave vai
//                para o Secret Manager e NUNCA volta para uma tela — o que a
//                tela mostra é uma pista de quatro caracteres, o bastante para
//                a pessoa responder "é a chave que colei ontem?".
//
//   2. OFERTAS   o que se vende e por quanto. ⚠️ O PREÇO MORA AQUI, no
//                servidor — a página de venda informa O QUE quer comprar, e
//                quem decide quanto custa é o servidor. Preço que viaja do
//                navegador é preço que o navegador edita.
//
//   3. CUPONS    desconto com limite de uso e validade. Sem oferta, cupom não
//                tem onde valer — por isso vem por último.
//
// E fora desta tela, as duas pontas que fazem a venda funcionar de verdade:
// o WEBHOOK (é ele que libera o acesso, e não a tela de "obrigado" — a pessoa
// pode fechar o navegador e mesmo assim ter pago) e o CANCELAMENTO, que
// interrompe a cobrança sem tirar o acesso já pago. O raciocínio inteiro está
// em `functions/index.js`, no bloco de PAGAMENTO.

export default {
  id: 'pagamento',
  nome: 'Pagamento',
  icone: 'estrela',
  menu: { grupo: '_rodape', ordem: 7, oculto: true },
  acesso: 'admin',

  async montarTela(caixa) {
    const cartao = document.createElement('div');
    cartao.className = 'card';

    const titulo = document.createElement('h2');
    titulo.style.cssText = 'margin:0 0 6px';
    titulo.textContent = 'Pagamento';

    const texto = document.createElement('p');
    texto.className = 'pagina-explica';
    texto.style.margin = '0';
    // Fala com quem VAI CONSTRUIR, porque numa matriz é essa a pessoa que abre
    // esta tela. Num produto de verdade, este texto é substituído pela tela.
    texto.textContent =
      'Ainda não há meio de pagamento ligado nesta instalação. ' +
      'O lugar já existe: quando o gateway entrar, ele monta aqui — conexão, ' +
      'ofertas e cupons, nesta ordem. As instruções estão no comentário no topo ' +
      'de modules/pagamento/module.js.';

    cartao.append(titulo, texto);
    caixa.appendChild(cartao);
  },
};
