// Semeia a comunidade INTEIRA com conteúdo DEMO, para ver o desenho de pé.
//
// POR QUE ISTO É UM SCRIPT, e não um botão no painel.
//
// O botão do painel ("Criar 10 módulos de exemplo") existe para o CLIENTE que
// recebe o sistema e quer partir de algo pronto. Isto aqui é outra coisa: é
// conteúdo de vitrine para NÓS enxergarmos as telas cheias enquanto elas estão
// sendo construídas. Vira lixo assim que o conteúdo de verdade entrar, e o
// lugar do que vira lixo é fora do produto.
//
// COMO RODA — sem arquivo de credencial:
//
//   node scripts/semear-demo.mjs "$(gcloud auth print-access-token)"
//
// O token é o da conta dona do projeto, vale uma hora, e não fica gravado.
//
// ---------------------------------------------------------------------------
// TODO VÍDEO APONTA PARA UM VÍDEO QUE EXISTE DE VERDADE.
// ---------------------------------------------------------------------------
//
// A tentação aqui é inventar identificadores de vídeo para variar o conteúdo.
// Não dá: identificador inventado é um quadro cinza escrito "vídeo indisponível"
// em toda aula do demo — e aí o demo prova o contrário do que existe para
// provar. Um vídeo real repetido mostra o sistema funcionando; dez falsos
// mostram um sistema quebrado.
//
// ---------------------------------------------------------------------------
// TUDO NASCE COM "DEMO" NO NOME.
// ---------------------------------------------------------------------------
//
// É o que permite limpar depois sem apagar o que é de verdade — e é o que
// impede alguém de olhar a tela daqui a um mês e confundir enfeite com
// conteúdo publicado.

const PROJETO = 'comunidade-ninja-digital';

// `--emulador` aponta o mesmo script para o Firestore local. Existe para
// conferir o DESENHO das telas cheias antes de encher o banco de verdade — e
// para poder repetir a conferência sem sujar a produção a cada tentativa.
const noEmulador = process.argv.includes('--emulador');
const BASE = noEmulador
  ? `http://127.0.0.1:8080/v1/projects/${PROJETO}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

// O vídeo real, do canal do dono. Serve de aula e de transmissão.
const VIDEO = 'https://www.youtube.com/watch?v=S-rBebfFnhs';
const CANAL = 'https://www.youtube.com/@SitacioOssakaReview';

// O emulador aceita qualquer token: ele não confere credencial, e a palavra
// `owner` é o jeito conhecido de dizer "passa por cima das regras".
const token = noEmulador ? 'owner' : process.argv[2];
if (!token) {
  console.error(
    'Falta o token. Rode: node scripts/semear-demo.mjs "$(gcloud auth print-access-token)"',
  );
  process.exit(1);
}
const limpar = process.argv.includes('--limpar');

const cabecalhos = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// O Firestore REST exige o tipo de cada campo. Isto traduz um objeto comum.
function paraCampos(objeto) {
  const fields = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    if (typeof valor === 'string') fields[chave] = { stringValue: valor };
    else if (typeof valor === 'boolean') fields[chave] = { booleanValue: valor };
    else if (typeof valor === 'number') {
      fields[chave] = Number.isInteger(valor)
        ? { integerValue: String(valor) }
        : { doubleValue: valor };
    } else if (Array.isArray(valor)) {
      fields[chave] = { arrayValue: { values: valor.map((v) => ({ stringValue: String(v) })) } };
    }
  }
  return { fields };
}

async function criar(colecao, dados) {
  const r = await fetch(`${BASE}/dados/app/${colecao}`, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify(paraCampos(dados)),
  });
  if (!r.ok) throw new Error(`${colecao}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).name.split('/').pop();
}

async function definir(caminho, dados) {
  const r = await fetch(`${BASE}/${caminho}`, {
    method: 'PATCH',
    headers: cabecalhos,
    body: JSON.stringify(paraCampos(dados)),
  });
  if (!r.ok) throw new Error(`${caminho}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

async function listar(colecao) {
  const r = await fetch(`${BASE}/dados/app/${colecao}?pageSize=300`, { headers: cabecalhos });
  if (!r.ok) throw new Error(`${colecao}: ${r.status}`);
  const d = await r.json();
  return (d.documents || []).map((x) => ({
    id: x.name.split('/').pop(),
    titulo: x.fields?.titulo?.stringValue || '',
    autorUid: x.fields?.autorUid?.stringValue || '',
    nome: x.fields?.nome?.stringValue || '',
  }));
}

// O QUE CONTA COMO DEMO. Não é só o título: comentário não tem título, e perfil
// tem `nome`. Se a limpeza olhasse só o título, apagar os posts deixaria para
// trás as RESPOSTAS deles — que continuam contando pontos para gente que não
// existe, e o ranking da comunidade nasceria mentindo.
function ehDemo(x) {
  return (
    /DEMO/i.test(x.titulo) ||
    /DEMO/i.test(x.nome) ||
    x.autorUid.startsWith('demo-') ||
    x.id.startsWith('demo-')
  );
}

async function remover(colecao, id) {
  await fetch(`${BASE}/dados/app/${colecao}/${id}`, { method: 'DELETE', headers: cabecalhos });
}

const HORA = 3600 * 1000;
const DIA = 24 * HORA;
const agora = Date.now();

// ---------------------------------------------------------------------------
// A LIMPEZA
// ---------------------------------------------------------------------------
//
// Apaga SÓ o que tem "DEMO" no título. Apagar por conta própria o que o dono
// criou não é decisão de script — e é justamente por isso que o marcador existe.

const COLECOES = [
  'cursos',
  'secoes',
  'aulas',
  'bonus',
  'produtos',
  'vitrine',
  'posts',
  'comentarios',
  'avisos',
  'lives',
  'perfis',
];

if (limpar) {
  console.log('Limpando o que é DEMO…');
  let total = 0;
  for (const colecao of COLECOES) {
    const demo = (await listar(colecao)).filter(ehDemo);
    for (const x of demo) await remover(colecao, x.id);
    if (demo.length) console.log(`  ${colecao}: ${demo.length} removido(s)`);
    total += demo.length;
  }
  // MÓDULOS E AULAS ÓRFÃOS. Eles não têm "DEMO" no título — o nome deles é
  // "Antes de começar", "A primeira venda". O que os liga ao demo é o curso
  // pai, que acabou de sumir; sem esta varredura, eles ficariam no banco para
  // sempre, invisíveis na tela e visíveis em toda listagem.
  const cursos = new Set((await listar('cursos')).map((c) => c.id));
  for (const colecao of ['secoes', 'aulas']) {
    const r = await fetch(`${BASE}/dados/app/${colecao}?pageSize=300`, { headers: cabecalhos });
    const d = await r.json();
    const orfaos = (d.documents || [])
      .filter((x) => !cursos.has(x.fields?.cursoId?.stringValue || ''))
      .map((x) => x.name.split('/').pop());
    for (const id of orfaos) await remover(colecao, id);
    if (orfaos.length) console.log(`  ${colecao}: ${orfaos.length} órfão(s) removido(s)`);
    total += orfaos.length;
  }
  console.log(`Pronto: ${total} registro(s). O que era de verdade continua lá.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// A TRAVA CONTRA DUPLICAR
// ---------------------------------------------------------------------------

const jaTem = (await listar('cursos')).filter(ehDemo);
if (jaTem.length) {
  console.error(`Este script já rodou (${jaTem.length} curso DEMO no ar).`);
  console.error('Para refazer: node scripts/semear-demo.mjs "$TOKEN" --limpar');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// O CATÁLOGO
// ---------------------------------------------------------------------------
//
// Três trilhas com tamanhos DIFERENTES de propósito. Um catálogo em que tudo
// tem o mesmo formato esconde justamente o que o demo precisa mostrar: como a
// tela se comporta com um curso curto ao lado de um longo.

const TRILHAS = [
  {
    titulo: 'DEMO · Do Zero Absoluto',
    descricao:
      'O caminho de quem nunca vendeu nada pela internet. Sem promessa ' +
      'de atalho: o que fazer na primeira semana, e por quê.',
    comecarAqui: true,
    modulos: [
      {
        titulo: 'Antes de começar',
        aulas: ['O que é viver do digital', 'O erro que trava 9 em 10', 'Montando sua rotina'],
      },
      {
        titulo: 'Sua primeira oferta',
        aulas: ['Escolhendo o que vender', 'Falando com quem compra', 'A primeira venda'],
      },
      {
        titulo: 'Colocando de pé',
        aulas: ['Ferramentas que bastam', 'Recebendo o dinheiro', 'O que fazer no mês 2'],
      },
    ],
  },
  {
    titulo: 'DEMO · Tráfego Pago na Prática',
    descricao:
      'Anúncio que traz cliente, e não curtida. Com orçamento pequeno, ' +
      'que é o orçamento de quem está começando.',
    comecarAqui: false,
    modulos: [
      { titulo: 'Fundamentos', aulas: ['Como o leilão funciona', 'Quanto investir no começo'] },
      {
        titulo: 'Campanhas',
        aulas: ['A primeira campanha', 'Lendo os números sem se enganar', 'Quando desligar'],
      },
    ],
  },
  {
    titulo: 'DEMO · Conteúdo que Vende',
    descricao: 'Aparecer sem depender de anúncio. Para quem tem tempo e não tem ' + 'orçamento.',
    comecarAqui: false,
    modulos: [{ titulo: 'A base', aulas: ['Sobre o que falar', 'Gravando com o celular'] }],
  },
];

console.log('Criando o catálogo…');
let ordemCurso = 0;
for (const trilha of TRILHAS) {
  ordemCurso += 10;
  const cursoId = await criar('cursos', {
    titulo: trilha.titulo,
    descricao: trilha.descricao,
    capaUrl: '',
    nivel: '',
    comecarAqui: trilha.comecarAqui,
    visivel: true,
    ordem: ordemCurso,
  });

  let ordemSecao = 0;
  let totalAulas = 0;
  for (const modulo of trilha.modulos) {
    ordemSecao += 10;
    const secaoId = await criar('secoes', {
      cursoId,
      titulo: modulo.titulo,
      capaUrl: '',
      visivel: true,
      ordem: ordemSecao,
    });
    let ordemAula = 0;
    for (const titulo of modulo.aulas) {
      ordemAula += 10;
      await criar('aulas', {
        cursoId,
        secaoId,
        titulo,
        capaUrl: '',
        videoUrl: VIDEO,
        descricao:
          'Aula DEMO. O vídeo é um exemplo real do canal — o conteúdo ' +
          'definitivo entra no lugar deste.',
        materiais: [],
        visivel: true,
        ordem: ordemAula,
      });
      totalAulas += 1;
    }
  }
  console.log(`  ${trilha.titulo} — ${trilha.modulos.length} módulos, ${totalAulas} aulas`);
}

// ---------------------------------------------------------------------------
// BÔNUS E PRODUTOS VALIDADOS
// ---------------------------------------------------------------------------
//
// Todo bônus nasce COM LINK. Card sem link fica apagado na tela — e uma fileira
// de cards apagados faz a área parecer quebrada, que é o oposto do que um demo
// precisa mostrar.

console.log('Criando bônus e produtos…');
const BONUS = [
  [
    'DEMO · Planilha de controle',
    'Onde entra e de onde sai. A conta que quase ninguém faz no começo.',
  ],
  ['DEMO · 30 modelos de post', 'Um mês de publicações, para não travar na página em branco.'],
  ['DEMO · Checklist do primeiro mês', 'O que fazer em cada semana, na ordem.'],
  ['DEMO · Aula extra sobre bastidores', 'Uma conversa fora da trilha, sem edição.'],
];
// O CAMPO É `resumo`, e não `descricao`.
//
// A tela do membro e o editor do painel leem `resumo`; a primeira versão deste
// script gravava `descricao`, então a linha de apoio que eu escrevi para cada
// bônus não aparecia em lugar nenhum — nem no card, nem no formulário. Dado de
// demonstração que não aparece é pior que dado nenhum: ele faz o campo parecer
// quebrado.
for (const [i, [titulo, resumo]] of BONUS.entries()) {
  await criar('bonus', {
    titulo,
    resumo,
    capaUrl: '',
    linkUrl: CANAL,
    visivel: true,
    ordem: (i + 1) * 10,
  });
}

const PRODUTOS = [
  ['DEMO · Curso Do Zero Absoluto', 'O nosso curso de entrada. Comissão de 50% para membros.'],
  ['DEMO · Mentoria em grupo', 'Encontros semanais. Ticket alto, comissão alta.'],
  ['DEMO · Ferramenta de agendamento', 'Assinatura mensal, comissão recorrente.'],
];
const SELOS_DEMO = ['Curso', 'Solução', 'Ferramenta'];
for (const [i, [titulo, resumo]] of PRODUTOS.entries()) {
  await criar('produtos', {
    titulo,
    resumo,
    capaUrl: '',
    linkUrl: CANAL,
    visivel: true,
    ordem: (i + 1) * 10,
    // O selo é o que separa um produto do outro na tela do membro — sem ele,
    // três cards iguais que vendem de jeitos diferentes.
    tipo: SELOS_DEMO[i] || '',
  });
}

// ---------------------------------------------------------------------------
// AO VIVO
// ---------------------------------------------------------------------------
//
// Três estados na mesma tela: uma no ar agora, uma marcada, uma que já passou.
// É a única forma de ver os três blocos funcionando sem esperar dias.

console.log('Marcando as transmissões…');
const LIVES = [
  [
    'DEMO · Aula ao vivo: começando hoje',
    agora - HORA,
    'Está no ar agora. O palco do meio da tela sempre mostra o que é mais urgente.',
  ],
  [
    'DEMO · Live de perguntas e respostas',
    agora + 2 * DIA,
    'Traga sua dúvida. Quando a hora chegar, ela sobe sozinha para o palco.',
  ],
  [
    'DEMO · Encontro de abertura',
    agora - 9 * DIA,
    'Já aconteceu. A gravação fica no mesmo endereço.',
  ],
];
for (const [titulo, quandoEmMs, descricao] of LIVES) {
  await criar('lives', { titulo, descricao, videoUrl: VIDEO, quandoEmMs, visivel: true });
}

// ---------------------------------------------------------------------------
// O FÓRUM
// ---------------------------------------------------------------------------
//
// Perguntas com respostas de gente diferente, e uma marcada como resolvida —
// é o que faz a pontuação, os selos e o ranking aparecerem na tela. Um fórum
// demo só com perguntas sem resposta mostra uma comunidade morta.

console.log('Criando o fórum…');
const AUTORES = [
  ['demo-maria', 'Maria (DEMO)'],
  ['demo-joao', 'João (DEMO)'],
  ['demo-ana', 'Ana (DEMO)'],
  ['demo-rita', 'Rita (DEMO)'],
];

const CONVERSAS = [
  {
    titulo: 'DEMO · Comecei do zero, por onde eu começo de verdade?',
    corpo: 'Vi muita coisa na internet e me perdi. Quero um primeiro passo, não dez.',
    autor: 0,
    h: 3,
    respostas: [
      [
        1,
        'Trilha 1, aula 1, e só ela hoje. Eu tentei ver tudo de uma vez e não fiz nada por duas semanas.',
        true,
      ],
      [
        2,
        'Complementando: escreve num papel o que você quer no mês 1. Sem isso a gente fica pulando de assunto.',
      ],
    ],
  },
  {
    titulo: 'DEMO · Quanto investir em anúncio no começo?',
    corpo: 'Tenho pouco dinheiro guardado e medo de queimar tudo na primeira semana.',
    autor: 3,
    h: 20,
    respostas: [
      [
        1,
        'O que você aguenta perder sem mudar nada na sua vida. Sério. No começo você está comprando aprendizado, não venda.',
      ],
      [
        2,
        'Eu comecei com 20 por dia durante 10 dias. Não vendi nada nos 5 primeiros e quase parei — foi no 7º que virou.',
        true,
      ],
      [0, 'Essa resposta salvou meu mês, obrigada.'],
    ],
  },
  {
    titulo: 'DEMO · Fiz a primeira venda! 🎉',
    corpo:
      'Três meses depois de entrar aqui. Não é muito dinheiro, mas provou para mim que funciona.',
    autor: 2,
    h: 30,
    respostas: [
      [0, 'Parabéns! Conta o que você fez diferente nas últimas semanas?'],
      [3, 'Isso aí. A primeira é a mais difícil.'],
    ],
  },
  {
    titulo: 'DEMO · Gateway de pagamento: qual vocês usam?',
    corpo: 'Preciso receber por cartão e boleto. Estou perdido entre as opções.',
    autor: 1,
    h: 50,
    respostas: [
      [
        3,
        'Depende do seu volume. No começo, o que tiver a menor burocracia de cadastro — trocar depois é fácil.',
        true,
      ],
    ],
  },
  {
    titulo: 'DEMO · Como vocês organizam a rotina trabalhando com CLT?',
    corpo: 'Saio às 18h e chego morto. Queria entender como encaixar isso.',
    autor: 0,
    h: 96,
    respostas: [
      [
        2,
        'Uma hora por dia, sempre no mesmo horário. Duas horas no sábado. Constância ganha de intensidade.',
      ],
      [1, 'Eu acordo 1h mais cedo. Doeu no começo, mas de noite eu não rendia nada mesmo.'],
    ],
  },
];

for (const [i, conversa] of CONVERSAS.entries()) {
  const [autorUid, autorNome] = AUTORES[conversa.autor];
  const emMs = agora - conversa.h * HORA;
  const postId = await criar('posts', {
    titulo: conversa.titulo,
    corpo: conversa.corpo,
    tipo: 'pergunta',
    autorUid,
    autorNome,
    emMs,
    visivel: true,
    fixado: false,
    respostaAceitaId: '',
  });

  let aceitaId = '';
  for (const [j, resposta] of conversa.respostas.entries()) {
    const [quem, texto, aceita] = resposta;
    const [rUid, rNome] = AUTORES[quem];
    const id = await criar('comentarios', {
      postId,
      corpo: texto,
      autorUid: rUid,
      autorNome: rNome,
      emMs: emMs + (j + 1) * 40 * 60000,
      visivel: true,
    });
    if (aceita) aceitaId = id;
  }
  if (aceitaId) {
    await definir(`dados/app/posts/${postId}`, {
      titulo: conversa.titulo,
      corpo: conversa.corpo,
      tipo: 'pergunta',
      autorUid,
      autorNome,
      emMs,
      visivel: true,
      fixado: false,
      respostaAceitaId: aceitaId,
    });
  }
  console.log(
    `  ${i + 1}. ${conversa.titulo.slice(0, 45)}… (${conversa.respostas.length} respostas)`,
  );
}

// As publicações da equipe: o acervo da aba "Publicações".
const MATERIAS = [
  [
    'DEMO · Regras da casa',
    'Pergunte à vontade, responda quando puder, e trate ' +
      'todo mundo como você queria ser tratado no seu primeiro dia. Não existe ' +
      'pergunta boba aqui — existe gente que já passou por ela.',
    200,
    true,
  ],
  [
    'DEMO · Como usar a comunidade para acelerar',
    'Perguntar em público parece ' +
      'expor fraqueza e é o contrário: é o jeito mais rápido de destravar, e a ' +
      'sua pergunta ajuda quem chegar depois.',
    400,
    false,
  ],
  [
    'DEMO · O que esperar dos primeiros 30 dias',
    'Não é venda. É entender o ' +
      'jogo, montar rotina e publicar a primeira coisa. Quem cobra venda de si ' +
      'mesmo na semana 1 desiste na semana 3.',
    700,
    false,
  ],
];
for (const [titulo, corpo, h, fixado] of MATERIAS) {
  await criar('posts', {
    titulo,
    corpo,
    tipo: 'post',
    autorUid: 'demo-equipe',
    autorNome: 'Equipe',
    emMs: agora - h * HORA,
    visivel: true,
    fixado,
    respostaAceitaId: '',
  });
}

// ---------------------------------------------------------------------------
// AVISOS E CONEXÃO
// ---------------------------------------------------------------------------

console.log('Criando avisos e perfis da Conexão…');
const AVISOS = [
  [
    'DEMO · Live de perguntas em 2 dias',
    'Manda sua dúvida antes, respondo primeiro as enviadas.',
    1,
  ],
  ['DEMO · Trilha de Tráfego no ar', 'Cinco aulas novas, já liberadas para todo mundo.', 26],
  ['DEMO · Novo bônus: 30 modelos de post', 'Está na Página Inicial, na seção de bônus.', 60],
];
for (const [titulo, corpo, h] of AVISOS) {
  await criar('avisos', { titulo, corpo, linkUrl: '', emMs: agora - h * HORA, visivel: true });
}

// A Conexão precisa de rosto: sem foto o perfil nem entra na lista, e a tela
// ficaria vazia justamente na área que existe para mostrar gente.
const PERFIS = [
  ['demo-maria', 'Maria (DEMO)', 'Começando em produto digital', '@maria.demo', 1],
  ['demo-joao', 'João (DEMO)', 'Faço tráfego para clínicas', '@joao.demo', 2],
  ['demo-ana', 'Ana (DEMO)', 'Vendo no digital há 8 meses', '@ana.demo', 3],
  ['demo-rita', 'Rita (DEMO)', 'Saí do CLT em maio', '@rita.demo', 4],
];
for (const [uid, nome, bio, instagram, n] of PERFIS) {
  await definir(`dados/app/perfis/${uid}`, {
    visivel: true,
    nome,
    // Foto gerada por endereço, sem depender de arquivo nenhum — o demo tem que
    // rodar numa máquina limpa, sem imagem para subir junto.
    fotoUrl: `https://api.dicebear.com/9.x/avataaars/png?seed=demo${n}&size=200`,
    bio,
    instagram,
    facebook: '',
    youtube: '',
    tiktok: '',
    outro: '',
    atualizadoEmMs: agora - n * HORA,
  });
}

console.log('');
console.log('Pronto. Tudo que entrou tem "DEMO" no nome.');
console.log('Para tirar: node scripts/semear-demo.mjs "$TOKEN" --limpar');
