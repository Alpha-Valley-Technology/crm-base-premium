// AS FOLHAS DE ESTILO FECHAM TODAS AS CHAVES.
//
// ⚠️ CSS NÃO DÁ ERRO — ele desiste em silêncio.
//
// Uma chave `}` sobrando no meio do arquivo não aparece no console, não quebra
// a página e não falha teste nenhum. O navegador engole o que não entende e
// segue em frente, e o efeito é uma regra qualquer que "não pega" — geralmente
// longe do lugar onde o erro foi digitado.
//
// Já aconteceu aqui: `modulos.css` carregou por semanas com uma `}` a mais,
// achada por acaso enquanto se caçava outra coisa.
//
// O `node --check` faz este serviço para o JavaScript desde sempre. Isto é o
// equivalente para o CSS, e custa dez milissegundos.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';

const FOLHAS = readdirSync('styles').filter((f) => f.endsWith('.css'));

test('toda folha de estilo tem as chaves equilibradas', () => {
  assert.ok(FOLHAS.length >= 4, 'esperava encontrar as folhas em styles/');

  for (const nome of FOLHAS) {
    const css = readFileSync(`styles/${nome}`, 'utf8');
    // Comentários viram espaço do mesmo tamanho: assim o número da linha
    // continua batendo com o do editor de quem for consertar.
    const limpo = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

    let nivel = 0;
    let linha = 1;
    for (const c of limpo) {
      if (c === '\n') linha += 1;
      else if (c === '{') nivel += 1;
      else if (c === '}') {
        nivel -= 1;
        assert.ok(nivel >= 0, `${nome}: chave "}" sobrando na linha ${linha}`);
      }
    }
    assert.equal(nivel, 0, `${nome}: ficaram ${nivel} bloco(s) sem fechar`);
  }
});

test('nenhum comentário fica aberto', () => {
  for (const nome of FOLHAS) {
    const css = readFileSync(`styles/${nome}`, 'utf8');
    assert.equal(
      (css.match(/\/\*/g) || []).length,
      (css.match(/\*\//g) || []).length,
      `${nome}: comentário aberto engole todo o resto do arquivo`,
    );
  }
});
