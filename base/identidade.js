// A identidade visual do site: logo, cor, fonte e as imagens da entrada.
//
// POR QUE ELA MORA NO BANCO, e não em `config/marca.js`.
//
// O mesmo sistema roda para vários negócios. Trocar a cara não pode exigir
// editar arquivo, publicar e esperar deploy — o dono troca pelo painel e vê na
// hora. `config/marca.js` continua existindo e continua sendo o nome cravado no
// código: é o que faz o produto funcionar no primeiro minuto, antes de alguém
// configurar qualquer coisa. A identidade do banco VENCE quando existe.
//
// POR QUE O DOCUMENTO É PÚBLICO.
//
// A tela de entrada precisa do logo e do fundo ANTES de qualquer login. Se
// exigisse sessão, a identidade só apareceria para quem já entrou. Ver
// `/publico/identidade` em firestore.rules, com lista branca de campos, e a
// pasta `publico/` em storage.rules.
//
// NADA AQUI PODE DERRUBAR A TELA. Identidade é enfeite: se a leitura falhar,
// cai no tema padrão e a pessoa continua entrando e usando o sistema. Toda
// função deste arquivo engole o próprio erro de propósito.

const NEUTRO = {};

// As combinações de fonte que o painel oferece. Fonte é a decisão que mais muda
// a cara de um site com menos trabalho — e é também a que mais estraga quando
// se deixa escolher qualquer coisa. Cinco combinações prontas, testadas juntas.
// ---------------------------------------------------------------------------
// AS FAMÍLIAS, e os pares prontos
// ---------------------------------------------------------------------------
//
// Duas listas, e uma depende da outra:
//
//   FAMILIAS  — cada fonte, sozinha, com a folha que a baixa e a pilha de
//               reserva para quando ela não chega.
//   FONTES    — os PARES prontos: uma fonte de título com personalidade e uma
//               de texto neutra. É o que a maioria vai usar sem pensar.
//
// A regra da casa: no máximo DUAS famílias por projeto — uma de display, uma de
// texto. Cada família a mais divide a atenção e barateia o conjunto, e cada uma
// é uma folha de estilo a mais para baixar antes de a tela aparecer.
//
// A pilha de reserva de cada família não é enfeite: enquanto a folha do Google
// não chega — ou se ela nunca chegar —, é ela que desenha. Uma serifada de
// display caindo numa sans genérica muda a cara do produto; caindo em Georgia,
// não.
export const FAMILIAS = {
  // ⚠️ A PADRÃO NÃO BAIXA NADA — e isso saiu de um teste que ficou vermelho.
  //
  // O produto sempre disse `"Inter", system-ui, …` na fonte padrão, e NUNCA
  // baixou a Inter. Ou seja: o que todo mundo via desde o começo era a pilha do
  // sistema, e o nome "Inter" ali era decoração.
  //
  // Em vez de passar a baixá-la, a pilha do sistema virou a família padrão de
  // verdade. Ela é a mais rápida que existe — zero pedido de rede, zero espera,
  // zero texto invisível enquanto a folha não chega — e já é a letra que a
  // pessoa lê o dia inteiro no aparelho dela. A Inter continua na lista, para
  // quem a quiser de propósito.
  sistema: {
    nome: 'Do sistema (mais rápida)',
    tipo: 'ambos',
    css: '',
    pilha: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inter: {
    nome: 'Inter',
    tipo: 'texto',
    css: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    pilha: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  playfair: {
    nome: 'Playfair Display',
    tipo: 'titulo',
    css: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap',
    pilha: '"Playfair Display", Georgia, "Times New Roman", serif',
  },
  poppins: {
    nome: 'Poppins',
    tipo: 'ambos',
    css: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    pilha: '"Poppins", system-ui, sans-serif',
  },
  sora: {
    nome: 'Sora',
    tipo: 'titulo',
    css: 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&display=swap',
    pilha: '"Sora", system-ui, sans-serif',
  },
  archivo: {
    nome: 'Archivo',
    tipo: 'titulo',
    css: 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&display=swap',
    pilha: '"Archivo", Impact, system-ui, sans-serif',
  },
  lora: {
    nome: 'Lora',
    tipo: 'texto',
    css: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',
    pilha: '"Lora", Georgia, serif',
  },
  quicksand: {
    nome: 'Quicksand',
    tipo: 'ambos',
    css: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap',
    pilha: '"Quicksand", system-ui, sans-serif',
  },
  mono: {
    nome: 'JetBrains Mono',
    tipo: 'titulo',
    css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap',
    pilha: '"JetBrains Mono", ui-monospace, "Courier New", monospace',
  },
};

// OS PARES PRONTOS. Cada um é uma direção inteira em uma escolha só: fonte de
// título com personalidade + fonte de texto que some para deixar ler.
//
// `familia` e `familiaTitulo` continuam existindo porque são o que o resto do
// sistema já lê — e porque um par é, no fim, só um atalho para duas famílias.
function par(nome, descricao, titulo, texto) {
  return {
    nome,
    descricao,
    titulo,
    texto,
    familia: FAMILIAS[texto].pilha,
    familiaTitulo: FAMILIAS[titulo].pilha,
    // A folha de cada uma; quando são a mesma, uma só.
    css: FAMILIAS[titulo].css,
    cssTexto: FAMILIAS[texto].css,
  };
}

export const FONTES = {
  padrao: par(
    'Padrão',
    'A letra do próprio aparelho. Nada para baixar, nada para esperar.',
    'sistema',
    'sistema',
  ),
  limpa: par(
    'Limpa',
    'Inter: a sans neutra dos produtos digitais. Some para deixar ler.',
    'inter',
    'inter',
  ),
  editorial: par(
    'Editorial',
    'Serifada de contraste no título. Ar de revista.',
    'playfair',
    'inter',
  ),
  moderna: par('Moderna', 'Geométrica e redonda. Jovem sem ser informal.', 'poppins', 'poppins'),
  tecnica: par(
    'Técnica',
    'Monoespaçada no título. Cara de produto de tecnologia.',
    'mono',
    'inter',
  ),
  amigavel: par(
    'Amigável',
    'Arredondada e macia. Boa para quem está começando.',
    'quicksand',
    'quicksand',
  ),
  forte: par(
    'Forte',
    'Título pesado que ocupa espaço. Para marca com atitude.',
    'archivo',
    'inter',
  ),
  serena: par('Serena', 'Título firme, texto serifado. Leitura longa e calma.', 'sora', 'lora'),
};

// QUAL FAMÍLIA VALE, no fim das contas.
//
// A escolha individual ganha do par pronto, e o par ganha do padrão. É a mesma
// escada de sempre: do mais específico ao mais genérico. Quem escolhe um par e
// não mexe em mais nada tem duas fontes coerentes; quem quiser trocar só o
// título, troca só o título.
//
// A compatibilidade mora aqui: instalação antiga só tem `fonte` gravado, e
// continua funcionando sem migração nenhuma.
export function familiasEscolhidas(id) {
  const dados = id || {};
  const combo = FONTES[dados.fonte] || FONTES.padrao;
  const doTitulo = FAMILIAS[dados.fonteTitulo] || FAMILIAS[combo.titulo];
  const doTexto = FAMILIAS[dados.fonteTexto] || FAMILIAS[combo.texto];
  return { titulo: doTitulo, texto: doTexto };
}

// Os campos que a lista branca da regra aceita. Gêmeo de `firestore.rules` —
// acrescentar campo aqui sem acrescentar lá faz o painel salvar e o banco
// recusar, com erro cru do Firestore na cara de quem preencheu.
// ⚠️ CAMPO NOVO ENTRA AQUI **E** EM `modules/identidade/module.js`, no
// `setDoc`. Aquela tela grava com `merge: false` de propósito — o documento é a
// identidade inteira —, então campo que não esteja lá é apagado a cada
// salvamento, em silêncio.
//
// Saíram desta lista, quando a carcaça virou matriz: `heroImagemUrl`,
// `heroTexto` e `heroLargura` (o topo da Página Inicial), `orientacaoCards` e
// `nomeAbaixoDaCapa` (o formato das capas do catálogo), `vitrineLigada` e
// `vitrineTitulo`, `areasDesligadas` (ligar e desligar áreas de uma área de
// membros) e `ofertaRenovacao`/`termosUrl`/`privacidadeUrl` (que eram do
// checkout). Eram configuração daquele produto, não da casca.
export const CAMPOS = [
  'logoUrl',
  'faviconUrl',
  'loginImagemUrl',
  'loginImagemMobileUrl',
  'corDestaque',
  'fonte',
  'rodape',
  // O tema e as três cores do layout. Ver `aplicarTema`.
  'tema',
  'corTopo',
  'corConteudo',
  'corRodape',
  // O logo ESCRITO, em até DUAS partes — cada uma com cor e fonte próprias.
  'logoTexto',
  'logoCor',
  'logoFonte',
  'logoTexto2',
  'logoCor2',
  'logoFonte2',
  // A escolha individual de fonte, quando o par pronto não serve.
  'fonteTitulo',
  'fonteTexto',
];

// CLARO OU ESCURO É ESCOLHA DO DONO, e não de quem usa.
//
// Não é preferência de usuário: é a identidade do produto, do mesmo jeito que a
// cor da marca e a fonte. Uma área de membros em que cada pessoa escolhe o tema
// é uma área de membros que não tem cara nenhuma — e o dono que desenhou a capa
// do curso para fundo claro perde o trabalho na conta de quem virou a chave.
//
// (Respeitar `prefers-color-scheme` seria o certo num site público, onde a
// preferência é do visitante. Aqui a marca é do dono.)
export const TEMAS = ['claro', 'escuro'];

export function temaValido(valor) {
  return TEMAS.includes(String(valor || '').trim()) ? String(valor).trim() : 'claro';
}

export function ehCorValida(valor) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(valor == null ? '' : valor).trim());
}

// https SEMPRE — menos no emulador, e a exceção é estreita de propósito.
//
// O Storage de verdade devolve endereço https. O do emulador devolve
// `http://127.0.0.1:9199/...`, e com a regra estrita a imagem simplesmente não
// aparecia durante o desenvolvimento — o que tira do emulador exatamente a
// utilidade dele: provar na tela antes de publicar.
//
// A brecha exige que a PRÓPRIA PÁGINA esteja em localhost. Num site publicado,
// `hostname` é o domínio real e nenhum `http://` passa — nem o de dentro do
// documento de identidade, que um admin poderia colar sem querer.
export function ehUrlSegura(url, hostname) {
  const u = String(url == null ? '' : url).trim();
  if (/^https:\/\//i.test(u)) return true;

  const host =
    hostname !== undefined ? hostname : typeof location !== 'undefined' ? location.hostname : '';
  const noEmulador = host === 'localhost' || host === '127.0.0.1';
  return noEmulador && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/i.test(u);
}

// Escurece uma cor para o estado :hover, sem exigir que o dono escolha duas.
// Pedir "a cor" e "a cor do hover" é pedir uma decisão que ninguém quer tomar.
export function escurecer(hex, fator = 0.82) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = (i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * fator)));
  return `#${[n(0), n(2), n(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Clareia para o segundo tom do gradiente, pelo mesmo motivo.
export function clarear(hex, fator = 0.28) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * fator);
  };
  return `#${[n(0), n(2), n(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Escreve as variáveis do tema. Recebe o elemento para poder ser testada.
export function aplicarTema(dados, raiz) {
  const id = dados || NEUTRO;
  const alvo = raiz || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!alvo || !alvo.style) return;

  if (ehCorValida(id.corDestaque)) {
    const cor = id.corDestaque.trim();
    const claro = clarear(cor);
    alvo.style.setProperty('--cor-principal', cor);
    alvo.style.setProperty('--cor-principal-2', claro);
    alvo.style.setProperty('--cor-principal-hover', escurecer(cor));
    alvo.style.setProperty('--grad-principal', `linear-gradient(135deg, ${cor}, ${claro})`);
  }

  const { titulo, texto } = familiasEscolhidas(id);
  alvo.style.setProperty('--fonte', texto.pilha);
  alvo.style.setProperty('--fonte-titulo', titulo.pilha);

  // A FORMA DAS CAPAS DOS CARDS.
  //
  // O campo `orientacaoCards` já era gravado no banco e não fazia nada: a capa
  // vinha com 16/9 cravado no CSS. Agora ele vira um token, e o card inteiro
  // ⚠️ SAÍRAM DAQUI, quando a carcaça virou matriz, três atributos que o
  // produto anterior usava: a proporção das capas do catálogo
  // (`--card-proporcao`), o nome abaixo da capa (`data-nome-card`) e a largura
  // do hero (`data-hero`).
  //
  // A LIÇÃO que sobrevive a eles: aparência que liga UM BLOCO de CSS (margens,
  // cantos, respiro) vira ATRIBUTO no elemento raiz, não token de cor. Token
  // resolve um valor; atributo resolve um estado. Confundir os dois faz o
  // produto guardar quinze campos no banco para descrever algo que o CSS já
  // sabe desenhar — e cria quinze jeitos de o contraste sair errado.

  // O TEMA É UM ATRIBUTO, e não uma pilha de cores gravadas.
  //
  // `data-tema="escuro"` liga um bloco de CSS que redefine os neutros de uma
  // vez. A alternativa — gravar cada cor do escuro no banco — faria o dono
  // configurar quinze campos para ter um tema que já sabemos desenhar, e
  // deixaria quinze jeitos de o contraste sair errado.
  alvo.setAttribute('data-tema', temaValido(id.tema));

  // As três áreas com cor própria. Cada uma só entra se for uma cor de verdade:
  // campo vazio quer dizer "usa a do tema", e não "pinta de nada".
  for (const [campo, token] of [
    ['corTopo', '--cor-topo'],
    ['corConteudo', '--cor-conteudo'],
    ['corRodape', '--cor-rodape'],
  ]) {
    if (ehCorValida(id[campo])) alvo.style.setProperty(token, id[campo].trim());
    else alvo.style.removeProperty(token);
  }

  // O LOGO ESCRITO tem cor e fonte próprias — e nem sempre são as do site.
  //
  // A marca costuma ser o lugar onde o cliente já decidiu tudo: a fonte do logo
  // dele pode não ser a fonte de leitura do produto, e a cor dele pode não ser
  // a cor de destaque dos botões. Amarrar as duas coisas obrigaria a escolher
  // entre um logo certo e um site legível.
  //
  // Sem escolha, ele herda: cor = o gradiente da marca, fonte = a do site.
  if (ehCorValida(id.logoCor)) alvo.style.setProperty('--cor-logo', id.logoCor.trim());
  else alvo.style.removeProperty('--cor-logo');

  for (const [campo, token] of [
    ['logoFonte', '--fonte-logo'],
    ['logoFonte2', '--fonte-logo-2'],
  ]) {
    const fam = FAMILIAS[id[campo]];
    if (fam) alvo.style.setProperty(token, fam.pilha);
    else alvo.style.removeProperty(token);
  }
  if (ehCorValida(id.logoCor2)) alvo.style.setProperty('--cor-logo-2', id.logoCor2.trim());
  else alvo.style.removeProperty('--cor-logo-2');
}

// AS FOLHAS DE FONTE, e só as que forem usadas.
//
// Cada família é uma folha do Google, e cada folha é um pedido de rede antes de
// o texto aparecer. Baixar as oito para usar duas seria pagar seis vezes por
// nada — e no 4G de quem está com pressa isso é segundo de tela em branco.
//
// A mesma família pedida duas vezes (o par usa a mesma no título e no texto)
// entra uma vez só: o `id` no elemento é a trava.
export function carregarFamilia(chave, cabeca) {
  const fam = FAMILIAS[chave];
  const head = cabeca || (typeof document !== 'undefined' ? document.head : null);
  // Família sem folha é a do sistema: não há o que baixar, e pedir por ela
  // seria um pedido de rede para receber nada.
  if (!fam || !fam.css || !head) return null;
  const id = `fonte-${chave}`;
  if (head.querySelector(`#${id}`)) return null;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = fam.css;
  head.appendChild(link);
  return link;
}

// Tudo que a identidade escolhida precisa: as duas do texto e as do logo.
export function carregarFontes(id, cabeca) {
  const dados = id || {};
  const { titulo, texto } = familiasEscolhidas(dados);
  const chaves = new Set();
  for (const [chave, fam] of Object.entries(FAMILIAS)) {
    if (fam === titulo || fam === texto) chaves.add(chave);
  }
  if (FAMILIAS[dados.logoFonte]) chaves.add(dados.logoFonte);
  if (FAMILIAS[dados.logoFonte2]) chaves.add(dados.logoFonte2);
  for (const chave of chaves) carregarFamilia(chave, cabeca);
  return [...chaves];
}

export function aplicarFavicon(dados, doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !dados || !ehUrlSegura(dados.faviconUrl)) return null;
  let link = d.querySelector('link[rel="icon"]');
  if (!link) {
    link = d.createElement('link');
    link.rel = 'icon';
    d.head.appendChild(link);
  }
  // O navegador guarda favicon com teimosia extra. Sem trocar o endereço, o
  // ícone novo pode levar dias — e a conclusão de quem olha é "não subiu".
  link.href = dados.faviconUrl;
  return link;
}

// Lê o documento público. Devolve `{}` em qualquer erro: sem sessão, sem rede,
// documento inexistente. Quem chama não precisa de try/catch.
export async function lerIdentidade(db, firestore) {
  try {
    const snap = await firestore.getDoc(firestore.doc(db, 'publico', 'identidade'));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    console.warn('identidade: sigo com o tema padrão.', e && e.message);
    return {};
  }
}

// Tudo de uma vez, para quem só quer a cara certa na tela.
export async function aplicarIdentidade(db, firestore) {
  const dados = await lerIdentidade(db, firestore);
  try {
    aplicarTema(dados);
    carregarFontes(dados);
    aplicarFavicon(dados);
  } catch (e) {
    console.warn('identidade: não consegui aplicar o tema.', e && e.message);
  }
  return dados;
}
