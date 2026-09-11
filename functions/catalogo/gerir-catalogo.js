// Criar, remover, reordenar e semear o catálogo: cursos, módulos e aulas.
//
// POR QUE ISTO É FUNÇÃO DE SERVIDOR, e não gravação do navegador.
//
// Editar um campo (título, capa, vídeo, visível) continua sendo no navegador,
// direto: é um documento só, é instantâneo, e a regra `ehAdmin()` já basta.
//
// Criar, remover e reordenar não são a mesma coisa:
//
//   • REMOVER um curso significa remover os módulos e as aulas dele junto.
//     Meia dúzia de documentos apagados e a conexão cai no meio: fica curso
//     fantasma ou aula órfã, e ninguém percebe até alguém abrir a tela.
//   • A ORDEM depende do que já existe. Dois administradores criando ao mesmo
//     tempo calculam a mesma posição e nascem dois itens empatados.
//   • A carcaça manda: "função de servidor reconfere tudo".
//
// TODA REMOÇÃO GRAVA AUDITORIA ANTES DE DESTRUIR. Se a trilha falhar, a
// remoção é recusada — ação recusada é melhor que ação invisível.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { assertGestor } from '../_lib/auth.js';
import { registrar, autor } from '../_lib/auditoria.js';
import { proximaOrdem, ordensRenumeradas, PASSO } from './ordem.js';

const TETO_TITULO = 200;

// O Firestore recusa lote acima de 500 operações. Remover um curso grande passa
// disso fácil (100 aulas + 10 módulos + o curso), então os lotes são fatiados.
const POR_LOTE = 400;

export const TIPOS = {
  cursos: { colecao: 'cursos', nome: 'curso' },
  secoes: { colecao: 'secoes', nome: 'módulo' },
  aulas: { colecao: 'aulas', nome: 'aula' },
};

function erro(msg) {
  return new HttpsError('invalid-argument', msg);
}

// O título é o único campo obrigatório na criação: o resto o admin preenche na
// tela, com o item já existindo. Pedir tudo de uma vez transforma "adicionar
// aula" num formulário, e a pessoa desiste no meio.
export function validarTitulo(titulo) {
  const t = String(titulo == null ? '' : titulo).trim();
  if (!t) throw erro('Escreva um título.');
  if (t.length > TETO_TITULO) throw erro(`Título muito longo (máximo ${TETO_TITULO}).`);
  return t;
}

// ---------------------------------------------------------------------------
// CRIAR
// ---------------------------------------------------------------------------

// Núcleo puro, com as dependências injetadas — é o que os testes exercitam.
export async function criarItemCore({ tipo, titulo, cursoId, secaoId }, deps) {
  if (!TIPOS[tipo]) throw erro('Tipo desconhecido.');
  const t = validarTitulo(titulo);

  // O pai TEM que existir. Sem esta conferência nasce aula pendurada em módulo
  // apagado: ela não aparece em lugar nenhum e não há tela que a alcance para
  // apagar de volta.
  if (tipo === 'secoes') {
    if (!(await deps.existe('cursos', cursoId))) throw erro('Esse curso não existe mais.');
  }
  if (tipo === 'aulas') {
    if (!(await deps.existe('cursos', cursoId))) throw erro('Esse curso não existe mais.');
    if (!(await deps.existe('secoes', secaoId))) throw erro('Esse módulo não existe mais.');
  }

  // A posição olha só os IRMÃOS: aulas do mesmo módulo, módulos do mesmo curso.
  const irmaos = await deps.irmaos(tipo, { cursoId, secaoId });
  const ordem = proximaOrdem(irmaos);

  const base = { titulo: t, visivel: false, ordem };
  const dados =
    tipo === 'cursos'
      ? { ...base, descricao: '', capaUrl: '', nivel: '', comecarAqui: false }
      : tipo === 'secoes'
        ? { ...base, cursoId, capaUrl: '' }
        : { ...base, cursoId, secaoId, capaUrl: '', videoUrl: '', descricao: '', materiais: [] };

  const id = await deps.criar(TIPOS[tipo].colecao, dados);
  return { id, ordem };
}

// NASCE INVISÍVEL, sempre. O admin cria a aula, preenche vídeo e descrição com
// calma, e só então liga. Nascer visível põe uma aula vazia na frente de quem
// está estudando — e quem paga pelo susto é o membro, não quem errou.

// ---------------------------------------------------------------------------
// REMOVER
// ---------------------------------------------------------------------------

// O que some junto. A tela pergunta antes usando exatamente estes números —
// "some 1 módulo e 12 aulas" é diferente de "tem certeza?".
export async function contarFilhosCore({ tipo, id }, deps) {
  if (tipo === 'cursos') {
    return {
      secoes: await deps.contar('secoes', 'cursoId', id),
      aulas: await deps.contar('aulas', 'cursoId', id),
    };
  }
  if (tipo === 'secoes') {
    return { secoes: 0, aulas: await deps.contar('aulas', 'secaoId', id) };
  }
  return { secoes: 0, aulas: 0 };
}

export async function removerItemCore({ tipo, id }, deps) {
  if (!TIPOS[tipo]) throw erro('Tipo desconhecido.');
  if (!id) throw erro('Item não informado.');
  if (!(await deps.existe(TIPOS[tipo].colecao, id))) {
    throw erro('Esse item já não existe.');
  }

  const filhos = await contarFilhosCore({ tipo, id }, deps);

  // A TRILHA VEM ANTES DA DESTRUIÇÃO. Se ela falhar, nada é apagado.
  await deps.auditar({
    acao: `catalogo.remover.${tipo}`,
    alvo: id,
    detalhe: { secoesRemovidas: filhos.secoes, aulasRemovidas: filhos.aulas },
  });

  // Os filhos primeiro, o pai por último. Na ordem inversa, uma queda no meio
  // deixaria as aulas sem curso e sem tela que as alcance.
  if (tipo === 'cursos') {
    await deps.removerOnde('aulas', 'cursoId', id);
    await deps.removerOnde('secoes', 'cursoId', id);
  }
  if (tipo === 'secoes') {
    await deps.removerOnde('aulas', 'secaoId', id);
  }
  await deps.remover(TIPOS[tipo].colecao, id);

  return { removido: id, ...filhos };
}

// ---------------------------------------------------------------------------
// REORDENAR
// ---------------------------------------------------------------------------

export async function reordenarCore({ tipo, ids }, deps) {
  if (!TIPOS[tipo]) throw erro('Tipo desconhecido.');
  if (!Array.isArray(ids) || !ids.length) throw erro('Nada para reordenar.');
  if (new Set(ids).size !== ids.length) throw erro('A lista veio com item repetido.');

  const novas = ordensRenumeradas(ids);
  await deps.gravarOrdens(TIPOS[tipo].colecao, novas);
  return { reordenados: novas.length };
}

// ---------------------------------------------------------------------------
// SEMEAR
// ---------------------------------------------------------------------------

export const SEMENTE = { secoes: 10, aulasPorSecao: 10 };

// A estrutura do projeto que veio antes: 10 módulos × 10 aulas, tudo invisível.
// Existe para quem prefere preencher a partir de algo pronto em vez de encarar
// uma tela vazia.
//
// SÓ RODA COM O CATÁLOGO VAZIO. Sem essa trava, um clique sem querer despeja
// 111 itens invisíveis no meio de um catálogo em uso — e limpar isso na mão é
// hora de trabalho.
export async function semearExemploCore(deps) {
  if (await deps.temAlgumCurso()) {
    throw new HttpsError(
      'failed-precondition',
      'Isto só funciona com o catálogo vazio. Você já tem curso cadastrado.',
    );
  }

  const cursoId = await deps.criar('cursos', {
    titulo: 'Curso de exemplo',
    descricao: '',
    capaUrl: '',
    nivel: '',
    comecarAqui: false,
    visivel: false,
    ordem: PASSO,
  });

  const itens = [];
  for (let s = 1; s <= SEMENTE.secoes; s += 1) {
    const secaoId = await deps.criar('secoes', {
      cursoId,
      titulo: `Módulo ${s}`,
      capaUrl: '',
      visivel: false,
      ordem: s * PASSO,
    });
    for (let a = 1; a <= SEMENTE.aulasPorSecao; a += 1) {
      itens.push({
        cursoId,
        secaoId,
        titulo: `Aula ${a}`,
        capaUrl: '',
        videoUrl: '',
        descricao: '',
        materiais: [],
        visivel: false,
        ordem: a * PASSO,
      });
    }
  }
  await deps.criarVarias('aulas', itens);

  return {
    cursoId,
    secoes: SEMENTE.secoes,
    aulas: SEMENTE.secoes * SEMENTE.aulasPorSecao,
  };
}

// ---------------------------------------------------------------------------
// As dependências de verdade
// ---------------------------------------------------------------------------

const CAMINHO = (colecao) => ['dados', 'app', colecao];

export function depsDoFirestore(quem, db = getFirestore()) {
  const col = (colecao) => db.collection(CAMINHO(colecao).join('/'));

  async function apagarEmLotes(docs) {
    for (let i = 0; i < docs.length; i += POR_LOTE) {
      const lote = db.batch();
      for (const d of docs.slice(i, i + POR_LOTE)) lote.delete(d.ref);
      await lote.commit();
    }
  }

  return {
    async existe(colecao, id) {
      if (!id) return false;
      return (await col(colecao).doc(id).get()).exists;
    },
    async irmaos(tipo, { cursoId, secaoId }) {
      let q = col(TIPOS[tipo].colecao);
      if (tipo === 'secoes') q = q.where('cursoId', '==', cursoId);
      if (tipo === 'aulas') q = q.where('secaoId', '==', secaoId);
      const snap = await q.get();
      return snap.docs.map((d) => d.data());
    },
    async criar(colecao, dados) {
      return (await col(colecao).add(dados)).id;
    },
    async criarVarias(colecao, lista) {
      for (let i = 0; i < lista.length; i += POR_LOTE) {
        const lote = db.batch();
        for (const dados of lista.slice(i, i + POR_LOTE)) {
          lote.set(col(colecao).doc(), dados);
        }
        await lote.commit();
      }
    },
    async contar(colecao, campo, valor) {
      const snap = await col(colecao).where(campo, '==', valor).count().get();
      return snap.data().count;
    },
    async removerOnde(colecao, campo, valor) {
      const snap = await col(colecao).where(campo, '==', valor).get();
      await apagarEmLotes(snap.docs);
    },
    async remover(colecao, id) {
      await col(colecao).doc(id).delete();
    },
    async gravarOrdens(colecao, novas) {
      for (let i = 0; i < novas.length; i += POR_LOTE) {
        const lote = db.batch();
        for (const { id, ordem } of novas.slice(i, i + POR_LOTE)) {
          lote.update(col(colecao).doc(id), { ordem });
        }
        await lote.commit();
      }
    },
    async temAlgumCurso() {
      return !(await col('cursos').limit(1).get()).empty;
    },
    auditar: (dados) => registrar({ ...dados, quem }),
  };
}

// ---------------------------------------------------------------------------
// As funções publicadas
// ---------------------------------------------------------------------------

const REGIAO = { region: 'southamerica-east1' };

export const criarItemDoCatalogo = onCall(REGIAO, async (request) => {
  const usuario = await assertGestor(request.auth);
  return criarItemCore(request.data || {}, depsDoFirestore(autor(request.auth, usuario)));
});

export const contarFilhosDoCatalogo = onCall(REGIAO, async (request) => {
  const usuario = await assertGestor(request.auth);
  return contarFilhosCore(request.data || {}, depsDoFirestore(autor(request.auth, usuario)));
});

export const removerItemDoCatalogo = onCall(REGIAO, async (request) => {
  const usuario = await assertGestor(request.auth);
  return removerItemCore(request.data || {}, depsDoFirestore(autor(request.auth, usuario)));
});

export const reordenarCatalogo = onCall(REGIAO, async (request) => {
  const usuario = await assertGestor(request.auth);
  return reordenarCore(request.data || {}, depsDoFirestore(autor(request.auth, usuario)));
});

export const semearCatalogoDeExemplo = onCall(REGIAO, async (request) => {
  const usuario = await assertGestor(request.auth);
  return semearExemploCore(depsDoFirestore(autor(request.auth, usuario)));
});
