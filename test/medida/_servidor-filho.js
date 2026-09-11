// O SERVIDOR DE TESTE, VISTO DE DENTRO DO PROCESSO QUE SÓ FAZ ISSO.
//
// Não é um teste, e não roda sozinho: quem o liga é `_servidor.js`, num
// processo separado. O porquê de ele precisar de um processo só dele está
// escrito lá, e é a razão de este arquivo existir.
//
// Fala com quem o ligou por ARQUIVO, e não por `stdout`: o processo de teste
// fica parado dentro de um `execFileSync` enquanto o navegador roda, e nesse
// tempo ele não escuta cano nenhum. Arquivo continua lá quando ele voltar.
//
// Argumentos, nesta ordem:
//   porta  registro-dos-404  marca-de-pronto  raiz-do-site

import { createServer } from 'node:http';
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const [porta, registro, marcaDePronto, raiz] = process.argv.slice(2);
process.chdir(raiz);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const cfg = JSON.parse(readFileSync('firebase.json', 'utf8'));
const cabecalhos = (cfg.hosting.headers || []).find((b) => b.source === '**').headers;

createServer((req, res) => {
  const caminho = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const arquivo = normalize(join('.', caminho === '/' ? '/index.html' : caminho));
  for (const h of cabecalhos) res.setHeader(h.key, h.value);

  if (!existsSync(arquivo) || arquivo.startsWith('..')) {
    appendFileSync(registro, `${caminho}\n`);
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader('Content-Type', TIPOS[extname(arquivo)] || 'application/octet-stream');
  res.end(readFileSync(arquivo));
}).listen(Number(porta), '127.0.0.1', () => {
  // ⚠️ A MARCA SÓ É ESCRITA DEPOIS DE A PORTA ESTAR ATENDENDO. É por ela que
  // quem ligou sabe que pode soltar o navegador; sem isso, a primeira página
  // do dia bate numa porta que ainda não abriu.
  writeFileSync(marcaDePronto, 'pronto');
});
