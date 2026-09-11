import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';

// A Base nasceu SEM NENHUMA regra para tela pequena. A lateral tinha 248px
// fixos e num celular de 375px sobravam 127px de conteudo -- cartao com uma
// palavra por linha. O problema so apareceu depois que um modulo inteiro ja
// tinha sido construido em cima.
//
// Estes testes existem para isso nao acontecer de novo. Eles nao medem layout
// (o jsdom nao calcula), mas cobram as regras que, faltando, quebram o celular.

const lerCss = (n) => readFileSync(new URL(`../../styles/${n}`, import.meta.url), 'utf8');
const todosOsCss = () =>
  readdirSync(new URL('../../styles/', import.meta.url))
    .filter((f) => f.endsWith('.css'))
    .map((f) => ({ nome: f, texto: lerCss(f) }));

test('a Base tem regra para tela pequena', () => {
  assert.match(
    lerCss('base.css'),
    /@media[^{]*max-width/,
    'sem @media, a lateral de 248px come a tela inteira do celular',
  );
});

test('a lateral vira uma coluna no celular', () => {
  const css = lerCss('base.css');
  const media = css.slice(css.search(/@media[^{]*max-width/));
  assert.match(
    media,
    /\.app-shell\s*\{[^}]*grid-template-columns:\s*1fr/,
    'a grade de duas colunas precisa virar uma so',
  );
  assert.match(
    media,
    /\.app-sidebar\s*\{[^}]*position:\s*fixed/,
    'a lateral precisa sair do fluxo para virar gaveta',
  );
});

test('o sanduiche aparece no celular e some no desktop', () => {
  const css = lerCss('base.css');
  const base = css.indexOf('.app-sanduiche {');
  const media = css.search(/@media[^{]*max-width/);
  assert.ok(base > -1, 'falta o botao sanduiche');
  assert.ok(
    base < media,
    'a regra base do sanduiche tem que vir ANTES do @media -- em CSS de mesma ' +
      'forca quem vem depois vence, e `display:none` escrito depois mata o ' +
      '`inline-flex` do celular. Ja aconteceu.',
  );
});

// A armadilha generica: grade de 3+ colunas fixas. Foi assim que o quadro de
// conteudos (4 colunas) ficou ilegivel mesmo depois de consertar a lateral.
test('nenhuma grade de 3+ colunas fica sem regra para celular', () => {
  for (const { nome, texto } of todosOsCss()) {
    const semMedia = texto.split(/@media/)[0];
    const grades = semMedia.match(/grid-template-columns:\s*repeat\((\d+)/g) || [];
    for (const g of grades) {
      const n = Number(g.match(/repeat\((\d+)/)[1]);
      if (n < 3) continue;
      assert.match(
        texto,
        /@media[^{]*max-width/,
        `${nome} tem grade de ${n} colunas e nenhuma regra para tela pequena — ` +
          'no celular cada coluna fica com poucas dezenas de pixels',
      );
    }
  }
});

// O veu e filho da GRADE do shell e vem antes do conteudo no HTML. Se ele
// existir no desktop, ocupa a celula da direita e empurra o conteudo para a
// linha de baixo -- embaixo do menu. Aconteceu: eu so tinha dado `position:
// fixed` dentro do @media, e no desktop ele virou um bloco normal da grade.
// Invisivel nao basta; tem que sair da grade.
test('o veu nao ocupa celula da grade no desktop', () => {
  const css = lerCss('base.css');
  const media = css.search(/@media[^{]*max-width/);
  const antesDoMedia = css.slice(0, media);
  assert.match(
    antesDoMedia,
    /\.app-veu\s*\{[^}]*display:\s*none/,
    'o veu precisa de `display: none` FORA do @media, senao rouba a vaga do conteudo',
  );
});

// ===========================================================================
// OS OBRIGATÓRIOS DA CASA (guia da agência, Bloco 12 e Parte 8.5)
// ===========================================================================
//
// Não são acabamento: os três primeiros decidem se a pessoa CONSEGUE usar o
// sistema. Faltavam todos até 20/08/2026, e nada quebrava — é exatamente por
// isso que precisam de teste.

test('movimento reduzido é respeitado', () => {
  assert.match(
    lerCss('base.css'),
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    'quem marca essa preferência costuma ter um motivo de saúde, não de gosto',
  );
});

test('o foco do teclado é desenhado', () => {
  assert.match(
    lerCss('base.css'),
    /:focus-visible\s*\{[^}]*outline/,
    'sem anel de foco, quem navega por teclado fica perdido no meio da tela',
  );
});

test('existe atalho para pular a barra lateral', () => {
  assert.match(lerCss('base.css'), /\.pular-para-conteudo/);
  assert.match(
    readFileSync(new URL('../../index.html', import.meta.url), 'utf8'),
    /class="pular-para-conteudo"/,
    'o atalho só serve se estiver no HTML, e como primeira parada do Tab',
  );
});

test('`hidden` esconde de verdade', () => {
  assert.match(
    lerCss('base.css'),
    /\[hidden\]\s*\{\s*display:\s*none\s*!important/,
    'sem isto, uma regra de classe faz o elemento reaparecer com hidden marcado ' +
      '— foi o "ponto fantasma" do campo de imagem',
  );
});

// ===========================================================================
// O CATÁLOGO: as ações não podem sumir
// ===========================================================================
//
// A primeira versão escondia as setas de ordenar com `opacity: 0` até o mouse
// passar. Limpou a tela e cegou a função: quem nunca viu a seta não sabe que dá
// para reordenar, e ninguém varre a tela com o mouse à procura de botão
// escondido. O certo é baixar o volume, não desligar o som.

test('as ações do catálogo ficam visíveis em repouso', () => {
  const css = lerCss('modulos.css');
  const regra = css.slice(css.indexOf('.cat-acoes {'), css.indexOf('.cat-acoes {') + 200);
  assert.equal(
    /opacity:\s*0\s*;/.test(regra),
    false,
    'controle invisível é controle que ninguém descobre',
  );
});
// ⚠️ DOIS TESTES SAÍRAM DAQUI com as telas que eles cobriam — o catálogo
// (`.cat-seta`) e o Ao Vivo (`.live-tela`). As duas LIÇÕES sobrevivem a elas, e
// valem para qualquer tela que se construa nesta carcaça:
//
// 1. COR DE REPOUSO MORA DENTRO DA DEFINIÇÃO DO ELEMENTO, e não numa regra
//    solta antes dela. Regra solta é sobrescrita pela de baixo e some sem erro
//    nenhum — CSS não reclama, ele desiste calado (ver playbook 1.8).
//
// 2. QUADRO DE VÍDEO SE AMARRA À ALTURA DISPONÍVEL, em `dvh` e não em `vh`.
//    Achado medindo de verdade: em largura cheia, um 16:9 num notebook de
//    1440×900 fica com ~640px de altura e o botão de play encosta na beirada.
//    Numa tela cujo trabalho é mostrar um vídeo, rolar para achar o play é o
//    pior lugar possível para um scroll. `vh` ignora a barra do navegador no
//    celular; `dvh` não.

// ===========================================================================
// CLASSE SEM CSS: o lint que faltava
// ===========================================================================
//
// ELE NASCE DE UM ERRO MEU, e é por isso que existe.
//
// Ao redesenhar o catálogo, apaguei o CSS de `.conteudo-linha`, `.conteudo-nome`
// e companhia — que a tela de Bônus e Produtos Validados ainda usava. Aquela
// tela ficou sem estilo nenhum: os nomes viraram botões cinzas de navegador.
// Nada quebrou, nenhum teste caiu, e eu não vi porque só tirei foto da aba que
// tinha mexido.
//
// Rodando, este lint achou o estrago inteiro — e mais cinco classes da tela de
// Suporte, que eu tinha construído sem escrever CSS para elas.
//
// Ele é grosseiro de propósito: só olha nome literal em `className = '…'` e
// `classList.add('…')`. Não pega classe montada com template, e tudo bem —
// pegar a maioria é o que separa "descobri no teste" de "o cliente me contou".

test('toda classe escrita no JS tem CSS em algum lugar', () => {
  const pastas = ['modules', 'base', 'ui'];
  const css = todosOsCss()
    .map((c) => c.texto)
    .join('\n');

  const jsDe = (dir, saida = []) => {
    for (const nome of readdirSync(new URL(`../../${dir}/`, import.meta.url))) {
      const cam = `${dir}/${nome}`;
      const url = new URL(`../../${cam}`, import.meta.url);
      try {
        if (nome.endsWith('.js')) saida.push({ cam, txt: readFileSync(url, 'utf8') });
        else if (!nome.includes('.')) jsDe(cam, saida);
      } catch {
        /* não é pasta nem arquivo legível */
      }
    }
    return saida;
  };

  const orfas = [];
  let quantas = 0;
  for (const dir of pastas) {
    for (const { cam, txt } of jsDe(dir)) {
      const achados = [
        ...txt.matchAll(/className\s*=\s*'([^'${}]+)'/g),
        ...txt.matchAll(/classList\.add\(\s*'([^'${}]+)'/g),
      ];
      for (const m of achados) {
        for (const classe of m[1].trim().split(/\s+/)) {
          if (!classe) continue;
          quantas += 1;
          if (!css.includes(`.${classe}`)) orfas.push(`${classe} (${cam})`);
        }
      }
    }
  }

  // Se a varredura parar de casar, ela passaria vazia dizendo que está tudo bem.
  assert.ok(quantas > 100, `só ${quantas} classes varridas — o lint quebrou`);
  assert.deepEqual(
    orfas,
    [],
    'classe usada no JS sem regra em styles/: ou falta o CSS, ou a classe é enfeite',
  );
});

// ===========================================================================
// A LARGURA DA COLUNA DE CONTEÚDO
// ===========================================================================
//
// Sem teto, uma linha de texto atravessa 1600px num monitor grande e vira
// ilegível: o olho perde a linha ao voltar para a esquerda, e a pessoa relê sem
// perceber. Medido depois de aplicado — 1280: 974px · 1440: 1110px (a tela
// fica cheia) · 1920 e 2560: 1110px centralizados.

test('a coluna de conteúdo tem teto', () => {
  assert.match(lerCss('tokens.css'), /--container:\s*1120px/);
  assert.match(
    lerCss('base.css'),
    /\.app-content\s*\{[^}]*--container/,
    'o teto precisa estar aplicado, e não só declarado',
  );
});

// A diferença aparece na barra de rolagem: com `max-width` + `margin:auto` ela
// desce pelo MEIO da tela, junto da caixa estreitada. Com padding elástico, a
// área que rola continua sendo a tela inteira e a barra fica na borda.
//
// ⚠️ E A FOLGA É DOS FILHOS, e não do container que rola. `100%` dentro de
// `calc()` mede o elemento em que a conta ACONTECE: no container era a área
// inteira; no rodapé, já era a caixa de dentro do padding. As duas contas davam
// números diferentes, e o rodapé ficava encolhido no meio da tela.
test('o teto vem do padding, para a barra de rolagem ficar na borda', () => {
  const css = lerCss('base.css');
  const inicio = css.indexOf('.app-content {');
  const container = css.slice(inicio, css.indexOf('}', inicio));

  assert.match(
    container,
    /--folga-lateral:[^;]*max\(/,
    'padding elástico com piso — em tela estreita a conta daria negativo',
  );
  assert.equal(/max-width/.test(container), false);
  // O container NÃO tem padding LATERAL: quem o tem são o miolo e o rodapé, e é
  // isso que faz o rodapé atravessar a tela.
  //
  // ⚠️ O DE CIMA É OUTRA HISTÓRIA, e por isso a conferência mudou de "nenhum
  // padding" para "nenhum padding lateral". O cabeçalho passou a ficar POR CIMA
  // do conteúdo — é o que deixa a imagem do hero correr por baixo dele —, e o
  // `padding-top` é o espaço que as OUTRAS telas precisam para não nascerem
  // escondidas atrás da faixa. Ele não mexe na largura, então a barra de
  // rolagem continua na borda: é o lado que este teste protege.
  assert.equal(/padding:/.test(container), false, 'o padding em atalho voltou ao container');
  assert.equal(
    /padding-(left|right|inline)/.test(container),
    false,
    'o padding lateral saiu do container: a barra de rolagem sai da borda',
  );
  assert.match(
    container,
    /padding-top:\s*var\(--altura-topo\)/,
    'sem este respiro, toda tela que não é a Inicial nasce atrás do cabeçalho',
  );

  // O rodapé resolve a folga com padding próprio, e é isso que o faz atravessar
  // a tela em vez de virar um cartão perdido no meio.
  const iRodape = css.indexOf('.app-rodape {');
  assert.match(
    css.slice(iRodape, css.indexOf('}', iRodape)),
    /padding:[^;]*var\(--folga-lateral\)/,
    '.app-rodape precisa resolver a folga por conta própria',
  );

  // ⚠️ O MIOLO RESOLVE A FOLGA EM COLUNAS, e não em padding — porque padding
  // não dá para atravessar.
  //
  // O hero "de ponta a ponta" precisa ir da borda do menu à borda da página, e
  // com padding ele teria que adivinhar o tamanho da folga com margem negativa.
  // Essa conta usa `100%`, que dentro do hero já vale a coluna de leitura: ele
  // sangrava 24px por lado e parava em 1168px numa tela de 1920.
  const iMiolo = css.indexOf('.app-miolo {');
  const miolo = css.slice(iMiolo, css.indexOf('}', iMiolo));
  assert.match(miolo, /grid-template-columns:/, 'o miolo precisa das colunas nomeadas');
  for (const linha of ['sangria-inicio', 'coluna-inicio', 'coluna-fim', 'sangria-fim']) {
    assert.ok(miolo.includes(`[${linha}]`), `a linha "${linha}" sumiu da grade do miolo`);
  }
  assert.equal(
    /padding:[^;]*var\(--folga/.test(miolo),
    false,
    'a folga do miolo voltou a ser padding: o hero perde a sangria de novo',
  );
});

// ===========================================================================
// O HOVER NO ESCURO SEGUE A COR DE DESTAQUE
// ===========================================================================
//
// No claro, o hover é um cinza levíssimo sobre branco — e funciona, porque
// qualquer escurecimento sobre branco é visível.
//
// No escuro esse raciocínio quebra: clarear um pouquinho um fundo já escuro dá
// uma diferença que quase ninguém enxerga, e o produto passa a parecer que não
// responde ao mouse. Fundo escuro precisa de COR para mostrar reação.

test('o hover tem token próprio, e não o cinza da superfície', () => {
  const css = todosOsCss()
    .map((c) => c.texto)
    .join('\n');
  assert.match(lerCss('tokens.css'), /--cor-hover:/);
  // Nenhum hover pode ter voltado a pintar com a superfície: no escuro ele
  // sumiria, e o teste é o que impede a volta silenciosa.
  assert.equal(
    /:hover[^{]*\{[^}]*background:\s*var\(--cor-superficie\)/.test(css),
    false,
    'hover pintando com a superfície some no tema escuro',
  );
});

// A cor vem da MARCA, então acompanha o cliente: quem trocar o acento para
// verde ganha hover verde, sem tocar em nenhuma linha de CSS.
test('no escuro, o hover é a cor de destaque com transparência', () => {
  const tokens = lerCss('tokens.css');
  const escuro = tokens.slice(tokens.indexOf('[data-tema="escuro"]'));
  assert.match(
    escuro,
    /--cor-hover:\s*color-mix\([^)]*--cor-principal/,
    'o hover do escuro precisa derivar da cor da marca',
  );
});

// Sombra preta sobre fundo preto não aparece: sem a borda de destaque, o card
// não dava sinal nenhum de estar sob o mouse.
//
// ⚠️ O ANEL MUDOU DE LUGAR — do card inteiro para a CAPA —, mas as duas
// exigências continuam as mesmas, e é por isso que este teste continua aqui:
//
//   1. tem que reagir por BORDA, e não só por sombra (o tema escuro depende)
//   2. a borda tem que existir EM REPOUSO, senão ela empurra 1px a cada
//      passada do mouse — um tremor que ninguém sabe nomear e todo mundo sente
// ⚠️ A MESMA REGRA VALE PARA O FEED, e por muito tempo não valia.
//
// A lista de assuntos da Comunidade reagia SÓ por fundo — e no tema claro
// `--cor-hover` é `--cor-superficie`, um quase-branco sobre outro quase-branco.
// O efeito existia no código e não existia na tela.
//
// Fundo sozinho não basta em nenhum dos dois temas: no claro ele some, no
// escuro ele funciona. Quem dá o sinal nos dois é a BORDA, porque muda de COR
// e não de claridade.
test('a lista da Comunidade reage por borda, e não só por fundo', () => {
  const css = lerCss('modulos.css');
  const i = css.indexOf('.feed-item:hover {');
  assert.ok(i > 0, 'o feed precisa de um estado de hover');
  const regra = css.slice(i, css.indexOf('}', i));
  assert.match(regra, /border-color/, 'sem borda, o hover some no tema claro');

  // A borda existe em repouso: aparecer só no hover empurraria a linha 1px a
  // cada passada do mouse.
  const j = css.indexOf('.feed-item {');
  assert.match(css.slice(j, css.indexOf('}', j)), /border:\s*1px solid var\(--cor-borda\)/);

  // Teclado enxerga o que o mouse enxerga.
  assert.match(css, /\.feed-item:focus-visible \{[^}]*border-color/);
});

test('o card também reage por borda, e não só por sombra', () => {
  const css = lerCss('modulos.css');
  const i = css.indexOf('.card-vitrine:hover .card-capa');
  assert.ok(i > 0, 'o anel do hover agora mora na capa');
  assert.match(css.slice(i, css.indexOf('}', i)), /border-color/);

  // Em repouso a capa já tem a borda; o hover só troca a COR dela.
  const bloco = css.match(
    /\.card-capa\s*\{[\s\S]*?aspect-ratio:[\s\S]*?border:\s*1px solid var\(--cor-borda\)/,
  );
  assert.ok(bloco, 'a capa precisa ter a borda em repouso e a proporção do card');
  assert.match(bloco[0], /aspect-ratio/);
  assert.match(bloco[0], /border:\s*1px solid var\(--cor-borda\)/);
});
