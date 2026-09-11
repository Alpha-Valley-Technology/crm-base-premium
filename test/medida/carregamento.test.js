// AS PÁGINAS CARREGAM INTEIRAS — nenhum arquivo pedido volta 404.
//
// ===========================================================================
// POR QUE ISTO PRECISOU EXISTIR
// ===========================================================================
//
// Um módulo que não carrega NÃO QUEBRA A PÁGINA. Ele some.
//
// O navegador pede o arquivo, leva 404, desiste do grafo de módulos INTEIRO e
// segue em frente. A tela continua de pé, bonita, com todos os botões
// desenhados — e nenhum deles ligado a coisa alguma. Não há tela vermelha, não
// há alerta: só uma linha no console que ninguém abre.
//
// Aconteceu, e em produção. O script da entrada saiu de dentro do `login.html`
// para um arquivo próprio (`base/login.js`) — mudança boa, é ela que permite
// uma política de segurança sem `unsafe-inline` — mas os caminhos vieram junto
// sem serem recalculados. `./base/auth.js`, certo para uma página na raiz,
// virou `/base/base/auth.js` para um arquivo dentro de `base/`.
//
// O estrago: os botões de Suporte e Financeiro sumiram da tela de entrada, e
// NENHUMA das três formas de entrar respondia ao clique. Quem deslogou não
// conseguiu voltar. A suíte inteira ficou verde o tempo todo — os testes liam o
// HTML, achavam os botões escritos lá, e passavam.
//
// `test/unit/importacoes-existem.test.js` cobra a mesma coisa lendo os arquivos,
// e custa milissegundos. Este aqui é a rede embaixo: ele cobra o que a página
// REALMENTE pede ao servidor, incluindo o que nenhuma leitura de código prevê.

import { test, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { PAGINAS, PORTA_CARREGAMENTO, subirServidor, abrirEDespejar } from './_servidor.js';

const servidor = subirServidor(PORTA_CARREGAMENTO);
after(() => servidor.parar());

const abrir = (pagina) => abrirEDespejar(pagina, { porta: servidor.porta });

test('nenhuma página pede um arquivo que não existe', () => {
  for (const [pagina, oQueE] of PAGINAS) {
    servidor.esquecer();
    abrir(pagina);
    assert.deepEqual(
      servidor.faltaram(),
      [],
      `${oQueE} (${pagina}) pede arquivo que não existe:\n    ` +
        `${servidor.faltaram().join('\n    ')}`,
    );
  }
});

// ⚠️ O TESTE ACIMA NÃO BASTA SOZINHO.
//
// Ele prova que os arquivos existem. Não prova que o módulo RODOU: um erro de
// sintaxe, um import circular ou uma exceção no topo do arquivo derrubam o
// grafo inteiro com todos os 200 no lugar.
//
// A prova de que rodou precisa ser uma marca que só o JavaScript deixa. Na tela
// de entrada essa marca é o título da aba: o HTML nasce com "Entrar", neutro de
// propósito, e a primeira coisa que `base/login.js` faz é trocá-lo pelo nome do
// produto. Título trocado é módulo vivo.
// ⚠️ SÓ RODA COM O FIREBASE CONFIGURADO, e o pulo é de propósito.
//
// A matriz nasce com `base/firebase.js` VAZIO, e ele estoura na primeira tela
// quando está assim — é a trava que impede um produto novo de escrever no banco
// do produto anterior (ver o comentário lá). Enquanto ninguém preencheu, a
// entrada não chega a rodar, e este teste não teria o que medir.
//
// Ele pula com recado em vez de reprovar: carcaça recém-clonada com a suíte
// vermelha ensina a ignorar a suíte. E volta a valer sozinho no minuto em que
// alguém configurar o projeto — que é exatamente quando ele passa a importar.
const semFirebase = !/projectId:\s*'[^']+'/.test(readFileSync('base/firebase.js', 'utf8'));

test(
  'o script da tela de entrada realmente roda',
  {
    skip: semFirebase && 'base/firebase.js ainda não foi preenchido — configure o projeto',
  },
  () => {
    const marca = readFileSync('config/marca.js', 'utf8');
    const nome = (marca.match(/nome\s*:\s*['"]([^'"]+)['"]/) || [])[1];
    assert.ok(nome, 'não achei o nome do produto em config/marca.js');

    const dom = abrir('login.html');
    const titulo = (dom.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    assert.match(
      titulo,
      new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `o título da aba ficou em "${titulo.trim()}" — o módulo da entrada não chegou a rodar`,
    );
  },
);
