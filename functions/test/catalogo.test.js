import { test } from 'node:test';
import assert from 'node:assert';

import { proximaOrdem, ordemEntre, ordensRenumeradas, PASSO } from '../catalogo/ordem.js';
import {
  criarItemCore,
  removerItemCore,
  contarFilhosCore,
  reordenarCore,
  semearExemploCore,
  validarTitulo,
  SEMENTE,
} from '../catalogo/gerir-catalogo.js';

// ===========================================================================
// A ORDEM
// ===========================================================================

test('o primeiro item da lista abre na primeira casa', () => {
  assert.equal(proximaOrdem([]), PASSO);
  assert.equal(proximaOrdem(null), PASSO);
});

test('quem entra depois vai para o fim, e não para o buraco do meio', () => {
  assert.equal(proximaOrdem([{ ordem: 10 }, { ordem: 30 }, { ordem: 20 }]), 40);
});

test('item sem ordem gravada não derruba a conta', () => {
  assert.equal(proximaOrdem([{ ordem: 10 }, {}, { ordem: null }]), 20);
});

test('quem entra no meio recebe a média — e ninguém mais é tocado', () => {
  assert.equal(ordemEntre(20, 30), 25);
  assert.equal(ordemEntre(null, 10), 0);
  assert.equal(ordemEntre(40, null), 50);
  assert.equal(ordemEntre(null, null), PASSO);
});

test('renumerar desfaz o acúmulo de casas decimais', () => {
  assert.deepEqual(ordensRenumeradas(['a', 'b', 'c']), [
    { id: 'a', ordem: 10 },
    { id: 'b', ordem: 20 },
    { id: 'c', ordem: 30 },
  ]);
});

// ===========================================================================
// O TÍTULO
// ===========================================================================

test('título vazio ou só de espaço é recusado', () => {
  for (const ruim of ['', '   ', null, undefined]) {
    assert.throws(() => validarTitulo(ruim), /título/i);
  }
});

test('o título é aparado antes de gravar', () => {
  assert.equal(validarTitulo('  Aula 1  '), 'Aula 1');
});

test('título absurdo é recusado — campo de texto sem teto é convite', () => {
  assert.throws(() => validarTitulo('x'.repeat(201)), /longo/i);
});

// ===========================================================================
// CRIAR
// ===========================================================================

function fingir(estado = {}) {
  const banco = {
    cursos: estado.cursos || {},
    secoes: estado.secoes || {},
    aulas: estado.aulas || {},
  };
  const trilha = [];
  let n = 0;
  return {
    banco,
    trilha,
    deps: {
      existe: async (colecao, id) => !!(id && banco[colecao] && banco[colecao][id]),
      irmaos: async (tipo, { cursoId, secaoId }) =>
        Object.values(banco[tipo]).filter((i) => {
          if (tipo === 'secoes') return i.cursoId === cursoId;
          if (tipo === 'aulas') return i.secaoId === secaoId;
          return true;
        }),
      criar: async (colecao, dados) => {
        n += 1;
        const id = `${colecao}-${n}`;
        banco[colecao][id] = { ...dados };
        return id;
      },
      criarVarias: async (colecao, lista) => {
        for (const dados of lista) {
          n += 1;
          banco[colecao][`${colecao}-${n}`] = { ...dados };
        }
      },
      contar: async (colecao, campo, valor) =>
        Object.values(banco[colecao]).filter((i) => i[campo] === valor).length,
      removerOnde: async (colecao, campo, valor) => {
        for (const [id, i] of Object.entries(banco[colecao])) {
          if (i[campo] === valor) delete banco[colecao][id];
        }
      },
      remover: async (colecao, id) => {
        delete banco[colecao][id];
      },
      gravarOrdens: async (colecao, novas) => {
        for (const { id, ordem } of novas) banco[colecao][id].ordem = ordem;
      },
      temAlgumCurso: async () => Object.keys(banco.cursos).length > 0,
      auditar: async (d) => {
        trilha.push(d);
      },
    },
  };
}

test('curso novo nasce INVISÍVEL — aula vazia não aparece para quem estuda', async () => {
  const f = fingir();
  const { id } = await criarItemCore({ tipo: 'cursos', titulo: 'Do Zero' }, f.deps);
  assert.equal(f.banco.cursos[id].visivel, false);
  assert.equal(f.banco.cursos[id].titulo, 'Do Zero');
  assert.equal(f.banco.cursos[id].ordem, PASSO);
});

test('módulo e aula também nascem invisíveis', async () => {
  const f = fingir({ cursos: { c1: {} }, secoes: { s1: { cursoId: 'c1' } } });
  const s = await criarItemCore({ tipo: 'secoes', titulo: 'M', cursoId: 'c1' }, f.deps);
  const a = await criarItemCore(
    { tipo: 'aulas', titulo: 'A', cursoId: 'c1', secaoId: 's1' },
    f.deps,
  );
  assert.equal(f.banco.secoes[s.id].visivel, false);
  assert.equal(f.banco.aulas[a.id].visivel, false);
});

test('a posição olha só os IRMÃOS, não o catálogo inteiro', async () => {
  const f = fingir({
    cursos: { c1: {}, c2: {} },
    secoes: { s1: { cursoId: 'c1' }, s2: { cursoId: 'c2' } },
    aulas: {
      a1: { secaoId: 's1', ordem: 10 },
      a2: { secaoId: 's1', ordem: 20 },
      a9: { secaoId: 's2', ordem: 90 },
    },
  });
  const { ordem } = await criarItemCore(
    { tipo: 'aulas', titulo: 'nova', cursoId: 'c1', secaoId: 's1' },
    f.deps,
  );
  assert.equal(ordem, 30, 'a aula do OUTRO módulo não pode empurrar esta para o fim');
});

test('NÃO nasce aula pendurada em módulo que não existe', async () => {
  const f = fingir({ cursos: { c1: {} } });
  await assert.rejects(
    () => criarItemCore({ tipo: 'aulas', titulo: 'A', cursoId: 'c1', secaoId: 'sumiu' }, f.deps),
    /módulo não existe/i,
  );
});

test('NÃO nasce módulo pendurado em curso que não existe', async () => {
  const f = fingir();
  await assert.rejects(
    () => criarItemCore({ tipo: 'secoes', titulo: 'M', cursoId: 'sumiu' }, f.deps),
    /curso não existe/i,
  );
});

test('tipo inventado é recusado', async () => {
  const f = fingir();
  await assert.rejects(() => criarItemCore({ tipo: 'bananas', titulo: 'x' }, f.deps), /tipo/i);
});

// ===========================================================================
// REMOVER
// ===========================================================================

function catalogoCheio() {
  return fingir({
    cursos: { c1: {}, c2: {} },
    secoes: { s1: { cursoId: 'c1' }, s2: { cursoId: 'c1' }, s9: { cursoId: 'c2' } },
    aulas: {
      a1: { cursoId: 'c1', secaoId: 's1' },
      a2: { cursoId: 'c1', secaoId: 's1' },
      a3: { cursoId: 'c1', secaoId: 's2' },
      a9: { cursoId: 'c2', secaoId: 's9' },
    },
  });
}

test('remover um curso leva os módulos e as aulas DELE — e nenhuma de outro', async () => {
  const f = catalogoCheio();
  const r = await removerItemCore({ tipo: 'cursos', id: 'c1' }, f.deps);

  assert.deepEqual(Object.keys(f.banco.cursos), ['c2']);
  assert.deepEqual(Object.keys(f.banco.secoes), ['s9'], 'os módulos do outro curso ficam');
  assert.deepEqual(Object.keys(f.banco.aulas), ['a9'], 'as aulas do outro curso ficam');
  assert.equal(r.secoes, 2);
  assert.equal(r.aulas, 3);
});

test('remover um módulo leva as aulas dele, e o curso fica de pé', async () => {
  const f = catalogoCheio();
  await removerItemCore({ tipo: 'secoes', id: 's1' }, f.deps);
  assert.ok(f.banco.cursos.c1, 'o curso continua');
  assert.deepEqual(Object.keys(f.banco.secoes).sort(), ['s2', 's9']);
  assert.deepEqual(Object.keys(f.banco.aulas).sort(), ['a3', 'a9']);
});

test('A TRILHA É GRAVADA ANTES, e diz quanto some junto', async () => {
  const f = catalogoCheio();
  await removerItemCore({ tipo: 'cursos', id: 'c1' }, f.deps);
  assert.equal(f.trilha.length, 1);
  assert.equal(f.trilha[0].acao, 'catalogo.remover.cursos');
  assert.equal(f.trilha[0].alvo, 'c1');
  assert.deepEqual(f.trilha[0].detalhe, { secoesRemovidas: 2, aulasRemovidas: 3 });
});

test('SE A TRILHA FALHA, NADA É APAGADO — ação recusada é melhor que invisível', async () => {
  const f = catalogoCheio();
  f.deps.auditar = async () => {
    throw new Error('trilha fora do ar');
  };
  await assert.rejects(() => removerItemCore({ tipo: 'cursos', id: 'c1' }, f.deps));
  assert.ok(f.banco.cursos.c1, 'o curso continua inteiro');
  assert.equal(Object.keys(f.banco.aulas).length, 4, 'nenhuma aula foi tocada');
});

test('remover o que já não existe é recusado, não ignorado em silêncio', async () => {
  const f = catalogoCheio();
  await assert.rejects(
    () => removerItemCore({ tipo: 'cursos', id: 'fantasma' }, f.deps),
    /já não existe/i,
  );
});

test('contar filhos é o que a tela usa para perguntar antes', async () => {
  const f = catalogoCheio();
  assert.deepEqual(await contarFilhosCore({ tipo: 'cursos', id: 'c1' }, f.deps), {
    secoes: 2,
    aulas: 3,
  });
  assert.deepEqual(await contarFilhosCore({ tipo: 'secoes', id: 's1' }, f.deps), {
    secoes: 0,
    aulas: 2,
  });
  assert.deepEqual(await contarFilhosCore({ tipo: 'aulas', id: 'a1' }, f.deps), {
    secoes: 0,
    aulas: 0,
  });
});

// ===========================================================================
// REORDENAR
// ===========================================================================

test('reordenar renumera na ordem que chegou', async () => {
  const f = fingir({ aulas: { a1: { ordem: 10 }, a2: { ordem: 20 }, a3: { ordem: 30 } } });
  await reordenarCore({ tipo: 'aulas', ids: ['a3', 'a1', 'a2'] }, f.deps);
  assert.equal(f.banco.aulas.a3.ordem, 10);
  assert.equal(f.banco.aulas.a1.ordem, 20);
  assert.equal(f.banco.aulas.a2.ordem, 30);
});

test('lista com item repetido é recusada — dois lugares para a mesma aula', async () => {
  const f = fingir({ aulas: { a1: { ordem: 10 } } });
  await assert.rejects(
    () => reordenarCore({ tipo: 'aulas', ids: ['a1', 'a1'] }, f.deps),
    /repetido/i,
  );
});

test('lista vazia é recusada', async () => {
  const f = fingir();
  await assert.rejects(() => reordenarCore({ tipo: 'aulas', ids: [] }, f.deps), /nada/i);
});

// ===========================================================================
// SEMEAR
// ===========================================================================

test('a semente entrega 10 módulos × 10 aulas, tudo invisível', async () => {
  const f = fingir();
  const r = await semearExemploCore(f.deps);

  assert.equal(Object.keys(f.banco.cursos).length, 1);
  assert.equal(Object.keys(f.banco.secoes).length, SEMENTE.secoes);
  assert.equal(Object.keys(f.banco.aulas).length, SEMENTE.secoes * SEMENTE.aulasPorSecao);
  assert.equal(r.aulas, 100);

  const tudo = [
    ...Object.values(f.banco.cursos),
    ...Object.values(f.banco.secoes),
    ...Object.values(f.banco.aulas),
  ];
  assert.ok(
    tudo.every((i) => i.visivel === false),
    'semente visível despejaria 100 aulas vazias na frente de quem estuda',
  );
});

test('cada aula da semente aponta para o módulo certo', async () => {
  const f = fingir();
  await semearExemploCore(f.deps);
  for (const aula of Object.values(f.banco.aulas)) {
    assert.ok(f.banco.secoes[aula.secaoId], 'aula órfã na própria semente');
    assert.equal(f.banco.secoes[aula.secaoId].cursoId, aula.cursoId);
  }
});

test('SEMEAR RECUSA quando já existe curso — 111 itens no meio do que está em uso', async () => {
  const f = fingir({ cursos: { c1: {} } });
  await assert.rejects(() => semearExemploCore(f.deps), /vazio/i);
});
