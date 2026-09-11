// TODO AVISO PRECISA TER COR.
//
// ===========================================================================
// POR QUE ESTE TESTE EXISTE
// ===========================================================================
//
// `ui.aviso(tipo, msg)` monta a classe como `aviso--<tipo>`. Se o tipo não
// tiver regra no CSS, o recado aparece **sem fundo nenhum** — praticamente
// invisível, e ninguém percebe olhando o código.
//
// Aconteceu de verdade: o painel de Pagamento usava `avisar('sucesso', …)`
// enquanto o vocabulário do projeto é `'ok'`. O resultado foi o pior possível
// numa tela que mexe com dinheiro: a confirmação de "conectado com sucesso"
// saiu invisível, e só os avisos amarelos apareceram. O dono concluiu que a
// conexão tinha falhado — quando ela tinha funcionado duas vezes.
//
// Nada quebra, nada avisa, e o sintoma é uma pessoa achando que o sistema não
// funciona. É exatamente o tipo de defeito que um teste pega e uma revisão não.

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function todosOsArquivos(pasta, saida = []) {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) todosOsArquivos(caminho, saida);
    else if (nome.endsWith('.js')) saida.push(caminho);
  }
  return saida;
}

const CSS = ['styles/base.css', 'styles/components.css', 'styles/modulos.css']
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

test('todo tipo de aviso usado no JS tem cor no CSS', () => {
  const arquivos = [
    ...todosOsArquivos('base'),
    ...todosOsArquivos('modules'),
    ...todosOsArquivos('ui'),
  ];
  const semCor = [];

  for (const arquivo of arquivos) {
    const texto = readFileSync(arquivo, 'utf8');
    // Pega `avisar('x'`, `aviso('x'` e `ui.aviso('x'`.
    for (const achado of texto.matchAll(/\b(?:avisar|aviso)\(\s*'([a-z-]+)'/g)) {
      const tipo = achado[1];
      if (!CSS.includes(`.aviso--${tipo}`)) {
        semCor.push(`${tipo} (${arquivo.replace(/\\/g, '/')})`);
      }
    }
  }

  assert.deepEqual(
    [...new Set(semCor)],
    [],
    'aviso sem regra `.aviso--<tipo>` no CSS: ele aparece sem fundo, e some da tela',
  );
});

// A lista fica curta de propósito. Um vocabulário de três palavras é o que
// impede alguém de inventar `'sucesso'`, `'alerta'` e `'atencao'` para dizer a
// mesma coisa — e é o que torna o teste acima possível de ler.
test('o vocabulário de avisos tem três palavras, e não mais', () => {
  const tipos = [...CSS.matchAll(/\.aviso--([a-z-]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(tipos)].sort(), ['erro', 'info', 'ok']);
});
