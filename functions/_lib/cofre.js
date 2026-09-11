// O COFRE: onde moram as credenciais que movem dinheiro.
//
// ===========================================================================
// POR QUE NÃO NO FIRESTORE
// ===========================================================================
//
// O projeto tem uma coleção `segredos` para credenciais de integração, e ela
// seria o lugar natural. Chave de gateway de pagamento fica de fora dela por
// uma razão específica: **com essa chave dá para sacar dinheiro da conta.**
//
// Tudo que está no Firestore entra no backup diário e no semanal, e fica na
// recuperação no tempo por sete dias. Guardar ali essa chave transformaria os
// arquivos de backup — que existem para proteger — em objetos de valor para
// quem os achasse. Um cofre de dinheiro dentro da caixa de fotos.
//
// Aqui ela fica no Secret Manager do Google: fora do banco, fora do backup,
// com acesso concedido a exatamente duas credenciais e a mais nada.
//
// ===========================================================================
// POR QUE LIDA EM TEMPO DE EXECUÇÃO, E NÃO PELO `defineSecret`
// ===========================================================================
//
// `defineSecret` amarra o valor no momento do DEPLOY. Isso obrigaria um deploy
// toda vez que alguém trocasse a chave pelo painel — ou seja, obrigaria de novo
// o cliente a abrir um terminal, que é exatamente o que este arquivo existe
// para eliminar.
//
// Lendo em execução, colar a chave nova no painel basta: a próxima instância
// que subir já a pega. O cache curto abaixo é o que decide quanto tempo a chave
// velha ainda pode ser usada por uma instância que já estava de pé.

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const cliente = new SecretManagerServiceClient();

// CINCO MINUTOS, e o número tem motivo dos dois lados.
//
// Sem cache, toda cobrança pagaria uma chamada ao Secret Manager — mais lento e
// mais caro numa página em que cada décimo de segundo é uma pessoa que desiste.
//
// Cache longo demais, por outro lado, é o tempo em que uma chave REVOGADA
// continua funcionando. Cinco minutos é o teto que eu aceito para "troquei a
// chave porque ela vazou".
const VALIDADE_CACHE_MS = 5 * 60 * 1000;

const cache = new Map();

function projeto() {
  // `GCLOUD_PROJECT` existe em produção e no emulador. O `FIREBASE_CONFIG` é o
  // reserva para quando o ambiente não o define.
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '';
  } catch {
    return '';
  }
}

export function caminhoDoSegredo(nome) {
  return `projects/${projeto()}/secrets/${nome}`;
}

// Devolve `null` quando o segredo ainda não tem valor — que é o estado de toda
// instalação nova, antes de alguém colar a chave. NÃO lança: "ainda não
// conectado" é um estado normal do sistema, não um erro.
export async function lerSegredo(nome) {
  const guardado = cache.get(nome);
  if (guardado && guardado.ate > Date.now()) return guardado.valor;

  try {
    const [versao] = await cliente.accessSecretVersion({
      name: `${caminhoDoSegredo(nome)}/versions/latest`,
    });
    const valor = versao.payload.data.toString('utf8').trim();
    cache.set(nome, { valor, ate: Date.now() + VALIDADE_CACHE_MS });
    return valor || null;
  } catch (e) {
    // Segredo sem nenhuma versão responde NOT_FOUND (5). É o estado de quem
    // ainda não conectou, e não merece log de erro.
    if (e && (e.code === 5 || e.code === 3)) {
      cache.set(nome, { valor: null, ate: Date.now() + VALIDADE_CACHE_MS });
      return null;
    }
    // ⚠️ NUNCA logar `e` inteiro aqui sem pensar: em alguns erros o SDK
    // devolve o pedido junto. O nome do segredo basta para achar o problema.
    console.error('COFRE: não consegui ler', nome, e && e.message);
    throw new Error('Não consegui ler a configuração de pagamento.', { cause: e });
  }
}

// Grava uma versão nova E DESLIGA AS ANTERIORES.
//
// Desligar as anteriores é o que faz "trocar a chave" significar alguma coisa.
// Sem isso, a chave velha continuaria acessível a quem tivesse permissão de
// leitura — e trocar uma chave vazada não a tiraria de circulação.
export async function gravarSegredo(nome, valor) {
  const texto = String(valor || '').trim();
  if (!texto) throw new Error('Valor vazio.');

  const pai = caminhoDoSegredo(nome);
  const [nova] = await cliente.addSecretVersion({
    parent: pai,
    payload: { data: Buffer.from(texto, 'utf8') },
  });

  try {
    const [versoes] = await cliente.listSecretVersions({ parent: pai });
    for (const v of versoes) {
      if (v.name === nova.name) continue;
      if (v.state !== 'ENABLED') continue;
      await cliente.destroySecretVersion({ name: v.name });
    }
  } catch (e) {
    // A versão nova já está no ar; a faxina das velhas é higiene. Falhar aqui
    // não pode desfazer uma troca de chave que deu certo — mas tem que gritar,
    // porque significa que a chave antiga continua viva.
    console.error(
      'COFRE: versão nova gravada, mas não consegui destruir as antigas de',
      nome,
      e && e.message,
    );
  }

  cache.set(nome, { valor: texto, ate: Date.now() + VALIDADE_CACHE_MS });
  return nova.name;
}

// Esquece o que está guardado. Usado logo depois de gravar em outra instância,
// e nos testes.
export function esquecerCache(nome) {
  if (nome) cache.delete(nome);
  else cache.clear();
}

// O QUE PODE APARECER NA TELA de uma credencial: os quatro últimos caracteres.
//
// Serve para a pessoa confirmar QUAL chave está lá sem que a chave saia do
// cofre. Quatro caracteres não permitem reconstruir nada, e são suficientes
// para responder "é a que eu colei ontem?".
export function pistaDaChave(chave) {
  const t = String(chave || '');
  if (t.length < 8) return '••••';
  return `•••• ${t.slice(-4)}`;
}
