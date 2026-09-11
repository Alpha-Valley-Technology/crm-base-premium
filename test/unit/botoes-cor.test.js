// TODO BOTÃO PRECISA DECLARAR A COR DO TEXTO.
//
// ===========================================================================
// POR QUE ISTO É UM TESTE, E NÃO UMA REGRA DE REVISÃO
// ===========================================================================
//
// `<button>` NÃO herda `color`. Sem declaração explícita ele usa a cor padrão
// do navegador — preta. No tema claro ninguém percebe: preto sobre quase-branco
// é o que já se esperava. No tema escuro o botão vira texto preto sobre fundo
// escuro e some.
//
// Aconteceu com o "☰ Índice" das aulas: `font: inherit` estava lá, `color` não.
// O dono viu; o código não tinha como avisar.
//
// Nada quebra, nada estoura, e o defeito só aparece para quem usa o tema
// escuro — que costuma ser a minoria de quem revisa e a maioria de quem usa.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function arquivosJs(pasta, saida = []) {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) arquivosJs(caminho, saida);
    else if (nome.endsWith('.js')) saida.push(caminho);
  }
  return saida;
}

const CSS = ['base', 'components', 'modulos']
  .map((n) => readFileSync(`styles/${n}.css`, 'utf8'))
  .join('\n')
  // Comentário citando `color:` não vale como declaração.
  .replace(/\/\*[\s\S]*?\*\//g, '');

// As classes que o JS põe em elementos criados como `<button>`.
function classesDeBotao() {
  const achadas = new Set();
  for (const arquivo of [...arquivosJs('base'), ...arquivosJs('modules'), ...arquivosJs('ui')]) {
    const texto = readFileSync(arquivo, 'utf8');
    // `const x = document.createElement('button')` … `x.className = '…'`
    for (const m of texto.matchAll(
      /(?:const|let)\s+(\w+)\s*=\s*document\.createElement\('button'\)/g,
    )) {
      const variavel = m[1];
      const depois = texto.slice(m.index, m.index + 600);
      // eslint-disable-next-line no-useless-escape
      const classe = depois.match(new RegExp(`${variavel}\.className\s*=\s*'([^']+)'`));
      if (classe) {
        for (const c of classe[1].split(/\s+/)) if (c && !c.includes('$')) achadas.add(c);
      }
    }
  }
  return [...achadas];
}

test('todo botão com classe própria declara a cor do texto', () => {
  const semCor = [];
  for (const classe of classesDeBotao()) {
    // A regra pode estar em qualquer folha e com qualquer seletor que contenha
    // a classe — inclusive dentro de uma media query.
    // eslint-disable-next-line no-useless-escape
    const temRegraComCor = new RegExp(`\.${classe}\b[^{}]*\{[^{}]*([;\s]|^)color\s*:`, 'm').test(
      CSS,
    );
    if (!temRegraComCor) semCor.push(classe);
  }
  assert.deepEqual(
    semCor,
    [],
    'botão sem `color` declarado fica preto no tema escuro: `<button>` não herda a cor',
  );
});
