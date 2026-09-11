import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// `base/auth.js` puxa o SDK do Firebase e não roda em Node. O que dá para
// cobrar aqui é o CONTRATO das mensagens e o desenho da tela — que é onde moram
// as decisões que se perdem quando outra pessoa mexe.
const fonte = (arquivo) => readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// A tela de entrada
// ---------------------------------------------------------------------------

test('a entrada oferece as DUAS portas', () => {
  const html = fonte('login.html');
  assert.match(html, /id="btGoogle"/);
  assert.match(html, /id="formSenha"/);
  assert.match(html, /id="email"/);
  assert.match(html, /id="senha"/);
});

// Primeiro acesso e senha esquecida são o mesmo email do Firebase. Separar em
// dois caminhos daria duas telas para manter e uma dúvida a mais para quem
// chega: "sou primeiro acesso ou esqueci?".
test('primeiro acesso e senha esquecida são o MESMO botão', () => {
  const html = fonte('login.html');
  assert.match(html, /Primeiro acesso ou esqueci minha senha/i);
  assert.equal((html.match(/id="btEsqueci"/g) || []).length, 1);
});

test('o texto de apoio não promete mais que só Google', () => {
  const html = fonte('login.html');
  assert.doesNotMatch(
    html.split('<script')[0],
    /Use a conta Google/i,
    'o texto acima do botão precisava mudar quando a segunda porta abriu',
  );
});

// A senha do navegador só oferece preencher quando o campo diz o que é.
test('os campos dizem ao navegador o que guardar', () => {
  const html = fonte('login.html');
  assert.match(html, /autocomplete="email"/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /type="password"/);
});

// ---------------------------------------------------------------------------
// As mensagens de erro
// ---------------------------------------------------------------------------

const auth = fonte('base/auth.js');

// DIZER "esse email não existe" CONTA A UM ESTRANHO QUEM É MEMBRO da
// comunidade — e é assim que se monta uma lista de alvos.
test('email inexistente e senha errada dão a MESMA resposta', () => {
  const naoExiste = /'auth\/user-not-found':\s*'([^']+)'/.exec(auth);
  const senhaErrada = /'auth\/wrong-password':\s*'([^']+)'/.exec(auth);
  const credencial = /'auth\/invalid-credential':\s*'([^']+)'/.exec(auth);
  assert.ok(naoExiste && senhaErrada && credencial);
  assert.equal(naoExiste[1], senhaErrada[1]);
  assert.equal(naoExiste[1], credencial[1]);
});

test('nenhuma mensagem entrega código de erro ou inglês para quem lê', () => {
  const bloco = auth.slice(
    auth.indexOf('const RECADOS'),
    auth.indexOf('export function recadoDoErro'),
  );
  const mensagens = [...bloco.matchAll(/:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  assert.ok(mensagens.length >= 6);
  for (const m of mensagens) {
    assert.ok(!/auth\//.test(m), `vazou código de erro: ${m}`);
    assert.ok(!/\b(password|error|failed|user)\b/i.test(m), `sobrou inglês: ${m}`);
  }
});

// Fechar a janela do Google é ação do usuário, não erro para mostrar.
test('fechar o popup do Google não vira mensagem de erro', () => {
  assert.match(auth, /'auth\/popup-closed-by-user':\s*''/);
  assert.match(auth, /'auth\/cancelled-popup-request':\s*''/);
});

// ---------------------------------------------------------------------------
// O email de senha
// ---------------------------------------------------------------------------

// Sem isto o email vai em inglês dizendo "reset your password", e metade das
// pessoas não abre.
test('o email de senha é pedido em português', () => {
  assert.match(auth, /languageCode\s*=\s*'pt-BR'/);
});

// Depois de definir a senha, a pessoa volta para a NOSSA tela, e não fica
// parada na página do Google sem saber o que fazer.
test('o email traz o caminho de volta para a nossa entrada', () => {
  assert.match(auth, /url:\s*`\$\{location\.origin\}\/login\.html`/);
});

// ---------------------------------------------------------------------------
// O convite, na tela de Equipe
// ---------------------------------------------------------------------------

const equipe = fonte('modules/equipe/module.js');

// Esta tela é desenhada e testada SEM REDE. `base/auth.js` puxa o SDK do
// Firebase: trazê-lo para o topo derrubou dois arquivos de teste na hora.
test('a tela de Equipe NÃO puxa o SDK no topo do arquivo', () => {
  const topo = equipe.slice(0, equipe.indexOf('export default'));
  assert.ok(
    !/^import .*base\/auth\.js/m.test(topo),
    'o import do auth precisa ser tardio, dentro da função que usa',
  );
  assert.match(equipe, /await import\('\.\.\/\.\.\/base\/auth\.js'\)/);
});

// A pessoa JÁ está cadastrada quando o email falha. Derrubar a criação por
// causa do envio faria o admin achar que nada aconteceu — e cadastrar de novo.
test('o convite que não sai NÃO derruba o cadastro', () => {
  const bloco = equipe.slice(equipe.indexOf('let enviou = true'), equipe.indexOf('form.reset()'));
  assert.match(bloco, /catch/, 'o envio tem que ser embrulhado');
  assert.match(bloco, /Reenviar convite/, 'e a tela precisa dizer o que fazer quando falha');
});

// Mandar link de senha para quem perdeu o acesso é prometer uma porta que a
// regra do banco vai fechar depois.
test('quem foi desativado não recebe reenvio de convite', () => {
  assert.match(
    equipe,
    /if\s*\(\s*u\.ativo\s*\)\s*\{[\s\S]*?linha\.appendChild\(\s*botaoComIcone\(\s*ui,\s*'publicar',\s*'Reenviar convite'/,
  );
});
