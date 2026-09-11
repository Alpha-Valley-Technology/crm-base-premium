// SUPORTE: a saída para quem travou.
//
// QUEM CHEGA AQUI JÁ ESTÁ COM PROBLEMA. Então é caminho curto: os botões
// primeiro, a explicação depois. Formulário longo, base de conhecimento com
// busca, categorias — tudo isso é o que se constrói quando o suporte vira
// custo. Antes disso, é obstáculo entre a pessoa irritada e a resposta.
//
// ---------------------------------------------------------------------------
// O QUE ESTA TELA MANDA PARA O FÓRUM, E POR QUÊ.
// ---------------------------------------------------------------------------
//
// Dúvida de CONTEÚDO não é suporte. "Como faço um anúncio?", "qual gateway
// usar?" — se isso vier para o WhatsApp, três coisas ruins acontecem: a
// resposta some para as outras cinquenta pessoas com a mesma dúvida, a
// comunidade deixa de ter motivo para existir, e o dono vira o gargalo do
// próprio produto.
//
// Suporte é para o que SÓ a equipe resolve. Essa fronteira está escrita na
// tela, em português, e não só na cabeça de quem construiu.
//
// ⚠️ E O QUE ELA RESOLVE AQUI NÃO É O MESMO DA TELA DE ENTRADA.
//
// Este texto dizia "não consigo entrar" — copiado da tela de entrada, onde faz
// todo sentido. Aqui não faz nenhum: quem lê esta tela JÁ ENTROU. Oferecer
// ajuda para um problema que a pessoa não pode estar tendo gasta a primeira
// linha da tela e ensina que o texto não foi escrito para ela.
//
// Lá fora: não consigo entrar, meu e-mail não é aceito.
// Aqui dentro: pagamento, acesso vencendo, problema na conta.

import { criarBotoesDeContato, lerContatos } from '../../base/suporte.js';
import { icone } from '../../ui/icones.js';

// As dúvidas que aparecem antes de qualquer pessoa mandar mensagem. Elas são a
// primeira linha do suporte — cada uma respondida aqui é um chamado que não
// nasce.
// ⚠️ ESTA LISTA É DO SEU PRODUTO, e nasce quase vazia de propósito.
//
// A matriz traz só as duas dúvidas que existem em QUALQUER sistema com login.
// As do produto anterior — "travei numa aula", "perdi a live", "como subo de
// nível" — saíram com ele: FAQ que responde sobre telas que não existem manda
// a pessoa procurar um lugar inexistente, e ela volta achando que o sistema
// está quebrado, bem no momento em que já tinha um problema.
//
// A REGRA para escrever uma boa: cada dúvida respondida aqui é um chamado que
// não nasce. Escreva a pergunta com as palavras de quem tem o problema, e não
// com as suas — quem trava não procura por "gerenciamento de credenciais",
// procura por "esqueci minha senha".
const DUVIDAS = [
  {
    p: 'Como eu mudo meu nome, minha foto ou meus dados?',
    r: 'Em Meu Perfil, na barra lateral. Você muda quando quiser.',
    ir: { texto: 'Ir para Meu Perfil', href: '#/perfil' },
  },
  {
    p: 'Entrei e não consigo ver nada. O que houve?',
    r:
      'Provavelmente a sua conta ainda não foi liberada, ou o acesso dela foi ' +
      'encerrado. Quem resolve isso é a equipe — fale pelos contatos abaixo, ' +
      'dizendo com qual email você entrou.',
  },
];

export default {
  id: 'suporte',
  nome: 'Suporte',
  icone: 'ajuda',
  menu: { grupo: '_rodape', ordem: 2 },
  acesso: 'membro',

  async montarTela(caixa, servicos) {
    const titulo = document.createElement('h1');
    titulo.className = 'pagina-titulo';
    titulo.textContent = 'Suporte';

    const explica = document.createElement('p');
    explica.className = 'pagina-explica';
    // ⚠️ NUNCA MANDE PARA UM LUGAR QUE PODE NÃO EXISTIR.
    //
    // Este texto já apontava para uma área que o cliente podia ter desligado.
    // Mandar a pessoa a um lugar inexistente é pior que não mandar a lugar
    // nenhum: ela procura, não acha, e volta achando que o sistema está
    // quebrado — bem no momento em que já estava com um problema.
    //
    // Se o seu produto tiver um canal melhor para dúvida de conteúdo (um
    // fórum, uma central de ajuda), acrescente a frase aqui — e cheque antes
    // que ele existe nesta instalação.
    explica.textContent =
      'Aqui é para o que só a equipe resolve: acesso, ' + 'cobrança, problema na sua conta.';

    caixa.append(titulo, explica);
    caixa.appendChild(await blocoContatos());
    caixa.appendChild(blocoDuvidas());

    // ------------------------------------------------------------------

    async function blocoContatos() {
      const cartao = document.createElement('div');
      cartao.className = 'card suporte-contatos';

      const h = document.createElement('h3');
      h.className = 'gami-titulo';
      h.textContent = 'Falar com a gente';
      cartao.appendChild(h);

      try {
        // `/publico/suporte` mora FORA de `dados/app`, onde `servicos.db`
        // trabalha — é o documento que a tela de entrada lê antes de qualquer
        // login. Por isso a leitura aqui é direta.
        const firestore =
          await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        const { db: banco } = await import('../../base/firebase.js');
        const dados = await lerContatos(banco, firestore);
        const botoes = criarBotoesDeContato(dados);

        if (botoes.length) {
          const linha = document.createElement('div');
          linha.className = 'suporte-botoes';
          for (const b of botoes) linha.appendChild(b);
          cartao.appendChild(linha);
        } else {
          // NÃO DESENHA BOTÃO QUEBRADO. Sem número cadastrado, um "Falar no
          // WhatsApp" que não abre conversa nenhuma é pior que a ausência dele:
          // a pessoa clica, nada acontece, e ela conclui que o sistema está
          // com defeito bem no momento em que já estava com problema.
          const vazio = document.createElement('p');
          vazio.className = 'gami-explica';
          vazio.textContent =
            'Os contatos ainda não foram cadastrados. ' +
            'Enquanto isso, pergunte na Comunidade — alguém da equipe vê por lá.';
          cartao.appendChild(vazio);
        }
      } catch (e) {
        console.warn('suporte: sem contatos.', e && e.message);
        const p = document.createElement('p');
        p.className = 'gami-explica';
        p.textContent = 'Não consegui carregar os contatos agora. Tente recarregar a página.';
        cartao.appendChild(p);
      }

      return cartao;
    }

    function blocoDuvidas() {
      const sec = document.createElement('section');
      sec.className = 'suporte-duvidas';

      const h = document.createElement('h2');
      h.className = 'secao-titulo';
      h.textContent = 'Antes de mandar mensagem';
      sec.appendChild(h);

      // ⚠️ DÚVIDA QUE APONTA PARA UM LUGAR QUE NÃO EXISTE NÃO PODE APARECER.
      //
      // Aqui havia um filtro que escondia a pergunta quando a área de destino
      // estava desligada naquela instalação — "como eu apareço na Conexão?"
      // num cliente sem Conexão só ensina que o texto não foi escrito para
      // ele. O catálogo de áreas era do produto e saiu com ele.
      //
      // Fica o cuidado, para quem escrever as dúvidas do seu produto: o `ir`
      // de cada uma tem que levar a uma tela que existe NESTA instalação. Se o
      // seu produto tiver telas opcionais, o filtro volta aqui.
      const cabem = DUVIDAS;
      for (const d of cabem) {
        // DOBRADAS, e não abertas. Cinco respostas inteiras na tela viram uma
        // parede de texto que ninguém lê — e quem chegou com pressa não acha a
        // dele no meio. Fechadas, a lista de perguntas cabe num olhar.
        const item = document.createElement('details');
        item.className = 'card suporte-duvida';

        const pergunta = document.createElement('summary');
        pergunta.append(icone('ajuda', 16), d.p);
        item.appendChild(pergunta);

        const resposta = document.createElement('p');
        resposta.className = 'suporte-resposta';
        resposta.textContent = d.r;
        item.appendChild(resposta);

        if (d.ir) {
          const link = document.createElement('a');
          link.className = 'btn btn--secundario';
          link.href = d.ir.href;
          link.textContent = d.ir.texto;
          item.appendChild(link);
        }
        sec.appendChild(item);
      }
      return sec;
    }
  },
};
