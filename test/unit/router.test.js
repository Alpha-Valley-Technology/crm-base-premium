import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { parseHash, montarModulo } from '../../base/router.js';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;

test('parseHash extrai o id do módulo', () => {
  assert.deepEqual(parseHash('#/exemplo'), { id: 'exemplo', sub: null, partes: [] });
  assert.deepEqual(parseHash('#/contatos'), { id: 'contatos', sub: null, partes: [] });
});

test('parseHash extrai a ferramenta quando o endereço tem duas partes', () => {
  assert.deepEqual(parseHash('#/editorial/keywords'), {
    id: 'editorial',
    sub: 'keywords',
    partes: ['keywords'],
  });
  assert.deepEqual(parseHash('#/editorial/gerar-kw'), {
    id: 'editorial',
    sub: 'gerar-kw',
    partes: ['gerar-kw'],
  });
});

// A SOBRA DEIXOU DE SER LIXO.
//
// A carcaça parava em duas partes e descartava o resto. Uma aula precisa de
// dois identificadores — curso e aula —, e com o teto antigo ou o endereço
// deixava de ser compartilhável, ou os dois ids iam grudados num campo só.
test('parseHash entrega TODAS as partes depois do módulo', () => {
  assert.deepEqual(parseHash('#/cursos/aula/c7/a3'), {
    id: 'cursos',
    sub: 'aula',
    partes: ['aula', 'c7', 'a3'],
  });
});

// `sub` continua sendo `partes[0]`: todo módulo que já existia segue funcionando
// sem saber que isto mudou.
test('sub continua sendo a primeira parte, como sempre foi', () => {
  const r = parseHash('#/cursos/aula/c7/a3');
  assert.equal(r.sub, r.partes[0]);
});

test('interrogação e cerquilha param a leitura das partes', () => {
  assert.deepEqual(parseHash('#/cursos/aula?x=1'), { id: 'cursos', sub: 'aula', partes: ['aula'] });
});

test('parseHash devolve vazio quando não há hash', () => {
  assert.deepEqual(parseHash(''), { id: null, sub: null, partes: [] });
  assert.deepEqual(parseHash('#/'), { id: null, sub: null, partes: [] });
});

test('montarModulo monta a tela e chama onMudou', async () => {
  const container = document.createElement('div');
  let mudou = null;
  const mod = {
    id: 'x',
    montarTela: (c) => {
      c.textContent = 'oi';
    },
  };
  await montarModulo(mod, container, {}, (id) => {
    mudou = id;
  });
  assert.equal(mudou, 'x');
  assert.equal(container.textContent, 'oi');
});

test('montarModulo trata erro do montarTela e avisa o usuário', async () => {
  const container = document.createElement('div');
  let avisou = null;
  const mod = {
    id: 'y',
    montarTela: () => {
      throw new Error('boom');
    },
  };
  await montarModulo(
    mod,
    container,
    {
      avisar: (tipo) => {
        avisou = tipo;
      },
    },
    () => {},
  );
  assert.match(container.textContent, /não consegui/i);
  assert.equal(avisou, 'erro');
});

test('montarModulo repassa a ferramenta pro módulo e pro onMudou', async () => {
  const container = document.createElement('div');
  let rotaRecebida = null;
  let mudou = null;
  const mod = {
    id: 'editorial',
    montarTela: (c, s, rota) => {
      rotaRecebida = rota;
    },
  };
  await montarModulo(
    mod,
    container,
    {},
    (id, sub) => {
      mudou = `${id}/${sub}`;
    },
    'keywords',
    ['keywords'],
  );
  assert.deepEqual(rotaRecebida, { sub: 'keywords', partes: ['keywords'] });
  assert.equal(mudou, 'editorial/keywords');
});

// A rota da aula carrega dois identificadores — curso e aula — e os dois
// precisam chegar inteiros ao módulo, senão o endereço da aula deixa de ser
// compartilhável.
test('montarModulo entrega TODAS as partes da rota ao módulo', async () => {
  const container = document.createElement('div');
  let rota = null;
  const mod = {
    id: 'cursos',
    montarTela: (c, s, r) => {
      rota = r;
    },
  };
  await montarModulo(mod, container, {}, null, 'aula', ['aula', 'c7', 'a3']);
  assert.deepEqual(rota, { sub: 'aula', partes: ['aula', 'c7', 'a3'] });
});

// O menu marca o MÓDULO, não a aula: `onMudou` continua recebendo só id e sub.
// Passar as partes para ele acenderia um item de menu diferente a cada aula.
test('o menu continua sendo avisado só do módulo e da ferramenta', async () => {
  const container = document.createElement('div');
  const recebido = [];
  const mod = { id: 'cursos', montarTela: () => {} };
  await montarModulo(mod, container, {}, (...args) => recebido.push(args), 'aula', [
    'aula',
    'c7',
    'a3',
  ]);
  assert.deepEqual(recebido, [['cursos', 'aula']]);
});

// ===========================================================================
// A FAXINA DA TELA QUE SAIU
// ===========================================================================
//
// `container.innerHTML = ''` tira os elementos e mais nada: o que a tela
// anterior tiver deixado ligado — relógio, escuta, conexão — continua rodando
// contra um pedaço de página que não existe mais. Trocar de tela dez vezes
// acumula dez.
//
// Isto apareceu como um TESTE QUE NÃO TERMINAVA: a tela Ao Vivo marcava um
// relógio de até seis horas e o processo ficava vivo esperando por ele. O
// travamento era a prova do vazamento.

test('a tela que sai é desligada antes de a próxima entrar', async () => {
  const container = document.createElement('div');
  const ordem = [];

  const comFaxina = {
    id: 'a',
    montarTela: (c) => {
      ordem.push('montou a');
      return () => ordem.push('desligou a');
    },
  };
  const seguinte = {
    id: 'b',
    montarTela: () => {
      ordem.push('montou b');
    },
  };

  await montarModulo(comFaxina, container, {}, null);
  await montarModulo(seguinte, container, {}, null);

  assert.deepEqual(
    ordem,
    ['montou a', 'desligou a', 'montou b'],
    'a faxina roda ANTES da próxima montar, e não depois',
  );
});

// Quem não tem nada para desligar não devolve nada — e nada muda.
test('tela sem faxina continua funcionando igual', async () => {
  const container = document.createElement('div');
  const simples = {
    id: 'x',
    montarTela: (c) => {
      c.textContent = 'oi';
    },
  };
  await montarModulo(simples, container, {}, null);
  await montarModulo(simples, container, {}, null);
  assert.equal(container.textContent, 'oi');
});

// Faxina que estoura não pode impedir a próxima tela de abrir: o estrago seria
// trocar um vazamento por uma tela em branco.
test('faxina que falha não derruba a navegação', async () => {
  const container = document.createElement('div');
  const quebrada = {
    id: 'q',
    montarTela: () => () => {
      throw new Error('boom');
    },
  };
  const boa = {
    id: 'b',
    montarTela: (c) => {
      c.textContent = 'abriu';
    },
  };

  await montarModulo(quebrada, container, {}, null);
  await montarModulo(boa, container, {}, null);
  assert.equal(container.textContent, 'abriu');
});
