// A GEOMETRIA DA CASCA, medida num navegador de verdade.
//
// Tudo aqui é número: onde a coisa começa, onde termina, quanto ela ocupa.
// Nenhuma destas contas pode ser feita em jsdom — ele não calcula layout —, e
// foi justamente por isso que os defeitos que este arquivo cobre chegaram à
// produção e precisaram ser achados a olho, uma conversa de cada vez.
//
// Roda com `npm run test:medida`. Leva alguns segundos: cada caso abre o
// navegador uma vez. É o preço de medir em vez de supor.

import { test } from 'node:test';
import assert from 'node:assert';
import { medirTela, opacidadeDe, LARGURA_BARRA_LATERAL, MIOLO_DE_AULA } from './_navegador.js';

const HERO_SANGRIA =
  '<section class="hero hero--com-imagem"><h1 class="hero-frase">Oi</h1></section>' +
  '<section class="secao"><h2 class="secao-titulo">Cursos</h2></section>';

// ===========================================================================
// O HERO "DE PONTA A PONTA"
// ===========================================================================

// ⚠️ O DEFEITO QUE ORIGINOU ESTE ARQUIVO.
//
// A sangria era margem negativa do tamanho de `--folga-lateral`, e essa conta
// usa `100%` — que, DENTRO do hero, já era a coluna de leitura de 1120px, e não
// a área toda. Ele sangrava 24px por lado e parava em 1168px numa tela de 1920,
// quando devia ir de borda a borda. Em janela pequena parecia certo.
test('vai da borda do menu até a borda da página', () => {
  const m = medirTela({ largura: 1920, hero: 'sangria', miolo: HERO_SANGRIA });
  const hero = m.alvos['.hero'];

  assert.equal(hero.esquerda, LARGURA_BARRA_LATERAL, 'o hero tem que encostar na barra lateral');
  assert.equal(
    hero.direita,
    m.janela.largura,
    'o hero tem que encostar na borda direita da janela',
  );
  assert.equal(hero.raio, '0px', 'sangria com canto arredondado deixa falha nas quinas');
});

// A largura só prova metade: um hero largo com o texto colado na borda
// esquerda seria igualmente errado. O respiro interno tem que devolver a folga,
// para a frase nascer alinhada com o resto da página.
test('a faixa é larga, mas a frase continua na coluna de leitura', () => {
  const m = medirTela({ largura: 1920, hero: 'sangria', miolo: HERO_SANGRIA });
  const hero = m.alvos['.hero'];
  const secao = m.alvos['.secao'];

  const inicioDoTexto = hero.esquerda + parseFloat(hero.respiroLados);
  assert.equal(
    Math.round(inicioDoTexto),
    secao.esquerda,
    'a frase do hero tem que começar onde começa o título da seção abaixo',
  );
});

// O outro modelo não pode ter mudado. Quem escolheu o cartão escolheu a
// moldura, e a grade nova do miolo não podia levá-la junto.
test('o hero "dentro da caixa" continua um cartão na coluna de leitura', () => {
  const m = medirTela({ largura: 1920, hero: 'caixa' });
  const hero = m.alvos['.hero'];
  const secao = m.alvos['.secao'];

  assert.equal(hero.esquerda, secao.esquerda, 'o cartão acompanha o resto do conteúdo');
  assert.equal(hero.largura, secao.largura);
  assert.notEqual(hero.raio, '0px', 'o cartão tem cantos arredondados');
  assert.ok(hero.direita < m.janela.largura, 'o cartão não encosta na borda');
});

// ===========================================================================
// A COLUNA DE LEITURA
// ===========================================================================

// Sem teto, uma linha de texto atravessa 1600px num monitor grande e vira
// ilegível. O teto é `--container: 1120px`.
test('o conteúdo tem teto de largura, e ele fica centralizado', () => {
  const m = medirTela({ largura: 2560, hero: 'caixa' });
  const secao = m.alvos['.secao'];
  const conteudo = m.alvos['.app-content'];

  assert.equal(secao.largura, 1120, 'a coluna de leitura tem que respeitar o teto');
  const folgaEsquerda = secao.esquerda - conteudo.esquerda;
  const folgaDireita = conteudo.direita - secao.direita;
  assert.equal(folgaEsquerda, folgaDireita, 'as duas folgas têm que ser iguais');
});

// O rodapé atravessa a tela como a faixa do topo. Ele já ficou encolhido no
// meio, com dois vãos enormes dos lados, por usar a folga mínima em vez da real.
test('o rodapé atravessa a área de conteúdo inteira', () => {
  const m = medirTela({ largura: 1920, hero: 'caixa' });
  const rodape = m.alvos['.app-rodape'];
  const conteudo = m.alvos['.app-content'];

  assert.equal(rodape.esquerda, conteudo.esquerda);
  assert.equal(rodape.direita, conteudo.direita);
});

// ===========================================================================
// O CABEÇALHO FLUTUANDO POR CIMA DO CONTEÚDO
// ===========================================================================

// A faixa deixou de ocupar uma linha própria da grade e passou a flutuar sobre
// o conteúdo — é o que permite a imagem do hero correr por baixo dela. O respiro
// do conteúdo é o que impede TODA outra tela de nascer escondida atrás dela.
test('nada nasce atrás da faixa do topo', () => {
  const m = medirTela({ largura: 1920, hero: 'caixa' });
  const cabecalho = m.alvos['.app-header'];
  const hero = m.alvos['.hero'];

  assert.ok(
    hero.topo >= cabecalho.altura,
    `o hero começa em ${hero.topo}px e a faixa termina em ${cabecalho.altura}px`,
  );
});

// ⚠️ O EFEITO COLATERAL QUE NÃO APARECE NA PÁGINA INICIAL.
//
// Com a faixa flutuando, a régua do `sticky` passou a começar embaixo dela:
// quem grudava em `top: 12px` grudava ATRÁS do cabeçalho, e o índice da aula
// perdia as primeiras linhas.
test('o índice da aula gruda abaixo da faixa, e não atrás dela', () => {
  const m = medirTela({ largura: 1920, hero: 'caixa', miolo: MIOLO_DE_AULA });
  const indice = m.alvos['.aula-indice'];
  const cabecalho = m.alvos['.app-header'];

  assert.equal(indice.posicao, 'sticky');
  assert.ok(
    parseFloat(indice.grudaEm) >= cabecalho.altura,
    `o índice gruda em ${indice.grudaEm}, e a faixa tem ${cabecalho.altura}px`,
  );
});

// ===========================================================================
// O HERO POR BAIXO DA FAIXA
// ===========================================================================

test('no modo de ponta a ponta, a imagem começa no topo da tela', () => {
  const m = medirTela({ largura: 1920, hero: 'sangria', heroTopo: true, miolo: HERO_SANGRIA });
  const hero = m.alvos['.hero'];

  assert.equal(hero.topo, 0, 'a imagem tem que subir até o topo, por baixo da faixa');
  assert.equal(hero.esquerda, LARGURA_BARRA_LATERAL);
  assert.equal(hero.direita, m.janela.largura);
});

test('a faixa fica transparente sobre a imagem, e opaca fora desse modo', () => {
  const comImagem = medirTela({
    largura: 1920,
    hero: 'sangria',
    heroTopo: true,
    miolo: HERO_SANGRIA,
  });
  const semImagem = medirTela({ largura: 1920, hero: 'caixa' });

  const sobreAImagem = comImagem.alvos['.app-header'].fundo;
  assert.equal(
    opacidadeDe(sobreAImagem),
    0,
    `sobre a imagem, a faixa tem que sumir — veio ${sobreAImagem}`,
  );

  // ⚠️ E FORA DESSE MODO ELA TEM QUE SER OPACA. Translúcida, o texto das outras
  // telas atravessa ela — letras fantasma em todo o sistema, porque o cabeçalho
  // agora flutua por cima do conteúdo em vez de ficar ao lado dele.
  const fora = semImagem.alvos['.app-header'].fundo;
  assert.equal(opacidadeDe(fora), 1, `a faixa das outras telas voltou a ser translúcida: ${fora}`);
});

// ===========================================================================
// O CELULAR
// ===========================================================================

// Zero rolagem horizontal a partir de 320px é critério de aceite do projeto, e
// a sangria do hero é o suspeito de sempre: ela é a única coisa que sai de
// propósito da largura do pai.
for (const largura of [320, 390, 768, 1024]) {
  test(`sem rolagem horizontal em ${largura}px`, () => {
    const m = medirTela({ largura, altura: 800, hero: 'sangria', miolo: HERO_SANGRIA });
    assert.equal(
      m.rolagemHorizontal,
      false,
      `o documento tem ${m.larguraDoDocumento}px numa janela de ${largura}px`,
    );
  });
}

test('no celular o hero também vai de ponta a ponta', () => {
  const m = medirTela({ largura: 390, altura: 800, hero: 'sangria', miolo: HERO_SANGRIA });
  const hero = m.alvos['.hero'];

  assert.equal(hero.esquerda, 0, 'sem barra lateral, a borda é a da tela');
  assert.equal(hero.direita, m.janela.largura);
});

// ===========================================================================
// A LEGIBILIDADE DO TOPO SOBRE A FOTO
// ===========================================================================
//
// Com a faixa transparente, tudo que mora nela passa a ficar sobre uma imagem
// escolhida pelo cliente — e ninguém garante que ela seja escura. Isto não é
// acabamento: é a diferença entre um topo premium e um topo que some.

test('sobre a imagem, o sino e o nome da marca ficam claros', () => {
  // No celular a marca aparece na faixa; no desktop ela mora na barra lateral.
  const m = medirTela({
    largura: 390,
    altura: 800,
    hero: 'sangria',
    heroTopo: true,
    miolo: HERO_SANGRIA,
  });

  assert.equal(
    claro(m.alvos['.app-sino'].corDoTexto),
    true,
    `o sino veio ${m.alvos['.app-sino'].corDoTexto}`,
  );

  // ⚠️ ESTE FALTAVA NA PRIMEIRA VERSÃO. O nome é desenhado com o gradiente da
  // marca recortado no texto — a cor do cliente competindo com a foto do
  // cliente, na tela mais importante e no aparelho em que a maioria entra.
  assert.equal(
    claro(m.alvos['.app-header strong'].corDoTexto),
    true,
    `o nome da marca veio ${m.alvos['.app-header strong'].corDoTexto}`,
  );
});

test('fora da imagem, o nome volta a ser o gradiente da marca', () => {
  const m = medirTela({ largura: 390, altura: 800, hero: 'caixa' });
  assert.equal(
    claro(m.alvos['.app-header strong'].corDoTexto),
    false,
    'nas outras telas o nome tem que voltar a ser desenhado com a cor da marca',
  );
});

// ===========================================================================
// O TOPO NO CELULAR
// ===========================================================================

// ⚠️ A PASTILHA DO SINO MONTAVA NA BARRA DE ROLAGEM.
//
// O cabeçalho flutua por cima da área que rola, então a barra dela corre por
// baixo dele, colada na borda. Com pouco respiro à direita, o arredondado do
// estado de toque do sino passava por cima dela.
test('o sino não encosta na borda direita da tela', () => {
  const m = medirTela({ largura: 390, altura: 800, hero: 'caixa' });
  const sino = m.alvos['.app-sino'];
  const folga = m.janela.largura - sino.direita;

  assert.ok(
    folga >= 12,
    `o sino termina a ${folga}px da borda — a barra de rolagem cabe aí embaixo`,
  );
});

// Uma cor é "clara" se as três componentes passam de 90%. Serve para separar
// branco de qualquer cor de marca — que é a única distinção que interessa aqui.
function claro(cor) {
  const n = String(cor || '').match(/[0-9.]+/g) || [];
  if (n.length < 3) return false;
  const escala = String(cor).includes('srgb') ? 1 : 255;
  return n.slice(0, 3).every((v) => parseFloat(v) / escala > 0.9);
}
