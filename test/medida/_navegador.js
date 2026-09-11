// A RÉGUA: medir a tela de verdade, num navegador de verdade.
//
// ===========================================================================
// POR QUE ISTO PRECISOU EXISTIR
// ===========================================================================
//
// O resto da suíte roda em jsdom, que monta o DOM mas NÃO CALCULA LAYOUT: ali
// todo elemento tem largura zero, e `getComputedStyle` devolve o que foi
// escrito, não o que o navegador resolveu. Isso cobre lógica, e não geometria.
//
// O preço apareceu num defeito real: o hero "de ponta a ponta" parava em 1168px
// em vez de ir até a borda, porque `100%` dentro de `calc()` mede o elemento em
// que a conta ACONTECE — e, dentro do hero, isso já era a coluna de leitura.
// Nenhum teste podia pegar aquilo, e foram três conversas até alguém medir.
//
// Layout errado não dá erro. Ele só fica feio, e alguém precisa reparar.
//
// ===========================================================================
// COMO FUNCIONA
// ===========================================================================
//
// Monta uma página com a casca REAL do sistema e as folhas de estilo REAIS,
// abre no Chrome sem interface, mede com `getBoundingClientRect` e
// `getComputedStyle`, e devolve os números.
//
// ⚠️ AS FOLHAS SÃO AS DO PROJETO, e não uma cópia. Cópia envelhece e passa a
// atestar um CSS que não existe mais — pior do que não ter teste, porque mente
// com a autoridade de um teste verde.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Achar o navegador
// ---------------------------------------------------------------------------

const CANDIDATOS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

// ⚠️ FALHA ALTO QUANDO NÃO ACHA, em vez de pular em silêncio.
//
// Um teste de medida que se desliga sozinho na máquina errada vira uma suíte
// verde que não mediu nada — e ninguém percebe, porque verde é exatamente o que
// se espera ver. Se um dia isto precisar rodar onde não há navegador, o caminho
// é dizer isso de propósito, e não deixar acontecer por acidente.
export function acharNavegador() {
  if (process.env.NAVEGADOR) return process.env.NAVEGADOR;
  const achado = CANDIDATOS.find((c) => existsSync(c));
  if (achado) return achado;
  throw new Error(
    'Não achei Chrome nem Edge para medir a tela. Instale um dos dois, ou aponte o ' +
      'caminho na variável NAVEGADOR (ex.: NAVEGADOR="/caminho/chrome" npm run test:medida).',
  );
}

const RAIZ = resolve('.');
const PASTA = mkdtempSync(join(tmpdir(), 'medida-'));

// ---------------------------------------------------------------------------
// A página de teste
// ---------------------------------------------------------------------------

// A casca é a mesma de `base/app.js`. Só a estrutura: o que se mede aqui é
// grade, largura e posição — nada depende do conteúdo real.
function paginaDeTeste({ hero, heroTopo, tema, miolo }) {
  const folhas = ['tokens', 'base', 'components', 'modulos']
    .map(
      (f) =>
        `<link rel="stylesheet" href="${pathToFileURL(join(RAIZ, 'styles', `${f}.css`)).href}">`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR" data-hero="${hero}" data-tema="${tema}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${folhas}</head>
<body><div id="app">
  <div class="app-shell"${heroTopo ? ' data-hero-topo="sim"' : ''}>
    <header class="app-header">
      <button class="app-sanduiche" type="button"></button>
      <strong>Marca</strong>
      <a class="app-sino" href="#"></a>
    </header>
    <nav class="app-sidebar" id="sidebar"></nav>
    <div class="app-veu"></div>
    <main class="app-content">
      <div id="content" class="app-miolo">${miolo}</div>
      <footer class="app-rodape">rodape</footer>
    </main>
  </div>
</div>
<script>
function medir(seletor) {
  var el = document.querySelector(seletor);
  if (!el) return null;
  var r = el.getBoundingClientRect();
  var cs = getComputedStyle(el);
  return {
    esquerda: Math.round(r.left), direita: Math.round(r.right),
    topo: Math.round(r.top), largura: Math.round(r.width), altura: Math.round(r.height),
    raio: cs.borderTopLeftRadius,
    colunas: cs.gridTemplateColumns,
    respiroTopo: cs.paddingTop,
    respiroLados: cs.paddingLeft,
    fundo: cs.backgroundColor,
    grudaEm: cs.top,
    posicao: cs.position,
    corDoTexto: cs.webkitTextFillColor || cs.color
  };
}
var raiz = document.documentElement;
var saida = {
  janela: { largura: window.innerWidth, altura: window.innerHeight },
  rolagemHorizontal: raiz.scrollWidth > raiz.clientWidth,
  larguraDoDocumento: raiz.scrollWidth,
  alvos: {}
};
var lista = ['.app-shell', '.app-header', '.app-content', '.app-miolo',
             '.hero', '.secao', '.aula-indice', '.app-rodape',
             '.app-header strong', '.app-sino'];
for (var i = 0; i < lista.length; i++) saida.alvos[lista[i]] = medir(lista[i]);
var pre = document.createElement('pre');
pre.id = 'medida';
pre.textContent = JSON.stringify(saida);
document.body.appendChild(pre);
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// A medição
// ---------------------------------------------------------------------------

let numero = 0;

/**
 * Abre a casca no navegador e devolve os números.
 *
 * @param {object}  op
 * @param {number}  op.largura   largura da janela (padrão 1920)
 * @param {number}  op.altura    altura da janela (padrão 1080)
 * @param {string}  op.hero      'caixa' ou 'sangria'
 * @param {boolean} op.heroTopo  se o hero passa por baixo da faixa
 * @param {string}  op.tema      'claro' ou 'escuro'
 * @param {string}  op.miolo     o HTML de dentro do miolo
 */
export function medirTela(op = {}) {
  const {
    largura = 1920,
    altura = 1080,
    hero = 'caixa',
    heroTopo = false,
    tema = 'claro',
    miolo = '<section class="hero"><h1 class="hero-frase">Oi</h1></section>' +
      '<section class="secao"><h2 class="secao-titulo">Cursos</h2></section>',
  } = op;

  numero += 1;
  const arquivo = join(PASTA, `tela-${numero}.html`);
  writeFileSync(arquivo, paginaDeTeste({ hero, heroTopo, tema, miolo }), 'utf8');

  const saida = execFileSync(
    acharNavegador(),
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      // ⚠️ SEM BARRA DE ROLAGEM NA CONTA. Com ela, toda medida horizontal viria
      // 15px menor no Windows e igual no Mac — e o teste passaria a depender do
      // sistema de quem roda, que é o jeito mais rápido de virar teste ignorado.
      '--hide-scrollbars',
      `--window-size=${largura},${altura}`,
      // Tempo virtual: o navegador adianta os relógios e devolve assim que a
      // página assenta, em vez de esperar um cronômetro de verdade.
      '--virtual-time-budget=4000',
      '--dump-dom',
      pathToFileURL(arquivo).href,
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );

  const m = saida.match(/<pre id="medida">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error('O navegador abriu a página mas não devolveu as medidas.');
  return JSON.parse(
    m[1]
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'),
  );
}

// A largura da barra lateral no desktop, declarada em `styles/base.css`. É a
// borda esquerda que o hero "de ponta a ponta" tem que encostar.
export const LARGURA_BARRA_LATERAL = 248;

// O trecho de uma aula, para medir o índice que gruda.
export const MIOLO_DE_AULA = `
  <div class="aula-layout">
    <aside class="aula-indice"><div class="aula-indice-topo">Índice</div></aside>
    <div><section class="card">Aula</section>
      <p style="height:2400px">conteúdo longo, para haver o que rolar</p></div>
  </div>`;

/**
 * A opacidade de uma cor calculada, seja qual for o formato em que ela vier.
 *
 * ⚠️ ISTO NÃO É FRESCURA DE PARSER. A primeira versão do teste da faixa
 * procurava por "rgba(...)" e passou verde numa mutação que a deixava
 * translúcida de novo — porque o Chrome devolve `color-mix` no formato novo,
 * `color(srgb 1 1 1 / 0.84)`, e não em `rgba`. O teste atestava uma coisa que
 * não estava sendo conferida, que é o pior estado possível de um teste.
 *
 * Os três formatos que aparecem na prática:
 *   color(srgb 0.99 0.99 0.99)        → opaca
 *   color(srgb 1 1 1 / 0.84)          → 84%
 *   rgba(0, 0, 0, 0)                  → invisível
 */
export function opacidadeDe(cor) {
  const s = String(cor == null ? '' : cor).trim();
  if (!s || s === 'transparent') return 0;

  const aposBarra = s.match(/\/\s*([0-9.]+%?)\s*\)/);
  if (aposBarra) {
    const v = aposBarra[1];
    return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  }

  const emRgba = s.match(/^rgba?\(([^)]+)\)$/i);
  if (emRgba) {
    const partes = emRgba[1].split(/[,\s]+/).filter(Boolean);
    return partes.length >= 4 ? parseFloat(partes[3]) : 1;
  }

  return 1;
}
