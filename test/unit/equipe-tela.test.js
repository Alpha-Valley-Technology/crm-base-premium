import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { montarModulo } from '../../base/router.js';
import equipe from '../../modules/equipe/module.js';
import { ui } from '../../ui/ui.js';
import { ESCOPO } from '../../config/marca.js';
import { CONTATOS } from '../../base/suporte.js';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
globalThis.document = dom.window.document;
globalThis.window = dom.window;
globalThis.location = dom.window.location; // a mensagem de boas-vindas usa location.origin

// Estes testes cobrem o comportamento DA BASE, não a escolha de um produto.
//
// O arquivo é copiado para dentro de cada produto montado, e lá o
// `config/marca.js` pode ter desligado o escopo ou trocado as palavras. Sem
// fixar a configuração aqui, o teste passaria a medir a escolha de quem montou
// em vez da carcaça, e quebraria sem ninguém ter feito nada de errado.
//
// A Base nasce SEM escopo (`usa: false`), porque produto recém-montado tem um
// operador só. Estes testes cobrem a maquinaria do escopo, então ligam e
// nomeiam a coleção de um produto fictício.
//
// Fixa o vocabulário INTEIRO, não só `usa`: o produto pode ter trocado as
// frases (o ViralNews fala em "radar"), e aí o teste mediria a escolha dele.
Object.assign(ESCOPO, {
  usa: true,
  colecao: 'projetos',
  rotulo: 'Onde essa pessoa atua',
  todos: 'Todos os projetos',
  nenhum: 'Nenhum projeto por enquanto',
  semCadastro:
    'Nenhum projeto cadastrado ainda. Cadastre a pessoa com "Nenhum ' +
    'projeto por enquanto" e marque depois, em "Trocar projetos".',
  erroSemEscolha: 'Escolha onde essa pessoa atua, ou marque "Nenhum projeto ' + 'por enquanto".',
  cuidaDeTodos: 'Atua em todos os projetos',
  cuidaDeNenhum: 'Ainda não atua em nenhum projeto',
  itemExcluido: 'projeto excluído',
  botaoTrocar: 'Trocar projetos',
});

const PROJETOS = [
  { id: 'b1', nome: 'Projeto Um' },
  { id: 'b2', nome: 'Projeto Dois' },
];

const EQUIPE = [
  { uid: 'eu', nome: 'Eu Mesmo', email: 'eu@x.com', papel: 'admin', ativo: true, projetos: null },
  {
    uid: 'a2',
    nome: 'Outro Admin',
    email: 'a2@x.com',
    papel: 'admin',
    ativo: true,
    projetos: null,
  },
  { uid: 'm1', nome: 'Redator', email: 'm1@x.com', papel: 'membro', ativo: true, projetos: null },
  {
    uid: 'm2',
    nome: 'Afastado',
    email: 'm2@x.com',
    papel: 'membro',
    ativo: false,
    projetos: ['b2'],
  },
];

let avisos = [];
function fake(usuarios = EQUIPE, aoChamar) {
  return {
    ui,
    db: {
      listar: async (colecao) => (colecao === 'projetos' ? PROJETOS : []),
      ler: async (colecao, id) => PROJETOS.find((b) => b.id === id) || null,
      listarOnde: async () => [],
    },
    servidor: async (fn, dados) => {
      if (aoChamar) aoChamar(fn, dados);
      if (fn === 'listarUsuarios') return { usuarios };
      return { ok: true };
    },
    avisar: (tipo, msg) => avisos.push({ tipo, msg }),
    usuario: { uid: 'eu', nome: 'Eu Mesmo', email: 'eu@x.com', papel: 'admin' },
  };
}
const esperar = () => new Promise((r) => setTimeout(r, 0));
const botao = (caixa, texto) =>
  [...caixa.querySelectorAll('button')].find((b) => new RegExp(texto).test(b.textContent));
const limparModais = () => {
  for (const m of document.body.querySelectorAll('.modal-fundo')) m.remove();
};
const linhaDe = (caixa, nome) =>
  [...caixa.querySelectorAll('.card')].find((c) => c.textContent.includes(nome));
// A caixinha de um projeto no seletor, pelo texto do rótulo ao lado.
const caixinha = (dentro, texto) =>
  [...dentro.querySelectorAll('label')]
    .find((l) => l.textContent.trim() === texto)
    ?.querySelector('input[type=checkbox]');

test('o botão de cadastro diz o que faz, não "Enviar"', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(), null, null);
  assert.ok(botao(caixa, '^Adicionar$'), 'deveria existir o botão "Adicionar"');
  assert.ok(!botao(caixa, '^Enviar$'), 'não deveria sobrar "Enviar"');
});

test('cada pessoa aparece com papel, estado e ações', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(), null, null);

  const redator = linhaDe(caixa, 'Redator');
  assert.match(redator.textContent, /m1@x\.com/);
  assert.match(redator.textContent, /Ativo/);
  assert.ok(botao(redator, 'Desativar'));
  assert.ok(botao(redator, 'Remover'));
  assert.equal(redator.querySelector('select').value, 'membro');

  const afastado = linhaDe(caixa, 'Afastado');
  assert.match(afastado.textContent, /Desativado/);
  assert.ok(botao(afastado, 'Reativar'), 'quem está fora pode voltar');
});

test('a própria conta não oferece ação nenhuma', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(), null, null);

  const minha = linhaDe(caixa, 'Eu Mesmo');
  assert.match(minha.textContent, /\(você\)/);
  assert.equal(minha.querySelector('select').disabled, true);
  assert.ok(!botao(minha, 'Remover'));
  assert.ok(!botao(minha, 'Desativar'));
  assert.match(minha.textContent, /não altera a própria conta/i);
});

test('o único administrador ativo fica protegido na tela', async () => {
  const soUm = [
    { uid: 'eu', nome: 'Eu Mesmo', email: 'eu@x.com', papel: 'membro', ativo: true },
    { uid: 'a1', nome: 'Chefe', email: 'chefe@x.com', papel: 'admin', ativo: true },
  ];
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(soUm), null, null);

  const chefe = linhaDe(caixa, 'Chefe');
  assert.equal(chefe.querySelector('select').disabled, true, 'não dá pra rebaixar');
  assert.ok(!botao(chefe, 'Remover'), 'não dá pra remover');
  assert.ok(!botao(chefe, 'Desativar'), 'não dá pra desativar');
  assert.match(chefe.textContent, /Promova outra pessoa antes/i);
});

test('mudar o papel pergunta antes e explica o que a permissão dá', async () => {
  limparModais();
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  const sel = linhaDe(caixa, 'Redator').querySelector('select');
  sel.value = 'admin';
  sel.dispatchEvent(new dom.window.Event('change'));
  await esperar();

  // Permissão não muda sozinha: nada foi salvo ainda.
  assert.equal(chamadas.filter((c) => c.fn === 'atualizarUsuario').length, 0);
  assert.match(document.body.textContent, /Tornar Redator administrador\?/);
  // ⚠️ O TEXTO DIZ O QUE O PAPEL DÁ DE PODER, e com três papéis isso passou a
  // importar mais: promover a gestor e promover a administrador são coisas
  // muito diferentes, e o nome sozinho não conta a diferença.
  assert.match(
    document.body.textContent,
    /Pagamento, Identidade e Equipe/i,
    'a confirmação precisa dizer o que o administrador alcança',
  );
  assert.match(document.body.textContent, /acesso mais alto/i);
});

test('cancelar a troca de papel devolve o seletor ao que era', async () => {
  limparModais();
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  const sel = linhaDe(caixa, 'Redator').querySelector('select');
  sel.value = 'admin';
  sel.dispatchEvent(new dom.window.Event('change'));
  await esperar();
  botao(document.body, 'Cancelar').click();
  await esperar();

  assert.equal(chamadas.filter((c) => c.fn === 'atualizarUsuario').length, 0);
  assert.equal(sel.value, 'membro', 'volta ao papel de antes');
});

test('confirmando, o papel novo é salvo', async () => {
  limparModais();
  avisos = [];
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  const sel = linhaDe(caixa, 'Redator').querySelector('select');
  sel.value = 'admin';
  sel.dispatchEvent(new dom.window.Event('change'));
  await esperar();
  botao(document.body, 'Sim, tornar Administrador').click();
  await esperar();

  const pedido = chamadas.find((c) => c.fn === 'atualizarUsuario');
  assert.deepEqual(pedido.d, { uid: 'm1', papel: 'admin' });
  assert.match(avisos.at(-1).msg, /agora é Administrador/);
});

// ESTE TESTE MUDOU DE LADO, e a mudança é o registro do que aconteceu.
//
// Antes ele cobrava que a tela NÃO prometesse email — porque não havia email
// nenhum: a entrada era só Google, e prometer link seria mentira. Com a entrada
// por senha, o convite passou a sair de verdade, e a mentira agora seria o
// contrário: cadastrar sem avisar deixaria quem não tem Google sem caminho
// nenhum, cadastrado no banco e sem senha para entrar.
test('ao adicionar, a tela promete o email — porque ele sai de verdade', async () => {
  avisos = [];
  // O formulário precisa estar preso ao documento: o jsdom não dispara o
  // "submit" de um form solto, e o botão de cadastro é do tipo submit.
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(equipe, caixa, fake(), null, null);

    assert.match(caixa.textContent, /email para definir a senha/i);
    assert.match(
      caixa.textContent,
      /também entra com um clique/i,
      'e continua dizendo que quem tem Google não precisa de senha',
    );

    const campos = caixa.querySelectorAll('input.input');
    campos[0].value = 'Nova Pessoa';
    campos[1].value = 'nova@gmail.com';
    caixinha(caixa, 'Todos os projetos').click();
    botao(caixa, '^Adicionar$').click();
    await esperar();

    // O envio do email falha no teste (não há rede), e isso é de propósito: a
    // criação NÃO pode ser derrubada por ele. A pessoa já está cadastrada, e o
    // admin sempre pode usar "Reenviar convite".
    assert.match(avisos.at(-1).msg, /Nova Pessoa foi adicionad/i);
    assert.match(
      avisos.at(-1).msg,
      /Reenviar convite/i,
      'quando o email não sai, a tela diz o que fazer em vez de calar',
    );
  } finally {
    caixa.remove();
  }
});

// ---------- Onde cada pessoa atua ----------

// O padrão silencioso é o perigo: cadastrar às pressas e a pessoa nascer
// enxergando os projetos de todo mundo. Por isso o formulário exige a escolha.
test('cadastrar sem escolher projeto é recusado antes de chegar ao servidor', async () => {
  avisos = [];
  const chamadas = [];
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(
      equipe,
      caixa,
      fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
      null,
      null,
    );
    const campos = caixa.querySelectorAll('input.input');
    campos[0].value = 'Apressado';
    campos[1].value = 'apressado@gmail.com';
    botao(caixa, '^Adicionar$').click();
    await esperar();

    assert.equal(chamadas.filter((c) => c.fn === 'criarUsuario').length, 0, 'nada foi criado');
    assert.match(avisos.at(-1).msg, /Escolha onde essa pessoa atua/i);
  } finally {
    caixa.remove();
  }
});

test('o projeto marcado no cadastro vai junto pro servidor', async () => {
  avisos = [];
  const chamadas = [];
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(
      equipe,
      caixa,
      fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
      null,
      null,
    );
    const campos = caixa.querySelectorAll('input.input');
    campos[0].value = 'Cuidador';
    campos[1].value = 'cuidador@gmail.com';
    caixinha(caixa, 'Projeto Dois').click();
    botao(caixa, '^Adicionar$').click();
    await esperar();

    const pedido = chamadas.find((c) => c.fn === 'criarUsuario');
    assert.deepEqual(pedido.d.projetos, ['b2']);
  } finally {
    caixa.remove();
  }
});

// "Todos" e um projeto específico ao mesmo tempo faria a tela dizer uma coisa e o
// banco guardar outra. As duas escolhas se excluem, nos dois sentidos.
test('"todos" e um projeto específico se excluem, nos dois sentidos', async () => {
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(equipe, caixa, fake(), null, null);
    const um = caixinha(caixa, 'Projeto Um');
    const todos = caixinha(caixa, 'Todos os projetos');

    um.click();
    assert.equal(um.checked, true);
    todos.click();
    assert.equal(um.checked, false, 'marcar "todos" apaga a escolha item a item');

    // E o caminho de volta, que é o que quem restringe alguém realmente faz.
    um.click();
    assert.equal(um.checked, true, 'a caixinha não pode estar desligada — o clique tem que valer');
    assert.equal(todos.checked, false, 'escolher um projeto sai de "todos" sozinho');
  } finally {
    caixa.remove();
  }
});

test('a linha de cada pessoa diz onde ela atua', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(), null, null);

  assert.match(linhaDe(caixa, 'Redator').textContent, /Atua em todos os projetos/i);
  assert.match(linhaDe(caixa, 'Afastado').textContent, /Cuida de: Projeto Dois/i);
});

test('trocar o escopo pergunta antes e diz o que a pessoa passa a ver', async () => {
  limparModais();
  const chamadas = [];
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(
      equipe,
      caixa,
      fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
      null,
      null,
    );

    const linha = linhaDe(caixa, 'Redator');
    botao(linha, 'Trocar projetos').click();
    await esperar();

    const editor = linha.querySelector('[data-editor-escopo]');
    caixinha(editor, 'Projeto Um').click();
    botao(editor, '^Salvar$').click();
    await esperar();

    // Ainda não salvou: só perguntou.
    assert.equal(chamadas.filter((c) => c.fn === 'atualizarUsuario').length, 0);
    assert.match(document.body.textContent, /Mudar onde Redator atua\?/);
    assert.match(document.body.textContent, /nada é apagado/i, 'explica que não perde trabalho');

    // Dentro do modal: o editor na linha também tem um "Salvar".
    botao(document.body.querySelector('.modal-fundo'), '^Salvar$').click();
    await esperar();

    const pedido = chamadas.find((c) => c.fn === 'atualizarUsuario');
    assert.deepEqual(pedido.d, { uid: 'm1', projetos: ['b1'] });
  } finally {
    caixa.remove();
    limparModais();
  }
});

test('a própria conta não oferece troca de escopo — o servidor recusaria', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(), null, null);
  assert.ok(!botao(linhaDe(caixa, 'Eu Mesmo'), 'Trocar projetos'));
});

// Mexer no alcance de alguém não deixa o sistema sem administrador, então essa
// trava não vale aqui — só as de papel e de acesso.
test('o único administrador ativo ainda pode ter o escopo trocado', async () => {
  const soUm = [
    {
      uid: 'eu',
      nome: 'Eu Mesmo',
      email: 'eu@x.com',
      papel: 'membro',
      ativo: true,
      projetos: null,
    },
    { uid: 'a1', nome: 'Chefe', email: 'chefe@x.com', papel: 'admin', ativo: true, projetos: null },
  ];
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake(soUm), null, null);
  assert.ok(botao(linhaDe(caixa, 'Chefe'), 'Trocar projetos'));
});

test('remover pergunta antes, e só age se confirmar', async () => {
  limparModais();
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  botao(linhaDe(caixa, 'Redator'), 'Remover').click();
  await esperar();

  // A pergunta apareceu e ninguém foi removido ainda.
  assert.match(document.body.textContent, /Não dá para desfazer/i);
  assert.equal(chamadas.filter((c) => c.fn === 'removerUsuario').length, 0);

  // Cancelar não remove.
  botao(document.body, 'Cancelar').click();
  await esperar();
  assert.equal(chamadas.filter((c) => c.fn === 'removerUsuario').length, 0);
});

test('confirmando a remoção, o servidor é chamado com a pessoa certa', async () => {
  limparModais();
  avisos = [];
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  botao(linhaDe(caixa, 'Redator'), 'Remover').click();
  await esperar();
  botao(document.body, 'Remover para sempre').click();
  await esperar();

  const pedido = chamadas.find((c) => c.fn === 'removerUsuario');
  assert.deepEqual(pedido.d, { uid: 'm1' });
  assert.match(avisos.at(-1).msg, /foi removido da equipe/);
});

test('reativar não fica atrás de confirmação — não é destrutivo', async () => {
  limparModais();
  const chamadas = [];
  const caixa = document.createElement('div');
  await montarModulo(
    equipe,
    caixa,
    fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
    null,
    null,
  );

  botao(linhaDe(caixa, 'Afastado'), 'Reativar').click();
  await esperar();

  const pedido = chamadas.find((c) => c.fn === 'atualizarUsuario');
  assert.deepEqual(pedido.d, { uid: 'm2', ativo: true });
});

test('a recusa do servidor aparece na tela em português', async () => {
  limparModais();
  avisos = [];
  const servicos = fake();
  servicos.servidor = async (fn, dados) => {
    if (fn === 'listarUsuarios') return { usuarios: EQUIPE };
    const e = new Error(
      'Esta é a única pessoa com acesso de administrador ativo. Promova outra pessoa antes.',
    );
    e.code = 'functions/failed-precondition';
    throw e;
  };
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, servicos, null, null);

  botao(linhaDe(caixa, 'Redator'), 'Remover').click();
  await esperar();
  botao(document.body, 'Remover para sempre').click();
  await esperar();

  assert.match(avisos.at(-1).msg, /única pessoa com acesso de administrador/);
});

// O caso real: o dono foi cadastrar alguém cujo projeto ainda não existia, e não
// havia opção possível — "todos" dava acesso demais, e não dava para marcar um
// projeto que não existe.
test('dá para cadastrar alguém antes do projeto existir', async () => {
  avisos = [];
  const chamadas = [];
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(
      equipe,
      caixa,
      fake(EQUIPE, (fn, d) => chamadas.push({ fn, d })),
      null,
      null,
    );
    const campos = caixa.querySelectorAll('input.input');
    campos[0].value = 'Sem Projeto Ainda';
    campos[1].value = 'semprojeto@gmail.com';
    caixinha(caixa, 'Nenhum projeto por enquanto').click();
    botao(caixa, '^Adicionar$').click();
    await esperar();

    const pedido = chamadas.find((c) => c.fn === 'criarUsuario');
    assert.deepEqual(pedido.d.projetos, [], 'lista vazia, não "todos"');
  } finally {
    caixa.remove();
  }
});

// Se "nenhum" nascesse marcado, voltaria o padrão silencioso que o formulário
// existe para evitar.
test('"nenhum projeto" não vem marcado sozinho no cadastro', async () => {
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(equipe, caixa, fake(), null, null);
    assert.equal(caixinha(caixa, 'Nenhum projeto por enquanto').checked, false);
    assert.equal(caixinha(caixa, 'Todos os projetos').checked, false);
  } finally {
    caixa.remove();
  }
});

test('as três escolhas se excluem', async () => {
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  try {
    await montarModulo(equipe, caixa, fake(), null, null);
    const um = caixinha(caixa, 'Projeto Um');
    const todos = caixinha(caixa, 'Todos os projetos');
    const nenhum = caixinha(caixa, 'Nenhum projeto por enquanto');

    um.click();
    nenhum.click();
    assert.equal(um.checked, false, 'escolher "nenhum" apaga os projetos marcados');
    todos.click();
    assert.equal(nenhum.checked, false, 'e "todos" apaga "nenhum"');
    um.click();
    assert.equal(todos.checked, false);
    assert.equal(nenhum.checked, false);
  } finally {
    caixa.remove();
  }
});

// ---------- O vocabulário do escopo vem do produto ----------
//
// A carcaça não sabe o que é um "projeto" neste produto — pode ser uma clínica,
// uma obra, um site, um radar. Deixar as palavras na Base obrigava cada produto
// novo a desfazer o vocabulário do anterior. Estes testes cobram os dois lados:
// que dá para trocar, e que dá para esconder por completo.

test('por padrão a tela fala em projetos, que é o neutro da carcaça', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake());
  await esperar();
  assert.match(caixa.textContent, /Onde essa pessoa atua/);
  assert.ok(caixinha(caixa, 'Todos os projetos'));
  assert.ok(botao(caixa, 'Trocar projetos'));
});

test('o produto troca as palavras sem tocar na carcaça', async () => {
  const original = { ...ESCOPO };
  Object.assign(ESCOPO, {
    rotulo: 'De quais radares essa pessoa cuida',
    todos: 'Todos os radares',
    nenhum: 'Nenhum radar por enquanto',
    cuidaDeTodos: 'Cuida de todos os radares',
    botaoTrocar: 'Trocar radares',
  });
  try {
    const caixa = document.createElement('div');
    await montarModulo(equipe, caixa, fake());
    await esperar();
    assert.match(caixa.textContent, /De quais radares essa pessoa cuida/);
    assert.ok(caixinha(caixa, 'Todos os radares'));
    assert.ok(caixinha(caixa, 'Nenhum radar por enquanto'));
    assert.ok(botao(caixa, 'Trocar radares'));
    assert.match(caixa.textContent, /Cuida de todos os radares/);
  } finally {
    Object.assign(ESCOPO, original);
  }
});

// Seletor vazio pede uma decisão que não existe. Produto de um operador só
// esconde tudo, e quem entra alcança tudo.
test('com ESCOPO.usa false, o seletor some inteiro', async () => {
  const original = ESCOPO.usa;
  ESCOPO.usa = false;
  try {
    const caixa = document.createElement('div');
    await montarModulo(equipe, caixa, fake());
    await esperar();
    assert.ok(!caixinha(caixa, 'Todos os projetos'), 'nenhuma caixinha de escopo');
    assert.ok(!botao(caixa, 'Trocar projetos'), 'nenhum botão de trocar');
    assert.ok(!/atua em/i.test(caixa.textContent), 'nem a linha de onde a pessoa atua');
  } finally {
    ESCOPO.usa = original;
  }
});

// Escondido, todo mundo que entra tem que alcançar tudo — senão a conta nova
// entraria sem enxergar nada e ninguém entenderia por quê.
test('sem escopo, quem é cadastrado alcança tudo', async () => {
  const original = ESCOPO.usa;
  ESCOPO.usa = false;
  const chamadas = [];
  try {
    const caixa = document.createElement('div');
    document.body.appendChild(caixa);
    await montarModulo(
      equipe,
      caixa,
      fake(EQUIPE, (fn, dados) => chamadas.push({ fn, dados })),
    );
    await esperar();
    const inputs = [...caixa.querySelectorAll('.campo input')];
    inputs[0].value = 'Fulano';
    inputs[1].value = 'fulano@x.com';
    caixa.querySelector('form').dispatchEvent(new dom.window.Event('submit'));
    await esperar();
    const criou = chamadas.find((c) => c.fn === 'criarUsuario');
    assert.ok(criou, 'a função de criar precisa ter sido chamada');
    assert.equal(criou.dados.projetos, null, 'null = alcança tudo');
    caixa.remove();
  } finally {
    ESCOPO.usa = original;
  }
});

// A coleção dos projetos também é do produto: a carcaça não pode chutar um nome
// de coleção, que era exatamente como a palavra "blog" vazava para dentro dela.
test('sem coleção declarada, não há projeto nenhum para listar', async () => {
  const original = ESCOPO.colecao;
  ESCOPO.colecao = '';
  try {
    const caixa = document.createElement('div');
    await montarModulo(equipe, caixa, fake());
    await esperar();
    assert.ok(!caixinha(caixa, 'Projeto Um'), 'não pode listar coleção que ninguém declarou');
    assert.match(caixa.textContent, /Nenhum projeto cadastrado ainda/);
  } finally {
    ESCOPO.colecao = original;
  }
});

// ---- Os botões da tela de entrada ----
//
// O painel é desenhado a partir da lista `CONTATOS` de `base/suporte.js`. Estes
// testes seguram o encaixe: se a lista crescer e a tela não acompanhar (ou o
// contrário), o número cadastrado não vira botão nenhum e ninguém percebe até
// um cliente travado ligar.

test('o painel pede número e mensagem de CADA contato', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake());
  await esperar();
  for (const c of CONTATOS) {
    assert.ok(caixa.querySelector(`#${c.chave}-whatsapp`), `faltou o número do ${c.chave}`);
    assert.ok(caixa.querySelector(`#${c.chave}-mensagem`), `faltou a mensagem do ${c.chave}`);
  }
});

test('O AVISO DE QUE O NÚMERO FICA PÚBLICO está na tela, não num manual', async () => {
  // Quem preenche precisa saber, no instante em que preenche, que o número vai
  // ficar legível por qualquer um — é a única forma de a pessoa decidir usar o
  // número da empresa e não o celular pessoal dela.
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake());
  await esperar();
  assert.match(caixa.textContent, /vis[íi]veis para qualquer pessoa/i);
});

test('A PRÉVIA MOSTRA O LINK QUE VAI ABRIR, com o 55 já posto', async () => {
  // Sem ela, descobrir que o número saiu errado exige sair, abrir a tela de
  // entrada e clicar — e o número errado abre uma conversa com ninguém, sem
  // dizer que está errado.
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake());
  await esperar();
  const numero = caixa.querySelector('#financeiro-whatsapp');
  numero.value = '(11) 3333-4444';
  numero.dispatchEvent(new dom.window.Event('input'));
  assert.match(caixa.textContent, /Financeiro.*https:\/\/wa\.me\/551133334444/);
});

test('campo em branco avisa que o botão NÃO vai aparecer', async () => {
  const caixa = document.createElement('div');
  await montarModulo(equipe, caixa, fake());
  await esperar();
  assert.match(caixa.textContent, /o bot[ãa]o "Suporte" n[ãa]o aparece/i);
  assert.match(caixa.textContent, /o bot[ãa]o "Financeiro" n[ãa]o aparece/i);
});
