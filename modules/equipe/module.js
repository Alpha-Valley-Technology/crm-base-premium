// Painel administrativo da equipe: adicionar pessoa, mudar o papel, dizer onde
// ela atua, desativar/reativar e remover.
//
// São dois eixos independentes, e a tela trata assim de propósito:
//   PAPEL   = o que a pessoa pode fazer (Membro / Administrador)
//   ESCOPO  = onde ela pode fazer
//
// AS PALAVRAS DO ESCOPO VÊM DO PRODUTO, não daqui.
//
// "Projeto" é o que o produto quiser: uma clínica, uma obra, um radar, um site.
// A carcaça não sabe e não precisa saber — ela só sabe que existe uma lista de
// coisas e que cada pessoa alcança algumas. É isso que impede o dado de um
// cliente de aparecer na tela do outro.
//
// Por isso as frases moram em `config/marca.js`, que é do produto. Produto que
// ainda não usa escopo põe `ESCOPO.usa: false` e o seletor some inteiro.
//
// As travas de verdade estão no servidor (gerir-usuario.js) e na regra do banco
// (firestore.rules). O que a tela faz aqui é não oferecer o que vai ser
// recusado, e explicar por quê.
import { icone, botaoComIcone } from '../../ui/icones.js';
import { projetosDoUsuario, vejoTodosOsProjetos } from '../../base/escopo.js';
import { ESCOPO, TEXTO_PAPEIS } from '../../config/marca.js';
// A lista e o montador de link entram por import normal: `base/suporte.js` não
// puxa Firebase nenhum, então a tela desenha (e o teste roda) sem rede. Só o
// gravar e o ler é que carregam o SDK, e por isso continuam sendo `import()`
// lá dentro da função.
import { CONTATOS, linkDoWhatsapp } from '../../base/suporte.js';

// A ORDEM É A DO PODER, de menos para mais. Num seletor, a opção mais perigosa
// é a última — e a pessoa passa pelas outras antes de chegar nela.
const PAPEIS = [
  { valor: 'membro', nome: 'Membro' },
  { valor: 'gestor', nome: 'Gestor' },
  { valor: 'admin', nome: 'Administrador' },
];

export default {
  id: 'equipe',
  nome: 'Equipe',
  icone: 'equipe',
  // NÃO É MAIS ITEM DA BARRA. Este módulo virou a primeira ferramenta de
  // `configuracao`, que o importa e delega. O menu fica lá; aqui sobra a tela.
  menu: { grupo: '_rodape', ordem: 4, oculto: true },
  acesso: 'admin',

  async montarTela(caixa, servicos) {
    const { ui, db, servidor, avisar, usuario } = servicos;

    const titulo = document.createElement('h2');
    titulo.style.cssText = 'display:flex;align-items:center;gap:11px;margin-bottom:18px';
    titulo.append(icone('equipe', 22), 'Equipe');

    // Os projetos que EU alcanço. Não dá pra entregar a alguém algo que nem eu
    // alcanço — e a regra do banco recusaria a leitura de qualquer jeito.
    let projetos = [];
    try {
      projetos = await projetosDoUsuario(db, usuario);
    } catch (e) {
      console.error('não consegui carregar os projetos:', e);
    }

    // ---------- Adicionar ----------
    const cartao = document.createElement('div');
    cartao.className = 'card';

    const form = ui.form(
      [
        { nome: 'nome', rotulo: 'Nome' },
        { nome: 'email', rotulo: 'Email', tipo: 'email' },
      ],
      cadastrar,
      'Adicionar',
    );

    const wPapel = document.createElement('div');
    wPapel.className = 'campo';
    const lblPapel = document.createElement('label');
    lblPapel.textContent = 'Papel';
    const selPapel = document.createElement('select');
    selPapel.className = 'input';
    for (const p of PAPEIS) {
      const o = document.createElement('option');
      o.value = p.valor;
      o.textContent = p.nome;
      selPapel.appendChild(o);
    }
    wPapel.append(lblPapel, selPapel);
    form.insertBefore(wPapel, form.querySelector('button'));

    // `undefined` = ninguém escolheu ainda, e é diferente de `[]` (= escolheu
    // "nenhum"). Nasce sem nada marcado de propósito: quem cadastra às pressas
    // tem que parar e escolher.
    const seletorNovo = seletorDeEscopo(undefined);
    if (seletorNovo.wrapper) form.insertBefore(seletorNovo.wrapper, form.querySelector('button'));

    const comoEntra = document.createElement('p');
    comoEntra.style.cssText =
      'color:var(--cor-texto-fraco);font-size:12.5px;line-height:1.5;margin-bottom:16px';
    comoEntra.textContent =
      'Use o email que a pessoa vai usar para entrar. Ela recebe ' +
      'na hora um email para definir a senha — e quem tiver conta Google nesse ' +
      'mesmo endereço também entra com um clique, sem senha nenhuma.';
    form.insertBefore(comoEntra, form.firstChild);

    cartao.appendChild(form);

    const lista = document.createElement('div');
    lista.style.marginTop = '26px';

    caixa.append(titulo, cartao, montarContatos(), lista);
    await recarregar();

    // ---------- Os botões da tela de entrada ----------
    //
    // MORA AQUI, e não na tela de configuração de um módulo de produto, porque
    // quem consome o dado é a TELA DE ENTRADA — que é da carcaça. Pondo na
    // carcaça, todo produto montado daqui em diante nasce com isto pronto, e a
    // Base não passa a depender de um módulo que pode nem existir.
    //
    // A TELA É DESENHADA A PARTIR DA LISTA `CONTATOS`, não escrita botão a
    // botão. Foi assim que o Financeiro entrou sem tocar em nada aqui, e é
    // assim que o próximo (Comercial, por exemplo) vai entrar.
    //
    // O AVISO DE QUE É PÚBLICO NÃO ESTÁ ESCONDIDO. Quem preenche precisa saber,
    // no instante em que preenche, que o número vai ficar legível por qualquer
    // um — é a única forma de a pessoa decidir usar o número da empresa e não o
    // celular pessoal dela.
    function montarContatos() {
      const bloco = document.createElement('div');
      bloco.className = 'card';
      bloco.style.marginTop = '26px';

      const h = document.createElement('h3');
      h.textContent = 'Botões da tela de entrada';
      bloco.appendChild(h);

      const explica = document.createElement('p');
      explica.style.cssText =
        'color:var(--cor-texto-fraco);font-size:12.5px;line-height:1.5;margin-bottom:6px';
      explica.textContent =
        'Cada número vira um botão embaixo do "Entrar com Google". ' +
        'Deixe em branco para não mostrar aquele botão. ' +
        'Estes números ficam visíveis para qualquer pessoa que abra a tela de entrada, ' +
        'mesmo sem conta — use os números da empresa, não um pessoal.';
      bloco.appendChild(explica);

      // Cada contato tem os mesmos dois campos e a mesma prévia. Guardo os
      // inputs por nome de campo do banco, que é o formato que `salvarContatos`
      // espera — sem tradução no meio para sair errado.
      const campos = {};
      const previas = [];

      for (const contato of CONTATOS) {
        const sub = document.createElement('h4');
        sub.style.cssText = 'margin:22px 0 4px';
        sub.textContent = contato.tituloAjuste;

        const porque = document.createElement('p');
        porque.style.cssText =
          'color:var(--cor-texto-fraco);font-size:12.5px;line-height:1.5;margin-bottom:12px';
        porque.textContent = contato.explicaAjuste;

        const numero = ui.campo('Número com DDD (pode digitar com ou sem o 55)');
        numero.input.id = `${contato.chave}-whatsapp`;
        const mensagem = ui.campo('Mensagem que já vem escrita na conversa');
        mensagem.input.id = `${contato.chave}-mensagem`;
        campos[contato.campoWhatsapp] = numero.input;
        campos[contato.campoMensagem] = mensagem.input;

        // A PRÉVIA MOSTRA O LINK QUE VAI SER ABERTO, com o 55 já posto quando
        // faltava. Sem ela, descobrir que o número saiu errado exige sair,
        // abrir a tela de entrada e clicar — e o número errado abre uma
        // conversa com ninguém, sem dizer que está errado.
        const previa = document.createElement('p');
        // O nome antigo vinha de outro produto e não tinha CSS nenhum aqui —
        // o estilo morava inline ao lado dele. Agora é uma classe de verdade.
        previa.className = 'suporte-previa';
        previas.push(() => {
          const link = linkDoWhatsapp({
            whatsapp: numero.input.value,
            mensagem: mensagem.input.value,
          });
          previa.textContent = link
            ? `O botão "${contato.rotulo}" vai abrir: ${link}`
            : `Sem número: o botão "${contato.rotulo}" não aparece na tela de entrada.`;
        });
        numero.input.addEventListener('input', mostrarPrevias);
        mensagem.input.addEventListener('input', mostrarPrevias);

        bloco.append(sub, porque, numero.wrapper, mensagem.wrapper, previa);
      }

      function mostrarPrevias() {
        for (const f of previas) f();
      }
      mostrarPrevias();

      const salvar = ui.botao('Salvar contatos', async () => {
        salvar.disabled = true;
        try {
          const { db } = await import('../../base/firebase.js');
          const firestore =
            await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
          const lib = await import('../../base/suporte.js');
          const dados = {};
          for (const [campo, input] of Object.entries(campos)) dados[campo] = input.value;
          await lib.salvarContatos(db, firestore, dados);
          mostrarPrevias();
          avisar('ok', 'Salvo. A tela de entrada já mostra os botões.');
        } catch (e) {
          console.error(e);
          avisar('erro', 'Não consegui salvar os contatos.');
        } finally {
          salvar.disabled = false;
        }
      });
      salvar.style.marginTop = '18px';
      bloco.appendChild(salvar);

      (async () => {
        try {
          const { db } = await import('../../base/firebase.js');
          const firestore =
            await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
          const lib = await import('../../base/suporte.js');
          const atual = await lib.lerContatos(db, firestore);
          if (atual) {
            for (const [campo, input] of Object.entries(campos)) input.value = atual[campo] || '';
          }
          mostrarPrevias();
        } catch (e) {
          console.warn('contatos: não consegui carregar.', e && e.message);
        }
      })();

      return bloco;
    }

    // ---------- O seletor de escopo ----------
    //
    // Devolve `null` quando é "todos" e a lista de IDs quando não é. Nunca
    // devolve lista vazia sem reclamar: seria uma conta que entra e não enxerga
    // nada, e ninguém escolhe isso de propósito.
    function seletorDeEscopo(selecionados) {
      // Produto que ainda não usa escopo não mostra seletor nenhum, e quem
      // entra alcança tudo. Um seletor vazio na tela é pior que seletor
      // nenhum: ele pede uma decisão que não existe.
      if (!ESCOPO.usa) return { wrapper: null, ler: () => ({ projetos: null }) };

      const wrapper = document.createElement('div');
      wrapper.className = 'campo';

      const lbl = document.createElement('label');
      lbl.textContent = ESCOPO.rotulo;
      wrapper.appendChild(lbl);

      const linha = (texto) => {
        const l = document.createElement('label');
        l.style.cssText =
          'display:flex;align-items:center;gap:9px;margin:7px 0;font-weight:400;cursor:pointer';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.cssText = 'width:16px;height:16px;flex:none;accent-color:var(--cor-destaque)';
        l.append(cb, document.createTextNode(texto));
        wrapper.appendChild(l);
        return cb;
      };

      const todos = linha(ESCOPO.todos);
      todos.checked = selecionados === null;

      // O caso de quem entra na equipe antes do projeto existir. Sem esta
      // opção, não havia como cadastrar a pessoa: "todos" dava acesso demais e
      // a tela exigia marcar algo que ainda não tinha sido criado.
      const nenhum = linha(ESCOPO.nenhum);
      nenhum.checked = Array.isArray(selecionados) && !selecionados.length;

      const caixas = projetos.map((b) => {
        const cb = linha(b.nome || b.id);
        cb.checked = Array.isArray(selecionados) && selecionados.includes(b.id);
        cb.dataset.projetoId = b.id;
        return cb;
      });

      if (!projetos.length) {
        const nota = document.createElement('p');
        nota.style.cssText = 'color:var(--cor-texto-fraco);font-size:12.5px;margin-top:4px';
        nota.textContent = ESCOPO.semCadastro;
        wrapper.appendChild(nota);
      }

      // As três escolhas se excluem: marcar uma desmarca as outras, senão a
      // tela diria uma coisa e o banco guardaria outra. As caixinhas continuam
      // clicáveis de propósito — desligá-las faria o clique num item não
      // fazer nada, e ninguém adivinha que precisa desmarcar "Todos" primeiro.
      todos.addEventListener('change', () => {
        if (!todos.checked) return;
        nenhum.checked = false;
        for (const cb of caixas) cb.checked = false;
      });
      nenhum.addEventListener('change', () => {
        if (!nenhum.checked) return;
        todos.checked = false;
        for (const cb of caixas) cb.checked = false;
      });
      for (const cb of caixas) {
        cb.addEventListener('change', () => {
          if (cb.checked) {
            todos.checked = false;
            nenhum.checked = false;
          }
        });
      }

      return {
        wrapper,
        ler() {
          if (todos.checked) return { projetos: null };
          const marcados = caixas.filter((c) => c.checked).map((c) => c.dataset.projetoId);
          if (marcados.length) return { projetos: marcados };
          if (nenhum.checked) return { projetos: [] };
          return { erro: ESCOPO.erroSemEscolha };
        },
      };
    }

    // Como isso aparece escrito na linha da pessoa.
    function textoDoEscopo(u) {
      if (!ESCOPO.usa) return '';
      if (vejoTodosOsProjetos(u)) return ESCOPO.cuidaDeTodos;
      if (!u.projetos.length) return ESCOPO.cuidaDeNenhum;
      const nomes = u.projetos.map((id) => {
        const b = projetos.find((x) => x.id === id);
        return b ? b.nome || b.id : ESCOPO.itemExcluido;
      });
      return `Cuida de: ${nomes.join(', ')}`;
    }

    async function cadastrar(dados) {
      const escolha = seletorNovo.ler();
      if (escolha.erro) {
        avisar('erro', escolha.erro);
        return;
      }

      const bt = form.querySelector('button');
      bt.disabled = true;
      try {
        await servidor('criarUsuario', {
          nome: dados.nome,
          email: dados.email,
          papel: selPapel.value,
          projetos: escolha.projetos,
        });
        // O CONVITE SAI NA HORA, e é o mesmo email de "esqueci minha senha".
        //
        // Sem ele, quem não tem conta Google ficava sem caminho nenhum: cadastrado
        // no banco e sem senha para entrar. O envio não pode derrubar a criação —
        // a pessoa JÁ está cadastrada, e o admin sempre pode reenviar depois.
        let enviou = true;
        try {
          await enviarConvite(dados.email);
        } catch (e) {
          enviou = false;
          console.warn('convite não saiu:', e && e.code);
        }
        avisar(
          'ok',
          enviou
            ? `${dados.nome} foi adicionado e recebeu o email para definir a senha.`
            : `${dados.nome} foi adicionado, mas o email não saiu. Use "Reenviar convite" na lista.`,
        );
        form.reset();
        await recarregar();
      } catch (e) {
        console.error(e);
        avisar('erro', mensagemDoServidor(e, 'Não consegui adicionar agora. Tente de novo.'));
      } finally {
        bt.disabled = false;
      }
    }

    // IMPORT TARDIO, e não no topo do arquivo.
    //
    // `base/auth.js` puxa o SDK do Firebase, e esta tela é desenhada (e testada)
    // sem rede — é o mesmo motivo que fez `base/suporte.js` entrar por import
    // normal e o gravar/ler dele ficar em `import()`. Trazer o SDK para o topo
    // derrubou dois arquivos de teste na hora.
    async function enviarConvite(email) {
      const { enviarDefinicaoDeSenha } = await import('../../base/auth.js');
      return enviarDefinicaoDeSenha(email);
    }

    async function reenviarConvite(u) {
      try {
        await enviarConvite(u.email);
        avisar('ok', `Email enviado para ${u.email}. Peça para conferir o spam também.`);
      } catch (e) {
        console.error(e);
        avisar('erro', 'Não consegui enviar agora. Tente de novo em alguns minutos.');
      }
    }

    // Mensagem que o servidor escreveu pro usuário (já em linguagem normal).
    function mensagemDoServidor(e, padrao) {
      const daGente = [
        'functions/failed-precondition',
        'functions/invalid-argument',
        'functions/already-exists',
      ];
      return (e && daGente.includes(e.code) && e.message) || padrao;
    }

    // ---------- Lista com as ações ----------
    async function recarregar() {
      ui.limpar(lista);
      let usuarios;
      try {
        ({ usuarios } = await servidor('listarUsuarios'));
      } catch (e) {
        console.error(e);
        const erro = document.createElement('div');
        erro.className = 'faixa faixa--atencao';
        erro.textContent = 'Não consegui carregar a equipe agora. Recarregue a página.';
        lista.appendChild(erro);
        return;
      }

      const adminsAtivos = usuarios.filter((u) => u.papel === 'admin' && u.ativo).length;

      for (const u of usuarios) {
        const souEu = u.uid === usuario.uid;
        // Mexer nesta pessoa deixaria o sistema sem administrador?
        const ultimoAdmin = u.papel === 'admin' && u.ativo && adminsAtivos === 1;

        const linha = document.createElement('div');
        linha.className = 'card';
        linha.style.cssText =
          'display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:190px';
        const nome = document.createElement('strong');
        nome.textContent = u.nome + (souEu ? ' (você)' : '');
        const email = document.createElement('div');
        email.style.cssText = 'font-size:13px;color:var(--cor-texto-fraco);margin-top:3px';
        email.textContent = u.email;
        const ondeCuida = document.createElement('div');
        ondeCuida.style.cssText = 'font-size:13px;color:var(--cor-texto-fraco);margin-top:3px';
        ondeCuida.textContent = textoDoEscopo(u);
        info.append(nome, email);
        // Sem escopo, a linha ficaria em branco ocupando espaço à toa.
        if (ondeCuida.textContent) info.appendChild(ondeCuida);

        const estado = document.createElement('span');
        estado.className = 'ponto' + (u.ativo ? ' ponto--ok' : '');
        estado.textContent = u.ativo ? 'Ativo' : 'Desativado';

        linha.append(info, estado);

        const sel = document.createElement('select');
        sel.className = 'input';
        sel.style.cssText = 'width:auto;min-width:150px';
        for (const p of PAPEIS) {
          const o = document.createElement('option');
          o.value = p.valor;
          o.textContent = p.nome;
          o.selected = u.papel === p.valor;
          sel.appendChild(o);
        }
        sel.disabled = souEu || ultimoAdmin;
        sel.addEventListener('change', () => trocarPapel(u, sel));
        linha.appendChild(sel);

        // Trocar o escopo de alguém não deixa o sistema sem administrador,
        // então vale até para o último admin. Só não vale para a própria conta
        // — o servidor recusa mexer em si mesmo, e oferecer seria mentira.
        if (!souEu && ESCOPO.usa) {
          linha.appendChild(
            botaoComIcone(
              ui,
              'livro',
              ESCOPO.botaoTrocar,
              () => trocarEscopo(u, linha),
              'secundario',
            ),
          );
        }

        // REENVIAR O CONVITE vale para qualquer pessoa ativa, inclusive para o
        // último admin e para mim mesmo: é o mesmo email de "esqueci minha
        // senha", e ninguém perde acesso por recebê-lo. É a saída para o caso
        // comum — o email caiu no spam, ou a pessoa apagou sem ler.
        //
        // Para quem foi DESATIVADO, não: mandar link de senha para quem perdeu
        // o acesso é prometer uma porta que a regra do banco vai fechar depois.
        if (u.ativo) {
          linha.appendChild(
            botaoComIcone(
              ui,
              'publicar',
              'Reenviar convite',
              () => reenviarConvite(u),
              'secundario',
            ),
          );
        }

        if (!souEu && !ultimoAdmin) {
          linha.appendChild(
            ui.botao(u.ativo ? 'Desativar' : 'Reativar', () => alternarAtivo(u), 'secundario'),
          );
          const btRemover = botaoComIcone(ui, 'erro', 'Remover', () => remover(u), 'secundario');
          btRemover.style.color = 'var(--cor-erro)';
          linha.appendChild(btRemover);
        } else {
          const motivo = document.createElement('span');
          motivo.style.cssText =
            'font-size:12px;color:var(--cor-texto-fraco);max-width:230px;line-height:1.4';
          motivo.textContent = souEu
            ? 'Você não altera a própria conta.'
            : 'Único administrador ativo. Promova outra pessoa antes.';
          linha.appendChild(motivo);
        }

        lista.appendChild(linha);
      }
    }

    // Permissão não muda sozinha: o sistema pergunta e explica o que a nova
    // permissão dá de poder. Cancelar devolve o seletor ao que era.
    async function trocarPapel(u, sel) {
      const novo = sel.value;
      const nomePapel = (PAPEIS.find((p) => p.valor === novo) || {}).nome;

      // A PERGUNTA DIZ O DESTINO, e não só que algo vai mudar. Com três papéis,
      // "tirar o acesso de administrador" deixou de descrever o que acontece:
      // tirar para virar gestor e tirar para virar membro são coisas
      // diferentes, e quem confirma precisa saber qual das duas está fazendo.
      const ok = await ui.confirmar(
        `Tornar ${u.nome} ${nomePapel.toLowerCase()}?`,
        TEXTO_PAPEIS[novo],
        `Sim, tornar ${nomePapel}`,
      );
      if (!ok) {
        sel.value = u.papel;
        return;
      }

      sel.disabled = true;
      try {
        await servidor('atualizarUsuario', { uid: u.uid, papel: novo });
        avisar('ok', `${u.nome} agora é ${nomePapel}.`);
      } catch (e) {
        console.error(e);
        avisar('erro', mensagemDoServidor(e, 'Não consegui mudar o papel agora.'));
      } finally {
        await recarregar();
      }
    }

    // Abre o seletor na própria linha, em vez de outra tela: assim dá pra ver
    // de quem é a mudança enquanto se marca.
    function trocarEscopo(u, linha) {
      if (linha.querySelector('[data-editor-escopo]')) return;

      const editor = document.createElement('div');
      editor.dataset.editorEscopo = '1';
      editor.style.cssText =
        'flex-basis:100%;border-top:1px solid var(--cor-borda);margin-top:12px;padding-top:12px';

      const quem = document.createElement('p');
      quem.style.cssText = 'font-size:13px;color:var(--cor-texto-fraco);margin-bottom:10px';
      quem.textContent = `Escolhendo onde ${u.nome} atua.`;

      const seletor = seletorDeEscopo(vejoTodosOsProjetos(u) ? null : u.projetos);

      const acoes = document.createElement('div');
      acoes.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
      const btSalvar = ui.botao('Salvar', salvar);
      acoes.append(
        btSalvar,
        ui.botao('Cancelar', () => editor.remove(), 'secundario'),
      );

      editor.append(quem, seletor.wrapper, acoes);
      linha.appendChild(editor);

      async function salvar() {
        const escolha = seletor.ler();
        if (escolha.erro) {
          avisar('erro', escolha.erro);
          return;
        }

        const vira =
          escolha.projetos === null
            ? ESCOPO.todos.toLowerCase()
            : escolha.projetos
                .map((id) => {
                  const b = projetos.find((x) => x.id === id);
                  return b ? b.nome || b.id : id;
                })
                .join(', ');

        const ok = await ui.confirmar(
          `Mudar onde ${u.nome} atua?`,
          `A partir de agora ${u.nome} enxerga e trabalha em: ${vira}. O que pertence aos outros some da tela dela — nada é apagado, ela só deixa de alcançar. Dá para mudar de novo quando quiser.`,
          'Salvar',
        );
        if (!ok) return;

        btSalvar.disabled = true;
        try {
          await servidor('atualizarUsuario', { uid: u.uid, projetos: escolha.projetos });
          avisar('ok', `${u.nome} agora cuida de ${vira}.`);
        } catch (e) {
          console.error(e);
          avisar('erro', mensagemDoServidor(e, 'Não consegui mudar agora.'));
        } finally {
          await recarregar();
        }
      }
    }

    async function alternarAtivo(u) {
      const desativando = u.ativo;
      if (desativando) {
        const ok = await ui.confirmar(
          `Desativar ${u.nome}?`,
          'A pessoa perde o acesso na hora, inclusive se estiver com o sistema aberto. O cadastro fica guardado e você pode reativar quando quiser.',
          'Desativar',
        );
        if (!ok) return;
      }
      try {
        const r = await servidor('atualizarUsuario', { uid: u.uid, ativo: !u.ativo });
        avisar('ok', desativando ? `${u.nome} foi desativado.` : `${u.nome} voltou a ter acesso.`);
        if (desativando) contarSobreACobranca(r, u.nome);
      } catch (e) {
        console.error(e);
        avisar('erro', mensagemDoServidor(e, 'Não consegui alterar agora.'));
      } finally {
        await recarregar();
      }
    }

    // O QUE DIZER SOBRE A COBRANÇA, depois de tirar alguém.
    //
    // ⚠️ O SILÊNCIO AQUI CUSTA DINHEIRO DE TERCEIRO. A assinatura vive no
    // gateway: o servidor tenta cancelá-la junto, mas se o gateway estiver fora
    // do ar o bloqueio acontece e a cobrança continua saindo todo mês — de
    // alguém que já não entra mais. Quem descobre isso é a pessoa, pela fatura,
    // e a resposta dela é estorno.
    //
    // ⚠️ NA MATRIZ ISTO NÃO DISPARA: sem gateway ligado, o servidor devolve
    // `cobranca: null` e a função sai calada no primeiro `if`. Ela fica aqui
    // INTEIRA e de propósito — o dia em que o meio de pagamento entrar, a tela
    // já sabe o que dizer quando o cancelamento falhar. Este é o tipo de
    // cuidado que ninguém se lembra de acrescentar depois, porque só aparece
    // quando já deu errado.
    //
    // Então quando falha, a tela FALA, e diz o que fazer. Um aviso feio é
    // melhor do que uma cobrança indevida silenciosa.
    function contarSobreACobranca(r, nome) {
      const c = r && r.cobranca;
      if (!c) return; // não havia assinatura: caso comum
      if (c.cancelada) {
        avisar('ok', `A assinatura de ${nome} também foi cancelada.`);
        return;
      }
      if (c.motivo === 'sem assinatura') return;
      // 'erro' e não 'info': dinheiro continuando a sair de alguém bloqueado é
      // uma falha, não um recado. O vermelho é para a pessoa não fechar sem ler.
      avisar(
        'erro',
        `Atenção: NÃO consegui cancelar a assinatura de ${nome} ` +
          `(${c.motivo}). Cancele à mão no meio de pagamento, senão a cobrança ` +
          'continua saindo todo mês.',
      );
    }

    async function remover(u) {
      const ok = await ui.confirmar(
        `Remover ${u.nome} da equipe?`,
        `Isso apaga o login e o cadastro de ${u.email}. Não dá para desfazer — para readmitir, você teria que cadastrar de novo. Se a ideia é só tirar o acesso por enquanto, use "Desativar".`,
        'Remover para sempre',
      );
      if (!ok) return;
      try {
        const r = await servidor('removerUsuario', { uid: u.uid });
        avisar('ok', `${u.nome} foi removido da equipe.`);
        contarSobreACobranca(r, u.nome);
      } catch (e) {
        console.error(e);
        avisar('erro', mensagemDoServidor(e, 'Não consegui remover agora.'));
      } finally {
        await recarregar();
      }
    }
  },
};
