// Instalar `node_modules` do lado de dentro — uma vez, e só quando muda.
//
// POR QUE ISTO NÃO É "RODAR npm install E PRONTO":
//
// 1. As pastas `node_modules` do container são VOLUMES do Docker, não as do
//    Windows. Pacote instalado no Windows carrega binário de Windows dentro;
//    montado no Linux, ele ou quebra na hora ou — pior — funciona quase sempre
//    e falha num caso raro que ninguém liga ao sistema operacional.
//
// 2. Sem a marca, todo `docker compose up` reinstalaria tudo. São minutos, toda
//    vez, para chegar no mesmo lugar — e ambiente lento é ambiente que a pessoa
//    deixa de usar, voltando a testar direto na produção.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function garantirDependencias(pasta, rotulo) {
  const lock = `${pasta}/package-lock.json`;
  if (!existsSync(lock)) {
    console.log(`\n  Sem package-lock.json ${rotulo} — pulando a instalação.`);
    return;
  }

  const resumo = createHash('sha256').update(readFileSync(lock)).digest('hex');
  const marca = `${pasta}/node_modules/.marca-docker`;
  if (existsSync(marca) && readFileSync(marca, 'utf8').trim() === resumo) return;

  console.log(`\n  Instalando as dependências ${rotulo} dentro do container…`);
  console.log('  (acontece na primeira vez e a cada mudança no package-lock.json)\n');

  // `npm ci` apaga `node_modules` antes de instalar, e aqui ela é um ponto de
  // montagem — apagar a pasta em si daria "resource busy". Com o lock presente,
  // `npm install` instala exatamente o que ele manda, sem apagar a pasta.
  execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: pasta, stdio: 'inherit' });

  writeFileSync(marca, `${resumo}\n`);
}
