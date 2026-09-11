// MEU PERFIL: o que a pessoa consegue resolver sozinha.
//
// Cada coisa que ela muda aqui é um chamado de suporte a menos. E o nome é o
// que mais importa: é ele que vai aparecer no fórum e na Conexão quando eles
// existirem — deixar a pessoa presa ao nome que veio do Google é começar a
// comunidade com gente que não se reconhece.
//
// O QUE ELA NÃO MUDA, e por quê: email e papel. O email é a chave da conta (a
// regra do banco e o cadastro se apoiam nele), e o papel é permissão — quem se
// promove sozinho não tem permissão nenhuma. Os dois ficam à vista, em texto,
// para ela saber com que conta entrou sem precisar perguntar.

const TETO_NOME = 100;

export default {
  id: 'perfil',
  nome: 'Meu Perfil',
  icone: 'usuario',
  menu: { grupo: '_rodape', ordem: 1 },
  acesso: 'membro',

  async montarTela(caixa, servicos) {
    const { ui, usuario, avisar } = servicos;

    const titulo = document.createElement('h1');
    titulo.className = 'pagina-titulo';
    titulo.textContent = 'Meu Perfil';
    caixa.appendChild(titulo);

    // ---- Quem eu sou ----

    const bloco = document.createElement('section');
    bloco.className = 'ident-bloco';
    const h = document.createElement('h3');
    h.textContent = 'Seus dados';
    bloco.appendChild(h);

    const { wrapper, input } = ui.campo('Nome de exibição');
    input.value = (usuario && usuario.nome) || '';
    input.maxLength = TETO_NOME;
    bloco.appendChild(wrapper);

    const conta = document.createElement('p');
    conta.className = 'perfil-conta';
    conta.textContent =
      `Você entrou com ${(usuario && usuario.email) || 'esta conta'}` +
      (usuario && usuario.papel === 'admin' ? ' · administrador' : '');
    bloco.appendChild(conta);

    const acoes = document.createElement('div');
    acoes.className = 'conteudo-editor-acoes';
    const btSalvar = ui.botao('Salvar', salvar);
    acoes.appendChild(btSalvar);
    bloco.appendChild(acoes);
    caixa.appendChild(bloco);

    // ⚠️ AQUI SAIU "MINHA ASSINATURA" quando o Asaas foi removido da matriz.
    //
    // Era o bloco onde a pessoa via o que pagava e cancelava sozinha. Ele não
    // era do produto área de membros — cancelar sozinho é o padrão de qualquer
    // negócio que cobre assinatura —, mas era do GATEWAY: cada linha dele
    // falava com o Asaas.
    //
    // Quando um meio de pagamento novo entrar (ver `modules/pagamento/`), este
    // é o lugar dele nesta tela: logo depois dos dados da conta e antes de tudo
    // o mais, porque é a única coisa daqui que envolve dinheiro — e quem chega
    // procurando "onde eu cancelo" precisa achar sem rolar a página.
    //
    // E a regra de produto que veio junto, para não se perder: CANCELAR NÃO
    // TIRA O ACESSO. Interrompe a cobrança do próximo período, e a pessoa
    // continua entrando até a data já paga. O contrário é confisco, e gera a
    // reclamação que destrói reputação de plataforma.

    // ⚠️ AQUI SAÍRAM DUAS SEÇÕES quando esta carcaça virou matriz:
    // "Aparecer na Conexão" (o perfil público do membro, com redes sociais) e
    // "Meu progresso" (quanto do catálogo a pessoa já viu). As duas eram do
    // PRODUTO área de membros, não da casca.
    //
    // O que sobrou é o que vale para qualquer produto: quem eu sou, e o estado
    // do meu acesso. Seção nova entra aqui, na mesma forma — um `bloco…()` que
    // devolve um elemento e se vira sozinho quando o banco não responde.

    // ------------------------------------------------------------------

    async function salvar() {
      const nome = input.value.trim();
      if (!nome) {
        avisar('info', 'Escreva um nome.');
        return;
      }
      if (nome.length > TETO_NOME) {
        avisar('erro', `No máximo ${TETO_NOME} letras.`);
        return;
      }

      btSalvar.disabled = true;
      try {
        // A regra do banco só deixa a pessoa mexer no PRÓPRIO documento, e o
        // servidor não entra nisso: mudar o próprio nome não é ação que precise
        // reconferir nada além de quem está pedindo.
        const firestore =
          await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        const { db: banco } = await import('../../base/firebase.js');
        await firestore.updateDoc(firestore.doc(banco, 'usuarios', usuario.uid), { nome });
        avisar('ok', 'Salvo! Recarregue para ver o nome na barra.');
      } catch (e) {
        console.error(e);
        avisar('erro', 'Não consegui salvar agora. Tente de novo.');
      } finally {
        btSalvar.disabled = false;
      }
    }
  },
};
