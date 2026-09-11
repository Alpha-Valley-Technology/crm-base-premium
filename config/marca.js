// A identidade visual DESTE produto. É o único lugar onde o nome aparece.
//
// POR QUE ISTO EXISTE. A marca ficava escrita direto em `base/app.js`. Cada
// produto novo tinha que editar um arquivo da carcaça para trocar o nome — e
// aí o produto passava a carregar uma versão modificada da Base. Consequência:
// numa remontagem, ou ao trazer uma correção da matriz, a marca voltava para
// "CRM Base" **em silêncio**, e ninguém percebia até abrir a tela.
//
// Agora a Base traz a tomada; o produto pluga o aparelho. Trocar a marca é
// mexer neste arquivo, e só neste.
//
// A matriz fica com o valor neutro de propósito: identidade de produto não
// entra na carcaça.

export const MARCA = {
  // O nome grande, no topo à esquerda.
  // ⚠️ TROQUE AQUI, e só aqui. Este é o nome que aparece no topo, no título da
  // aba e na tela de entrada. A matriz fica com o nome dela de propósito: se
  // ficasse com o do produto anterior, o produto novo nasceria com a marca de
  // outro negócio e ninguém perceberia até um cliente ver.
  nome: 'CRM Base Premium',

  // Versão discreta ao lado do nome. Deixe vazio para não mostrar nada.
  versao: '',

  // Para onde o nome leva quando clicado. `#/` faz o roteador cair na primeira
  // ferramenta do primeiro módulo — o ponto de partida natural.
  inicio: '#/',
};

// O VOCABULÁRIO DO ESCOPO — de "onde" cada pessoa da equipe atua.
//
// "Projeto" é o que o SEU produto quiser: uma clínica, uma obra, um site, um
// radar de notícias. A carcaça não sabe e não precisa saber — ela só sabe que
// existe uma lista de coisas e que cada pessoa alcança algumas delas. É isso
// que impede o dado de um cliente de aparecer na tela do outro.
//
// As frases moram aqui, no produto, porque é o produto que sabe a palavra
// certa. Deixá-las na carcaça obrigava cada produto novo a desfazer o
// vocabulário do produto anterior — e foi exatamente o que aconteceu.
export const ESCOPO = {
  // `false` esconde o seletor inteiro na tela de Equipe, e todo mundo que entra
  // alcança tudo. É o padrão da Base: produto recém-montado tem um operador só,
  // e mostrar um seletor vazio pede uma decisão que ainda não existe.
  usa: false,

  // A coleção que guarda os projetos, para a tela de Equipe listar as opções.
  // Vazio = não há o que listar. O gêmeo deste ajuste, do lado servidor, é
  // `functions/_lib/produto.js`.
  colecao: '',

  // Frases inteiras, e não pedaços montados na hora: em português o artigo muda
  // com o gênero ("todos os sites" / "todas as clínicas"), e montar isso por
  // código daria mais trabalho e erraria mais do que escrever as frases.
  rotulo: 'Onde essa pessoa atua',
  todos: 'Todos os projetos',
  nenhum: 'Nenhum projeto por enquanto',
  semCadastro:
    'Nenhum projeto cadastrado ainda. Cadastre a pessoa com "Nenhum ' +
    'projeto por enquanto" e marque depois, em "Trocar projetos".',
  erroSemEscolha: 'Escolha onde essa pessoa atua, ou marque "Nenhum projeto ' + 'por enquanto".',
  cuidaDeTodos: 'Atua em todos os projetos',
  cuidaDeNenhum: 'Ainda não atua em nenhum projeto',
  itemExcluido: 'projeto excluído',
  botaoTrocar: 'Trocar projetos',
};

// O que cada papel permite — dito na hora de decidir, não escondido num manual.
// Mora aqui junto porque a frase fala do que o SEU produto faz.
// O QUE CADA PAPEL DÁ DE PODER, escrito para quem vai clicar em "confirmar".
//
// O texto diz o que a pessoa PASSA A PODER e o que ela DEIXA de poder, nesta
// ordem. Permissão descrita só pelo nome ("Administrador") faz o dono promover
// alguém sem saber o que entregou — e descobrir depois.
export const TEXTO_PAPEIS = {
  admin:
    'Vai poder TUDO: cuidar do conteúdo e também mexer em Pagamento, ' +
    'Identidade e Equipe — inclusive promover e remover outras pessoas. ' +
    'É o acesso mais alto que existe aqui.',
  // ⚠️ ESTA FRASE PRECISA SER REESCRITA POR CADA PRODUTO. Ela diz o que o
  // gestor cuida — e isso depende do que o produto faz. A da carcaça é genérica
  // porque não há o que cuidar ainda; deixá-la assim num produto de verdade faz
  // o dono promover alguém sem saber o que entregou.
  gestor:
    'Vai cuidar do conteúdo do dia a dia e escrever avisos. NÃO vê ' +
    'Pagamento, Identidade nem Equipe — nem pela barra, nem digitando o endereço.',
  membro:
    'Vai continuar usando as ferramentas do dia a dia — mas perde o ' +
    'acesso à equipe e às configurações.',
};
