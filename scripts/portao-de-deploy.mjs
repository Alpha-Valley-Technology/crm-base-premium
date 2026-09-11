// NÃO VAI PARA PRODUÇÃO O QUE NÃO ESTÁ NO HISTÓRICO.
//
// ===========================================================================
// POR QUE ISTO É UM SCRIPT, E NÃO UMA FRASE NUM DOCUMENTO
// ===========================================================================
//
// A regra "commite cada etapa" já tinha sido dada pelo dono, em conversa, mais
// de uma vez. Ela não pegou — e o resultado foi um trabalho de 29/08 a 05/09
// vivendo só no disco e em produção, sem um único commit.
//
// O custo apareceu no dia 04/09: o login ficou cinco dias quebrado no ar e
// **não havia para onde voltar**. O Firebase guarda as versões publicadas, mas
// o código-fonte daquele estado não existia em lugar nenhum além de uma pasta.
// Se a máquina tivesse falhado naquela semana, o trabalho tinha ido junto.
//
// Regra escrita depende de alguém lembrar. Regra de máquina não depende de
// ninguém — e é por isso que ela existe aqui e não só no CLAUDE.md.
//
// ===========================================================================
// O QUE ELE COBRA
// ===========================================================================
//
// Uma coisa só: que a árvore esteja limpa na hora de publicar. Se está limpa,
// existe um commit que descreve exatamente o que foi ao ar — e `git log` passa
// a ser o histórico honesto da produção, não uma ficção.
//
// ⚠️ SAÍDA DE EMERGÊNCIA: se o site estiver fora do ar, o caminho NÃO é burlar
// este portão — é `firebase hosting:rollback`, que volta para a versão
// anterior sem passar por aqui. Commitar leva cinco segundos; publicar às
// cegas custou cinco dias.

import { execFileSync } from 'node:child_process';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let sujo;
try {
  sujo = git('status', '--porcelain');
} catch {
  // Sem git (uma cópia baixada em zip, por exemplo) não há histórico para
  // cobrar, e travar o deploy aqui seria implicância sem serventia.
  console.log('  portão: não é um repositório git — seguindo sem cobrar commit.');
  process.exit(0);
}

if (sujo) {
  const linhas = sujo.split('\n');
  console.error('');
  console.error('DEPLOY BARRADO — há trabalho fora do histórico.');
  console.error('');
  for (const l of linhas.slice(0, 12)) console.error(`    ${l}`);
  if (linhas.length > 12) console.error(`    … e mais ${linhas.length - 12} arquivo(s)`);
  console.error('');
  console.error('  Publicar o que não está commitado deixa a produção sem para onde voltar.');
  console.error('  Foi assim que o login ficou cinco dias quebrado no ar, em 04/09/2026.');
  console.error('');
  console.error('  Commite (a mensagem conta o PORQUÊ, não o quê) e publique de novo.');
  console.error('  Se o site está fora do ar agora: firebase hosting:rollback');
  console.error('');
  process.exit(1);
}

console.log(
  `  portão: árvore limpa, publicando ${git('rev-parse', '--short', 'HEAD')} — ${git('log', '-1', '--format=%s')}`,
);
