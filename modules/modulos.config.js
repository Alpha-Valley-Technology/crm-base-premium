// A NAVEGAÇÃO DA MATRIZ.
//
// A ORDEM DESTA LISTA É A ORDEM DA BARRA LATERAL. `construirMenu` agrupa por
// `menu.grupo` na ordem em que cada grupo aparece aqui — então os itens de
// `_topo` vêm todos antes dos de `_rodape`, e não por acaso.
//
// Grupo iniciado por "_" não desenha título (ver base/sidebar.js). A barra é
// uma lista corrida:
//
//   LOGO
//   (aqui entram os módulos do SEU produto)
//   ─────────────────────────────────────────────── (empurrado para o pé)
//   Meu Perfil · Suporte · Administração (só admin)
//   Fulano                                                            sair
//
// "SAIR" não está aqui: quem desenha é a própria carcaça, junto do nome de
// quem está logado (base/app.js).
//
// ===========================================================================
// ⚠️ A BARRA DE CIMA ESTÁ VAZIA, E ISSO É O PONTO
// ===========================================================================
//
// Esta é a matriz. O que ela entrega é a CASCA: entrar, sair, quem é quem, a
// marca, a equipe, o suporte e o lugar do pagamento. O produto é o que você
// pendura aqui em cima.
//
// A carcaça nasceu de uma área de membros premium, e o que foi removido dali
// era o PRODUTO daquele negócio: cursos, aulas, progresso, fórum, lives,
// conexão entre membros, gamificação, vitrines. Nada disso é carcaça — e
// guardar "para o caso de servir" é o que transforma uma matriz num produto
// que ninguém consegue enxugar depois.
//
// ===========================================================================
// COMO PENDURAR UM MÓDULO NOVO
// ===========================================================================
//
// 1. `modules/<id>/module.js` exportando `{ id, nome, icone, menu, acesso,
//    montarTela(caixa, servicos, rota) }`
// 2. importar aqui e pôr na lista, no grupo `_topo`
// 3. `base/registry.js` valida o formato na subida — módulo torto não sobe
//    calado
//
// O `acesso` é um de: `aluno` (todo mundo que entra), `gestor` (cuida do
// conteúdo) ou `admin` (marca, dinheiro e pessoas). Ver `base/escopo.js`.

import perfil from './perfil/module.js';
import suporte from './suporte/module.js';

import equipe from './equipe/module.js';
import identidade from './identidade/module.js';
import avisos from './avisos/module.js';
import pagamento from './pagamento/module.js';
import administracao from './administracao/module.js';

export default [
  // ── O SEU PRODUTO ENTRA AQUI ──────────────────────────────────────────────
  // Ex.: import clientes from './clientes/module.js';  →  clientes,

  // ── O pé da barra, que a carcaça já resolve ───────────────────────────────
  perfil,
  suporte,
  administracao,

  // Fora da barra, mas com endereço próprio (menu.oculto): são as abas que a
  // Administração desenha por dentro. Precisam estar plugadas para o roteador
  // conhecer o endereço direto de cada uma.
  equipe,
  identidade,
  avisos,
  pagamento,
];
