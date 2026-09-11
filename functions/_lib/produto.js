// Configuração DESTE produto, lado servidor.
//
// Gêmeo de `config/marca.js`, que é o lado da tela. Existem os dois porque o
// site e as Cloud Functions sobem em pacotes separados: a função não consegue
// importar nada de fora da pasta `functions/`.
//
// A Base entrega este arquivo neutro. O produto edita, e o `sincronizar` do
// módulo preserva na remontagem — igual ao `config/marca.js`.

export const ESCOPO_SERVIDOR = {
  // Coleção que guarda os "projetos" deste produto — o que quer que "onde a
  // pessoa atua" signifique aqui: clínicas, obras, radares, sites.
  //
  // Serve para conferir, ANTES de gravar, se o ID escolhido ainda existe. É uma
  // gentileza com quem usa: sem ela, marcar um projeto recém-excluído grava um
  // cadastro apontando para o vazio.
  //
  // VAZIO = não confere. É o padrão da Base de propósito: a carcaça não sabe o
  // que é um projeto neste produto, e chutar um nome de coleção seria o mesmo
  // vazamento que este arquivo existe para evitar. A regra do banco continua
  // protegendo o acesso de qualquer jeito.
  colecao: '',
};
