import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  FONTES,
  CAMPOS,
  ehCorValida,
  ehUrlSegura,
  escurecer,
  clarear,
  aplicarTema,
  carregarFamilia,
  carregarFontes,
  aplicarFavicon,
  lerIdentidade,
  FAMILIAS,
  familiasEscolhidas,
} from '../../base/identidade.js';

const dom = new JSDOM('<!doctype html><head></head><body></body>');
globalThis.document = dom.window.document;

// ---------------------------------------------------------------------------
// A lista branca tem DOIS donos, e eles não podem divergir
// ---------------------------------------------------------------------------

// Campo que existe só no painel: o banco recusa a gravação INTEIRA (hasOnly),
// com erro cru do Firestore na cara de quem preencheu. Campo que existe só na
// regra: o painel nunca manda, e a pessoa não entende por que não salva.
test('os campos da identidade batem com a lista branca da regra do banco', () => {
  const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const bloco = regras.slice(regras.indexOf('match /publico/identidade'));
  // O corte vai até o FECHA-COLCHETE DA LISTA, e não até o primeiro `]` do
  // arquivo — a lista cresceu para várias linhas, e o corte curto lia só a
  // primeira delas e dizia que faltavam campos que estavam lá.
  const inicio = bloco.indexOf('hasOnly');
  const lista = bloco.slice(inicio, bloco.indexOf(']', inicio));
  // O padrão aceita DÍGITO: sem ele, `logoCor2` era lido como `logoCor`, e a
  // comparação dizia que faltava um campo que estava lá — enquanto deixava
  // passar um campo de verdade que ninguém tinha declarado.
  const naRegra = [...lista.matchAll(/'([a-zA-Z0-9]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual([...CAMPOS].sort(), naRegra);
});

// ---------------------------------------------------------------------------
// Cor
// ---------------------------------------------------------------------------

test('só cor de verdade passa', () => {
  for (const boa of ['#fff', '#4f46e5', '#ABCDEF', '  #123456 ']) {
    assert.equal(ehCorValida(boa), true, boa);
  }
  for (const ruim of ['', 'azul', '4f46e5', '#12345', 'rgb(1,2,3)', null, undefined]) {
    assert.equal(ehCorValida(ruim), false, String(ruim));
  }
});

// Pedir "a cor" e "a cor do hover" e "a cor do gradiente" é pedir três decisões
// que ninguém quer tomar. O dono escolhe uma; as outras saem dela.
test('as cores derivadas saem de uma escolha só', () => {
  assert.equal(escurecer('#ffffff', 0.5), '#808080');
  assert.equal(escurecer('#000000'), '#000000');
  assert.match(clarear('#000000'), /^#[0-9a-f]{6}$/);
  assert.equal(clarear('#ffffff'), '#ffffff');
});

test('atalho de 3 dígitos funciona igual', () => {
  assert.equal(escurecer('#fff', 0.5), escurecer('#ffffff', 0.5));
});

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

// A raiz de mentira imita o que `aplicarTema` usa de um elemento: as variáveis
// de estilo e os atributos. Ela cresceu quando o tema claro/escuro entrou —
// guardar só as variáveis fazia o teste passar por cima de metade do trabalho.
function raizFalsa() {
  const props = {};
  const atributos = {};
  return {
    props,
    atributos,
    style: {
      setProperty: (k, v) => {
        props[k] = v;
      },
      removeProperty: (k) => {
        delete props[k];
      },
    },
    setAttribute: (k, v) => {
      atributos[k] = v;
    },
  };
}

test('a cor escolhida vira as quatro variáveis do tema', () => {
  const raiz = raizFalsa();
  aplicarTema({ corDestaque: '#ff0000' }, raiz);
  assert.equal(raiz.props['--cor-principal'], '#ff0000');
  assert.ok(raiz.props['--cor-principal-2']);
  assert.ok(raiz.props['--cor-principal-hover']);
  assert.match(raiz.props['--grad-principal'], /linear-gradient/);
});

// Identidade é enfeite: cor inválida não pode deixar a tela sem cor nenhuma.
test('cor inválida é IGNORADA — o tema padrão fica de pé', () => {
  const raiz = raizFalsa();
  aplicarTema({ corDestaque: 'javascript:alert(1)' }, raiz);
  assert.equal(raiz.props['--cor-principal'], undefined);
});

// A FAMÍLIA AGORA É SEMPRE ESCRITA, e isso mudou de propósito: identidade vazia
// cai na pilha do SISTEMA, que é uma escolha, e não uma ausência. Antes o token
// não era escrito e o valor vinha do CSS — dois lugares decidindo a mesma coisa.
test('identidade vazia, nula ou sem fonte cai na pilha do sistema', () => {
  for (const entrada of [null, undefined, {}, { fonte: 'nao-existe' }]) {
    const raiz = raizFalsa();
    aplicarTema(entrada, raiz);
    assert.match(raiz.props['--fonte'], /system-ui/, `falhou com ${JSON.stringify(entrada)}`);
    assert.match(raiz.props['--fonte-titulo'], /system-ui/);
  }
});

test('a fonte escolhida troca a família', () => {
  const raiz = raizFalsa();
  aplicarTema({ fonte: 'moderna' }, raiz);
  assert.match(raiz.props['--fonte'], /Poppins/);
});

test('fonte com título próprio preenche as duas variáveis', () => {
  const raiz = raizFalsa();
  aplicarTema({ fonte: 'editorial' }, raiz);
  assert.match(raiz.props['--fonte-titulo'], /Playfair/);
  assert.match(raiz.props['--fonte'], /Inter/);
});

test('todo par tem nome, motivo e as duas famílias', () => {
  for (const [chave, f] of Object.entries(FONTES)) {
    assert.ok(f.nome, chave);
    assert.ok(f.descricao, `${chave}: o par precisa dizer para que serve`);
    assert.ok(FAMILIAS[f.titulo], `${chave}: família de título desconhecida`);
    assert.ok(FAMILIAS[f.texto], `${chave}: família de texto desconhecida`);
    assert.ok(f.familia && f.familiaTitulo, chave);
  }
});

test('toda família tem nome e pilha de reserva; a folha é opcional', () => {
  for (const [chave, fam] of Object.entries(FAMILIAS)) {
    assert.ok(fam.nome, chave);
    // A pilha de reserva desenha enquanto a folha não chega — e se ela nunca
    // chegar. Uma serifada caindo numa sans genérica muda a cara do produto.
    assert.match(fam.pilha, /,/, `${chave}: sem reserva depois da vírgula`);
    if (fam.css) assert.match(fam.css, /^https:\/\/fonts\.googleapis\.com/, chave);
  }
});

// A do sistema é a única sem folha, e é o que a torna a mais rápida: zero
// pedido de rede, zero espera, zero texto invisível.
test('a família do sistema não baixa nada', () => {
  assert.equal(FAMILIAS.sistema.css, '');
  assert.equal(FONTES.padrao.titulo, 'sistema');
  assert.equal(FONTES.padrao.texto, 'sistema');
});

// ---------------------------------------------------------------------------
// A folha de fonte
// ---------------------------------------------------------------------------

// ⚠️ ESTE TESTE ACHOU UM ENGANO ANTIGO. Ele dizia "a padrão já vem no produto"
// — e não vinha: o produto declarava `"Inter", system-ui, …` e NUNCA baixava a
// Inter. O que todo mundo via desde o começo era a pilha do sistema, com o nome
// "Inter" ali de enfeite.
//
// Em vez de passar a baixá-la, a pilha do sistema virou a família padrão de
// verdade — a mais rápida que existe, e a letra que a pessoa já lê o dia
// inteiro no aparelho dela.
test('a fonte padrão não baixa folha nenhuma', () => {
  const head = dom.window.document.createElement('head');
  assert.equal(carregarFamilia('sistema', head), null);
  assert.equal(head.children.length, 0);
});

// E a que TEM folha, baixa.
test('família com folha entra no cabeçalho', () => {
  const head = dom.window.document.createElement('head');
  assert.ok(carregarFamilia('inter', head));
  assert.equal(head.children.length, 1);
});

// Só as que forem usadas: baixar as oito para usar duas seria pagar seis vezes
// por nada, e no 4G de quem está com pressa isso é segundo de tela em branco.
test('carrega só as famílias que a identidade usa', () => {
  const head = dom.window.document.createElement('head');
  const chaves = carregarFontes({ fonteTitulo: 'playfair', fonteTexto: 'inter' }, head);
  assert.deepEqual([...chaves].sort(), ['inter', 'playfair']);
  assert.equal(head.children.length, 2);
});

test('o mesmo par no título e no texto baixa uma folha só', () => {
  const head = dom.window.document.createElement('head');
  carregarFontes({ fonte: 'moderna' }, head);
  assert.equal(head.children.length, 1, 'Poppins nos dois lados é uma folha');
});

test('a folha entra uma vez só, mesmo pedindo duas', () => {
  const head = dom.window.document.createElement('head');
  carregarFamilia('poppins', head);
  carregarFamilia('poppins', head);
  assert.equal(head.querySelectorAll('link').length, 1);
});

test('fonte inventada não pendura nada', () => {
  const head = dom.window.document.createElement('head');
  carregarFamilia('comic-sans-do-mal', head);
  assert.equal(head.children.length, 0);
});

// ---------------------------------------------------------------------------
// Favicon e links
// ---------------------------------------------------------------------------

test('so https passa num site publicado', () => {
  const publicado = 'comunidade-ninja-digital.web.app';
  assert.equal(ehUrlSegura('https://x/y.png', publicado), true);
  assert.equal(ehUrlSegura('http://x/y.png', publicado), false);
  assert.equal(ehUrlSegura('javascript:alert(1)', publicado), false);
  assert.equal(ehUrlSegura('', publicado), false);
});

// O Storage do emulador devolve http://127.0.0.1:9199/... Com a regra estrita a
// imagem nao aparecia durante o desenvolvimento, e o emulador perdia a unica
// utilidade que tem: provar na tela antes de publicar.
test('no emulador, http de localhost passa — e SO de localhost', () => {
  assert.equal(ehUrlSegura('http://127.0.0.1:9199/v0/b/x/o/y.png', '127.0.0.1'), true);
  assert.equal(ehUrlSegura('http://localhost:9199/y.png', 'localhost'), true);
  assert.equal(ehUrlSegura('http://site-de-fora.com/y.png', '127.0.0.1'), false);
});

// A brecha nao pode viajar para producao: quem decide e o hostname da PAGINA.
test('NUM SITE PUBLICADO a brecha do emulador nao existe', () => {
  const publicado = 'comunidade-ninja-digital.web.app';
  assert.equal(ehUrlSegura('http://127.0.0.1:9199/y.png', publicado), false);
  assert.equal(ehUrlSegura('http://localhost/y.png', publicado), false);
});

test('favicon inseguro é recusado', () => {
  const d = new JSDOM('<!doctype html><head></head>').window.document;
  assert.equal(aplicarFavicon({ faviconUrl: 'javascript:alert(1)' }, d), null);
  assert.equal(aplicarFavicon({}, d), null);
});

test('favicon válido é pendurado, e reaproveita a tag que já existe', () => {
  const d = new JSDOM('<!doctype html><head><link rel="icon" href="/velho.png"></head>').window
    .document;
  aplicarFavicon({ faviconUrl: 'https://x/novo.png' }, d);
  assert.equal(d.querySelectorAll('link[rel="icon"]').length, 1);
  assert.equal(d.querySelector('link[rel="icon"]').href, 'https://x/novo.png');
});

// ---------------------------------------------------------------------------
// A leitura nunca derruba a tela
// ---------------------------------------------------------------------------

// Identidade é enfeite. Se a leitura falhar, a pessoa tem que continuar
// entrando e assistindo aula — com o tema padrão.
test('leitura que falha devolve vazio, e não estoura', async () => {
  const quebrado = {
    doc: () => {
      throw new Error('sem rede');
    },
    getDoc: async () => {},
  };
  assert.deepEqual(await lerIdentidade(null, quebrado), {});
});

test('documento que não existe devolve vazio', async () => {
  const vazio = { doc: () => 'ref', getDoc: async () => ({ exists: () => false }) };
  assert.deepEqual(await lerIdentidade(null, vazio), {});
});

test('documento que existe devolve os dados', async () => {
  const cheio = {
    doc: () => 'ref',
    getDoc: async () => ({ exists: () => true, data: () => ({ corDestaque: '#123456' }) }),
  };
  assert.deepEqual(await lerIdentidade(null, cheio), { corDestaque: '#123456' });
});

// ---------------------------------------------------------------------------
// CLARO OU ESCURO — escolha do DONO, e não do aluno
// ---------------------------------------------------------------------------
//
// Não é preferência de usuário: é a identidade do produto, como a cor da marca
// e a fonte. Uma área de membros em que cada pessoa escolhe o tema é uma área
// de membros sem cara nenhuma.

test('o tema vira um atributo na raiz, e não uma pilha de cores', () => {
  const raiz = raizFalsa();
  aplicarTema({ tema: 'escuro' }, raiz);
  assert.equal(raiz.atributos['data-tema'], 'escuro');
  // O escuro é um bloco de CSS, e não quinze campos gravados no banco: gravar
  // cada cor daria quinze jeitos de o contraste sair errado.
  assert.equal(raiz.props['--cor-fundo'], undefined);
});

test('tema ausente ou inventado cai no claro', () => {
  for (const valor of [undefined, '', 'roxo', null]) {
    const raiz = raizFalsa();
    aplicarTema({ tema: valor }, raiz);
    assert.equal(raiz.atributos['data-tema'], 'claro', `falhou com ${JSON.stringify(valor)}`);
  }
});

test('as três áreas pintam quando têm cor, e só então', () => {
  const raiz = raizFalsa();
  aplicarTema({ corTopo: '#101018', corRodape: '#f0f0f5' }, raiz);
  assert.equal(raiz.props['--cor-topo'], '#101018');
  assert.equal(raiz.props['--cor-rodape'], '#f0f0f5');
  // Campo vazio quer dizer "segue o tema", e não "pinta de nada".
  assert.equal(raiz.props['--cor-conteudo'], undefined);
});

// `<input type=color>` não tem estado "nenhuma cor": ele sempre devolve alguma.
// Sem a limpeza, quem pintasse o topo por engano nunca voltaria ao tema.
test('apagar a cor devolve a área ao tema', () => {
  const raiz = raizFalsa();
  aplicarTema({ corTopo: '#101018' }, raiz);
  assert.equal(raiz.props['--cor-topo'], '#101018');
  aplicarTema({ corTopo: '' }, raiz);
  assert.equal(raiz.props['--cor-topo'], undefined);
});

test('cor de área inválida é ignorada, como a de destaque', () => {
  const raiz = raizFalsa();
  aplicarTema({ corTopo: 'azul-marinho' }, raiz);
  assert.equal(raiz.props['--cor-topo'], undefined);
});

// ---------------------------------------------------------------------------
// O LOGO ESCRITO
// ---------------------------------------------------------------------------
//
// Para quem não tem imagem de logo — que é a maioria no começo. Sem ele, o
// produto mostrava o nome que veio no arquivo de configuração, e trocá-lo
// exigia editar código. Marca é decisão de dono, não de programador.

// A marca costuma ser o lugar onde o cliente já decidiu tudo: a fonte do logo
// dele pode não ser a fonte de leitura do produto, e a cor dele pode não ser a
// cor de destaque dos botões.
test('o logo escrito tem cor e fonte próprias', () => {
  const raiz = raizFalsa();
  aplicarTema({ logoCor: '#c8a04b', logoFonte: 'playfair' }, raiz);
  assert.equal(raiz.props['--cor-logo'], '#c8a04b');
  assert.ok(raiz.props['--fonte-logo'], 'a família da fonte escolhida entra no token');
});

// Sem escolha, ele HERDA: cor = o gradiente da marca, fonte = a do site. Os
// tokens ficam de fora, e o `var(--cor-logo, var(--grad-principal))` do CSS faz
// o resto.
test('sem escolha, o logo herda a cor e a fonte do site', () => {
  const raiz = raizFalsa();
  aplicarTema({ logoCor: '', logoFonte: '' }, raiz);
  assert.equal(raiz.props['--cor-logo'], undefined);
  assert.equal(raiz.props['--fonte-logo'], undefined);
});

test('apagar a cor do logo devolve o gradiente da marca', () => {
  const raiz = raizFalsa();
  aplicarTema({ logoCor: '#c8a04b' }, raiz);
  aplicarTema({ logoCor: '' }, raiz);
  assert.equal(raiz.props['--cor-logo'], undefined);
});

test('cor e fonte inválidas no logo são ignoradas', () => {
  const raiz = raizFalsa();
  aplicarTema({ logoCor: 'dourado', logoFonte: 'comic-sans' }, raiz);
  assert.equal(raiz.props['--cor-logo'], undefined);
  assert.equal(raiz.props['--fonte-logo'], undefined);
});

// Os campos novos precisam estar na lista branca — que é o gêmeo da regra do
// banco. Só num lado, a gravação inteira é recusada com erro cru na cara de
// quem preencheu.
test('os campos do logo escrito estão na lista de campos', () => {
  for (const campo of ['logoTexto', 'logoCor', 'logoFonte']) {
    assert.ok(CAMPOS.includes(campo), `"${campo}" ficou fora de CAMPOS`);
  }
});

// A escada de sempre: do mais específico ao mais genérico. Quem escolhe um par
// e não mexe em mais nada tem duas fontes coerentes; quem quiser trocar só o
// título, troca só o título.
test('a escolha individual ganha do par, e o par ganha do padrão', () => {
  // só o par
  const doPar = familiasEscolhidas({ fonte: 'editorial' });
  assert.equal(doPar.titulo, FAMILIAS.playfair);
  assert.equal(doPar.texto, FAMILIAS.inter);

  // o par, com o título trocado à mão
  const misto = familiasEscolhidas({ fonte: 'editorial', fonteTitulo: 'archivo' });
  assert.equal(misto.titulo, FAMILIAS.archivo, 'a escolha individual manda');
  assert.equal(misto.texto, FAMILIAS.inter, 'o resto continua vindo do par');

  // nada escolhido
  const padrao = familiasEscolhidas({});
  assert.equal(padrao.titulo, FAMILIAS.sistema);
  assert.equal(padrao.texto, FAMILIAS.sistema);
});

// ⚠️ COMPATIBILIDADE: instalação antiga só tem `fonte` gravado, e não pode
// perder a cara por causa de campos que não existiam quando ela foi
// configurada.
test('identidade antiga, só com o par gravado, continua funcionando', () => {
  const antiga = familiasEscolhidas({ fonte: 'moderna' });
  assert.equal(antiga.titulo, FAMILIAS.poppins);
  assert.equal(antiga.texto, FAMILIAS.poppins);
});

test('família inventada na escolha individual cai no par', () => {
  const r = familiasEscolhidas({ fonte: 'editorial', fonteTitulo: 'comic-sans' });
  assert.equal(r.titulo, FAMILIAS.playfair);
});

// ---------------------------------------------------------------------------
// TODA SEÇÃO DA TELA TEM QUE APARECER **E** TER CONTEÚDO
// ---------------------------------------------------------------------------
//
// ⚠️ SEÇÃO MONTADA E NÃO ANEXADA É TRABALHO INVISÍVEL — e não quebra nada.
//
// Aconteceu em 07/09/2026: uma limpeza removeu por acidente a linha
// `secaoTema.append(...)`, junto da seção vizinha que estava sendo apagada de
// verdade. O resultado passou uma semana no ar sem ninguém ver o defeito, e sem
// um único teste vermelho:
//
//   "O visual do site" continuava na tela, com título e explicação, e VAZIA por
//   dentro. Tema claro/escuro, cor de destaque e fontes tinham sumido da
//   Identidade — mas continuavam sendo construídos, ligados à prévia e SALVOS
//   no banco ao clicar em Salvar. Só não estavam na tela.
//
// São dois erros diferentes, e um teste que cobre só o primeiro não pega o
// segundo:
//
//   seção criada e não anexada à CAIXA   → a seção inteira some da tela
//   seção anexada e sem nada DENTRO      → sobra um título órfão
//
// Este teste lê o código-fonte porque a tela fala com o Firebase e não monta em
// jsdom. É a mesma escolha de `navegacao.test.js` para as abas: cobrar do
// arquivo o que a linguagem não cobra.

const fonteIdentidade = readFileSync(
  new URL('../../modules/identidade/module.js', import.meta.url),
  'utf8',
);

const secoesDaTela = () =>
  [...fonteIdentidade.matchAll(/const (secao[A-Za-z]+) = bloco\(/g)].map((m) => m[1]);

test('toda seção da Identidade é anexada à tela', () => {
  const secoes = secoesDaTela();
  assert.ok(secoes.length >= 4, 'a varredura precisa encontrar as seções de verdade');

  // ⚠️ TODAS as chamadas, e não a primeira. A tela usa `caixa.append` mais de
  // uma vez, e casar só a primeira reprovava seções que estavam corretas —
  // um teste que acusa errado é abandonado tão rápido quanto um que não acusa.
  const montagem = [...fonteIdentidade.matchAll(/caixa\.append\([\s\S]*?\);/g)]
    .map((m) => m[0])
    .join(' ');

  for (const secao of secoes) {
    assert.ok(
      montagem.includes(secao),
      `"${secao}" é criada e nunca entra na tela — seção montada e não anexada ` +
        'é trabalho invisível',
    );
  }
});

test('nenhuma seção da Identidade aparece vazia', () => {
  for (const secao of secoesDaTela()) {
    // `append(` e `appendChild(` contam: a seção das cores monta as linhas num
    // laço e usa `appendChild`. Cobrar só uma das duas formas seria cobrar
    // estilo de escrita, e não o que importa — que é ter conteúdo.
    const temConteudo = new RegExp(String.raw`${secao}\.append(Child)?\(\s*\w`).test(
      fonteIdentidade,
    );
    assert.ok(
      temConteudo,
      `"${secao}" desenha título e explicação, e não recebe campo nenhum. ` +
        'Um título órfão na tela é pior que a seção não existir: quem procura ' +
        'o ajuste ali conclui que ele foi removido do produto.',
    );
  }
});
