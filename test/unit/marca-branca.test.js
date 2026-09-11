// O PRODUTO NÃO PODE VAZAR A NOSSA MARCA NO PRODUTO DO CLIENTE.
//
// ===========================================================================
// POR QUE ISTO PRECISA DE TESTE
// ===========================================================================
//
// Este sistema é vendido a outros negócios. Cada um põe o próprio nome, a
// própria cor e o próprio logo — e o comprador DELE nunca deveria encontrar
// vestígio nosso em lugar nenhum.
//
// O vazamento nunca aparece onde se olha. Não é o logo: é o título da aba na
// página de pagamento, o halo roxo embaixo de um botão laranja, o anel de foco
// de um campo. Coisas que ninguém confere ao instalar, e que o cliente descobre
// quando um comprador pergunta "que empresa é essa?".

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';

// O índigo da nossa instalação. Ele pode ser o PADRÃO em `tokens.css` — todo
// produto precisa de uma cor no primeiro dia — mas não pode estar cravado em
// nenhuma regra, onde a escolha do cliente não alcança.
const NOSSO_INDIGO = /rgba\(\s*79\s*,\s*70\s*,\s*229|#4f46e5/i;

test('nenhuma sombra, anel ou borda usa a nossa cor cravada', () => {
  for (const nome of readdirSync('styles').filter((f) => f.endsWith('.css'))) {
    // Comentários viram espaço do mesmo tamanho: explicar POR QUE a cor saiu
    // dali exige citar a cor, e o número da linha continua batendo com o editor.
    const css = readFileSync(`styles/${nome}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) =>
      c.replace(/[^\n]/g, ' '),
    );
    for (const [i, linha] of css.split('\n').entries()) {
      if (!NOSSO_INDIGO.test(linha)) continue;
      // A declaração do token padrão é o único lugar legítimo.
      const ehPadrao = /--cor-principal:|--grad-principal:|--cor-principal-2:/.test(linha);
      assert.ok(
        ehPadrao,
        `${nome}:${i + 1} tem a nossa cor cravada — o cliente de marca laranja ` +
          `herda um halo roxo:\n    ${linha.trim().slice(0, 120)}`,
      );
    }
  }
});

// ⚠️ ESTA É A PÁGINA QUE O COMPRADOR DO CLIENTE VÊ. O nome cravado aqui
// anunciava a nossa marca na aba do navegador, no meio do checkout dele.
// ⚠️ O TESTE DA PÁGINA PÚBLICA DE PAGAMENTO SAIU COM O GATEWAY.
//
// Ele cobrava que `oferta.html` e `base/oferta-publica.js` não cravassem o nome
// do nosso produto — a página de venda é a única que uma pessoa de fora abre, e
// era o lugar mais fácil de a marca de fábrica vazar num white-label.
//
// A regra continua valendo para quem construir a próxima: PÁGINA PÚBLICA TIRA
// O NOME DE `config/marca.js`, nunca do HTML. Ao criar a página de venda do
// meio de pagamento novo, traga este teste de volta apontando para ela.

// ⚠️ O NOME COBRADO SAI DE `config/marca.js`, e não de uma constante escrita
// aqui. Cravar o nome no teste faria ele parar de valer no primeiro produto que
// trocasse a marca — que é exatamente quando ele passa a importar.
test('a tela de entrada também sai da marca', () => {
  assert.match(readFileSync('base/login.js', 'utf8'), /MARCA\.nome/);

  const nome = (readFileSync('config/marca.js', 'utf8').match(/nome:\s*'([^']+)'/) || [])[1];
  assert.ok(nome, 'não achei o nome do produto em config/marca.js');
  assert.equal(
    readFileSync('login.html', 'utf8').includes(nome),
    false,
    `"${nome}" está cravado no HTML da tela de entrada — ele tem que vir da marca`,
  );
});
