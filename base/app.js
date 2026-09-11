import { observarSessao, carregarUsuarioAtual, sair } from './auth.js';
import { validarModulo, construirMenu, alcanca } from './registry.js';
import { montarSidebar, marcarAtivo } from './sidebar.js';
import { criarRouter } from './router.js';
import { criarSino, montarPainelDoSino } from './sino.js';
import { montarServicos } from './servicos.js';
import { ligarRecolher, sigla, imagemCompacta } from './barra-recolhida.js';
import modulos from '../modules/modulos.config.js';
import { MARCA } from '../config/marca.js';
import { icone } from '../ui/icones.js';

const appEl = document.getElementById('app');

observarSessao(async (fbUser) => {
  if (!fbUser) {
    location.replace('login.html');
    return;
  }
  const usuario = await carregarUsuarioAtual();
  if (!usuario) {
    montarSemAcesso();
    return;
  }
  modulos.forEach(validarModulo);
  renderShell(usuario);
});

// A TELA DE PORTA FECHADA — e por que ela tem os mesmos botões da entrada.
//
// Aqui cai quem entrou no Google com sucesso e mesmo assim não tem acesso:
// conta ainda não cadastrada, acesso removido, licença vencida. Era uma frase
// solta na tela, sem saída nenhuma — a pessoa fechava o navegador e ligava para
// quem tivesse o telefone à mão, que quase nunca é quem resolve.
//
// Os botões são os mesmos de `login.html`, montados pela mesma função, para que
// as duas telas não sejam desenhadas diferente com o tempo.
function montarSemAcesso() {
  // O título da aba também aqui: sem isto a aba fica em "Carregando…" para
  // sempre, porque quem troca o título é o `renderShell`, que nunca roda.
  document.title = MARCA.versao ? `${MARCA.nome} ${MARCA.versao}` : MARCA.nome;
  appEl.innerHTML = '';

  const caixa = document.createElement('div');
  caixa.className = 'card';
  caixa.style.cssText = 'width:360px;max-width:92vw;margin:12vh auto;text-align:center';

  const titulo = document.createElement('h2');
  titulo.style.cssText = 'margin:0 0 6px';
  titulo.textContent = 'Sua conta ainda não tem acesso';

  const texto = document.createElement('p');
  texto.style.cssText =
    'color:var(--cor-texto-fraco);font-size:13.5px;line-height:1.5;margin-bottom:20px';
  texto.textContent =
    'Peça para um administrador te cadastrar. Se o seu acesso ' +
    'parou de funcionar, fale com o Financeiro para liberar.';

  const contatos = document.createElement('div');
  contatos.className = 'pilha-contatos';

  const sairBt = document.createElement('button');
  sairBt.className = 'btn btn--secundario';
  sairBt.style.cssText = 'width:100%;margin-top:10px';
  sairBt.textContent = 'Entrar com outra conta';
  // Sem isto, quem entrou com o Google errado ficava preso: a sessão do Google
  // continua valendo e voltar para `login.html` só devolve esta mesma tela.
  sairBt.onclick = () => sair();

  caixa.append(titulo, texto, contatos, sairBt);
  appEl.appendChild(caixa);

  // Acessório e depois: nada aqui pode derrubar a tela, que já é a tela de erro.
  (async () => {
    try {
      const [{ db }, firestore, contatosLib] = await Promise.all([
        import('./firebase.js'),
        import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
        import('./suporte.js'),
      ]);
      const dados = await contatosLib.lerContatos(db, firestore);
      contatos.append(...contatosLib.criarBotoesDeContato(dados));
    } catch (e) {
      console.warn('contatos: não consegui montar os botões.', e && e.message);
    }
  })();
}

// A marca desenhada uma vez só, usada em dois lugares: no topo da barra lateral
// (onde ela vive) e no cabeçalho do celular (onde ela acompanha o sanduíche).
// Duas cópias montadas à mão divergiriam — já divergiram antes, entre o painel
// e a tela de entrada.
export function criarMarca(classe) {
  const a = document.createElement('a');
  a.className = classe;
  a.href = MARCA.inicio;
  a.title = 'Voltar ao início';

  const nome = document.createElement('strong');
  nome.textContent = MARCA.nome;
  a.appendChild(nome);

  if (MARCA.versao) {
    const v = document.createElement('span');
    v.className = 'app-versao';
    v.textContent = MARCA.versao;
    a.appendChild(v);
  }
  return a;
}

function renderShell(usuario) {
  // O título da aba também vem da marca. Ele estava escrito no index.html —
  // arquivo da Base — então trocar o nome do produto exigia editar a carcaça, e
  // uma remontagem devolvia "CRM Base" em silêncio. Mesmo erro do cabeçalho.
  document.title = MARCA.versao ? `${MARCA.nome} ${MARCA.versao}` : MARCA.nome;

  const menu = construirMenu(modulos, usuario.papel);
  appEl.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <button class="app-sanduiche" id="sanduiche" type="button"
                aria-label="Abrir o menu" aria-expanded="false" aria-controls="sidebar"></button>
      </header>
      <nav class="app-sidebar" id="sidebar"></nav>
      <div class="app-veu" id="veu"></div>
      <main class="app-content">
        <div id="content" class="app-miolo"></div>
        <footer class="app-rodape" id="rodape" hidden></footer>
      </main>
    </div>`;

  // A faixa do topo leva o SINO em toda largura de tela — é o que faz o aviso
  // de live encontrar a pessoa em vez de esperar ser procurado.
  //
  // A MARCA só aparece nela no celular, onde a barra lateral é gaveta fechada e
  // uma faixa com botão e mais nada não diz onde você está. No desktop quem
  // mostra o nome é o logo do topo da barra, e o CSS esconde esta cópia — mas o
  // elemento é montado sempre, porque virar o tablet não pode exigir remontar a
  // tela.
  const cabecalho = document.querySelector('.app-header');
  cabecalho.appendChild(criarMarca('app-marca'));

  // O AVISO DE VENCIMENTO, quando existe. Fica no topo do miolo e nao no sino:
  // acesso da propria pessoa.
  //
  // ⚠️ A FAIXA SAIU COM O GATEWAY, e o lugar dela na tela continua sendo este:
  // topo do miolo, acima de tudo, dentro de `.app-content`.
  //
  // Ela avisava "seu acesso vence em 3 dias" e oferecia o botão de renovar. Não
  // era do produto área de membros — vencer é o que acontece em qualquer
  // negócio de assinatura —, mas dependia de campos que só o gateway
  // preenchia. Quando o meio de pagamento novo entrar, este é o ponto de
  // montagem.
  //
  // A decisão que veio junto e vale registrar: a faixa NASCE SEM O BOTÃO e o
  // ganha quando a identidade chega do banco. A tela não espera o banco para
  // aparecer, e avisar sem o caminho é melhor do que não avisar.

  const sino = criarSino();
  cabecalho.appendChild(sino);

  // O QUE O SINO MOSTRA CHEGA DEPOIS DA TELA, como a identidade. O sino já
  // está lá e já abre — vazio, se o banco demorar. Esperar por ele para
  // desenhar a casca seria tela em branco enquanto se busca um recado.
  //
  // ---------------------------------------------------------------------
  // ELE ESCUTA, e não busca uma vez só.
  // ---------------------------------------------------------------------
  //
  // Com uma busca única, o sino só acendia quando a pessoa recarregasse a
  // página — e quem fica com a tela aberta enquanto trabalha só descobriria a
  // resposta no dia seguinte. Aviso que chega tarde não é aviso.
  //
  // ISSO NÃO CUSTA CARO, e a razão é que o Firestore não cobra por conexão
  // aberta nem por tempo: ele cobra por DOCUMENTO ENTREGUE. A escuta cobra o
  // mesmo que a busca única na abertura, e depois 1 leitura por recado que
  // realmente chegar. Alguns recados por pessoa por dia é ruído dentro da cota
  // gratuita.
  (async () => {
    try {
      const [recadosLib, estadoLib, firestore, { db }] = await Promise.all([
        import('./recados.js'),
        import('./estado-do-usuario.js'),
        import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
        import('./firebase.js'),
      ]);
      const recadosRef = firestore.collection(db, 'dados', 'app', 'recados');
      const avisosRef = firestore.collection(db, 'dados', 'app', 'avisos');
      const estado = await estadoLib.lerEstado(db, firestore, usuario.uid);

      let avisos = [];
      let recados = [];
      // O CARIMBO VIVE AQUI DENTRO, e não é relido do banco a cada mudança.
      // Depois de abrir o sino, tudo que já estava na tela conta como visto —
      // se ele fosse relido, uma gravação lenta faria a bolinha reacender
      // sozinha logo depois de a pessoa ter olhado.
      let vistos = Number(estado.avisosVistosEmMs) || 0;

      const painel = montarPainelDoSino(sino, {
        avisos,
        recados,
        vistosEmMs: vistos,
        // ABRIR CARIMBA A HORA, e o carimbo vai no mesmo documento que a pessoa
        // já escreve (o estado dela). Nenhuma porta nova foi aberta no banco
        // para o sino funcionar.
        aoAbrir: () => {
          vistos = Date.now();
          return Promise.all([
            estadoLib.gravarEstado(db, firestore, usuario.uid, { avisosVistosEmMs: vistos }),
            limparRecadosVelhos(),
          ]);
        },
      });

      const repintar = () => painel.atualizar({ avisos, recados, vistosEmMs: vistos });

      const doSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const seDerErrado = (oQue) => (e) => console.warn(`sino (${oQue}):`, e && e.message);

      firestore.onSnapshot(
        avisosRef,
        (snap) => {
          avisos = doSnap(snap);
          repintar();
        },
        seDerErrado('avisos'),
      );

      // ⚠️ O FILTRO POR `paraUid` NÃO É OTIMIZAÇÃO, É O QUE FAZ A CONSULTA
      // PASSAR. A regra do recado olha esse campo, e o Firestore recusa a
      // listagem inteira quando a consulta não filtra pelo campo que a regra
      // examina. Sem o `where`, o sino fica vazio para todo mundo.
      firestore.onSnapshot(
        firestore.query(recadosRef, firestore.where('paraUid', '==', usuario.uid)),
        (snap) => {
          recados = doSnap(snap);
          repintar();
        },
        seDerErrado('recados'),
      );

      // O SINO VARRE A PRÓPRIA CAIXA. O recado que já saiu da lista dos sete
      // não vai voltar a aparecer nunca — guardá-lo é uma coleção que só
      // cresce, num sistema onde ninguém tem tela para limpá-la.
      //
      // Varre a partir de 20, e não a partir de 8: apagar a cada abertura
      // trocaria uma coleção que cresce por uma rajada de gravações toda vez
      // que alguém confere o sino. Quem apaga é o DONO do recado, que é o
      // único que a regra deixa apagar.
      async function limparRecadosVelhos() {
        if (recados.length <= 20) return;
        const guardar = new Set(recadosLib.ultimosRecados(recados, 20).map((r) => r.id));
        await Promise.all(
          recados
            .filter((r) => r.id && !guardar.has(r.id))
            .map((r) => firestore.deleteDoc(firestore.doc(recadosRef, r.id)).catch(() => {})),
        );
      }
    } catch (e) {
      console.warn('sino: fica sem lista.', e && e.message);
    }
  })();

  // O RODAPÉ FICA DENTRO DA ÁREA QUE ROLA, e não colado no pé da janela.
  //
  // Barra fixa embaixo come altura de tela em TODA página, para dizer uma linha
  // que ninguém precisa ler duas vezes. Dentro do rolo, ela aparece quando a
  // pessoa chega ao fim — que é quando um rodapé faz sentido.
  //
  // Ele mora FORA de `#content` de propósito: o router limpa `#content` a cada
  // troca de tela, e um rodapé lá dentro sumiria na primeira navegação.
  //
  // Nasce escondido: rodapé vazio é uma faixa em branco no fim de toda tela.
  // Quem o acende é a identidade, se houver texto configurado.
  const sidebar = document.getElementById('sidebar');

  // NO DESKTOP, A MARCA MORA AQUI — no topo da barra, não na faixa.
  //
  // A carcaça nasceu com uma faixa no topo só para o nome do produto: 60px de
  // altura em toda tela para repetir o que já estava na aba do navegador. A
  // barra lateral já é a âncora da navegação; o nome pertence ao topo dela.
  //
  // ANTES do montarSidebar: ele empilha os blocos do menu na ordem em que
  // chegam, e o logo tem que ser o primeiro.
  //
  // Montado por `textContent`, nunca por HTML interpolado — o nome vem de
  // `config/marca.js`, que um integrador edita. É a mesma decisão que
  // `login.html` já tinha tomado, pelo mesmo motivo: config de produto não é
  // lugar para abrir caminho de injeção.
  // O TOPO DA BARRA: a marca e o botao de recolher, na mesma linha.
  //
  // O botao mora aqui, e nao no cabecalho, porque e a barra que ele encolhe —
  // controle longe do que ele controla e controle que ninguem acha.
  const topoDaBarra = document.createElement('div');
  topoDaBarra.className = 'app-barra-topo';
  // A versao compacta nasce com a SIGLA do nome de fabrica. A identidade
  // troca por favicon, imagem ou pela sigla do que o dono escreveu — mas ate
  // ela chegar do banco a barra recolhida ja tem o que mostrar, em vez de um
  // buraco de meio segundo.
  const marcaCompacta = document.createElement('a');
  marcaCompacta.className = 'app-logo-compacto';
  marcaCompacta.href = MARCA.inicio;
  marcaCompacta.title = 'Voltar ao início';
  const siglaInicial = document.createElement('strong');
  siglaInicial.textContent = sigla('', '', MARCA.nome);
  marcaCompacta.appendChild(siglaInicial);

  topoDaBarra.append(criarMarca('app-logo'), marcaCompacta);

  sidebar.insertBefore(topoDaBarra, sidebar.firstChild);

  // O BOTAO MORA NA CASCA, e nao dentro da barra.
  //
  // Ele fica colado na BORDA da barra, metade de cada lado — e a barra tem
  // `overflow-y: auto`, que recorta qualquer filho que passe da largura dela.
  // Pendurado na casca, que e o container da grade, ele pode ficar exatamente
  // em cima da linha divisoria.
  //
  // E o lugar dele nao muda ao recolher: so a seta vira. A referencia e a
  // borda, e a borda continua existindo nas duas larguras — botao que anda de
  // canto obriga o olho a procurar de novo a cada clique.
  const botaoRecolher = document.createElement('button');
  botaoRecolher.type = 'button';
  botaoRecolher.className = 'app-recolher';
  botaoRecolher.id = 'recolher';
  document.querySelector('.app-shell').appendChild(botaoRecolher);

  const links = montarSidebar(menu, sidebar);

  // Quem está logado vai no PÉ da barra, não no topo da página: o cabeçalho
  // fica com a marca e mais nada, o que pesa principalmente no celular.
  //
  // Depois do montarSidebar, e fixado embaixo por CSS — como último item da
  // lista ele rolaria junto com o menu e sumiria numa tela baixa.
  sidebar.insertAdjacentHTML(
    'beforeend',
    `
    <div class="app-usuario">
      <span class="app-usuario-nome" id="usuario-nome"></span>
      <a href="#" id="sair" class="app-sair">sair</a>
    </div>`,
  );

  // DEPOIS de o bloco existir. Enquanto estas duas linhas ficaram lá em cima —
  // de quando o usuário morava no cabeçalho — elas procuravam um elemento que
  // ainda não existia, estouravam, e o roteador nem chegava a ser iniciado:
  // sobrava a carcaça na tela, sem menu e sem conteúdo.
  document.getElementById('usuario-nome').textContent = usuario.nome;
  const linkSair = document.getElementById('sair');
  // Ícone antes da palavra, como todo item do menu. Sem ele, "sair" era o único
  // link da barra desenhado diferente de todos os outros.
  linkSair.insertBefore(icone('sair', 16), linkSair.firstChild);
  linkSair.onclick = (e) => {
    e.preventDefault();
    sair();
  };

  ligarSanduiche(sidebar);
  ligarRecolher(document.querySelector('.app-shell'), botaoRecolher, icone);

  // A IDENTIDADE CHEGA DEPOIS DA TELA, e nunca antes.
  //
  // Ela é enfeite: cor, fonte e logo. Esperar por ela para desenhar a casca
  // significaria uma tela em branco até o banco responder — e, se o banco não
  // responder, para sempre. Assim a pessoa já está navegando, e a cara certa
  // entra em cima.
  //
  // Depois do `montarSidebar` de propósito: o logo troca o texto que ele mesmo
  // acabou de pendurar.
  // O ROTEADOR É DECLARADO ANTES do bloco da identidade porque os dois se
  // encontram: a identidade diz quais áreas estão desligadas, e quem precisa
  // saber disso é ele. `let` e não `const` pelo mesmo motivo — ele nasce
  // logo abaixo, e este bloco roda em paralelo.
  let router;

  (async () => {
    try {
      const [identidadeLib, firestore, { db }] = await Promise.all([
        import('./identidade.js'),
        import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
        import('./firebase.js'),
      ]);
      const identidade = await identidadeLib.aplicarIdentidade(db, firestore);

      // ---- AS ÁREAS QUE ESTE CLIENTE NÃO USA ----
      //
      // ⚠️ A BARRA NASCE COMPLETA E PERDE ITENS, e não o contrário.
      //
      // A alternativa — nascer vazia e ganhar os itens quando a identidade
      // chega — deixaria a barra em branco se o banco demorasse, e VAZIA PARA
      // SEMPRE se ele não respondesse. Do jeito daqui, falha significa "tudo
      // ligado", que é o estado seguro: a pessoa navega no sistema inteiro em
      // vez de ficar sem metade dele sem explicação.
      //
      // ⚠️ AQUI ERAM REMOVIDOS OS ITENS DAS ÁREAS DESLIGADAS. O catálogo de
      // áreas era do produto anterior e saiu com ele. Se um produto novo
      // precisar disso, este é o lugar: depois de a identidade chegar, e não
      // antes — a barra tem que aparecer inteira e encolher, nunca o contrário.

      // O RODAPÉ SÓ ACENDE SE TIVER O QUE DIZER. Faixa vazia no fim de toda
      // tela é ruído com aparência de estrutura.
      const rodape = document.getElementById('rodape');
      const texto = String(identidade.rodape || '').trim();
      if (rodape && texto) {
        rodape.textContent = texto;
        rodape.hidden = false;
      }

      // A IMAGEM GANHA DO TEXTO, e o texto ganha do nome de fábrica.
      //
      // São três degraus de "quem é esta marca", do mais específico ao mais
      // genérico: o logo desenhado, as palavras que o dono escreveu, e o nome
      // que veio no arquivo de configuração do produto.
      const parte1 = String(identidade.logoTexto || '').trim();
      const parte2 = String(identidade.logoTexto2 || '').trim();
      // A MARCA COMPACTA: o que sobra da identidade em 40px de largura.
      //
      // Favicon se houver (ele ja nasce desenhado para ser lido pequeno);
      // senao a propria imagem contida num quadrado; senao a SIGLA das partes
      // escritas. Montada aqui junto com a inteira, e nao ao recolher, para
      // trocar de largura nao piscar nem baixar imagem de novo.
      const compacta = document.querySelector('.app-logo-compacto');
      if (compacta) {
        const imagem = imagemCompacta(identidade, identidadeLib.ehUrlSegura);
        if (imagem) {
          const img = document.createElement('img');
          img.className = 'app-logo-icone';
          img.src = imagem;
          img.alt = [parte1, parte2].filter(Boolean).join(' ') || MARCA.nome;
          compacta.replaceChildren(img);
        } else {
          const s2 = document.createElement('strong');
          s2.textContent = sigla(parte1, parte2, MARCA.nome);
          compacta.replaceChildren(s2);
        }
      }

      for (const alvo of document.querySelectorAll('.app-logo, .app-marca')) {
        if (identidadeLib.ehUrlSegura(identidade.logoUrl)) {
          const img = document.createElement('img');
          img.className = 'app-logo-img';
          img.src = identidade.logoUrl;
          img.alt = [parte1, parte2].filter(Boolean).join(' ') || MARCA.nome;
          alvo.replaceChildren(img);
        } else if (parte1 || parte2) {
          // Duas partes, cada uma com cor e fonte próprias — "NINJA" pesado e
          // "DIGITAL" leve é como marca escrita costuma ser.
          //
          // `textContent`, nunca `innerHTML`: o texto vem do banco, e banco é
          // exatamente de onde não se aceita marcação.
          const pedacos = [];
          const a = document.createElement('strong');
          a.textContent = parte1 || MARCA.nome;
          pedacos.push(a);
          if (parte2) {
            const b = document.createElement('strong');
            b.className = 'app-logo-2';
            b.textContent = parte2;
            pedacos.push(b);
          }
          alvo.replaceChildren(...pedacos);
        }
      }
    } catch (e) {
      console.warn('identidade: sigo com o visual padrão.', e && e.message);
    }
  })();

  const servicos = montarServicos(usuario);
  router = criarRouter({
    // ⚠️ O ROTEADOR RECEBE A LISTA JÁ FILTRADA PELO PAPEL, e é isto que impede
    // alguém de alcançar uma tela digitando o endereço. Esconder da barra é
    // conveniência; não estar na lista do roteador é a trava da TELA — e a do
    // BANCO continua sendo a regra, que é a que vale de verdade.
    modulos: modulos.filter((m) => alcanca(usuario.papel, m.acesso)),
    container: document.getElementById('content'),
    servicos,
    onMudou: (id, sub) => marcarAtivo(links, id, sub),
  });
  router.iniciar();
}

// A gaveta do celular. Em tela grande o botão nem aparece (o CSS esconde), então
// isto fica inerte — não há dois comportamentos para manter.
//
// Fecha ao escolher um item de propósito: no celular, depois de escolher a
// pessoa quer VER o conteúdo, não a lista. Manter aberto custa um toque a mais,
// sempre.
function ligarSanduiche(sidebar) {
  const botao = document.getElementById('sanduiche');
  const veu = document.getElementById('veu');
  if (!botao || !veu) return;
  botao.append(icone('menu', 20));

  const mostrar = (aberta) => {
    sidebar.classList.toggle('aberta', aberta);
    veu.classList.toggle('aberta', aberta);
    botao.setAttribute('aria-expanded', String(aberta));
    botao.setAttribute('aria-label', aberta ? 'Fechar o menu' : 'Abrir o menu');
  };

  botao.addEventListener('click', () => mostrar(!sidebar.classList.contains('aberta')));
  veu.addEventListener('click', () => mostrar(false));
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) mostrar(false);
  });
  // Esc é o jeito que todo mundo já conhece de fechar o que está por cima.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') mostrar(false);
  });
}
