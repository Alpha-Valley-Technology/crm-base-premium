// Conjunto de ícones da Base.
//
// Traço fino, monocromático, herdando a cor do texto (currentColor) — assim o
// ícone acende junto com o item ativo do menu, sem manter duas versões.
// Desenhados aqui dentro: o projeto é sem build e sem biblioteca externa.
//
// Módulo declara `icone: 'chave'` (o NOME), não o desenho. Quem desenha é a
// Base — é isso que mantém a unidade visual quando entram módulos novos.

const NS = 'http://www.w3.org/2000/svg';

// Cada ícone é uma lista de formas numa caixa de 24×24.
// ⚠️ O CONJUNTO É O VOCABULÁRIO DE UI DA CARCAÇA, e nem todo ícone daqui está
// em uso hoje — `lapis`, `lixeira`, `mais`, `baixar`, `voltar`, `subir` e
// companhia existem porque todo produto acaba precisando deles, e cada um é
// meia dúzia de números.
//
// Saíram, quando a carcaça virou matriz, os que nomeavam telas de um produto
// específico: `aovivo`, `comunidade`, `elo`, `trilha`, `tendencias`, `modelar`
// e `gerar`. Ícone que nomeia uma tela inexistente convida a ser reusado com
// outro sentido — e aí a barra passa a mentir.
//
// EXPORTADO para `test/unit/icones.test.js` conseguir varrer o conjunto
// inteiro atrás de desenho vazio, em vez de conferir uma lista escrita à mão.
export const ICONES = {
  // Colunas do quadro de conteúdos
  conteudos: [
    { tag: 'rect', x: 3, y: 4, width: 5, height: 16, rx: 1 },
    { tag: 'rect', x: 9.5, y: 4, width: 5, height: 11, rx: 1 },
    { tag: 'rect', x: 16, y: 4, width: 5, height: 14, rx: 1 },
  ],
  // Linha subindo = tendência
  livro: [
    { tag: 'path', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' },
    { tag: 'path', d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z' },
  ],
  relogio: [
    { tag: 'circle', cx: 12, cy: 12, r: 9 },
    { tag: 'polyline', points: '12 7 12 12 15.5 14' },
  ],
  mais: [
    { tag: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { tag: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  chave: [
    { tag: 'circle', cx: 7.5, cy: 15.5, r: 4.5 },
    { tag: 'path', d: 'M10.8 12.2 21 2' },
    { tag: 'path', d: 'm17.5 5.5 3 3' },
  ],
  usuario: [
    { tag: 'circle', cx: 12, cy: 8, r: 4 },
    { tag: 'path', d: 'M4 21a8 8 0 0 1 16 0' },
  ],
  equipe: [
    { tag: 'circle', cx: 9, cy: 8, r: 3.5 },
    { tag: 'path', d: 'M2 21a7 7 0 0 1 14 0' },
    { tag: 'path', d: 'M16.5 4.7a3.5 3.5 0 0 1 0 6.6' },
    { tag: 'path', d: 'M18.5 14.5A7 7 0 0 1 22 21' },
  ],
  // Avião de papel = enviar/publicar
  publicar: [
    { tag: 'path', d: 'M22 2 11 13' },
    { tag: 'path', d: 'M22 2 15 22l-4-9-9-4Z' },
  ],
  'seta-direita': [
    { tag: 'line', x1: 4, y1: 12, x2: 19, y2: 12 },
    { tag: 'polyline', points: '13 6 19 12 13 18' },
  ],
  // Elo de corrente = conectar
  externo: [
    { tag: 'path', d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
    { tag: 'polyline', points: '15 3 21 3 21 9' },
    { tag: 'line', x1: 10, y1: 14, x2: 21, y2: 3 },
  ],
  // Ampulheta = ainda vem por aí
  ampulheta: [
    { tag: 'line', x1: 6, y1: 2, x2: 18, y2: 2 },
    { tag: 'line', x1: 6, y1: 22, x2: 18, y2: 22 },
    { tag: 'path', d: 'M6 2c0 4.5 6 6 6 6s6-1.5 6-6' },
    { tag: 'path', d: 'M6 22c0-4.5 6-6 6-6s6 1.5 6 6' },
  ],
  documento: [
    { tag: 'path', d: 'M14 3v5h5' },
    { tag: 'path', d: 'M19 10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z' },
  ],
  texto: [
    { tag: 'line', x1: 4, y1: 6, x2: 20, y2: 6 },
    { tag: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
    { tag: 'line', x1: 4, y1: 18, x2: 13, y2: 18 },
  ],
  // Estrela vazia (favoritar) — a cheia é a mesma forma preenchida por CSS
  estrela: [
    { tag: 'path', d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z' },
  ],
  // Setas de ordenação. Entram no sprite em vez de virarem os caracteres "↑" e
  // "↓" no meio do texto: glifo de fonte tem outro peso de traço, outro
  // alinhamento e outro tamanho óptico que os ícones ao lado — e a régua da
  // casa é "um set só, mesmo peso de traço".
  subir: [
    { tag: 'line', x1: 12, y1: 19, x2: 12, y2: 6 },
    { tag: 'polyline', points: '6 12 12 6 18 12' },
  ],
  descer: [
    { tag: 'line', x1: 12, y1: 5, x2: 12, y2: 18 },
    { tag: 'polyline', points: '6 12 12 18 18 12' },
  ],
  baixar: [
    { tag: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { tag: 'polyline', points: '7 10 12 15 17 10' },
    { tag: 'line', x1: 12, y1: 15, x2: 12, y2: 3 },
  ],
  lapis: [
    { tag: 'path', d: 'M12 20h9' },
    { tag: 'path', d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' },
  ],
  lixeira: [
    { tag: 'polyline', points: '3 6 21 6' },
    {
      tag: 'path',
      d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    },
    { tag: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { tag: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
  voltar: [
    { tag: 'line', x1: 20, y1: 12, x2: 5, y2: 12 },
    { tag: 'polyline', points: '11 18 5 12 11 6' },
  ],
  ok: [{ tag: 'polyline', points: '4 12.5 9.5 18 20 6' }],
  erro: [
    { tag: 'line', x1: 6, y1: 6, x2: 18, y2: 18 },
    { tag: 'line', x1: 18, y1: 6, x2: 6, y2: 18 },
  ],
  // Cai aqui quando o nome não existe: melhor um ponto discreto que uma tela quebrada.
  // Sanduíche. Mesma forma de todos os outros: LISTA de figuras, não texto —
  // escrito como texto, o desenhador percorria as letras uma a uma e não saía
  // ícone nenhum.
  // Recolher e expandir a barra lateral: UMA SETA, e mais nada.
  //
  // A primeira versao tinha um traco vertical (a borda da barra) ao lado da
  // seta. A ideia era dizer "a barra vai para ca" — mas dentro de uma pastilha
  // de 26px o traco vira sujeira: duas formas competindo num espaco onde cabe
  // uma, e o olho gasta um instante separando o desenho do enfeite.
  //
  // A pastilha JA ESTA em cima da borda. O contexto diz o que o traco dizia, e
  // sem ocupar pixel nenhum. Sobra a seta, que e a unica coisa que importa:
  // para onde a barra vai.
  //
  // Sem haste, so a cabeca: numa pastilha redonda pequena o angulo sozinho e
  // mais nitido que uma flecha inteira espremida.
  recolher: [{ tag: 'polyline', points: '15 6 9 12 15 18' }],
  expandir: [{ tag: 'polyline', points: '9 6 15 12 9 18' }],
  menu: [
    { tag: 'line', x1: 3.5, y1: 6.5, x2: 20.5, y2: 6.5 },
    { tag: 'line', x1: 3.5, y1: 12, x2: 20.5, y2: 12 },
    { tag: 'line', x1: 3.5, y1: 17.5, x2: 20.5, y2: 17.5 },
  ],
  // ---- A navegação da comunidade ----
  // Casa = página inicial.
  casa: [
    { tag: 'path', d: 'M3 10.5 12 3l9 7.5' },
    { tag: 'path', d: 'M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5' },
    { tag: 'path', d: 'M9.5 21v-6h5v6' },
  ],
  // Caminho com marcos = trilha. Não é seta nem lista: trilha se anda, e o
  // desenho tem que dizer "percurso", não "próximo item".
  sino: [
    { tag: 'path', d: 'M18 16V10a6 6 0 0 0-12 0v6l-1.5 2.5h15Z' },
    { tag: 'path', d: 'M10 21h4' },
  ],
  // Bóia salva-vidas = suporte. Uma interrogação diria "dúvida"; a bóia diz
  // "socorro", que é o motivo real de alguém clicar aqui.
  ajuda: [
    { tag: 'circle', cx: 12, cy: 12, r: 9 },
    { tag: 'circle', cx: 12, cy: 12, r: 3.8 },
    { tag: 'line', x1: 5.6, y1: 5.6, x2: 9.3, y2: 9.3 },
    { tag: 'line', x1: 14.7, y1: 14.7, x2: 18.4, y2: 18.4 },
    { tag: 'line', x1: 18.4, y1: 5.6, x2: 14.7, y2: 9.3 },
    { tag: 'line', x1: 9.3, y1: 14.7, x2: 5.6, y2: 18.4 },
  ],
  // Porta com seta saindo = sair.
  sair: [
    { tag: 'path', d: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4' },
    { tag: 'path', d: 'M10 8 6 12l4 4' },
    { tag: 'line', x1: 6, y1: 12, x2: 15, y2: 12 },
  ],
  padrao: [{ tag: 'circle', cx: 12, cy: 12, r: 3.5 }],
};

export function existeIcone(nome) {
  return Object.prototype.hasOwnProperty.call(ICONES, nome);
}

export function icone(nome, tamanho = 18) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(tamanho));
  svg.setAttribute('height', String(tamanho));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // Decorativo: quem lê a tela em voz alta não deve anunciar o desenho.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icone');

  for (const forma of ICONES[nome] || ICONES.padrao) {
    const el = document.createElementNS(NS, forma.tag);
    for (const chave in forma) {
      if (chave !== 'tag') el.setAttribute(chave, String(forma[chave]));
    }
    svg.appendChild(el);
  }
  return svg;
}

// Botão com ícone + texto, no padrão do sistema.
export function botaoComIcone(ui, nomeIcone, texto, aoClicar, variante) {
  const b = ui.botao(texto, aoClicar, variante);
  b.prepend(icone(nomeIcone, 16));
  b.classList.add('btn--icone');
  return b;
}

// Exposto só para o teste de formato conferir que todo ícone é lista de figuras.
export const ICONES_PARA_TESTE = ICONES;
