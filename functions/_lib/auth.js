import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { HttpsError } from 'firebase-functions/v2/https';
import { alcancaProjeto, ehResponsavelPeloProjeto } from './escopo.js';

if (!getApps().length) initializeApp();

async function carregarUsuario(auth) {
  if (!auth) throw new HttpsError('unauthenticated', 'Faça login.');
  const snap = await getFirestore().doc(`usuarios/${auth.uid}`).get();
  if (!snap.exists || snap.data().ativo !== true) {
    throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  }
  return snap.data();
}

export async function assertMembro(auth) {
  return carregarUsuario(auth);
}

export async function assertAdmin(auth) {
  const u = await carregarUsuario(auth);
  if (u.papel !== 'admin') throw new HttpsError('permission-denied', 'Só administradores.');
  return u;
}

// O GESTOR: quem cuida da área de membros sem tocar no dinheiro.
//
// ⚠️ ADMIN PASSA AQUI, e não é conveniência: o dono não pode precisar de uma
// segunda conta para publicar uma aula. `admin` é `gestor` mais o resto.
//
// O que NÃO usa isto, e por quê:
//   criar/atualizar/remover usuário   promover alguém dá as chaves de tudo
//   conectar um gateway de pagamento  é o cofre que decide, não o papel
//   bootstrapAdmin                    é quem cria o primeiro dono
export async function assertGestor(auth) {
  const u = await carregarUsuario(auth);
  if (!['admin', 'gestor'].includes(u.papel)) {
    throw new HttpsError('permission-denied', 'Só administradores e gestores.');
  }
  return u;
}

// A regra do banco já barra o navegador, mas as funções escrevem com poder de
// servidor — passam por cima das regras. Então a conferência do projeto tem que
// ser repetida aqui, em toda função que age sobre um projeto.
export function assertAlcanca(usuario, projetoId) {
  if (!alcancaProjeto(usuario, projetoId)) {
    throw new HttpsError(
      'permission-denied',
      'Você não cuida deste item. Peça para um administrador.',
    );
  }
  return usuario;
}

// Membro da equipe QUE alcança este projeto.
export async function assertMembroDoProjeto(auth, projetoId) {
  return assertAlcanca(await carregarUsuario(auth), projetoId);
}

// Administrador QUE alcança este projeto.
export async function assertAdminDoProjeto(auth, projetoId) {
  return assertAlcanca(await assertAdmin(auth), projetoId);
}

// Responsável pelo projeto: administrador que o alcança, ou membro marcado
// nele. Ver escopo.js — é a mesma régua da ação de mais peso do produto, e por
// bom motivo: quem responde pelo projeto responde também pela conexão dele.
//
// Exigir administrador para isso obrigava a promover a pessoa, agir e rebaixar
// — e no meio disso ela virava admin de verdade, com acesso à Equipe e às
// chaves de integração. Trabalho a mais em troca de menos segurança.
export async function assertResponsavelPeloProjeto(auth, projetoId, acao = 'fazer isso aqui') {
  const u = await carregarUsuario(auth);
  if (!ehResponsavelPeloProjeto(u, projetoId)) {
    throw new HttpsError(
      'permission-denied',
      `Você não pode ${acao}. Isso é do responsável ou de um administrador.`,
    );
  }
  return u;
}
