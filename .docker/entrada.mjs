// O que acontece quando o container sobe. Roda dentro do container, nunca fora.
//
// ===========================================================================
// A REGRA QUE ESTE ARQUIVO EXISTE PARA CUMPRIR
// ===========================================================================
//
// **O ambiente local não altera NENHUMA configuração do Firebase.**
//
// `firebase.json`, `.firebaserc` e `base/firebase.js` são de homologação e de
// produção. Se subir local exigisse editá-los, toda sessão de trabalho
// começaria mexendo neles e terminaria com o risco de a config de brincadeira
// viajar para o ar — que é exatamente o acidente que a matriz documenta em
// `docs/RETOMAR-AQUI.md`: "o produto seguinte escreveria no banco do vizinho".
//
// Então o local LÊ essas configurações e não escreve em nenhuma delas.
//
// Isso funciona por causa de `base/env.js`: em `localhost`, o SDK é
// redirecionado para 127.0.0.1 e NADA sai para o Google. As chaves de produção
// podem continuar carregadas — elas não são usadas. A única coisa que precisa
// bater é o `projectId`, porque é o nome da gaveta onde o emulador guarda os
// dados; por isso ele é lido daqui, e não escrito à mão.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

import { garantirDependencias } from './dependencias.mjs';

const RAIZ = '/app';

// ⚠️ O DESPEJO VAI NUMA SUBPASTA DO VOLUME, e não no volume.
//
// MEDIDO, não suposto: o `firebase` APAGA a pasta de destino antes de gravar o
// despejo. `/dados` é o ponto de montagem do volume do Docker, e ponto de
// montagem não se apaga — o resultado é `Export failed: EBUSY: resource busy or
// locked, rmdir '/dados'`, e o banco da tarde inteira não é guardado.
// `/dados/despejo` é pasta comum dentro do volume: apagar e recriar funciona.
const VOLUME = '/dados';
const DESPEJO = '/dados/despejo';

// O nome começa com ponto DE PROPÓSITO: a lista `ignore` do `firebase.json`
// tem `**/.*`, então este arquivo nunca é publicado junto com o site, sem que
// ninguém precise lembrar de acrescentá-lo em lugar nenhum.
const CONFIG_LOCAL = `${RAIZ}/.firebase.docker.json`;

function aviso(texto) {
  console.log(`\n  ${texto}`);
}

function morrer(texto) {
  console.error(`\n  AMBIENTE LOCAL NÃO SUBIU\n\n  ${texto}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Qual é o projeto — lido, nunca inventado
// ---------------------------------------------------------------------------
//
// A ordem importa. `base/firebase.js` vem primeiro porque é ele que o NAVEGADOR
// carrega: se o emulador subisse com outro nome, o site gravaria numa gaveta e
// o painel do emulador mostraria outra, vazia — e a pessoa passaria a tarde
// procurando o dado que ela mesma acabou de salvar.
function descobrirProjeto() {
  if (process.env.PROJETO_LOCAL) {
    return { id: process.env.PROJETO_LOCAL, origem: 'a variável PROJETO_LOCAL' };
  }

  const fonte = `${RAIZ}/base/firebase.js`;
  if (existsSync(fonte)) {
    // Expressão regular, e não `import`: o arquivo importa o SDK de
    // `https://www.gstatic.com`, e o Node não sabe importar de endereço web —
    // tentar carregá-lo estoura antes de chegar na configuração.
    const achado = readFileSync(fonte, 'utf8').match(/projectId:\s*['"]([^'"]+)['"]/);
    if (achado) return { id: achado[1], origem: 'base/firebase.js' };
  }

  const rc = `${RAIZ}/.firebaserc`;
  if (existsSync(rc)) {
    const padrao = JSON.parse(readFileSync(rc, 'utf8'))?.projects?.default;
    if (padrao) return { id: padrao, origem: '.firebaserc' };
  }

  return morrer(
    'Não achei o nome do projeto. Preencha `projectId` em `base/firebase.js`\n' +
      '  (é o que o navegador usa), ou defina PROJETO_LOCAL em `.docker/.env`.',
  );
}

// ---------------------------------------------------------------------------
// 2. A configuração do emulador, DERIVADA do firebase.json
// ---------------------------------------------------------------------------
//
// Uma única coisa muda: cada emulador passa a escutar em 0.0.0.0.
//
// POR QUE, e por que isso NÃO é abrir a sua máquina para a rede: dentro do
// container, `127.0.0.1` é o container — quem escuta ali não é alcançável de
// fora, e o navegador da sua máquina bateria numa porta muda. Quem decide a
// exposição de verdade é o `compose.yml`, que publica cada porta como
// `127.0.0.1:PORTA` — ou seja, só o seu computador enxerga. O alcance final é o
// mesmo de rodar `npm run emu` direto na máquina.
//
// E é DERIVADA em vez de copiada porque cópia diverge: no dia em que alguém
// mudar uma porta no `firebase.json`, o local continuaria falando com a antiga.
function gerarConfig() {
  const original = `${RAIZ}/firebase.json`;
  if (!existsSync(original)) morrer('Não achei `firebase.json` na raiz do projeto.');

  const config = JSON.parse(readFileSync(original, 'utf8'));
  const emuladores = { ...(config.emulators ?? {}) };

  // O `hub` é como as ferramentas do Firebase acham os emuladores que estão de
  // pé. Ele não aparece no `firebase.json` (fica no padrão), e sem host próprio
  // ficaria preso dentro do container.
  emuladores.hub = { port: 4400, ...(emuladores.hub ?? {}) };

  for (const [nome, valor] of Object.entries(emuladores)) {
    // `singleProjectMode` mora aqui e é um booleano, não um emulador.
    if (valor && typeof valor === 'object') emuladores[nome] = { ...valor, host: '0.0.0.0' };
  }

  config.emulators = emuladores;
  liberarEmuladoresNaCSP(config, emuladores);

  try {
    writeFileSync(CONFIG_LOCAL, `${JSON.stringify(config, null, 2)}\n`);
  } catch (erro) {
    morrer(
      `Não consegui escrever \`.firebase.docker.json\` na pasta do projeto (${erro.code}).\n` +
        '  No Docker Desktop, confira Settings › Resources › File sharing.',
    );
  }
}

// ---------------------------------------------------------------------------
// 2b. A CSP precisa conhecer os emuladores — ou o login morre "sem conexão"
// ---------------------------------------------------------------------------
//
// MEDIDO em 08/09/2026, e vale contra o que estava escrito: o emulador de
// hosting do `firebase-tools` 15 **APLICA** o bloco `headers` do `firebase.json`
// (o playbook 5.2 dizia que ele ignorava; deixou de ser verdade).
//
// O sintoma: a página abre bonita em `localhost:5000`, você digita email e
// senha, e volta **"Sem conexão. Confira a internet e tente de novo."** Não é a
// internet. É a CSP: `connect-src` permite `'self'` e domínios do Google, e o
// emulador de login mora em `http://127.0.0.1:9099` — outra origem. O navegador
// bloqueia a chamada, o SDK devolve `auth/network-request-failed`, e a mensagem
// manda a pessoa conferir o Wi-Fi.
//
// ⚠️ A CORREÇÃO NÃO É APAGAR A CSP. Desligá-la no local esconderia justamente a
// classe de defeito que ela existe para pegar — e o playbook 5.2 é sobre isso.
// O que fazemos é ACRESCENTAR as origens dos emuladores, e só elas: as portas
// saem do próprio `firebase.json`, então nada é escrito à mão e nada sobra.
// Tudo o mais da política continua valendo em `localhost` igual ao que vale
// publicado.
//
// `img-src` e `media-src` entram junto porque capa, logo e vídeo vêm do
// emulador de arquivos; `frame-src`, porque o login do Google usa a janela
// servida pelo emulador de contas.
function liberarEmuladoresNaCSP(config, emuladores) {
  const blocos = config.hosting?.headers;
  if (!Array.isArray(blocos)) return;

  const portas = ['auth', 'firestore', 'functions', 'storage']
    .map((nome) => emuladores[nome]?.port)
    .filter(Boolean);
  if (!portas.length) return;

  // `127.0.0.1` e `localhost` são origens DIFERENTES para o navegador. O site
  // pode ser aberto por qualquer um dos dois, e o SDK fala com `127.0.0.1`.
  const origens = portas.flatMap((porta) => [
    `http://127.0.0.1:${porta}`,
    `http://localhost:${porta}`,
    `ws://127.0.0.1:${porta}`,
    `ws://localhost:${porta}`,
  ]);

  const ALVOS = ['connect-src', 'img-src', 'media-src', 'frame-src'];

  for (const bloco of blocos) {
    for (const cabecalho of bloco.headers ?? []) {
      if (cabecalho.key?.toLowerCase() !== 'content-security-policy') continue;
      cabecalho.value = cabecalho.value
        .split(';')
        .map((diretiva) => {
          const nome = diretiva.trim().split(/\s+/)[0];
          return ALVOS.includes(nome) ? `${diretiva.trimEnd()} ${origens.join(' ')}` : diretiva;
        })
        .join(';');
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Subir — e principalmente: DESCER SEM PERDER O BANCO
// ---------------------------------------------------------------------------
//
// `--export-on-exit` só grava se o `firebase` receber o pedido de parada. O
// Docker manda SIGTERM para o processo 1 — que é este arquivo, não o emulador.
// Sem repassar o sinal, `docker compose down` mata tudo de uma vez e o trabalho
// da tarde inteira vai embora em silêncio, que é o jeito mais caro de descobrir
// que faltava um `kill`.
function subir(projeto) {
  mkdirSync(VOLUME, { recursive: true });

  const args = ['emulators:start', '--config', CONFIG_LOCAL, '--project', projeto];

  // Importar de uma pasta que não existe dá erro. Na primeira vez ela não
  // existe mesmo — e isso é o normal, não é defeito.
  if (existsSync(DESPEJO) && readdirSync(DESPEJO).length > 0) {
    args.push('--import', DESPEJO);
    aviso('Trazendo de volta o banco local da última vez.');
  } else {
    aviso('Banco local vazio — quem entrar primeiro vira admin (é o esperado).');
  }
  args.push('--export-on-exit', DESPEJO);

  // ⚠️ A PASTA DE TRABALHO É O VOLUME, e não o projeto. MEDIDO em 08/09/2026.
  //
  // O `firebase` monta o despejo numa pasta temporária `firebase-export-<...>`
  // criada na PASTA DE TRABALHO, e só então a move para o destino. Com a pasta
  // de trabalho no projeto (que está montado), um despejo que falhe no meio
  // deixa essa temporária na raiz — e o `npm run portao` passa a **barrar o
  // deploy** por árvore suja, sem que ninguém ligue uma coisa à outra.
  //
  // Dentro do volume, a temporária nasce ao lado do destino: nunca toca o
  // projeto, e a mudança de lugar deixa de atravessar sistemas de arquivo.
  //
  // Os caminhos do projeto não dependem disto: quem os resolve é a pasta do
  // `--config`, que é absoluta.
  const filho = spawn('firebase', args, { cwd: VOLUME, stdio: 'inherit' });

  let encerrando = false;
  function encerrar() {
    if (encerrando) return;
    encerrando = true;
    aviso('Guardando o banco local antes de desligar…');

    // ⚠️ SIGINT, e não o sinal que chegou. MEDIDO, não suposto: com SIGTERM o
    // `firebase` morre na hora e o despejo NÃO acontece — o volume fica vazio e
    // ninguém é avisado. Quem dispara o `--export-on-exit` é o caminho do
    // Ctrl+C, que é SIGINT. O Docker manda SIGTERM; a tradução é aqui.
    filho.kill('SIGINT');

    // Rede de segurança: se ele travar no meio do despejo, o Docker mataria o
    // container inteiro aos 45s (`stop_grace_period`) sem dizer por quê.
    // Melhor desistir antes, e em voz alta.
    setTimeout(() => {
      aviso('O emulador não desligou sozinho em 40s — encerrando à força.');
      filho.kill('SIGKILL');
    }, 40_000).unref();
  }

  for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, encerrar);

  filho.on('exit', (codigo, sinal) => {
    process.exit(codigo ?? (sinal ? 1 : 0));
  });
}

const projeto = descobrirProjeto();
aviso(`Projeto local: ${projeto.id}  (lido de ${projeto.origem})`);
gerarConfig();
garantirDependencias(`${RAIZ}/functions`, 'das Functions');
subir(projeto.id);
