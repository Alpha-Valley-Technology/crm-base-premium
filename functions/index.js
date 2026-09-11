// Ponto de registro das Cloud Functions. Cada módulo exporta as suas aqui.
//
// PRIMEIRO import, sempre: define os limites globais (região, instâncias) antes
// de qualquer função se registrar. Trocar a ordem quebra o deploy por cota.
import './_lib/opcoes.js';

export { criarUsuario } from './equipe/criar-usuario.js';
export { bootstrapAdmin } from './equipe/bootstrap-admin.js';
export { listarUsuarios } from './equipe/listar-usuarios.js';
export { atualizarUsuario, removerUsuario } from './equipe/gerir-usuario.js';

export {
  criarItemDoCatalogo,
  contarFilhosDoCatalogo,
  removerItemDoCatalogo,
  reordenarCatalogo,
  semearCatalogoDeExemplo,
} from './catalogo/gerir-catalogo.js';

// O backup das contas de login. O backup do Firestore guarda o CADASTRO da
// pessoa; sem este, a conta que a deixa entrar não está em lugar nenhum.
export { exportarContasDeLogin } from './backup/exportar-contas.js';

// ⚠️ PAGAMENTO: NÃO HÁ FUNÇÃO NENHUMA AQUI, e isso é o estado correto da
// matriz.
//
// Havia sete, todas construídas sobre o Asaas: criar a cobrança, receber o
// aviso de pago, liberar o acesso, fechar o que venceu, conectar a chave pelo
// painel, cancelar a assinatura e responder à página pública. Elas saíram
// inteiras quando a matriz deixou de usar aquele gateway.
//
// O QUE FICA REGISTRADO, porque é o desenho e não o gateway — e porque custou
// descoberta:
//
//   1. O PREÇO VEM DO SERVIDOR, nunca da tela. A página pública pede a cobrança
//      informando O QUE quer comprar, e o servidor decide quanto custa. Preço
//      que viaja do navegador é preço que o navegador edita.
//
//   2. QUEM LIBERA O ACESSO É O WEBHOOK, não a tela de "obrigado". A pessoa
//      pode fechar o navegador antes de voltar do gateway, e mesmo assim pagou.
//
//   3. O WEBHOOK PRECISA DE UM SEGREDO PRÓPRIO conferido a cada chamada. O
//      endereço dele é público por natureza: sem o segredo, qualquer um libera
//      acesso mandando um POST.
//
//   4. CANCELAR PRECISA SER TÃO FÁCIL QUANTO ASSINAR — é exigência legal, e é
//      a diferença entre um produto vendável a terceiros e uma dor de cabeça
//      para quem o comprou. Cancelar para a cobrança seguinte; o acesso do
//      período já pago continua até a data.
//
//   5. A CHAVE DO GATEWAY ENTRA PELO PAINEL, nunca por terminal. Quem compra o
//      sistema não é programador; chave que só se troca por linha de comando
//      vira chamado de suporte a cada troca. `_lib/cofre.js` está aqui para
//      isso, e é lido em tempo de execução — `defineSecret` amarraria o valor
//      no deploy, e trocar a chave passaria a exigir um deploy.
//
//   6. A FAXINA DO QUE VENCEU é uma tarefa agendada, mas quem DESATIVA de
//      verdade é a regra do banco, que compara a data a cada leitura. Tarefa
//      que falha uma noite não pode virar acesso liberado de graça.

// ⚠️ `gerarTexto` FOI REMOVIDA, e não é falta: ela era a receita de referência
// que veio com a base ("apague quando não precisar"), e nenhuma tela a chamava.
//
// Publicada, ela era um endpoint aberto a QUALQUER MEMBRO que aceitava um texto
// livre e o mandava para o Gemini — sem teto de tamanho, sem limite de
// chamadas, na conta do projeto. Numa comunidade paga, uma pessoa com o console
// aberto queimava a cota de todo mundo, e a fatura chegava sem dono.
//
// Se um dia a IA voltar, ela volta com dono: uma tela que a use, um teto por
// pessoa e um limite de tamanho.
