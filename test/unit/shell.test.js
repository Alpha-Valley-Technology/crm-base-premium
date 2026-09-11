import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// O shell (base/app.js) nunca tinha teste: eu conferia o visual remontando a
// tela na mao, e por isso NAO peguei que mover o usuario pro pe da barra
// quebrou o app inteiro -- as linhas que preenchiam o nome continuaram no lugar
// antigo, procuravam um elemento que ainda nao existia, estouravam, e o
// roteador nem chegava a ser iniciado. Sobrava a carcaca na tela.
//
// Isto le o codigo e cobra a ORDEM. Nao substitui abrir o app, mas pega a
// classe de erro que passou.

const fonte = () => readFileSync(new URL('../../base/app.js', import.meta.url), 'utf8');

test('o nome do usuario so e preenchido DEPOIS de o bloco existir', () => {
  const s = fonte();
  const criacao = s.indexOf('id="usuario-nome"');
  const uso = s.indexOf("getElementById('usuario-nome')");
  assert.ok(criacao > -1 && uso > -1, 'os dois trechos precisam existir');
  assert.ok(
    criacao < uso,
    'o elemento e criado depois de ser usado — isso estoura e o app nao carrega',
  );
});

test('o botao sair so e ligado DEPOIS de existir', () => {
  const s = fonte();
  assert.ok(
    s.indexOf('id="sair"') < s.indexOf("getElementById('sair')"),
    'ligar o clique antes de o botao existir derruba a montagem inteira',
  );
});

// O roteador e a ultima coisa: se algo acima estourar, nao ha tela nenhuma.
test('o roteador so inicia depois de tudo montado', () => {
  const s = fonte();
  const iniciar = s.indexOf('router.iniciar()');
  for (const trecho of [
    "getElementById('usuario-nome')",
    "getElementById('sair')",
    'montarSidebar(',
  ]) {
    assert.ok(s.indexOf(trecho) < iniciar, `"${trecho}" tem que vir antes de iniciar o roteador`);
  }
});

// Existem DOIS "Carregando...": o do inicio (index.html, enquanto o Google
// confere o login) e o das trocas de tela (router.js). Eu centralizei so o
// segundo e disse que estava pronto -- o dono continuou vendo o primeiro no
// canto. Este teste cobra que os dois usem a mesma regra.
test('os dois "Carregando" usam a mesma regra de estilo', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const router = readFileSync(new URL('../../base/router.js', import.meta.url), 'utf8');
  assert.match(
    html,
    /id="app"[^>]*>\s*<div class="carregando-tela"/,
    'o "Carregando" do inicio precisa da classe, senao fica solto no canto',
  );
  assert.match(router, /className = 'carregando-tela'/);
});

// ===========================================================================
// O RODAPÉ
// ===========================================================================
//
// Ele existia como CAMPO na Configuração desde o começo — e nunca aparecia em
// lugar nenhum. Um campo que o dono preenche e não vê é pior que um campo que
// não existe: ele promete e não entrega.

test('o rodapé fica FORA de #content, que o router limpa a cada tela', () => {
  const s = fonte();
  const conteudo = s.indexOf('<div id="content"');
  const rodape = s.indexOf('id="rodape"');
  assert.ok(conteudo > -1 && rodape > -1);
  assert.ok(rodape > conteudo, 'o rodapé vem depois');
  // O trecho entre um e outro precisa FECHAR o #content: se o rodapé estivesse
  // dentro dele, sumiria na primeira troca de tela.
  assert.match(
    s.slice(conteudo, rodape),
    /<\/div>/,
    'rodapé dentro de #content seria apagado pelo router',
  );
});

// Faixa em branco no fim de toda tela é ruído com aparência de estrutura.
test('o rodapé nasce escondido, e só acende com texto', () => {
  const s = fonte();
  assert.match(s, /id="rodape"[^>]*hidden/, 'nasce escondido');
  const trecho = s.slice(
    s.indexOf("getElementById('rodape')"),
    s.indexOf("getElementById('rodape')") + 400,
  );
  assert.match(trecho, /rodape\.hidden = false/);
  assert.match(trecho, /if \(rodape && texto\)/, 'só acende quando há o que dizer');
});

// A área que rola é a de conteúdo, e o rodapé mora dentro dela: barra fixa no
// pé da janela comeria altura de tela em toda página para dizer uma linha.
test('o rodapé rola junto com o conteúdo', () => {
  const s = fonte();
  const main = s.indexOf('<main class="app-content">');
  const fim = s.indexOf('</main>');
  assert.ok(main > -1 && fim > main);
  assert.match(s.slice(main, fim), /id="rodape"/);
});
