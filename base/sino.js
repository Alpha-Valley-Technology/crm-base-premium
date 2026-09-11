// O sino de notificações. Só mexe em DOM (roda em jsdom e no navegador).
//
// Mora em arquivo próprio, e não dentro de `app.js`, pelo mesmo motivo que
// `sidebar.js` e `registry.js`: `app.js` importa o Firebase e dispara a sessão
// ao ser carregado, então não dá para importá-lo num teste. O que tem lógica
// sai de lá para poder ser cobrado.

import { icone } from '../ui/icones.js';
import { ultimosAvisos, temNaoLido } from './avisos.js';
import { ultimosRecados, temRecadoNovo, textoDoRecado } from './recados.js';

// POR QUE O SINO NÃO ESTÁ NA BARRA LATERAL, junto de Meu Perfil e Suporte.
//
// Perfil e Suporte são lugares que a pessoa PROCURA — podem morar no menu.
// Notificação é o contrário: ela precisa encontrar a pessoa. E, no celular, a
// barra lateral é gaveta fechada: ninguém abre a gaveta para conferir se tem
// recado. O aviso de live morreria justamente no aparelho em que mais se usa
// isto.
//
// Ele também não precisa flutuar por cima do conteúdo para ficar parado: a
// faixa do topo é `sticky` e a área de conteúdo rola dentro da própria caixa.
// Botão flutuante daria a mesma imobilidade e taparia o canto das telas.
export function criarSino() {
  // BOTÃO, e não link. Ele abre um painel aqui mesmo — não navega. Link que
  // não navega confunde quem usa leitor de tela e quem clica com o meio.
  const a = document.createElement('button');
  a.type = 'button';
  a.className = 'app-sino';
  a.title = 'Avisos';
  a.setAttribute('aria-label', 'Avisos');
  a.setAttribute('aria-haspopup', 'dialog');
  a.appendChild(icone('sino', 20));

  // O PONTO É VERMELHO E PARADO. Sem animação, de propósito: bolinha que se
  // mexe o tempo todo vira papel de parede em uma semana — a pessoa para de
  // enxergar, e o aviso falha exatamente quando importa. Animação eterna ainda
  // mantém o navegador desenhando à toa e come bateria no celular.
  const ponto = document.createElement('span');
  ponto.className = 'app-sino-ponto';
  ponto.hidden = true;
  // Quem usa leitor de tela não enxerga bolinha: o aviso precisa ser texto.
  ponto.setAttribute('role', 'status');
  ponto.setAttribute('aria-label', 'há notificações não lidas');
  a.appendChild(ponto);

  return a;
}

// O POPUP ABRE EMBAIXO DO SINO, e não numa tela à parte.
//
// Aviso é coisa de olhar em pé: a pessoa quer saber se tem recado, não navegar
// até uma página para descobrir que não tem. Levá-la a uma tela para mostrar
// "nada de novo" é gastar um clique e uma troca de contexto por nenhuma
// informação.
//
// A lista some ao clicar em qualquer lugar fora, e com Esc — é o que todo mundo
// já sabe fazer com um menu, e não precisa ser ensinado.
//
// ---------------------------------------------------------------------------
// DUAS LISTAS DENTRO DO MESMO PAINEL, e elas não se misturam.
// ---------------------------------------------------------------------------
//
// "PARA VOCÊ" são os recados pessoais: alguém respondeu a sua pergunta, alguém
// marcou a sua resposta como a que resolveu. "AVISOS" são os recados da equipe
// para todo mundo: live de quinta, trilha nova.
//
// Elas moram em coleções diferentes, com regras diferentes (o recado pessoal
// nem o admin lê), e aparecem em blocos separados, cada um com o seu título.
// Um único lugar de OLHAR, duas listas DENTRO — que é o contrário de misturar.
//
// "Para você" vem primeiro porque é o que a pessoa não consegue descobrir de
// outro jeito: o aviso de live ela reencontra na tela inicial, mas ninguém
// relê o fórum inteiro procurando quem respondeu.
export function montarPainelDoSino(sino, { avisos, recados, vistosEmMs, aoAbrir }) {
  const painel = document.createElement('div');
  painel.className = 'app-avisos';
  painel.hidden = true;
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Avisos');

  const lista = document.createElement('div');
  lista.className = 'app-avisos-lista';
  painel.appendChild(lista);

  desenhar();
  sino.appendChild(painel);

  function titulo(texto) {
    const el = document.createElement('div');
    el.className = 'app-avisos-topo';
    el.textContent = texto;
    return el;
  }

  function desenhar() {
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    const corte = Number(vistosEmMs) || 0;
    const meus = ultimosRecados(recados);
    const daEquipe = ultimosAvisos(avisos);

    if (!meus.length && !daEquipe.length) {
      const vazio = document.createElement('p');
      vazio.className = 'app-avisos-vazio';
      vazio.textContent = 'Nenhum aviso por enquanto.';
      lista.append(titulo('Avisos'), vazio);
      return;
    }

    // O bloco vazio NÃO é desenhado. Título com nada embaixo ocupa a altura de
    // um item para informar ausência — e o painel tem sete linhas de espaço.
    if (meus.length) {
      lista.appendChild(titulo('Para você'));
      for (const r of meus) lista.appendChild(itemDeRecado(r, corte));
    }
    if (daEquipe.length) {
      lista.appendChild(titulo('Avisos'));
      for (const a of daEquipe) lista.appendChild(itemDeAviso(a, corte));
    }
  }

  function itemDeRecado(r, corte) {
    const { titulo: frase, apoio, href } = textoDoRecado(r);
    const item = document.createElement('a');
    item.className =
      'app-aviso app-aviso--pessoal' + ((Number(r.emMs) || 0) > corte ? ' app-aviso--novo' : '');
    // Endereço interno: leva ao POST, dentro do próprio sistema. Por isso não
    // abre aba nova nem leva `rel` de link externo.
    item.href = href;
    item.addEventListener('click', fechar);

    const t = document.createElement('div');
    t.className = 'app-aviso-titulo';
    t.textContent = frase;
    item.appendChild(t);

    if (apoio) {
      const c = document.createElement('p');
      c.className = 'app-aviso-corpo';
      c.textContent = apoio;
      item.appendChild(c);
    }
    return item;
  }

  function itemDeAviso(a, corte) {
    // Link só quando ele existe. Item que parece clicável e não leva a lugar
    // nenhum é pior que item que nunca prometeu nada.
    const temLink = /^https?:\/\//i.test(String(a.linkUrl || '').trim());
    const item = document.createElement(temLink ? 'a' : 'div');
    item.className = 'app-aviso' + ((Number(a.emMs) || 0) > corte ? ' app-aviso--novo' : '');
    if (temLink) {
      item.href = a.linkUrl;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
    }

    const t = document.createElement('div');
    t.className = 'app-aviso-titulo';
    t.textContent = a.titulo || '';
    item.appendChild(t);

    if (a.corpo) {
      const c = document.createElement('p');
      c.className = 'app-aviso-corpo';
      c.textContent = a.corpo;
      item.appendChild(c);
    }
    return item;
  }

  function fechar() {
    painel.hidden = true;
    sino.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', foraDaqui, true);
    document.removeEventListener('keydown', peloEsc);
  }
  function foraDaqui(e) {
    if (!sino.contains(e.target)) fechar();
  }
  function peloEsc(e) {
    if (e.key === 'Escape') fechar();
  }

  sino.setAttribute('aria-expanded', 'false');
  sino.addEventListener('click', (e) => {
    e.preventDefault();
    if (!painel.hidden) {
      fechar();
      return;
    }
    painel.hidden = false;
    sino.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', foraDaqui, true);
    document.addEventListener('keydown', peloEsc);

    // ABRIR JÁ APAGA O PONTO. Exigir um "marcar como lido" seria pedir um
    // segundo clique para dizer o que o primeiro já disse. E apaga os DOIS
    // blocos de uma vez: um carimbo de tempo só, senão a pessoa abriria o
    // mesmo painel duas vezes para matar a mesma bolinha.
    marcarNotificacoes(false, sino);
    if (aoAbrir)
      Promise.resolve(aoAbrir()).catch((err) => console.warn('avisos:', err && err.message));
  });

  return {
    painel,
    atualizar({ avisos: novosAvisos, recados: novosRecados, vistosEmMs: novoCorte }) {
      avisos = novosAvisos;
      recados = novosRecados;
      vistosEmMs = novoCorte;
      desenhar();
      marcarNotificacoes(
        temNaoLido(avisos, vistosEmMs) || temRecadoNovo(recados, vistosEmMs),
        sino,
      );
    },
  };
}

// A tomada para a máquina de notificações.
//
// Enquanto ela não vier, o ponto nasce apagado. Sino aceso sem ter o que
// mostrar é o jeito mais rápido de ensinar a pessoa a ignorar o sino.
export function marcarNotificacoes(temNaoLidas, raiz = document) {
  const ponto = raiz.querySelector('.app-sino-ponto');
  if (ponto) ponto.hidden = !temNaoLidas;
  return ponto;
}
