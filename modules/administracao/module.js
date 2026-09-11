// ADMINISTRAÇÃO: marca, dinheiro e pessoas.
//
// ===========================================================================
// POR QUE ISTO NÃO É UMA ABA DA CONFIGURAÇÃO
// ===========================================================================
//
// As três ferramentas daqui têm em comum o que a Configuração não tem:
//
//   IDENTIDADE   muda a cara do produto inteiro, para todo mundo, de uma vez.
//   PAGAMENTO    move dinheiro e decide quem entra.
//   EQUIPE       decide quem administra — inclusive quem pode chegar aqui.
//
// São decisões raras e de consequência alta. Na mesma fila da aba que troca a
// capa de um curso, elas tinham o mesmo peso visual e ficavam a um clique de
// distância do trabalho do dia a dia.
//
// ⚠️ E A SEPARAÇÃO NÃO É SÓ VISUAL — ela é a preparação de um cargo.
//
// O dono descreveu o caso real: alguém da equipe que cuida da área de membros
// (publica aula, marca live, escreve aviso) SEM acessar a área de pagamento.
// Hoje esse papel não existe: quem administra, administra tudo.
//
// Com as duas entradas separadas, o dia em que o papel de GESTOR existir ele
// simplesmente não vê este item. Numa fila só, seria preciso esconder abas no
// meio dela — e torcer para ninguém digitar o endereço à mão, que é
// exatamente o tipo de trava que não trava nada.
//
// ⚠️ ENQUANTO O PAPEL NÃO EXISTE, ISTO CONTINUA SENDO SÓ DE ADMIN. A separação
// prepara o terreno; ela não protege nada sozinha. Quem tem `acesso: 'admin'`
// vê as duas entradas, e é assim que tem que ser até as regras do banco
// aprenderem a diferença.

import { montarAbas } from '../../base/abas-admin.js';
import equipe from '../equipe/module.js';
import identidade from '../identidade/module.js';
import avisos from '../avisos/module.js';
import pagamento from '../pagamento/module.js';

// A ORDEM É A DA MONTAGEM DE UM NEGÓCIO, e não a da frequência de uso.
//
// Primeiro a casa fica com a sua cara, depois entra quem vai cuidar dela, e só
// então liga-se o caixa. É a ordem em que um cliente novo percorre esta tela no
// primeiro dia — e a ordem em que ele volta a percorrer quando algo dá errado:
// "está estranho" (Identidade), "quem mexeu?" (Equipe), "e o dinheiro?"
// (Pagamento).
//
// Pagamento fica por último também porque é a mais perigosa das três: a aba que
// move dinheiro não deve ser a primeira que o dedo encontra.
// AVISOS VEM LOGO DEPOIS DE IDENTIDADE porque as duas falam com a base inteira
// de uma vez: uma diz como o produto SE PARECE, a outra diz o que ele TEM A
// DIZER. É isso que as separa de qualquer ferramenta de rotina, que mexe numa
// tela de cada vez.
//
// ⚠️ "ÁREAS" SAIU DAQUI quando esta carcaça virou matriz. Ela ligava e
// desligava as áreas de uma ÁREA DE MEMBROS (Cursos, Comunidade, Ao Vivo…) —
// era configuração daquele produto, não da casca. Num produto novo, o
// equivalente nasce junto com os módulos dele, se fizer sentido.
//
// O que o tira do dia a dia é o alcance sem desfazer: um aviso toca o sino de
// todo mundo no mesmo instante, e apagar depois não desapaga de quem já leu.
// Errar aqui é como errar no logo — aparece para a base toda antes de alguém
// perceber.
//
// Pagamento continua por último, pelo mesmo motivo de sempre.
const FERRAMENTAS = [
  { sub: 'identidade', nome: 'Identidade', icone: 'chave', modulo: identidade },
  { sub: 'avisos', nome: 'Avisos', icone: 'sino', modulo: avisos },
  { sub: 'equipe', nome: 'Equipe', icone: 'equipe', modulo: equipe },
  { sub: 'pagamento', nome: 'Pagamento', icone: 'estrela', modulo: pagamento },
];

export default {
  id: 'administracao',
  nome: 'Administração',
  icone: 'chave',
  menu: { grupo: '_rodape', ordem: 4 },
  acesso: 'admin',

  async montarTela(caixa, servicos, rota) {
    const escolhida = montarAbas(caixa, FERRAMENTAS, 'administracao', rota);
    return escolhida.modulo.montarTela(caixa, servicos, rota);
  },
};
