// A POLÍTICA DE SEGURANÇA DE CONTEÚDO (CSP), provada num navegador.
//
// ===========================================================================
// POR QUE ISTO NÃO PODE SER CONFERIDO LENDO O ARQUIVO
// ===========================================================================
//
// A CSP diz ao navegador de onde ele pode buscar script, estilo, fonte, imagem
// e para onde pode abrir conexão. Ela é a diferença entre "alguém injetou um
// texto no fórum" e "alguém está rodando código na sessão de todo mundo".
//
// O problema é o modo de falhar: uma política apertada demais NÃO dá erro de
// sintaxe. Ela simplesmente bloqueia uma coisa — a fonte da marca, a chamada
// que confere o cupom, o quadro do vídeo — e a tela fica quebrada só em
// produção, só para quem já pagou.
//
// Este teste sobe as páginas de verdade com a política de verdade (lida do
// `firebase.json`), abre no Chrome e coleta as violações que o navegador
// reporta. O emulador de hosting do Firebase ignora o bloco `headers`, então
// não dá para usá-lo aqui: o servidor vem de `_servidor.js`.
//
// ⚠️ COBRE OS TRÊS PONTOS DE ENTRADA: a tela de login, a área de membros e a
// página pública de pagamento. A terceira é a mais importante — ela é a única
// que uma pessoa de fora abre, e a única onde uma falha custa uma venda.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import {
  PAGINAS,
  PORTA_CSP,
  subirServidor,
  abrirEDespejar,
  cabecalhosDoProjeto,
} from './_servidor.js';

// O espião: anota cada violação que o navegador reporta e despeja num <pre>.
// Precisa ser arquivo, e não script embutido — a própria política que estamos
// testando proíbe embutido, que é justamente o ponto dela.
//
// ===========================================================================
// ⚠️ ABRIR A PÁGINA NÃO BASTA: O ESPIÃO PRECISA CLICAR
// ===========================================================================
//
// Custou o login do Google, em produção.
//
// A política nasceu sem `https://apis.google.com`, e o SDK do Firebase busca
// `apis.google.com/js/api.js` para montar o popup de entrada — mas **só no
// momento do clique**. Uma página aberta e deixada quieta nunca pede esse
// arquivo, nunca viola nada, e o teste passa verde sobre um login quebrado.
//
// Um recurso que só é buscado sob interação é invisível para um teste que só
// carrega. Se um botão dispara ida à rede, o teste tem que apertar o botão.
const ESPIA = `
const achados = [];
document.addEventListener('securitypolicyviolation', (e) => {
  achados.push(e.violatedDirective + ' <- ' + (e.blockedURI || '(embutido)'));
});
addEventListener('load', () => {
  // O clique é o que faz o SDK buscar o que ele só busca na hora de entrar.
  // O popup não vai a lugar nenhum aqui, e não precisa: o que se mede é o que
  // a política deixou o navegador buscar antes disso.
  const google = document.getElementById('btGoogle');
  if (google) google.click();

  setTimeout(() => {
    const pre = document.createElement('pre');
    pre.id = 'violacoes';
    pre.textContent = achados.length ? [...new Set(achados)].join('\\n') : 'NENHUMA';
    document.body.appendChild(pre);
  }, 2500);
});
`;

test('nenhuma página viola a política de segurança', async () => {
  const servidor = subirServidor(PORTA_CSP);
  const temporarios = ['_csp-espia.js'];
  writeFileSync('_csp-espia.js', ESPIA);

  try {
    for (const [pagina, oQueE] of PAGINAS) {
      const teste = `_csp-${pagina}`;
      temporarios.push(teste);
      writeFileSync(
        teste,
        readFileSync(pagina, 'utf8').replace(
          '</head>',
          '  <script src="/_csp-espia.js"></script>\n</head>',
        ),
      );

      const saida = abrirEDespejar(teste, { porta: servidor.porta });

      const m = saida.match(/<pre id="violacoes">([\s\S]*?)<\/pre>/);
      assert.ok(m, `${pagina} não chegou a rodar`);
      const violacoes = m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      assert.equal(
        violacoes,
        'NENHUMA',
        `a política bloqueia algo em ${oQueE} (${pagina}):\n    ${violacoes.split('\n').join('\n    ')}`,
      );
    }
  } finally {
    servidor.parar();
    for (const t of temporarios) {
      try {
        unlinkSync(t);
      } catch {
        /* já foi */
      }
    }
  }
});

// ⚠️ AS TRÊS LINHAS QUE NÃO PODEM AFROUXAR.
//
// As outras diretivas são ajustáveis conforme o produto cresce. Estas mudam o
// que o sistema é: sem elas, um site qualquer embute a área de membros num
// quadro invisível e colhe os cliques de quem já pagou, e um texto injetado
// vira código rodando na sessão de todo mundo.
test('a política não abre mão do essencial', () => {
  const csp = cabecalhosDoProjeto().find((h) => h.key === 'Content-Security-Policy');
  assert.ok(csp, 'faltou a Content-Security-Policy');

  assert.match(
    csp.value,
    /frame-ancestors 'none'/,
    'sem isto, qualquer site embute a área de membros e colhe os cliques',
  );
  assert.match(csp.value, /object-src 'none'/);
  assert.equal(
    /script-src[^;]*unsafe-inline/.test(csp.value),
    false,
    'script embutido liberado desliga a parte da política que protege',
  );
  assert.equal(/script-src[^;]*unsafe-eval/.test(csp.value), false);

  // Cravar o nosso projeto aqui quebraria a instalação de todo cliente.
  assert.equal(
    /comunidade-ninja-digital/.test(csp.value),
    false,
    'a política não pode citar o nosso projeto: ela vai junto no white-label',
  );
});
