// O BACKUP DAS CONTAS DE LOGIN.
//
// ===========================================================================
// POR QUE ELE EXISTE
// ===========================================================================
//
// O backup do Firestore guarda `/usuarios` — nome, e-mail, papel, se está
// ativo. Não guarda a CONTA: a credencial que faz o Firebase Auth reconhecer a
// pessoa e deixar entrar.
//
// Some a conta, e o cadastro continua lá, intacto e inútil: ninguém entra. É o
// tipo de buraco que só aparece no dia em que se precisa dele, quando já não dá
// para consertar.
//
// ===========================================================================
// O QUE ESTE ARQUIVO NÃO EXPORTA, E POR QUÊ
// ===========================================================================
//
// SENHA. Nem a senha, nem o hash dela, nem o sal.
//
// O `firebase auth:export` sabe exportar os hashes, e com eles a restauração
// seria completa — a pessoa voltaria com a mesma senha. Guardar isso num balde
// de arquivos é trocar um risco raro (o Google perder contas) por um risco
// permanente (um arquivo com o segredo de todo mundo esperando alguém achar).
//
// Sem os hashes, a restauração é: recriar as contas com os mesmos e-mails e
// mandar a cada um o convite para definir a senha — o MESMO caminho que já
// existe para quem entra pela primeira vez, e que já está testado. A pessoa
// troca a senha uma vez; ninguém perde acesso.
//
// Uma linha a mais de trabalho no pior dia, contra um arquivo perigoso todos os
// dias. É troca fácil de fazer.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
// O import inicializa o app do Admin SDK como efeito de carga do módulo — é
// assim que o resto do projeto faz, e é o que garante que `getAuth()` funcione.
import '../_lib/auth.js';

// A pasta fica dentro do mesmo balde do produto, e o balde não é público: a
// regra do Storage não declara este prefixo, e o que não está declarado é
// recusado. Só o servidor, que passa por cima das regras, escreve e lê aqui.
const PASTA = 'backup-contas';

// De quantas em quantas contas o Firebase entrega a lista. Mil é o teto dele.
const POR_PAGINA = 1000;

// O QUE VAI PARA O ARQUIVO. Só o que identifica e o que permite recriar.
export function contaParaBackup(u) {
  return {
    uid: u.uid,
    email: u.email || '',
    nome: u.displayName || '',
    verificado: u.emailVerified === true,
    desativada: u.disabled === true,
    criadaEm: u.metadata && u.metadata.creationTime ? u.metadata.creationTime : '',
    ultimaEntrada: u.metadata && u.metadata.lastSignInTime ? u.metadata.lastSignInTime : '',
    // COMO a pessoa entra: com Google ou com senha. Sem isso, a restauração não
    // sabe a quem mandar convite de senha e a quem só pedir para entrar de novo
    // com o Google.
    provedores: (u.providerData || []).map((p) => p.providerId),
  };
}

export async function listarTodasAsContas(auth) {
  const contas = [];
  let pagina;
  do {
    const r = await auth.listUsers(POR_PAGINA, pagina);
    for (const u of r.users) contas.push(contaParaBackup(u));
    pagina = r.pageToken;
  } while (pagina);
  return contas;
}

export function nomeDoArquivo(agora) {
  // Uma pasta por dia, com a data no nome: para achar "o de antes de ontem" sem
  // abrir nenhum arquivo.
  const d = new Date(agora);
  const dois = (n) => String(n).padStart(2, '0');
  return `${PASTA}/${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}.json`;
}

export async function exportarContas({ auth, bucket, agora }) {
  const contas = await listarTodasAsContas(auth);
  const conteudo = JSON.stringify(
    {
      exportadoEmMs: agora,
      quantas: contas.length,
      // O aviso viaja junto do arquivo: quem o abrir daqui a um ano precisa saber
      // que a senha não está aqui, antes de contar com ela.
      aviso:
        'Sem senhas nem hashes. Para restaurar: recrie as contas com estes ' +
        'e-mails e envie o convite de definição de senha.',
      contas,
    },
    null,
    2,
  );

  await bucket.file(nomeDoArquivo(agora)).save(conteudo, {
    contentType: 'application/json',
    // Sem cache: é um arquivo de resgate, e ler uma versão velha dele no dia do
    // resgate seria o pior momento possível para um cache acertar.
    metadata: { cacheControl: 'no-store' },
  });
  return contas.length;
}

// Todo dia às 4h da manhã (horário de São Paulo) — depois do movimento da noite
// e antes do da manhã, para a exportação nunca disputar recurso com gente
// usando o sistema.
export const exportarContasDeLogin = onSchedule(
  { schedule: '0 4 * * *', timeZone: 'America/Sao_Paulo', retryCount: 2 },
  async () => {
    const quantas = await exportarContas({
      auth: getAuth(),
      bucket: getStorage().bucket(),
      agora: Date.now(),
    });
    console.log(`backup de contas: ${quantas} exportada(s).`);
  },
);
