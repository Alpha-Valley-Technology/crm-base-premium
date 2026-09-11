// O CARIMBO DO TOKEN TEM QUE SEGUIR O CADASTRO.
//
// ===========================================================================
// ⚠️ O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR DE VOLTAR
// ===========================================================================
//
// `atualizarUsuario` procurava a pessoa na equipe por `u.id`. Mas quem monta
// essa lista escreve `{ uid, ...dados }` — não existe `id` ali. A busca
// devolvia `undefined` SEMPRE, e o objeto "como a pessoa está hoje" era vazio
// em toda alteração.
//
// O estrago não aparecia na tela. Mudar só o PAPEL de alguém fazia o "ativo"
// atual valer `undefined`, e `sincronizarClaim` lê isso como "não está ativo":
// carimbava `equipe: false` no token.
//
// Ou seja, PROMOVER UM MEMBRO A GESTOR TIRAVA DELE O ACESSO AO STORAGE — que é
// exatamente a ferramenta do cargo. O banco dizia uma coisa, o token dizia
// outra, e a pessoa descobria ao tentar publicar uma aula.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { sincronizarClaim } from '../_lib/claims.js';

// A regra de leitura do carimbo, isolada: é ela que transforma um `undefined`
// em "fora da equipe".
test('sem saber se está ativo, o carimbo diz que NÃO está', async () => {
  const marcas = [];
  const falso = {
    setCustomUserClaims: async (uid, m) => {
      marcas.push(m);
    },
  };

  await sincronizarClaim('u1', { ativo: undefined, papel: 'gestor' }, falso);
  assert.deepEqual(
    marcas[0],
    { equipe: false },
    'este é o comportamento — e é por isso que "ativo" nunca pode chegar vazio',
  );

  await sincronizarClaim('u1', { ativo: true, papel: 'gestor' }, falso);
  assert.deepEqual(marcas[1], { equipe: true, papel: 'gestor' });
});

// A amarra no arquivo de verdade: a busca precisa continuar por `uid`.
test('a equipe é procurada por uid, e não por id', () => {
  const fonte = readFileSync('equipe/gerir-usuario.js', 'utf8');

  assert.equal(
    /usuarios\.find\(\(u\) => u\.id ===/.test(fonte),
    false,
    'voltou a procurar por `u.id`: a lista tem `uid`, e a busca falha calada',
  );
  assert.match(fonte, /usuarios\.find\(\(u\) => u\.uid === uid\)/);

  // E a lista precisa continuar sendo montada com `uid`, senão a correção
  // acima passa a estar errada pelo outro lado.
  assert.match(fonte, /uid: d\.id/);
});
