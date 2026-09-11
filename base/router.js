// parseHash é pura (testável em Node). O router usa DOM (roda no navegador).
//
// Endereço: #/<modulo>/<parte>/<parte>/…
//
// POR QUE MAIS DE DUAS PARTES.
//
// A carcaça entendia `#/<modulo>/<ferramenta>` e parava aí — o resto era
// descartado. Uma aula precisa de DOIS identificadores, curso e aula:
// `#/cursos/aula/c7/a3`. Com o teto de duas partes, ou o endereço da aula
// deixava de ser compartilhável, ou os dois ids iam grudados num campo só.
//
// `sub` continua sendo `partes[0]`, então todo módulo que já existia continua
// funcionando sem saber que isto mudou.
export function parseHash(hash) {
  const m = /^#\/([^?#]*)/.exec(hash || '');
  const partes = (m ? m[1] : '').split('/').filter(Boolean);
  return {
    id: partes[0] || null,
    sub: partes[1] || null,
    partes: partes.slice(1),
  };
}

// Monta um módulo com segurança: limpa o container, avisa a mudança e trata erro
// do montarTela — mostra um erro pro usuário em vez de falhar em silêncio.
// Espera antes de mostrar "carregando". Abaixo disso a tela já apareceu e o
// aviso só piscaria — piscar é pior que não ter.
const ESPERA_ANTES_DE_AVISAR = 180;

// A FAXINA DA TELA QUE SAIU.
//
// `container.innerHTML = ''` tira os elementos da tela, e mais nada: o que a
// tela anterior tiver deixado ligado — um relógio, uma escuta, uma conexão —
// continua rodando contra um pedaço de página que não existe mais. Trocar de
// tela dez vezes acumula dez.
//
// O contrato é opcional e cabe numa linha: `montarTela` PODE devolver uma
// função, e o router a chama antes de montar a próxima. Quem não tem nada para
// desligar não devolve nada e não muda.
//
// (Não dá para a própria tela se vigiar por `isConnected` no elemento que
// recebeu: o CONTAINER é reaproveitado e continua conectado para sempre. Foi
// exatamente esse o engano da primeira tentativa — o guarda parecia certo e
// nunca era falso.)
let desmontarAtual = null;

export async function montarModulo(mod, container, servicos, onMudou, sub = null, partes = []) {
  if (!mod || !container) return;

  if (desmontarAtual) {
    try {
      desmontarAtual();
    } catch (e) {
      console.warn('faxina da tela anterior:', e && e.message);
    }
    desmontarAtual = null;
  }
  container.innerHTML = '';
  if (onMudou) onMudou(mod.id, sub);

  // A tela é apagada na hora e os dados vêm depois. Sem isto, quem está no
  // celular clica no menu e encara um espaço em branco sem saber se funcionou.
  const avisar = setTimeout(() => {
    if (container.childElementCount) return; // já desenhou, não atrapalha
    const c = document.createElement('div');
    c.className = 'carregando-tela';
    c.setAttribute('role', 'status');
    c.textContent = 'Carregando…';
    container.appendChild(c);
  }, ESPERA_ANTES_DE_AVISAR);

  try {
    const talvezFaxina = await mod.montarTela(container, servicos, { sub, partes });
    if (typeof talvezFaxina === 'function') desmontarAtual = talvezFaxina;
  } catch (e) {
    console.error(`Falha ao montar o módulo "${mod.id}":`, e);
    container.innerHTML = '';
    const aviso = document.createElement('div');
    aviso.className = 'card';
    aviso.textContent = 'Não consegui abrir esta tela agora. Tente de novo.';
    container.appendChild(aviso);
    if (servicos && servicos.avisar) servicos.avisar('erro', 'Não consegui abrir esta tela.');
  } finally {
    clearTimeout(avisar);
    const c = container.querySelector('.carregando-tela');
    if (c) c.remove();
  }
}

import { desligarHeroNoTopo } from './hero-topo.js';

export function criarRouter({ modulos, container, servicos, onMudou }) {
  const porId = new Map(modulos.map((m) => [m.id, m]));

  // AS ÁREAS DESLIGADAS CHEGAM DEPOIS DO ROTEADOR NASCER.
  //
  // A identidade — que é onde a escolha mora — é lida em paralelo com a
  // montagem da tela, de propósito: esperar por ela significaria tela em branco
  // até o banco responder. Então o roteador nasce sabendo de todos os módulos,
  // e recebe a lista de desligados quando ela chega.
  //
  // Enquanto ela não chega, tudo funciona. Falhar assim é o certo: se o banco
  // não responder, a pessoa navega no sistema inteiro em vez de ficar sem
  // metade dele sem explicação.
  let desligadas = new Set();

  function aoMudarHash() {
    const { id, sub, partes } = parseHash(location.hash);
    const primeiro = modulos.find((m) => !desligadas.has(m.id)) || modulos[0];
    const alvo = id || (primeiro && primeiro.id);
    if (!alvo) return;
    let mod = porId.get(alvo) || primeiro;
    // Endereço de área desligada não abre tela vazia nem erro: leva para casa.
    // O link pode ter sido guardado por alguém antes de a área cair.
    if (mod && desligadas.has(mod.id)) mod = primeiro;
    // ⚠️ DESLIGA ANTES DE MONTAR, sempre. O modo de faixa transparente é da
    // Página Inicial; se ele sobrevivesse a uma navegação, a próxima tela
    // nasceria com o texto passando por baixo de um cabeçalho invisível.
    // Quem liga é a tela que precisa — e só ela.
    desligarHeroNoTopo();
    montarModulo(mod, container, servicos, onMudou, sub, partes);
  }

  return {
    iniciar() {
      window.addEventListener('hashchange', aoMudarHash);
      aoMudarHash();
    },
    // Chamado quando a identidade chega. Redesenha se a pessoa já estiver
    // parada numa área que acabou de ser desligada.
    desligarAreas(ids) {
      desligadas = ids instanceof Set ? ids : new Set(ids || []);
      const { id } = parseHash(location.hash);
      if (id && desligadas.has(id)) aoMudarHash();
    },
    abrir(id, ...partes) {
      const resto = partes.filter(Boolean).join('/');
      location.hash = resto ? `#/${id}/${resto}` : `#/${id}`;
    },
  };
}
