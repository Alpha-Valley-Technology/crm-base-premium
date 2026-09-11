import { test } from 'node:test';
import assert from 'node:assert';
import {
  vejoTodosOsProjetos,
  alcancaProjeto,
  ehResponsavelPeloProjeto,
  fatiar,
  projetosDoUsuario,
  listarComEscopo,
  LIMITE_IN,
} from '../../base/escopo.js';
import * as servidor from '../../functions/_lib/escopo.js';
import { ESCOPO } from '../../config/marca.js';

// A carcaça não chuta nome de coleção — quem declara é o produto. Aqui um
// produto fictício, para os testes de busca terem onde procurar.
ESCOPO.colecao = 'projetos';

test('sem lista, a pessoa alcança todos os projetos', () => {
  assert.equal(vejoTodosOsProjetos({ papel: 'membro' }), true);
  assert.equal(vejoTodosOsProjetos({ projetos: null }), true);
  assert.equal(alcancaProjeto({}, 'b9'), true);
});

test('com lista, alcança só o que está nela', () => {
  assert.equal(alcancaProjeto({ projetos: ['b1'] }, 'b1'), true);
  assert.equal(alcancaProjeto({ projetos: ['b1'] }, 'b2'), false);
});

// Os dois arquivos sobem em pacotes diferentes (site e Cloud Functions) e não
// dá pra um importar o outro. Se as respostas divergirem, a tela mostra uma
// coisa e o servidor decide outra — este teste é o que cobra os dois iguais.
//
// Eles leem FORMATOS diferentes de propósito: o site recebe o cadastro já
// traduzido (`projetos`), e o servidor lê o documento cru do banco, onde o
// campo ainda tem o nome que nasceu no primeiro produto feito nesta Base.
// `alcanceParaOBanco` é a própria tradução — usá-la aqui mantém o nome antigo
// fora do teste e prova que os dois lados falam da mesma pessoa.
const comoOBancoGuarda = (u) => ({ ...u, ...servidor.alcanceParaOBanco(u.projetos) });

test('a cópia do servidor responde igual à do navegador', () => {
  const casos = [
    [{}, 'b1'],
    [{ projetos: null }, 'b1'],
    [{ projetos: [] }, 'b1'],
    [{ projetos: ['b1'] }, 'b1'],
    [{ projetos: ['b1'] }, 'b2'],
  ];
  for (const [u, id] of casos) {
    const noBanco = comoOBancoGuarda(u);
    assert.equal(
      alcancaProjeto(u, id),
      servidor.alcancaProjeto(noBanco, id),
      `divergiu em ${JSON.stringify(u)} / ${id}`,
    );
    assert.equal(vejoTodosOsProjetos(u), servidor.vejoTodosOsProjetos(noBanco));
  }
  // A régua de responsável é a que mais dói divergir: a tela esconderia um
  // botão que o servidor aceitaria, ou ofereceria um que ele recusa.
  const responsaveis = [
    { papel: 'admin', ativo: true },
    { papel: 'admin', ativo: true, projetos: ['b1'] },
    { papel: 'membro', ativo: true },
    { papel: 'membro', ativo: true, projetos: ['b1'] },
    { papel: 'membro', ativo: false, projetos: ['b1'] },
  ];
  for (const u of responsaveis) {
    for (const id of ['b1', 'b2']) {
      assert.equal(
        ehResponsavelPeloProjeto(u, id),
        servidor.ehResponsavelPeloProjeto(comoOBancoGuarda(u), id),
        `divergiu no responsável: ${JSON.stringify(u)} / ${id}`,
      );
    }
  }
});

// O `in` do Firestore aceita 30 valores por consulta. Passar disso devolve
// erro, não resultado parcial — por isso a lista é fatiada antes.
test('a lista é fatiada no limite que o Firestore aceita', () => {
  const muitos = Array.from({ length: 71 }, (_, i) => `b${i}`);
  const fatias = fatiar(muitos);
  assert.equal(fatias.length, 3);
  assert.ok(fatias.every((f) => f.length <= LIMITE_IN));
  assert.deepEqual(fatias.flat(), muitos);
});

test('lista vazia não vira fatia nenhuma', () => {
  assert.deepEqual(fatiar([]), []);
  assert.deepEqual(fatiar(undefined), []);
});

// ---------- Como a busca acontece ----------

function fakeDb(registros) {
  const chamadas = [];
  return {
    chamadas,
    listar: async (colecao) => {
      chamadas.push(['listar', colecao]);
      return registros[colecao] || [];
    },
    ler: async (colecao, id) => {
      chamadas.push(['ler', colecao, id]);
      return (registros[colecao] || []).find((r) => r.id === id) || null;
    },
    listarOnde: async (colecao, campo, valores) => {
      chamadas.push(['listarOnde', colecao, campo, valores]);
      return (registros[colecao] || []).filter((r) => valores.includes(r[campo]));
    },
  };
}

const REGISTROS = {
  projetos: [
    { id: 'b1', nome: 'Um' },
    { id: 'b2', nome: 'Dois' },
  ],
  conteudos: [
    { id: 'c1', projetoId: 'b1' },
    { id: 'c2', projetoId: 'b2' },
  ],
};

test('quem alcança todos faz a listagem normal', async () => {
  const db = fakeDb(REGISTROS);
  assert.equal((await projetosDoUsuario(db, { papel: 'admin' })).length, 2);
  assert.deepEqual(db.chamadas[0], ['listar', 'projetos']);
});

// A regra do banco recusa a listagem geral pra quem tem escopo, então buscar um
// a um não é preciosismo: é o único caminho que passa.
test('quem tem escopo busca os projetos dele um a um', async () => {
  const db = fakeDb(REGISTROS);
  const r = await projetosDoUsuario(db, { projetos: ['b2'] });
  assert.deepEqual(
    r.map((b) => b.id),
    ['b2'],
  );
  assert.ok(!db.chamadas.some((c) => c[0] === 'listar'), 'não pode tentar listar tudo');
});

// Cadastro que envelheceu: alguém continua marcado num projeto já excluído.
test('projeto que sumiu não vira erro nem linha em branco', async () => {
  const db = fakeDb(REGISTROS);
  const r = await projetosDoUsuario(db, { projetos: ['b1', 'apagado'] });
  assert.deepEqual(
    r.map((b) => b.id),
    ['b1'],
  );
});

test('quem não alcança nenhum projeto não recebe nada', async () => {
  const db = fakeDb(REGISTROS);
  assert.deepEqual(await projetosDoUsuario(db, { projetos: [] }), []);
});

// O nome do campo que aponta pro projeto é de cada módulo: `radarId` aqui,
// `blogId` lá. A Base recebe por parâmetro em vez de adivinhar.
test('conteúdo é filtrado pelo projeto de quem está olhando', async () => {
  const db = fakeDb(REGISTROS);
  const r = await listarComEscopo(db, { projetos: ['b1'] }, 'conteudos', 'projetoId');
  assert.deepEqual(
    r.map((c) => c.id),
    ['c1'],
  );
  assert.deepEqual(db.chamadas[0], ['listarOnde', 'conteudos', 'projetoId', ['b1']]);
});

test('quem alcança todos os projetos continua listando tudo', async () => {
  const db = fakeDb(REGISTROS);
  const r = await listarComEscopo(db, {}, 'conteudos', 'projetoId');
  assert.equal(r.length, 2);
  assert.deepEqual(db.chamadas[0], ['listar', 'conteudos']);
});
