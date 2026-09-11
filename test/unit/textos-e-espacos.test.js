// TRÊS COISAS QUE SÓ APARECEM OLHANDO A TELA — e que, uma vez consertadas,
// voltam sozinhas se ninguém escrever o porquê.
//
// Não são bugs de lógica: são texto no lugar errado e espaço faltando. O dono
// achou os três usando o sistema, e é esse o tipo de defeito que nenhuma suíte
// pega por acidente — só se alguém escrever a regra depois de aprendê-la.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(p, 'utf8');

// ===========================================================================
// 1. O RECADO DA CONEXÃO PRECISA DE AR ANTES DO BOTÃO
// ===========================================================================

// Com `margin: 0` ele encostava em "Salvar a Conexão", e as duas coisas liam
// como uma só — o texto parecia rótulo do botão em vez de explicar o estado.
test('o recado do perfil não encosta no botão de salvar', () => {
  const css = ler('styles/modulos.css');
  const i = css.indexOf('.perfil-recado {');
  assert.ok(i > 0);
  const regra = css.slice(i, css.indexOf('}', i));

  const margem = regra.match(/margin:\s*0\s+0\s+(\d+)px/);
  assert.ok(margem, 'o recado precisa de margem embaixo, e não de `margin: 0`');
  assert.ok(Number(margem[1]) >= 12, `pouco ar: ${margem[1]}px`);
});

// ===========================================================================
// 2. O SUPORTE DE DENTRO NÃO FALA COM QUEM NÃO CONSEGUE ENTRAR
// ===========================================================================

// ⚠️ O texto foi copiado da tela de entrada, onde faz todo sentido. Aqui não
// faz nenhum: QUEM LÊ ESTA TELA JÁ ENTROU.
//
// Oferecer ajuda para um problema que a pessoa não pode estar tendo gasta a
// primeira linha da tela e ensina que o texto não foi escrito para ela.
test('a tela de Suporte não oferece ajuda para entrar — quem a lê já entrou', () => {
  const js = ler('modules/suporte/module.js');
  // Só o que a TELA diz: o comentário do topo explica justamente esta
  // diferença e precisa poder citar a frase.
  const textos = [...js.matchAll(/textContent\s*=\s*([^;]+);/gs)].map((m) => m[1]).join('\n');
  assert.doesNotMatch(
    textos,
    /não consigo entrar|conseguindo entrar/i,
    'quem lê esta tela já está dentro; esse texto é da tela de entrada',
  );
});

// A tela de ENTRADA continua oferecendo, porque lá é exatamente para isso.
test('a tela de entrada continua falando com quem não consegue entrar', () => {
  const js = ler('base/suporte.js');
  assert.match(
    js,
    /não está conseguindo entrar/i,
    'o botão da tela de entrada existe para quem está de fora',
  );
});

// ===========================================================================
// 3. O FORMATO DAS CAPAS É UMA CATEGORIA, E NÃO UM CAMPO SOLTO
// ===========================================================================

// ===========================================================================
// 4. BOTAO QUE E LINK NAO PODE VIR SUBLINHADO
// ===========================================================================

// ⚠️ MUITO BOTAO DESTE SISTEMA E UM `<a>`: navegacao entre aulas, "Ver a
// pagina", "Entrar na comunidade", os contatos da tela de entrada. `.btn` nunca
// declarou `text-decoration`, entao todos nasciam com o sublinhado padrao do
// navegador — que dentro de um retangulo colorido parece defeito, e nao link.
//
// O conserto tem que estar no BOTAO, e nao em cada caso: quem escrever o
// proximo botao-link nao tem como saber que precisa desligar isso a mao.
test('o botao desliga o sublinhado, porque muitos deles sao links', () => {
  const css = readFileSync('styles/components.css', 'utf8');
  const i = css.indexOf('.btn {');
  assert.ok(i > 0);
  assert.match(css.slice(i, css.indexOf('}', i)), /text-decoration:\s*none/);
});

// "Anterior" sozinho pergunta "anterior o que?" — e numa tela que tem curso,
// modulo, aula e material, a resposta nao e obvia.
