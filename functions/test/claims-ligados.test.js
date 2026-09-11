import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// A REGRA ESTAVA CERTA E A LIGAÇÃO NÃO EXISTIA.
//
// `storage.rules` recusa envio de arquivo sem `request.auth.token.equipe`. O
// carimbo é posto por `_lib/claims.js` — que ficou escrito e NUNCA foi chamado.
// Resultado: ninguém conseguia enviar imagem neste sistema. Nem o dono.
//
// O teste da regra do Storage não pegou, e não tinha como: ele carimba o token
// à mão (`authenticatedContext(uid, { equipe: true })`) para provar a REGRA. Um
// teste de regra prova a regra; ele não prova que alguém recebe o carimbo.
//
// Isto aqui lê o código e cobra a LIGAÇÃO. Não substitui subir um arquivo de
// verdade no emulador — mas pega a classe de erro que passou por baixo de duas
// suítes verdes.

const fonte = (arquivo) => readFileSync(new URL(`../equipe/${arquivo}`, import.meta.url), 'utf8');

// Toda função que mexe em quem é da equipe: entrou, mudou de papel, saiu.
const QUE_MEXEM_NA_EQUIPE = ['bootstrap-admin.js', 'criar-usuario.js', 'gerir-usuario.js'];

for (const arquivo of QUE_MEXEM_NA_EQUIPE) {
  test(`${arquivo} sincroniza o carimbo do token`, () => {
    const s = fonte(arquivo);
    assert.match(
      s,
      /from '\.\.\/_lib\/claims\.js'/,
      'quem mexe na equipe precisa importar o sincronizador do carimbo',
    );
    assert.match(
      s,
      /sincronizarClaim(SemDerrubar)?\(/,
      'importar e não chamar é o defeito de novo, com o import por cima',
    );
  });
}

test('o primeiro admin só é carimbado quando REALMENTE virou admin', () => {
  const s = fonte('bootstrap-admin.js');
  // Quem chega depois do primeiro admin recebe `criado: false` e não tem
  // cadastro nenhum. Carimbar essa pessoa daria a ela o Storage de
  // administrador sem estar na equipe — trocaria um defeito por um buraco.
  assert.match(
    s,
    /r\.criado === true/,
    'a condição tem que ser `criado === true`, e nada mais frouxo',
  );
  assert.ok(!/virouAdmin/.test(s), 'campo que não existe no retorno é sempre verdadeiro');
});

test('desativar tira o carimbo, e não só derruba a sessão', () => {
  const s = fonte('gerir-usuario.js');
  const iSync = s.indexOf('sincronizarClaimSemDerrubar');
  const iRevoke = s.indexOf('revokeRefreshTokens');
  assert.ok(iSync > -1 && iRevoke > -1);
  // Derrubar a sessão sem tirar o carimbo devolveria o Storage à pessoa no
  // próximo login dela.
  assert.ok(
    iSync < iRevoke,
    'sincroniza antes de derrubar a sessão, para o token novo já nascer sem o carimbo',
  );
});
