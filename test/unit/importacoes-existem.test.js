// TODO `import` APONTA PARA UM ARQUIVO QUE EXISTE.
//
// ⚠️ UM MÓDULO QUE NÃO CARREGA NÃO QUEBRA A PÁGINA — ELE SOME.
//
// O navegador pede o arquivo, leva 404, desiste do módulo INTEIRO e segue em
// frente. A tela continua de pé, bonita, com todos os botões desenhados — e
// nenhum deles ligado a coisa alguma. Não há tela vermelha, não há alerta: só
// uma linha no console que ninguém abre.
//
// Já aconteceu aqui, e em produção. O script da entrada saiu de dentro do
// `login.html` para um arquivo próprio (`base/login.js`), e os caminhos vieram
// junto sem serem recalculados: `./base/auth.js`, que estava certo para uma
// página na raiz, virou `/base/base/auth.js` para um arquivo dentro de `base/`.
// Resultado: os botões de suporte e financeiro sumiram da tela de entrada e
// NENHUMA das três formas de entrar respondia ao clique. Os testes de então
// liam o HTML, achavam os botões no lugar, e passavam todos.
//
// É o mesmo serviço que o `css-integro.test.js` faz para as folhas de estilo:
// cobrar do arquivo aquilo que a linguagem não cobra, e que o navegador
// perdoa em silêncio.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, sep } from 'node:path';

// A raiz do site é a raiz do projeto: é ela que o Hosting publica, e é contra
// ela que um caminho começado com "/" tem de ser resolvido.
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

function todosOsArquivos(pasta, extensao, achados = []) {
  for (const item of readdirSync(join(RAIZ, pasta))) {
    const relativo = `${pasta}/${item}`;
    if (statSync(join(RAIZ, relativo)).isDirectory()) todosOsArquivos(relativo, extensao, achados);
    else if (item.endsWith(extensao)) achados.push(relativo);
  }
  return achados;
}

// Comentários fora do caminho: um `import('./x.js')` citado dentro de um
// comentário explicativo não é uma dependência, e reprovar por causa dele
// ensinaria a não comentar o código.
const semComentarios = (js) => js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const daBarra = (caminho) => caminho.split(sep).join('/');

const FRONT = ['base', 'modules', 'config', 'ui'].flatMap((p) => todosOsArquivos(p, '.js'));

test('todo import relativo do front aponta para um arquivo que existe', () => {
  assert.ok(FRONT.length >= 20, 'esperava encontrar os módulos do front');

  const quebrados = [];
  for (const arquivo of FRONT) {
    const codigo = semComentarios(readFileSync(join(RAIZ, arquivo), 'utf8'));

    // `import ... from 'x'`, `export ... from 'x'` e o `import('x')` dinâmico.
    const alvos = [
      ...codigo.matchAll(/(?:^|[\s;}])(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g),
      ...codigo.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);

    for (const alvo of alvos) {
      if (!alvo.startsWith('.') && !alvo.startsWith('/')) continue; // o SDK vem da web
      const destino = alvo.startsWith('/')
        ? join(RAIZ, alvo.slice(1))
        : join(RAIZ, dirname(arquivo), alvo);
      if (!existsSync(destino)) {
        const esperado = daBarra(normalize(join(dirname(arquivo), alvo)));
        quebrados.push(`${arquivo}: importa '${alvo}' → ${esperado} não existe`);
      }
    }
  }

  assert.deepEqual(quebrados, [], `\n  ${quebrados.join('\n  ')}\n`);
});

test('todo script e folha de estilo das páginas aponta para um arquivo que existe', () => {
  const PAGINAS = readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
  // A matriz tem duas: a área logada e a entrada. A página pública de venda
  // saiu com o gateway, e volta quando o próximo entrar.
  assert.ok(PAGINAS.length >= 2, 'esperava ao menos index e login');

  const quebrados = [];
  for (const pagina of PAGINAS) {
    const html = readFileSync(join(RAIZ, pagina), 'utf8');
    const alvos = [
      ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g),
      ...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g),
    ].map((m) => m[1]);

    for (const alvo of alvos) {
      if (/^https?:|^data:/.test(alvo)) continue;
      const limpo = alvo.split('?')[0]; // o ?v=2 dos ícones
      const destino = limpo.startsWith('/') ? join(RAIZ, limpo.slice(1)) : join(RAIZ, limpo);
      if (!existsSync(destino)) quebrados.push(`${pagina}: aponta para '${alvo}', que não existe`);
    }
  }

  assert.deepEqual(quebrados, [], `\n  ${quebrados.join('\n  ')}\n`);
});
