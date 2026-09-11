// AS PÁGINAS DE VERDADE, COM OS CABEÇALHOS DE VERDADE, NUM NAVEGADOR DE VERDADE.
//
// O emulador de hosting do Firebase ignora o bloco `headers` do `firebase.json`,
// então ele não prova nada sobre a política de segurança nem sobre o que o
// navegador consegue buscar. Este módulo sobe um servidor que entrega os
// arquivos do projeto com os cabeçalhos lidos do próprio `firebase.json` — a
// única cópia que existe deles — e abre as páginas no Chrome sem interface.
//
// ===========================================================================
// ⚠️ POR QUE O SERVIDOR RODA NUM PROCESSO SEPARADO
// ===========================================================================
//
// Esta é a armadilha que custou caro, e ela não é óbvia.
//
// `execFileSync` PARA O EVENT LOOP do Node até o programa filho terminar. Um
// servidor HTTP criado no mesmo processo do teste vive nesse event loop — logo,
// enquanto o navegador está aberto, o servidor NÃO ATENDE NINGUÉM. O navegador
// pede a página, ninguém responde, ele desiste e desenha a PÁGINA DE ERRO DELE.
//
// E a página de erro é um DOM válido. Um teste que só procure uma etiqueta lá
// dentro passa, contente, sem nunca ter visto o site.
//
// Isso não falha sempre: o sistema operacional segura a conexão numa fila, e se
// o navegador levar tempo suficiente para chegar até a requisição, às vezes dá
// certo. "Às vezes" é o pior resultado possível num teste — ele fica verde na
// máquina de quem escreveu e vermelho na de quem herdou, e ninguém confia mais
// em nenhum dos dois.
//
// Com o servidor num processo próprio, o event loop dele é dele. Não há
// corrida, não há sorte, e o teste passa a medir o site em vez de medir o
// tempo de partida do navegador.

import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { acharNavegador } from './_navegador.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FILHO = join(AQUI, '_servidor-filho.js');

// Os pontos de entrada do sistema.
//
// ⚠️ A PÁGINA PÚBLICA DE PAGAMENTO SAIU com o gateway, e ela era a mais
// importante das três: a única que uma pessoa de fora abre, e a única onde uma
// falha custa uma venda. Ao criar a página de venda do meio de pagamento novo,
// ACRESCENTE ELA AQUI — senão ela nasce sem cobertura de CSP e sem cobertura
// de arquivo faltando, que são justamente os dois defeitos que já derrubaram o
// login em produção.
export const PAGINAS = [
  ['login.html', 'a tela de entrada'],
  ['index.html', 'a área logada'],
];

// ⚠️ UMA PORTA POR ARQUIVO DE TESTE. O executor do Node roda os arquivos em
// paralelo, e dois servidores na mesma porta dão `EADDRINUSE` — uma falha que
// aparece e some conforme a máquina.
export const PORTA_CSP = 8899;
export const PORTA_CARREGAMENTO = 8898;

// ⚠️ UM NOME DE HOST QUE NÃO É `localhost`, de propósito.
//
// O código troca de endereço quando reconhece a máquina local: em `127.0.0.1`
// ele fala com o emulador, e o emulador não é o que vai ao ar. Testar por lá
// aprovaria uma configuração que quebra em produção.
export const HOST = 'teste.exemplo';

// A política que vai ao ar, lida de onde ela realmente mora.
export function cabecalhosDoProjeto() {
  const cfg = JSON.parse(readFileSync('firebase.json', 'utf8'));
  const bloco = (cfg.hosting.headers || []).find((b) => b.source === '**');
  assert.ok(bloco, 'firebase.json precisa de um bloco de cabeçalhos para `**`');
  return bloco.headers;
}

// Espera sem devolver o controle ao event loop — que é justamente o que não
// temos aqui. `Atomics.wait` é a única pausa síncrona que o Node oferece.
function dormir(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Sobe o servidor num processo próprio e só devolve quando ele estiver
// atendendo. Quem chama fecha com `parar()`.
export function subirServidor(porta) {
  const pasta = mkdtempSync(join(tmpdir(), 'medida-servidor-'));
  const registro = join(pasta, 'faltaram.txt');
  const marcaDePronto = join(pasta, 'pronto');
  writeFileSync(registro, '');

  const filho = spawn(
    process.execPath,
    [FILHO, String(porta), registro, marcaDePronto, resolve('.')],
    { stdio: 'ignore' },
  );

  for (let esperei = 0; esperei < 10000 && !existsSync(marcaDePronto); esperei += 50) dormir(50);
  if (!existsSync(marcaDePronto)) {
    filho.kill();
    rmSync(pasta, { recursive: true, force: true });
    throw new Error(`o servidor de teste não subiu na porta ${porta} — ela já está ocupada?`);
  }

  return {
    porta,
    // Tudo que a página pediu e não existe. Lido do arquivo, e não de um cano:
    // o processo de teste esteve parado o tempo todo em que o navegador rodou.
    faltaram: () => readFileSync(registro, 'utf8').split('\n').filter(Boolean),
    esquecer: () => writeFileSync(registro, ''),
    parar: () => {
      filho.kill();
      rmSync(pasta, { recursive: true, force: true });
    },
  };
}

// Abre a página no Chrome sem interface e devolve o DOM depois que ela assentou.
export function abrirEDespejar(caminho, { porta = PORTA_CSP, milissegundos = 12000 } = {}) {
  const r = spawnSync(
    acharNavegador(),
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      `--virtual-time-budget=${milissegundos}`,
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
      '--dump-dom',
      `http://${HOST}:${porta}/${caminho}`,
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );

  assert.ok(!r.error, `o navegador não abriu: ${r.error && r.error.message}`);
  const dom = r.stdout || '';

  // ⚠️ A PÁGINA DE ERRO DO CHROME TAMBÉM É UM DOM VÁLIDO, e passaria por
  // qualquer teste que apenas procure uma etiqueta dentro dela. O título dela é
  // o nome do host — e o nosso host de teste nunca é título de página nossa.
  assert.ok(
    !new RegExp(`<title>\\s*${HOST}\\s*</title>`).test(dom),
    `o navegador não conseguiu abrir ${caminho}: veio a página de erro dele, e não o site. ` +
      'O servidor de teste não estava atendendo.',
  );
  return dom;
}
