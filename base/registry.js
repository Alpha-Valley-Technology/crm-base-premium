// Lógica pura de registro e menu. NÃO importa Firebase (roda em teste Node).

// OS TRÊS PAPÉIS, EM ORDEM DE PODER.
//
// A comparação passa a ser por NÍVEL, e não por igualdade. Com `acesso ===
// 'admin'`, um módulo de gestor precisaria ser listado duas vezes — uma para
// cada papel que o alcança — e a primeira vez que alguém esquecesse uma delas,
// a tela sumiria para metade da equipe sem ninguém entender por quê.
//
// `admin` é `gestor` mais o resto; `gestor` é `membro` mais o resto. Papel
// desconhecido cai em `membro`, que é o padrão seguro: papel estragado no banco
// não vira permissão.
export const NIVEIS = { membro: 0, gestor: 1, admin: 2 };

export function nivelDe(papel) {
  return NIVEIS[String(papel || '').trim()] ?? NIVEIS.membro;
}

export function alcanca(papel, exigido) {
  return nivelDe(papel) >= nivelDe(exigido);
}

export function validarModulo(m) {
  for (const campo of ['id', 'nome', 'icone', 'menu', 'acesso']) {
    if (m[campo] === undefined) throw new Error(`Módulo inválido: falta "${campo}"`);
  }
  if (typeof m.montarTela !== 'function')
    throw new Error('Módulo inválido: "montarTela" deve ser função');
  if (!Object.keys(NIVEIS).includes(m.acesso)) {
    throw new Error('Módulo inválido: "acesso" deve ser membro|gestor|admin');
  }
  if (typeof m.menu.grupo !== 'string' || typeof m.menu.ordem !== 'number') {
    throw new Error('Módulo inválido: "menu" precisa de { grupo, ordem }');
  }
  if (m.menu.atalhos !== undefined) {
    if (!Array.isArray(m.menu.atalhos))
      throw new Error('Módulo inválido: "menu.atalhos" deve ser lista');
    for (const a of m.menu.atalhos) {
      if (!a || typeof a.sub !== 'string' || typeof a.nome !== 'string') {
        throw new Error('Módulo inválido: cada atalho precisa de { sub, nome }');
      }
    }
  }
  return m;
}

// ===========================================================================
// ⚠️ AQUI MORAVA "AS ÁREAS QUE DÁ PARA DESLIGAR"
// ===========================================================================
//
// Era a lista das áreas de uma ÁREA DE MEMBROS (Comunidade, Ao Vivo, Conexão,
// Produtos Validados, Gamificação) que um cliente white-label podia desligar,
// mais as funções que faziam a barra e as abas de administração sumirem junto.
// Saiu com o produto: é catálogo de negócio, não carcaça.
//
// A IDEIA vale para o próximo produto que precisar dela, e ela tem uma parte
// não óbvia: quando uma área cai, a ABA DE ADMINISTRAÇÃO dela tem que cair
// junto — senão o dono continua alimentando um lugar que ninguém vê. E área
// vazia não é neutra: ela promete movimento que não existe, e o sistema parece
// abandonado logo na primeira visita.
//
// Se voltar, volta como configuração DAQUELE produto, e não da casca.

// papel: 'admin' | 'membro'. Módulos e atalhos com acesso admin só aparecem pra admin.
//
// `menu.oculto` tira o módulo do MENU sem tirá-lo do roteador: o endereço
// continua valendo, só não há item na barra. É o caso de "Notificações", cujo
// caminho é o sino no topo — repetir na lateral seria dizer a mesma coisa duas
// vezes, e o sino perderia o motivo de existir.
export function construirMenu(modulos, papel, desligadas = new Set()) {
  const visiveis = modulos.filter(
    (m) => alcanca(papel, m.acesso) && !m.menu.oculto && !desligadas.has(m.id),
  );
  const grupos = new Map();
  for (const m of visiveis) {
    if (!grupos.has(m.menu.grupo)) grupos.set(m.menu.grupo, []);
    grupos.get(m.menu.grupo).push(m);
  }
  return [...grupos.entries()].map(([grupo, itens]) => ({
    grupo,
    itens: itens
      .sort((a, b) => a.menu.ordem - b.menu.ordem)
      .map((m) => ({
        id: m.id,
        nome: m.nome,
        icone: m.icone,
        atalhos: (m.menu.atalhos || [])
          .filter((a) => !a.admin || alcanca(papel, 'admin'))
          .map((a) => ({ sub: a.sub, nome: a.nome, icone: a.icone || '', secao: a.secao || null })),
      })),
  }));
}
