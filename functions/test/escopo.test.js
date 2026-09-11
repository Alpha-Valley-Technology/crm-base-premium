import { test } from 'node:test';
import assert from 'node:assert';
import {
  alcancaProjeto,
  vejoTodosOsProjetos,
  ehResponsavelPeloProjeto,
  normalizarAlcance,
  alcanceParaOBanco,
} from '../_lib/escopo.js';

// O SERVIDOR lê o documento cru do banco, onde o campo do alcance ainda tem o
// nome que nasceu no primeiro produto feito nesta Base. O site recebe o mesmo
// dado já traduzido para `projetos` (ver base/auth.js).
//
// `alcanceParaOBanco` é a própria tradução: montar as fixtures com ela mantém o
// nome antigo fora deste arquivo e deixa claro que aqui se testa o formato
// gravado, não o da tela.
const cadastro = (extras, projetos) => ({ ...extras, ...alcanceParaOBanco(projetos) });

// ---------- Quem alcança o quê ----------

test('sem lista, a pessoa alcança todos os projetos', () => {
  assert.equal(vejoTodosOsProjetos({ papel: 'admin' }), true);
  assert.equal(alcancaProjeto({ papel: 'admin' }, 'qualquer'), true);
  assert.equal(alcancaProjeto(cadastro({ papel: 'membro' }, null), 'qualquer'), true);
});

test('com lista, alcança só o que está nela', () => {
  const u = cadastro({ papel: 'membro' }, ['b1', 'b2']);
  assert.equal(alcancaProjeto(u, 'b1'), true);
  assert.equal(alcancaProjeto(u, 'b3'), false);
});

// Lista vazia é diferente de lista ausente: quem escolheu "nenhum" não vê nada,
// quem nunca escolheu vê tudo. Trocar os dois abriria acesso sem querer.
test('lista vazia não é o mesmo que lista ausente', () => {
  assert.equal(vejoTodosOsProjetos(cadastro({}, [])), false);
  assert.equal(alcancaProjeto(cadastro({}, []), 'b1'), false);
});

test('sem usuário nenhum, não alcança nada', () => {
  assert.equal(alcancaProjeto(null, 'b1'), false);
});

// ---------- Ser responsável é mais restrito que alcançar ----------

test('administrador sem lista responde por qualquer projeto', () => {
  assert.equal(ehResponsavelPeloProjeto({ papel: 'admin', ativo: true }, 'b1'), true);
});

test('membro SEM projeto marcado não responde por nenhum', () => {
  const redator = { papel: 'membro', ativo: true };
  assert.equal(alcancaProjeto(redator, 'b1'), true, 'ele VÊ tudo…');
  assert.equal(ehResponsavelPeloProjeto(redator, 'b1'), false, '…mas não põe no ar');
});

test('membro responsável responde pelo projeto dele e só por ele', () => {
  const resp = cadastro({ papel: 'membro', ativo: true }, ['b1']);
  assert.equal(ehResponsavelPeloProjeto(resp, 'b1'), true);
  assert.equal(ehResponsavelPeloProjeto(resp, 'b2'), false);
});

test('administrador com lista não responde fora dela', () => {
  assert.equal(
    ehResponsavelPeloProjeto(cadastro({ papel: 'admin', ativo: true }, ['b1']), 'b2'),
    false,
  );
});

test('quem foi desativado não responde por nada, nem sendo admin', () => {
  assert.equal(ehResponsavelPeloProjeto({ papel: 'admin', ativo: false }, 'b1'), false);
});

test('sem projeto nenhum informado, não responde por nada', () => {
  assert.equal(ehResponsavelPeloProjeto({ papel: 'admin', ativo: true }, ''), false);
});

// ---------- O que chega da tela ----------

test('não informar nada é "todos os projetos"', () => {
  assert.deepEqual(normalizarAlcance(undefined), { projetos: null });
  assert.deepEqual(normalizarAlcance(null), { projetos: null });
});

// "Cadastrado, mas ainda sem projeto" é estado legítimo: quem entra na equipe
// antes do projeto existir. Quem impede a escolha ACIDENTAL é a tela, que exige
// marcar uma das três opções — aqui só se verifica se o que chegou é válido.
test('lista vazia é aceita: cadastrado, mas ainda sem projeto', () => {
  assert.deepEqual(normalizarAlcance([]), { projetos: [] });
});

// E lista vazia NÃO pode virar "todos" por descuido: seria o contrário do que
// a pessoa escolheu.
test('lista vazia não vira "todos os projetos"', () => {
  assert.notEqual(normalizarAlcance([]).projetos, null);
});

test('repetido e espaço em branco são limpos', () => {
  assert.deepEqual(normalizarAlcance(['b1', 'b1', ' b2 ', '', null]), { projetos: ['b1', 'b2'] });
});

// Projeto excluído entre carregar a tela e salvar. Guardar o ID morto deixaria a
// pessoa com uma lista que não corresponde a nada.
test('projeto que não existe mais é recusado', () => {
  const r = normalizarAlcance(['b1', 'sumiu'], ['b1', 'b2']);
  assert.ok(r.erro);
  assert.match(r.erro, /não existe mais/i);
});

test('o que não é lista é recusado', () => {
  assert.ok(normalizarAlcance('b1').erro);
});
