// O painel de avisos: o que o sino mostra.
//
// Aviso é UMA LINHA para ler em pé — "Live hoje às 20h", "Trilha 3 no ar". O
// texto de apoio existe para o detalhe, e é opcional. Se o aviso pudesse ser um
// parágrafo, o sino viraria outro fórum, e aí ninguém leria nem um nem outro.
//
// NÃO É "fulano respondeu você". Isso é aviso pessoal, tem outro dono e outra
// régua — e não passa por aqui.

import { ultimosAvisos, validarAviso, novoAviso, QUANTOS } from '../../base/avisos.js';
import { quandoFoi } from '../_comum/tempo.js';

export default {
  id: 'avisos',
  nome: 'Avisos',
  icone: 'sino',
  menu: { grupo: '_rodape', ordem: 8, oculto: true },
  acesso: 'gestor',

  async montarTela(caixa, servicos) {
    const { ui, db, avisar } = servicos;
    let avisos = [];

    const topo = document.createElement('div');
    topo.className = 'conteudo-topo';
    const titulo = document.createElement('h2');
    titulo.textContent = 'Avisos';
    titulo.style.margin = '0';
    topo.appendChild(titulo);

    const explica = document.createElement('p');
    explica.className = 'pagina-explica';
    explica.textContent =
      `Aparecem no sino, no topo da tela, para todo mundo. ` +
      `O sino mostra os ${QUANTOS} mais recentes — quem entrar depois de um ` +
      `aviso novo vê a marca acesa até abrir.`;

    caixa.append(topo, explica, formulario());

    const lista = document.createElement('div');
    lista.className = 'forum-lista';
    caixa.appendChild(lista);

    await recarregar();

    // ------------------------------------------------------------------

    function formulario() {
      const cartao = document.createElement('div');
      cartao.className = 'card forum-editor';

      const { wrapper: wTitulo, input: inTitulo } = ui.campo('O aviso (uma linha)');
      inTitulo.placeholder = 'Live de quinta, 20h';

      const wCorpo = document.createElement('div');
      wCorpo.className = 'campo';
      const lCorpo = document.createElement('label');
      lCorpo.textContent = 'Texto de apoio (opcional)';
      const inCorpo = document.createElement('textarea');
      inCorpo.className = 'input input--area';
      wCorpo.append(lCorpo, inCorpo);

      const { wrapper: wLink, input: inLink } = ui.campo('Link (opcional, https)');
      inLink.placeholder = 'https://…';

      const acoes = document.createElement('div');
      acoes.className = 'conteudo-editor-acoes';
      const bt = ui.botao('Publicar aviso', publicar);
      acoes.appendChild(bt);

      cartao.append(wTitulo, wCorpo, wLink, acoes);
      return cartao;

      async function publicar() {
        const erro = validarAviso({ titulo: inTitulo.value, corpo: inCorpo.value });
        if (erro) {
          avisar('info', erro);
          return;
        }
        const link = inLink.value.trim();
        if (link && !link.startsWith('https://')) {
          avisar('erro', 'O link precisa começar com https://');
          return;
        }

        bt.disabled = true;
        try {
          await db.criar(
            'avisos',
            novoAviso({ titulo: inTitulo.value, corpo: inCorpo.value, linkUrl: link }, Date.now()),
          );
          inTitulo.value = '';
          inCorpo.value = '';
          inLink.value = '';
          avisar('ok', 'Aviso publicado. Ele já está no sino de todo mundo.');
          await recarregar();
        } catch (e) {
          console.error(e);
          avisar('erro', 'Não consegui publicar agora. Tente de novo.');
        } finally {
          bt.disabled = false;
        }
      }
    }

    async function recarregar() {
      lista.textContent = 'Carregando…';
      avisos = await db.listar('avisos').catch(() => []);
      desenhar();
    }

    function desenhar() {
      ui.limpar(lista);
      const todos = [...avisos]
        .filter((a) => a && a.visivel !== false)
        .sort((a, b) => (Number(b.emMs) || 0) - (Number(a.emMs) || 0));

      if (!todos.length) {
        const cartao = document.createElement('div');
        cartao.className = 'card';
        cartao.textContent = 'Nenhum aviso publicado ainda.';
        lista.appendChild(cartao);
        return;
      }

      // A LINHA DE CORTE É DESENHADA. Do sétimo em diante o aviso continua
      // existindo mas não aparece no sino — e quem publica precisa ver isso
      // acontecendo, senão publica o oitavo achando que todo mundo vai ver.
      const noSino = ultimosAvisos(todos).length;

      todos.forEach((a, i) => {
        if (i === noSino) lista.appendChild(corte());
        lista.appendChild(linha(a, i >= noSino));
      });
    }

    function corte() {
      const el = document.createElement('div');
      el.className = 'avisos-corte';
      el.textContent = `Daqui para baixo não aparece mais no sino (ele mostra ${QUANTOS})`;
      return el;
    }

    function linha(a, foraDoSino) {
      const el = document.createElement('div');
      el.className = 'forum-item' + (foraDoSino ? ' avisos-fora' : '');

      const t = document.createElement('div');
      t.className = 'forum-item-titulo';
      t.textContent = a.titulo || '(sem texto)';

      const meta = document.createElement('div');
      meta.className = 'forum-item-meta';
      meta.textContent = quandoFoi(a.emMs);

      el.append(t, meta);

      if (a.corpo) {
        const c = document.createElement('p');
        c.className = 'forum-item-resumo';
        c.textContent = a.corpo;
        el.insertBefore(c, meta);
      }

      const acoes = document.createElement('div');
      acoes.className = 'forum-acoes';
      const bt = ui.botao('Remover', () => remover(a), 'secundario');
      bt.classList.add('btn--perigo');
      acoes.appendChild(bt);
      el.appendChild(acoes);
      return el;
    }

    async function remover(a) {
      const ok = await ui.confirmar(
        'Remover este aviso?',
        'Ele some do sino de todo mundo. Isso não tem desfazer.',
        'Remover',
      );
      if (!ok) return;
      try {
        await db.remover('avisos', a.id);
        avisar('ok', 'Removido.');
        await recarregar();
      } catch (e) {
        console.error(e);
        avisar('erro', 'Não consegui remover agora.');
      }
    }
  },
};
