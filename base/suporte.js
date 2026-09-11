// Os contatos públicos do produto: os números de WhatsApp que a tela de entrada
// oferece a quem não está conseguindo entrar.
//
// São dois, e eles resolvem problemas diferentes:
//
//   SUPORTE     — "não estou conseguindo entrar", "meu email não é aceito".
//   FINANCEIRO  — "minha licença venceu e eu quero pagar para voltar".
//
// Ter só o suporte fazia todo cliente com pagamento em atraso cair na fila de
// quem tem problema técnico, e quem atende suporte não é quem libera acesso. O
// botão do financeiro tira essa conversa do caminho errado.
//
// POR QUE ESTES DADOS SÃO PÚBLICOS, e por que isso não é um vazamento.
//
// Os botões existem exatamente para quem NÃO consegue entrar — conta ainda não
// cadastrada, email errado, licença vencida, Google recusando. Se dependessem
// de estar logado, apareceriam só para quem não precisa deles. Logo, a tela de
// entrada lê este documento ANTES de qualquer autenticação, e a regra do banco
// (`/publico/suporte`) libera a leitura para qualquer um.
//
// O que fica exposto são números feitos para clientes ligarem: é o propósito
// deles, não um segredo escapando. O que a regra protege é o TAMANHO da porta —
// um documento só, quatro campos só, gravável só por administrador. Nada mais
// do banco fica aberto, e o nome da coleção ("publico") existe para que ninguém
// jogue ali dentro, meses depois, algo que não devia sair de casa.

// O ID DO DOCUMENTO CONTINUA SENDO `suporte` mesmo agora que ele guarda também
// o financeiro. Renomear documento em produto que já está no ar é migração de
// dado com janela de sistema quebrado, e o ganho seria puramente estético — o
// mesmo motivo pelo qual `base/auth.js` mantém o campo `blogs` no banco.
export const CAMINHO_CONTATOS = ['publico', 'suporte'];

// Comprimentos que a regra do banco também confere. Ficam aqui para a tela
// poder avisar ANTES de gravar, em vez de deixar a pessoa descobrir pelo erro
// cru do Firestore.
export const TETO_WHATSAPP = 20;
export const TETO_MENSAGEM = 300;

// A LISTA MANDA EM TUDO: nos campos do painel de Equipe, nos botões da tela de
// entrada, no que é gravado e no que a regra do banco aceita. Botão novo
// (Comercial, por exemplo) é UMA entrada aqui — mais a linha correspondente no
// `firestore.rules`, que é o único lugar que não tem como ler daqui.
//
// `campoWhatsapp` do suporte é `whatsapp` puro, sem prefixo, porque é assim que
// ele já está gravado nos produtos que estão no ar. Trocar por `suporteWhatsapp`
// deixaria o botão de suporte sumir de todos eles no dia da atualização.
export const CONTATOS = [
  {
    chave: 'suporte',
    rotulo: 'Suporte',
    classe: 'btn--suporte',
    campoWhatsapp: 'whatsapp',
    campoMensagem: 'mensagem',
    tituloAjuste: 'Suporte no WhatsApp',
    explicaAjuste:
      'Para quem não está conseguindo entrar: conta nova, email ' + 'errado, Google recusando.',
  },
  {
    chave: 'financeiro',
    rotulo: 'Financeiro',
    classe: 'btn--financeiro',
    campoWhatsapp: 'financeiroWhatsapp',
    campoMensagem: 'financeiroMensagem',
    tituloAjuste: 'Financeiro no WhatsApp',
    explicaAjuste:
      'Para quem quer pagar e liberar o acesso — licença vencida, ' +
      'renovação, segunda via. Sem este botão, quem está devendo cai na fila ' +
      'do suporte, que não é quem libera.',
  },
];

// Todos os campos que este documento pode ter. A regra do banco recusa a
// gravação inteira se aparecer um quinto — e é essa trava que impede a coleção
// pública de virar depósito de dado de cliente.
export const CAMPOS = CONTATOS.flatMap((c) => [c.campoWhatsapp, c.campoMensagem]);

// O DDI 55 é posto quando falta, e este é o único palpite deste arquivo.
//
// O erro nº 1 ao preencher é digitar o número como se fala ("11 99999-9999") e
// o link abrir uma conversa com ninguém — o WhatsApp exige o país. Números com
// 10 ou 11 dígitos são celular ou fixo brasileiro com DDD, e nada mais no
// mundo tem esse formato sem país. Qualquer coisa maior já traz DDI e é
// deixada em paz.
const DIGITOS_BR_SEM_DDI = [10, 11];

export function soDigitos(texto) {
  return String(texto == null ? '' : texto).replace(/\D/g, '');
}

export function numeroCompleto(whatsapp) {
  const d = soDigitos(whatsapp);
  if (!d) return '';
  return DIGITOS_BR_SEM_DDI.includes(d.length) ? `55${d}` : d;
}

// Devolve '' quando não há número configurado — e é isso que faz o botão SUMIR
// em vez de aparecer levando a lugar nenhum. Botão que não funciona é pior que
// botão ausente: o primeiro quebra a confiança de quem já estava com problema.
export function linkDoWhatsapp(contato) {
  const numero = numeroCompleto(contato && contato.whatsapp);
  if (!numero) return '';
  const mensagem = String((contato && contato.mensagem) || '').trim();
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${numero}${texto}`;
}

// O link de UM contato, lido do documento cru pelos nomes de campo dele.
export function linkDoContato(dados, contato) {
  return linkDoWhatsapp({
    whatsapp: dados && dados[contato.campoWhatsapp],
    mensagem: dados && dados[contato.campoMensagem],
  });
}

// OS BOTÕES, prontos para pendurar na tela — e só os que têm número.
//
// Mora aqui, e não em cada tela, porque são DUAS telas que mostram os mesmos
// botões: a de entrada e a de "sua conta ainda não tem acesso". Duplicar o
// desenho garantia que um dia elas ficassem diferentes, e a segunda é
// justamente onde cai quem está com a licença vencida.
//
// `documento` entra por parâmetro para o teste poder montar isto sem navegador.
export function criarBotoesDeContato(dados, documento = globalThis.document) {
  const botoes = [];
  for (const contato of CONTATOS) {
    const link = linkDoContato(dados, contato);
    if (!link) continue;
    const a = documento.createElement('a');
    a.id = `bt-${contato.chave}`;
    a.className = `btn ${contato.classe}`;
    a.href = link;
    a.target = '_blank';
    // `noopener` não é enfeite: sem ele a página aberta ganha `window.opener` e
    // consegue trocar o endereço desta aba — a manobra clássica de fingir uma
    // tela de login. Esta É a tela de login.
    a.rel = 'noopener noreferrer';
    a.textContent = contato.rotulo;
    botoes.push(a);
  }
  return botoes;
}

// A LEITURA NUNCA DERRUBA QUEM CHAMA. Na tela de entrada isto roda antes de
// existir sessão, e uma regra recusando, uma rede caindo ou um projeto sem o
// documento não podem impedir alguém de entrar — os contatos são o acessório,
// o login é o essencial.
// ⚠️ INSTALAÇÃO NOVA NASCE COM NÚMERO DE MENTIRA, E ISSO É DE PROPÓSITO.
//
// Cada botão de contato só aparece se houver número — e o efeito disso numa
// carcaça recém-instalada era a tela de entrada nascer SEM os botões, sem
// nenhuma pista de que eles existem. Quem monta o produto não descobre um
// recurso que não está na tela: ele configurava tudo, entregava ao cliente, e o
// suporte simplesmente não existia ali.
//
// Com a semente, os dois botões aparecem desde o primeiro segundo. Quem está
// montando VÊ o recurso, entende para que serve, e troca o número por um de
// verdade. É o oposto de um campo vazio esperando adivinhação.
//
// ⚠️ E ELA SÓ VALE ENQUANTO NINGUÉM DECIDIU NADA — a diferença está entre
// "documento não existe" e "documento existe com o campo vazio":
//
//   documento AUSENTE   ninguém configurou ainda  →  mostra a semente
//   campo VAZIO         alguém apagou de propósito →  respeita, e some o botão
//
// Sem essa distinção, apagar o número seria impossível: a semente voltaria a
// cada leitura, e o botão que o dono acabou de tirar reapareceria sozinho.
export const CONTATOS_SEMENTE = {
  // Número claramente falso — 9 seguido de zeros não existe em lugar nenhum.
  // Fosse um número plausível, alguém publicaria o produto sem trocar e um
  // desconhecido receberia as mensagens de suporte de um cliente.
  whatsapp: '11 90000-0000',
  mensagem: 'Olá! Preciso de ajuda para entrar.',
  financeiroWhatsapp: '11 90000-0000',
  financeiroMensagem: 'Olá! É sobre pagamento.',
};

export async function lerContatos(db, firestore) {
  try {
    const { doc, getDoc } = firestore;
    const snap = await getDoc(doc(db, ...CAMINHO_CONTATOS));
    // `!snap.exists()` e não "sem campos": ver o aviso acima.
    return snap.exists() ? snap.data() : { ...CONTATOS_SEMENTE };
  } catch (e) {
    console.warn('contatos: não consegui ler.', e && e.message);
    return null;
  }
}

// `setDoc` com merge, não `updateDoc`: no dia 1 o documento não existe, e
// `updateDoc` falha com `not-found` em documento inexistente — foi exatamente
// esse o defeito que impediu um produto desta casa de ser ligado.
//
// GRAVA SEMPRE OS QUATRO CAMPOS, mesmo os vazios. Assim apagar um número
// realmente apaga (com merge, campo ausente ficaria com o valor antigo, e o
// botão que a pessoa acabou de tirar continuaria na tela de entrada).
export async function salvarContatos(db, firestore, dados) {
  const { doc, setDoc } = firestore;
  const paraGravar = {};
  for (const c of CONTATOS) {
    paraGravar[c.campoWhatsapp] = limpar(dados && dados[c.campoWhatsapp], TETO_WHATSAPP);
    paraGravar[c.campoMensagem] = limpar(dados && dados[c.campoMensagem], TETO_MENSAGEM);
  }
  await setDoc(doc(db, ...CAMINHO_CONTATOS), paraGravar, { merge: true });
}

function limpar(valor, teto) {
  return String(valor == null ? '' : valor)
    .trim()
    .slice(0, teto);
}
