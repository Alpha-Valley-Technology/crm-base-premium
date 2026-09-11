import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import {
  soDigitos,
  numeroCompleto,
  linkDoWhatsapp,
  linkDoContato,
  criarBotoesDeContato,
  CONTATOS,
  CAMPOS,
  CAMINHO_CONTATOS,
  TETO_WHATSAPP,
  TETO_MENSAGEM,
  CONTATOS_SEMENTE,
  lerContatos,
} from '../../base/suporte.js';

const dom = new JSDOM('<!doctype html><body></body>');
const documento = dom.window.document;

const contatoDe = (chave) => CONTATOS.find((c) => c.chave === chave);

test('tira tudo que não é dígito do jeito que a pessoa digita', () => {
  assert.equal(soDigitos('(11) 99999-9999'), '11999999999');
  assert.equal(soDigitos('+55 11 99999 9999'), '5511999999999');
  assert.equal(soDigitos(''), '');
  assert.equal(soDigitos(null), '');
  assert.equal(soDigitos(undefined), '');
});

test('O 55 É POSTO QUANDO FALTA — é o erro número 1 de quem preenche', () => {
  // Digitar o número como se fala e o link abrir conversa com ninguém é a
  // falha mais comum, e ela não avisa: o WhatsApp só mostra uma tela vazia.
  assert.equal(numeroCompleto('(11) 99999-9999'), '5511999999999'); // 11 dígitos
  assert.equal(numeroCompleto('11 3333-4444'), '551133334444'); // 10 dígitos
});

test('número que JÁ tem país é deixado em paz', () => {
  assert.equal(numeroCompleto('+55 11 99999-9999'), '5511999999999');
  assert.equal(numeroCompleto('5511999999999'), '5511999999999');
  // Estrangeiro: 12 dígitos, fora da faixa brasileira sem DDI — não recebe 55.
  assert.equal(numeroCompleto('351912345678'), '351912345678');
});

test('número curto demais não vira brasileiro por acidente', () => {
  // 9 dígitos não é celular nem fixo com DDD. Pôr 55 aqui inventaria um número.
  assert.equal(numeroCompleto('999999999'), '999999999');
});

test('SEM NÚMERO NÃO HÁ LINK — é isso que faz o botão sumir', () => {
  // Botão verde que não leva a lugar nenhum é pior que botão nenhum: quem
  // clica nele já estava com problema para entrar.
  assert.equal(linkDoWhatsapp(null), '');
  assert.equal(linkDoWhatsapp({}), '');
  assert.equal(linkDoWhatsapp({ whatsapp: '' }), '');
  assert.equal(linkDoWhatsapp({ whatsapp: '   ' }), '');
  assert.equal(linkDoWhatsapp({ whatsapp: 'sem número nenhum' }), '');
  assert.equal(linkDoWhatsapp({ mensagem: 'oi' }), '', 'mensagem sozinha não faz botão');
});

test('o link monta com o número completo e a mensagem escapada', () => {
  const link = linkDoWhatsapp({ whatsapp: '(11) 99999-9999', mensagem: 'Olá, preciso de ajuda' });
  assert.equal(link, 'https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda');
});

test('mensagem com acento, & e quebra de linha não quebra o endereço', () => {
  // Texto de gente vai para dentro de uma URL. Sem escapar, um "&" cortaria a
  // mensagem no meio e o resto viraria outro parâmetro.
  const link = linkDoWhatsapp({ whatsapp: '5511999999999', mensagem: 'Ajuda & suporte\nurgente' });
  assert.ok(!link.includes('&suporte'), 'o & foi escapado');
  assert.ok(!link.includes('\n'), 'a quebra de linha foi escapada');
  assert.ok(link.startsWith('https://wa.me/5511999999999?text='));
});

test('sem mensagem, o link abre a conversa em branco', () => {
  assert.equal(linkDoWhatsapp({ whatsapp: '5511999999999' }), 'https://wa.me/5511999999999');
  assert.equal(
    linkDoWhatsapp({ whatsapp: '5511999999999', mensagem: '   ' }),
    'https://wa.me/5511999999999',
  );
});

test('os tetos batem com os que a regra do banco confere', () => {
  // Se divergirem, a tela deixa gravar o que o banco vai recusar — e o erro
  // que a pessoa vê é o do Firestore, cru, em inglês.
  assert.equal(TETO_WHATSAPP, 20);
  assert.equal(TETO_MENSAGEM, 300);
});

// ---- Os contatos: suporte e financeiro ----

test('O CAMPO DO SUPORTE CONTINUA SENDO `whatsapp` puro', () => {
  // Os produtos que já estão no ar gravaram `whatsapp`/`mensagem`. Trocar por
  // `suporteWhatsapp` faria o botão de suporte sumir de todos eles no dia da
  // atualização, sem ninguém ter mexido em nada.
  assert.equal(contatoDe('suporte').campoWhatsapp, 'whatsapp');
  assert.equal(contatoDe('suporte').campoMensagem, 'mensagem');
  assert.deepEqual(CAMINHO_CONTATOS, ['publico', 'suporte']);
});

test('a lista de campos é exatamente a que a regra do banco aceita', () => {
  // O gêmeo desta lista está no `firestore.rules`, no `hasOnly`. Divergir =
  // painel salvando e banco recusando com erro cru na cara de quem preencheu.
  assert.deepEqual(CAMPOS, ['whatsapp', 'mensagem', 'financeiroWhatsapp', 'financeiroMensagem']);
});

test('cada contato lê o próprio par de campos, sem trocar um pelo outro', () => {
  const dados = {
    whatsapp: '11999999999',
    mensagem: 'Suporte',
    financeiroWhatsapp: '1133334444',
    financeiroMensagem: 'Quero pagar',
  };
  assert.equal(
    linkDoContato(dados, contatoDe('suporte')),
    'https://wa.me/5511999999999?text=Suporte',
  );
  assert.equal(
    linkDoContato(dados, contatoDe('financeiro')),
    'https://wa.me/551133334444?text=Quero%20pagar',
  );
});

test('OS BOTÕES SAEM NA ORDEM: Suporte, depois Financeiro', () => {
  // A ordem é a da pilha na tela de entrada: entrar, pedir ajuda, pagar.
  const botoes = criarBotoesDeContato(
    {
      whatsapp: '11999999999',
      financeiroWhatsapp: '1133334444',
    },
    documento,
  );
  assert.deepEqual(
    botoes.map((b) => b.textContent),
    ['Suporte', 'Financeiro'],
  );
  assert.deepEqual(
    botoes.map((b) => b.id),
    ['bt-suporte', 'bt-financeiro'],
  );
});

test('SÓ SAI O BOTÃO DE QUEM TEM NÚMERO — um não arrasta o outro', () => {
  // O caso comum de produto recém-ligado: cadastraram o suporte e ainda não o
  // financeiro. O botão sem número tem que sumir sozinho.
  const soSuporte = criarBotoesDeContato({ whatsapp: '11999999999' }, documento);
  assert.deepEqual(
    soSuporte.map((b) => b.textContent),
    ['Suporte'],
  );

  const soFinanceiro = criarBotoesDeContato({ financeiroWhatsapp: '1133334444' }, documento);
  assert.deepEqual(
    soFinanceiro.map((b) => b.textContent),
    ['Financeiro'],
  );

  assert.deepEqual(criarBotoesDeContato(null, documento), [], 'sem documento nenhum: pilha vazia');
  assert.deepEqual(criarBotoesDeContato({}, documento), [], 'documento vazio: pilha vazia');
  assert.deepEqual(
    criarBotoesDeContato({ mensagem: 'oi' }, documento),
    [],
    'mensagem sem número não faz botão',
  );
});

test('todo botão abre em outra aba e SEM dar o controle desta', () => {
  // Sem `noopener`, a página aberta ganha `window.opener` e consegue trocar o
  // endereço desta aba — a manobra clássica de fingir uma tela de login. Esta
  // É a tela de login.
  for (const b of criarBotoesDeContato(
    { whatsapp: '11999999999', financeiroWhatsapp: '1133334444' },
    documento,
  )) {
    assert.equal(b.target, '_blank');
    assert.ok(b.rel.includes('noopener'), `${b.textContent}: faltou noopener`);
    assert.ok(b.rel.includes('noreferrer'), `${b.textContent}: faltou noreferrer`);
    assert.ok(b.className.includes('btn'), `${b.textContent}: tem que parecer botão`);
  }
});

// ---------------------------------------------------------------------------
// A SEMENTE: instalação nova nasce com os botões à vista
// ---------------------------------------------------------------------------
//
// ⚠️ O DEFEITO QUE ISTO CONSERTA ERA INVISÍVEL. Cada botão de contato só
// aparece se houver número, e numa carcaça recém-instalada não há — então a
// tela de entrada nascia sem eles, sem nenhuma pista de que existem. Quem monta
// o produto não descobre um recurso que não está na tela: entregava ao cliente
// com o suporte simplesmente ausente da entrada.
//
// E a parte difícil não é mostrar a semente: é conseguir APAGAR o número
// depois. Se a semente valesse sempre que os campos estivessem vazios, o botão
// que o dono acabou de tirar voltaria na leitura seguinte, para sempre.

const bancoFalso = (existe, dados) => ({
  firestore: {
    doc: () => ({}),
    getDoc: async () => ({ exists: () => existe, data: () => dados }),
  },
});

test('instalação nova traz os dois botões, com número de mentira', async () => {
  const { firestore } = bancoFalso(false, null);
  const dados = await lerContatos({}, firestore);

  assert.equal(dados.whatsapp, CONTATOS_SEMENTE.whatsapp);
  assert.equal(dados.financeiroWhatsapp, CONTATOS_SEMENTE.financeiroWhatsapp);

  const botoes = criarBotoesDeContato(dados, documento);
  assert.deepEqual(
    botoes.map((b) => b.textContent),
    ['Suporte', 'Financeiro'],
    'os dois têm que aparecer sem ninguém configurar nada',
  );
});

// ⚠️ O NÚMERO DA SEMENTE PRECISA SER IMPOSSÍVEL DE CONFUNDIR COM UM DE VERDADE.
//
// Fosse plausível, alguém publicaria o produto sem trocar — e um desconhecido
// passaria a receber as mensagens de suporte de um cliente pagante.
test('o número da semente é claramente falso', () => {
  for (const n of [CONTATOS_SEMENTE.whatsapp, CONTATOS_SEMENTE.financeiroWhatsapp]) {
    assert.match(n, /90000-0000/, 'nove seguido de zeros não existe em lugar nenhum');
  }
});

test('apagar o número tira o botão — a semente NÃO volta', async () => {
  // O documento EXISTE e está vazio: alguém apagou de propósito.
  const { firestore } = bancoFalso(true, { whatsapp: '', financeiroWhatsapp: '' });
  const dados = await lerContatos({}, firestore);

  assert.equal(dados.whatsapp, '', 'a escolha de apagar tem que ser respeitada');
  assert.deepEqual(
    criarBotoesDeContato(dados, documento),
    [],
    'sem número não há botão — senão apagar seria impossível',
  );
});

test('apagar só um deixa o outro de pé', async () => {
  const { firestore } = bancoFalso(true, { whatsapp: '11 98888-7777', financeiroWhatsapp: '' });
  const botoes = criarBotoesDeContato(await lerContatos({}, firestore), documento);
  assert.deepEqual(
    botoes.map((b) => b.textContent),
    ['Suporte'],
  );
});
