// A REGRA DO PRODUTO, EM UM LUGAR SÓ:
//
//   "Aluno não deve conseguir fazer nada a não ser navegar e visualizar.
//    Somente na parte de fórum que poderá escrever."
//
// Esse é o contrato. Ele vale em três camadas, e as três precisam ser cobradas
// separadamente porque falham de jeitos diferentes:
//
//   1. A BARRA        — Administração não aparece para quem não é admin.
//   2. AS TELAS       — nenhuma tela de membro grava fora do que é dela.
//   3. AS REGRAS      — o banco recusa, mesmo pelo console. (`test/rules/`)
//
// Este arquivo cuida das duas primeiras. A terceira é a única que protege de
// verdade; as duas daqui existem para o sistema não OFERECER o que o banco vai
// recusar — e para que uma tela nova, escrita daqui a um ano, não abra uma
// porta em silêncio.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
globalThis.document = dom.window.document;
globalThis.location = dom.window.location;

const { default: modulos } = await import('../../modules/modulos.config.js');
const { construirMenu } = await import('../../base/registry.js');

// ---------------------------------------------------------------------------
// 1. A BARRA
// ---------------------------------------------------------------------------

test('a barra do aluno não tem NADA de administração', () => {
  // `construirMenu` devolve GRUPOS (topo e rodapé), e não itens soltos.
  const doAluno = construirMenu(modulos, 'membro')
    .flatMap((g) => g.itens)
    .map((i) => i.id);
  const soAdmin = modulos.filter((m) => m.acesso === 'admin').map((m) => m.id);

  for (const id of soAdmin) {
    assert.equal(doAluno.includes(id), false, `"${id}" apareceu para o aluno`);
  }
  // E a lista do aluno é EXATAMENTE esta. Um item novo aqui é uma decisão de
  // produto, não um efeito colateral de alguém ter criado um arquivo.
  //
  // ⚠️ A MATRIZ NASCE COM DUAS: Meu Perfil e Suporte. O produto pendura as
  // dele em cima, e cada uma que entrar aqui passa a ser decisão consciente —
  // que é exatamente o serviço deste teste.
  assert.deepEqual(doAluno, ['perfil', 'suporte']);
});

// ---------------------------------------------------------------------------
// 2. AS TELAS
// ---------------------------------------------------------------------------
//
// ONDE CADA TELA DE MEMBRO PODE GRAVAR. A lista é curta de propósito: se uma
// tela nova precisar de uma linha aqui, quem a escreveu tem que parar e
// justificar — e é exatamente esse o momento em que uma porta indevida é
// notada, em vez de nascer em silêncio.
//
// O estado do usuário não aparece porque não passa por `servicos.db`: mora em
// `base/estado-do-usuario.js`, escrito no documento cujo id é o uid da própria
// pessoa.
//
// ⚠️ A LISTA NASCE VAZIA NA MATRIZ, e é assim que ela deve continuar até um
// produto precisar do contrário. Tela de membro que grava é a exceção, não a
// regra — e cada linha aqui é uma porta que alguém teve que justificar.
const PODE_GRAVAR = {};

const ESCRITA = /\bdb\.(criar|atualizar|remover|definir)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;

function arquivosDoModulo(id) {
  const pasta = `modules/${id}`;
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ caminho: `${pasta}/${f}`, texto: readFileSync(`${pasta}/${f}`, 'utf8') }));
}

// ⚠️ "TELA DE MEMBRO" É `acesso === 'membro'`, e não "tudo que não é admin".
//
// Quando o papel de GESTOR nasceu, a checagem antiga (`!== 'admin'`) passou a
// contar as telas de gestor como telas de aluno — e reprovou o painel de
// Avisos por gravar em `avisos`, que é literalmente o trabalho dele.
//
// A regra que este teste protege é sobre o ALUNO: ele navega e visualiza, e
// escreve em exatamente dois lugares. Gestor não é aluno.
test('nenhuma tela de membro grava fora do que é dela', () => {
  const encontrados = [];

  for (const m of modulos) {
    if (m.acesso !== 'membro') continue;
    const permitido = PODE_GRAVAR[m.id] || [];

    for (const { caminho, texto } of arquivosDoModulo(m.id)) {
      for (const achado of texto.matchAll(ESCRITA)) {
        const colecao = achado[2];
        encontrados.push(`${m.id}→${colecao}`);
        assert.ok(
          permitido.includes(colecao),
          `${caminho} grava em "${colecao}", e a tela "${m.id}" não deveria. ` +
            'Se isto é intencional, acrescente em PODE_GRAVAR — e explique por quê.',
        );
      }
    }
  }

  // Cinto e suspensório: se um dia a expressão parar de casar (alguém renomeou
  // `db.criar`, ou passou o nome da coleção numa variável), este teste passaria
  // vazio e diria que está tudo bem sem ter olhado nada.
  // ⚠️ NA MATRIZ ESTA VARREDURA PODE ACHAR ZERO, e isso é legítimo — sobraram
  // duas telas de membro, e o pouco que elas gravam vai pelo SDK direto, não
  // pelo `db.` da carcaça. Cobrar ">= 3" numa carcaça vazia seria reprovar o
  // projeto por estar limpo.
  //
  // O cinto contra a expressão ter parado de casar continua valendo, mas só
  // pode cobrar quando houver o que cobrar: no dia em que um produto pendurar
  // telas de membro aqui, a varredura volta a ter material.
  const telasDeMembro = modulos.filter((m) => m.acesso === 'membro');
  assert.ok(telasDeMembro.length >= 1, 'a carcaça precisa de ao menos uma tela de membro');
  if (telasDeMembro.some((m) => arquivosDoModulo(m.id).some(({ texto }) => ESCRITA.test(texto)))) {
    assert.ok(
      encontrados.length >= 1,
      'há tela de membro que grava, e a varredura não achou nada — ela parou de funcionar',
    );
  }
});

// A trava de verdade é `firestore.rules`. Uma tela que confere `papel === admin`
// e mais nada é cortesia: quem abre o console do navegador passa por cima dela.
// Este teste existe para essa frase continuar verdadeira depois de a lista de
// coleções crescer.
test('toda coleção de administração está declarada na regra do banco', () => {
  const regras = readFileSync('firestore.rules', 'utf8');
  // ⚠️ SÓ O QUE A MATRIZ TEM. As coleções de catálogo (cursos, seções, aulas,
  // vitrine, bônus, produtos, gamificação, lives) saíram junto com a área de
  // membros — eram do produto, não da casca.
  //
  // Coleção nova de administração entra aqui E ganha uma linha no
  // `firestore.rules`. A daqui é lembrete; a de lá é a que trava.
  const soAdmin = ['avisos'];

  for (const colecao of soAdmin) {
    assert.ok(
      regras.includes(`match /dados/app/${colecao}/`),
      `"${colecao}" não tem regra própria — ela cai na genérica e fica aberta`,
    );
    assert.ok(
      new RegExp(`temRegraPropria[\\s\\S]{0,400}'${colecao}'`).test(regras),
      `"${colecao}" não está em temRegraPropria — as regras são OU, e a genérica anula a estrita`,
    );
  }
});

// ---------------------------------------------------------------------------
// 3. O QUE O ALUNO VÊ NA TELA DE ADMINISTRAÇÃO
// ---------------------------------------------------------------------------

test('as áreas de administração declaram acesso de admin — e as ferramentas delas também', () => {
  // ⚠️ NA MATRIZ SOBROU UMA ÁREA SÓ. "Configuração" era o trabalho de rotina de
  // uma ÁREA DE MEMBROS — cursos, lives, fórum — e saiu junto com o produto.
  // Administração ficou porque marca, dinheiro e pessoas existem em qualquer
  // negócio que se construa aqui.
  //
  // O nível `gestor` continua no código, e é de propósito: no dia em que um
  // produto tiver trabalho de rotina para delegar, ele já existe e as regras do
  // banco já o conhecem. Ver `base/escopo.js`.
  assert.equal(modulos.find((m) => m.id === 'administracao').acesso, 'admin');

  // As ferramentas são módulos escondidos, alcançáveis por endereço direto.
  // Se uma delas esquecesse o `acesso`, o aluno abriria a tela digitando a URL.
  //
  // A BUSCA É POR PALAVRA INTEIRA, e não por pedaço. Com `includes`, o id
  // "conexao" casava dentro de `modulo: conexaoAdmin` — e o teste conferia o
  // módulo ERRADO (o do membro, que é de acesso `membro` por natureza) e
  // reprovava uma tela correta.
  const fontes = ['administracao']
    .map((id) => readFileSync(`modules/${id}/module.js`, 'utf8'))
    .join(' ');

  let achou = 0;
  for (const m of modulos) {
    const referida = new RegExp(String.raw`modulo:\s*` + m.id + String.raw`\b`).test(fontes);
    // O id do módulo e o nome da variável importada nem sempre são iguais
    // (`conexao-admin` é importado como `conexaoAdmin`), então a varredura
    // acima cobre o caso comum e a lista abaixo fecha o resto.
    if (!referida) continue;
    achou += 1;
    // Ferramenta de Administração exige admin; ferramenta de Configuração
    // exige ao menos gestor. Nenhuma das duas pode ser alcançável por aluno.
    assert.notEqual(m.acesso, 'membro', `a ferramenta "${m.id}" está aberta ao aluno`);
  }
  assert.ok(achou >= 4, 'a varredura precisa encontrar as ferramentas de verdade');

  // ⚠️ AS FERRAMENTAS DE ADMINISTRAÇÃO NÃO PODEM CAIR PARA GESTOR. É a lista
  // inteira da razão de o papel existir — um `acesso: 'gestor'` colado por
  // engano em Pagamento entregaria o caixa a quem foi contratado para cuidar do
  // conteúdo.
  for (const id of ['pagamento', 'identidade', 'equipe']) {
    assert.equal(
      modulos.find((m) => m.id === id).acesso,
      'admin',
      `"${id}" tem que continuar exigindo administrador`,
    );
  }

  // ⚠️ AVISOS É A EXCEÇÃO, E ELA É CONSCIENTE.
  //
  // Ele mora na Administração desde 07/09/2026 — o alcance dele é a base
  // inteira, e isso o tira do trabalho de rotina. Mas o `acesso` continua
  // `gestor`, porque escrever aviso é serviço de quem cuida do conteúdo.
  //
  // Na prática: o gestor não vê a Administração na barra, mas alcança o painel
  // pelo endereço direto `#avisos`. É uma porta estreita e de propósito. Se um
  // dia a decisão for fechá-la, troque para `admin` — e mude esta linha junto,
  // para o teste continuar dizendo a verdade.
  assert.equal(
    modulos.find((m) => m.id === 'avisos').acesso,
    'gestor',
    'Avisos é a única ferramenta da Administração alcançável por gestor',
  );
});
