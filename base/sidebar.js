// Desenho da barra lateral. Só mexe em DOM (roda em jsdom e no navegador).
// Chave dos links: 'modulo' pro item do módulo, 'modulo/ferramenta' pro sub-item.
//
// As ferramentas de um módulo ficam recolhidas e só aparecem quando você está
// naquele módulo — senão, com vários módulos plugados, a lateral vira uma
// lista sem fim.

import { icone } from '../ui/icones.js';

// O grupo que o CSS prega no pé da barra, acima de quem está logado.
export const GRUPO_RODAPE = '_rodape';

export function montarSidebar(menu, container) {
  const links = new Map();
  const gavetas = new Map(); // id do módulo -> caixa das ferramentas

  for (const grupo of menu) {
    // Cada grupo vira um bloco. O bloco existe para o CSS conseguir empurrar a
    // fileira da conta para o pé da barra sem depender da ordem do DOM.
    const bloco = document.createElement('div');
    bloco.className = 'menu-bloco' + (grupo.grupo === GRUPO_RODAPE ? ' menu-bloco--rodape' : '');
    container.appendChild(bloco);

    // Grupo cujo nome começa com "_" é separador invisível: agrupa e ordena,
    // mas não escreve título nenhum. Existe porque a navegação da comunidade
    // é uma lista corrida — pedir um rótulo ali obrigaria a inventar palavra
    // ("NAVEGAÇÃO", "CONTA") que ninguém pediu e que só ocupa espaço.
    //
    // Por que "_" e não nome vazio: `construirMenu` agrupa por nome, e dois
    // grupos vazios virariam um só — a fileira de baixo subiria para junto da
    // de cima e o CSS perderia onde separar.
    if (!grupo.grupo.startsWith('_')) {
      const t = document.createElement('div');
      t.className = 'menu-grupo';
      t.textContent = grupo.grupo;
      bloco.appendChild(t);
    }

    for (const item of grupo.itens) {
      const temFerramentas = (item.atalhos || []).length > 0;

      const a = document.createElement('a');
      a.className = 'menu-item';
      a.href = '#/' + item.id;
      const rotulo = document.createElement('span');
      rotulo.className = 'menu-rotulo';
      // ⚠️ O NOME PRECISA DE ELEMENTO PRÓPRIO, e não pode ser texto solto.
      //
      // Ele era `rotulo.append(icone(...), item.nome)` — o nome como nó de
      // texto, irmão do ícone. Com a barra recolhida (só ícones), o CSS não tem
      // como esconder SÓ o nome: esconder o pai levaria o ícone junto.
      //
      // Envolver num `<span>` não muda nada do que já existia: `textContent` do
      // rótulo continua sendo "ícone + nome", que é o que os testes de
      // navegação leem.
      const nome = document.createElement('span');
      nome.className = 'menu-nome';
      nome.textContent = item.nome;
      rotulo.append(icone(item.icone), nome);
      a.appendChild(rotulo);
      // O nome também vira dica do navegador: com a barra recolhida, ícone sem
      // dica é adivinhação. Custa um atributo e resolve a única perda real de
      // recolher a barra.
      a.title = item.nome;
      if (temFerramentas) {
        const seta = document.createElement('span');
        seta.className = 'menu-seta';
        seta.textContent = '▸';
        a.appendChild(seta);
      }
      links.set(item.id, a);
      bloco.appendChild(a);

      if (!temFerramentas) continue;

      const gaveta = document.createElement('div');
      gaveta.className = 'menu-sub';
      // Ferramenta pode declarar `secao`; o rótulo aparece só na transição,
      // separando o que se opera do que se configura.
      let secaoAtual = null;
      for (const atalho of item.atalhos) {
        const secao = atalho.secao || null;
        if (secao && secao !== secaoAtual) {
          const divisor = document.createElement('div');
          divisor.className = 'menu-secao';
          divisor.textContent = secao;
          gaveta.appendChild(divisor);
        }
        secaoAtual = secao;

        const s = document.createElement('a');
        s.className = 'menu-subitem';
        s.href = `#/${item.id}/${atalho.sub}`;
        s.append(icone(atalho.icone, 16), atalho.nome);
        links.set(`${item.id}/${atalho.sub}`, s);
        gaveta.appendChild(s);
      }
      gavetas.set(item.id, gaveta);
      bloco.appendChild(gaveta);
    }
  }

  links.gavetas = gavetas;
  return links;
}

// Acende o item da rota atual e abre a gaveta do módulo em que você está.
// Se a ferramenta não estiver no menu (link digitado errado), acende o
// módulo dono pra tela não ficar sem referência.
export function marcarAtivo(links, id, sub) {
  const chaveFerramenta = `${id}/${sub}`;
  const chave = sub && links.has(chaveFerramenta) ? chaveFerramenta : id;
  for (const [k, el] of links) {
    el.classList.toggle('ativo', k === chave);
    el.classList.toggle('ativo-pai', k === id && chave !== id);
  }
  const gavetas = links.gavetas;
  if (!gavetas) return;
  for (const [moduloId, gaveta] of gavetas) {
    gaveta.classList.toggle('aberta', moduloId === id);
    const pai = links.get(moduloId);
    if (pai) pai.classList.toggle('aberto', moduloId === id);
  }
}
