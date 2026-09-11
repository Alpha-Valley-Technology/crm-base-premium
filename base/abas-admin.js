// A FILA DE ABAS DAS ÁREAS DE ADMINISTRAÇÃO.
//
// Nasceu quando "Configuração" se partiu em duas: o que se usa para POPULAR e
// GERIR a área de membros, e o que mexe em dinheiro, identidade e pessoas.
// Duas telas com a mesma fila de abas montada à mão divergiriam na primeira
// mudança — e a fila é a única coisa que elas têm em comum.

import { icone } from '../ui/icones.js';

// ⚠️ HOJE ELA DEVOLVE TUDO, e a função existe mesmo assim.
//
// Ela filtrava as abas cujas áreas o cliente tinha desligado — senão o dono
// continuava alimentando um lugar que ninguém vê. Aquele catálogo de áreas era
// do produto e saiu com ele (ver `base/registry.js`).
//
// A função fica porque ela é o PONTO DE ENGATE: um produto que precise
// esconder abas conforme a instalação muda só este corpo, e as duas telas que
// desenham filas de aba continuam funcionando sem saber. Apagá-la obrigaria a
// próxima pessoa a descobrir de novo onde esse filtro entra — e a descobrir
// junto que são DUAS telas, não uma.
export function abasDisponiveis(ferramentas) {
  return ferramentas;
}

/**
 * Desenha a fila e devolve a ferramenta escolhida.
 *
 * @param {HTMLElement} caixa   onde a fila entra
 * @param {Array}  ferramentas  [{ sub, nome, icone, modulo }]
 * @param {string} raiz         o id do módulo dono da fila (vira o endereço)
 * @param {object} rota
 */
export function montarAbas(caixa, ferramentas, raiz, rota) {
  const disponiveis = abasDisponiveis(ferramentas);
  const escolhida =
    disponiveis.find((f) => f.sub === (rota && rota.sub)) || disponiveis[0] || ferramentas[0];

  // Uma ferramenta só não desenha aba nenhuma: aba única é moldura em volta de
  // nada, e ainda promete uma escolha que não existe.
  if (disponiveis.length > 1) {
    const abas = document.createElement('nav');
    abas.className = 'abas';
    abas.setAttribute('aria-label', 'Ferramentas');
    for (const f of disponiveis) {
      const a = document.createElement('a');
      a.className = 'aba' + (f === escolhida ? ' aba--ativa' : '');
      a.href = `#/${raiz}/${f.sub}`;
      if (f === escolhida) a.setAttribute('aria-current', 'page');
      a.append(icone(f.icone, 16), f.nome);
      abas.appendChild(a);
    }
    caixa.appendChild(abas);
  }

  return escolhida;
}
