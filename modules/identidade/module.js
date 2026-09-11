// A identidade visual do site, trocada pelo painel.
//
// É o que faz o mesmo sistema servir vários negócios: trocar a cara não exige
// editar arquivo, publicar e esperar deploy. O dono troca aqui e vê na hora.
//
// TUDO AQUI VAI PARA UM DOCUMENTO PÚBLICO (`/publico/identidade`), porque a
// tela de entrada precisa do logo e do fundo ANTES de qualquer login. A regra
// do banco tem LISTA BRANCA de campos: gravar um campo fora da lista faz o
// Firestore recusar a gravação INTEIRA. O gêmeo da lista é `CAMPOS`, em
// `base/identidade.js`.
//
// As imagens vão para `publico/` no Storage — a única pasta que o mundo lê. Sem
// isso, a foto de fundo do login voltaria 403 para o visitante, que é
// exatamente quem a tela existe para receber.

import { campoImagem } from '../_comum/campo-imagem.js';
import {
  FONTES,
  FAMILIAS,
  aplicarTema,
  carregarFamilia,
  carregarFontes,
  ehCorValida,
  ehUrlSegura,
  TEMAS,
  temaValido,
} from '../../base/identidade.js';
// O nome de fábrica do produto: é ele que a caixa do logo escrito sugere, e o
// que o site mostra quando ninguém escreveu nada.
import { MARCA } from '../../config/marca.js';

const PASTA = 'publico/identidade';

export default {
  id: 'identidade',
  nome: 'Identidade',
  icone: 'estrela',
  // Fora da barra: é ferramenta de dentro da Configuração.
  menu: { grupo: '_rodape', ordem: 6, oculto: true },
  acesso: 'admin',

  async montarTela(caixa, servicos) {
    const { ui, avisar } = servicos;

    const titulo = document.createElement('h2');
    titulo.textContent = 'Identidade do site';
    titulo.style.cssText = 'margin:0 0 4px';

    const sub = document.createElement('p');
    sub.style.cssText =
      'color:var(--cor-texto-fraco);font-size:13.5px;line-height:1.55;margin:0 0 22px;max-width:62ch';
    sub.textContent =
      'A cara da comunidade. O que você põe aqui aparece para todo ' +
      'mundo, inclusive na tela de entrada — antes de a pessoa fazer login.';

    caixa.append(titulo, sub);

    const carregando = document.createElement('p');
    carregando.className = 'carregando-tela';
    carregando.textContent = 'Carregando…';
    caixa.appendChild(carregando);

    // O documento é público e mora fora de /dados/app, então não passa pelos
    // ajudantes de `servicos.db`. Leitura e gravação diretas, aqui.
    const firestore =
      await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    const { db: banco } = await import('../../base/firebase.js');
    const ref = firestore.doc(banco, 'publico', 'identidade');

    let atual = {};
    try {
      const snap = await firestore.getDoc(ref);
      atual = snap.exists() ? snap.data() : {};
    } catch (e) {
      console.warn('identidade: não consegui ler.', e && e.message);
    }
    carregando.remove();

    // ---------------- A entrada ----------------

    const secaoEntrada = bloco(
      'A tela de entrada',
      'A primeira coisa que qualquer pessoa vê. No computador a imagem ocupa a ' +
        'metade esquerda; no celular ela vira o fundo, com a caixa de login por cima.',
    );

    const imgLogin = campoImagem({
      rotulo: 'Imagem da entrada',
      dica:
        'Medida recomendada: 1200×1600 (em pé) ou 1600×1200. Até 10 MB. ' +
        'Ela é recortada para caber, então deixe o assunto no centro.',
      urlAtual: atual.loginImagemUrl,
    });

    const imgLoginMobile = campoImagem({
      rotulo: 'Imagem da entrada no celular (opcional)',
      dica:
        'Só preencha se quiser uma foto DIFERENTE no celular — em pé, tipo ' +
        '1080×1920. Deixando vazio, a de cima é reaproveitada e recortada.',
      urlAtual: atual.loginImagemMobileUrl,
    });

    secaoEntrada.append(imgLogin.wrapper, imgLoginMobile.wrapper);

    // ---------------- A marca ----------------

    // ---------------- 1. A marca ----------------
    //
    // PRIMEIRO BLOCO porque é a pergunta que vem antes de todas: quem é esta
    // marca? Cor, imagem de fundo e palavras só fazem sentido depois de a
    // identidade estar decidida.
    const secaoMarca = bloco(
      'A marca',
      'O ícone da aba, e o logo que aparece no topo da barra lateral e na tela ' +
        'de entrada. Você pode usar uma imagem OU escrever o nome — a imagem, ' +
        'quando existe, é a que vale.',
    );

    const imgFavicon = campoImagem({
      rotulo: 'Ícone da aba (favicon)',
      dica: 'Quadrado, 512×512 (PNG). O navegador reduz sozinho.',
      urlAtual: atual.faviconUrl,
    });
    const imgLogo = campoImagem({
      rotulo: 'Logo (imagem)',
      dica:
        'Horizontal, por volta de 320×80, com fundo transparente (PNG). ' +
        'Deixe vazio para usar o nome escrito abaixo.',
      urlAtual: atual.logoUrl,
    });

    // O LOGO ESCRITO, EM DUAS PARTES.
    //
    // Marca escrita quase nunca é um bloco só: é "NINJA" pesado e "DIGITAL"
    // leve, ou a primeira palavra na cor da marca e a segunda em cinza. Com uma
    // parte só, quem quisesse isso precisaria de um designer e de um PNG — que
    // é exatamente o que o logo escrito existe para evitar.
    //
    // A segunda parte é OPCIONAL e não aparece quando está vazia: quem quer só
    // um nome preenche o primeiro campo e ignora o resto.
    function parteDoLogo(numero, valores) {
      const caixa = document.createElement('div');
      caixa.className = 'logo-parte';

      const titulo = document.createElement('span');
      titulo.className = 'logo-parte-titulo';
      titulo.textContent = numero === 1 ? 'Primeira parte' : 'Segunda parte (opcional)';
      caixa.appendChild(titulo);

      const { wrapper: wTexto, input: inTexto } = ui.campo(
        numero === 1 ? 'Texto' : 'Texto — ex.: a segunda palavra',
      );
      inTexto.value = valores.texto || '';
      if (numero === 1) inTexto.placeholder = MARCA.nome;
      inTexto.maxLength = 40;
      inTexto.addEventListener('input', previa);

      // ---- cor ----
      const linhaCorLogo = document.createElement('div');
      linhaCorLogo.className = 'campo';
      const rotCor = document.createElement('label');
      rotCor.textContent = 'Cor';
      const caixaCor = document.createElement('div');
      caixaCor.className = 'campo-cor';
      const cor = document.createElement('input');
      cor.type = 'color';
      const hexCor = document.createElement('input');
      hexCor.type = 'text';
      hexCor.className = 'input';
      hexCor.placeholder = 'usa a cor da marca';
      hexCor.value = ehCorValida(valores.cor) ? valores.cor : '';
      cor.value = hexCor.value || '#4f46e5';
      // A mesma saída explícita das cores de área: `<input type=color>` não tem
      // estado "nenhuma cor", então quem pintar por engano precisa de volta.
      const limpar = document.createElement('button');
      limpar.type = 'button';
      limpar.className = 'btn btn--secundario btn--mini';
      limpar.textContent = 'Cor da marca';
      limpar.addEventListener('click', () => {
        hexCor.value = '';
        previa();
      });
      cor.addEventListener('input', () => {
        hexCor.value = cor.value;
        previa();
      });
      hexCor.addEventListener('input', () => {
        if (ehCorValida(hexCor.value)) cor.value = hexCor.value.trim();
        previa();
      });
      caixaCor.append(cor, hexCor, limpar);
      linhaCorLogo.append(rotCor, caixaCor);

      // ---- fonte, com amostra ----
      const linhaFonteLogo = document.createElement('div');
      linhaFonteLogo.className = 'campo';
      const rotFonte = document.createElement('label');
      rotFonte.textContent = 'Fonte';
      const sel = document.createElement('select');
      sel.className = 'input';
      const semFonte = document.createElement('option');
      semFonte.value = '';
      semFonte.textContent = 'A mesma dos títulos do site';
      sel.appendChild(semFonte);
      for (const [chave, fam] of Object.entries(FAMILIAS)) {
        const o = document.createElement('option');
        o.value = chave;
        o.textContent = fam.nome;
        o.style.fontFamily = fam.pilha;
        if (chave === valores.fonte) o.selected = true;
        sel.appendChild(o);
      }
      const amostraFonte = document.createElement('div');
      amostraFonte.className = 'fonte-amostra-linha';
      const repintar = () => {
        const fam = FAMILIAS[sel.value];
        amostraFonte.style.fontFamily = fam ? fam.pilha : 'var(--fonte-titulo)';
        amostraFonte.textContent = inTexto.value.trim() || 'Aa — amostra';
      };
      sel.addEventListener('change', () => {
        repintar();
        previa();
      });
      inTexto.addEventListener('input', repintar);
      repintar();
      linhaFonteLogo.append(rotFonte, sel, amostraFonte);

      caixa.append(wTexto, linhaCorLogo, linhaFonteLogo);
      return { caixa, inTexto, hexCor, sel };
    }

    const logo1 = parteDoLogo(1, {
      texto: atual.logoTexto,
      cor: atual.logoCor,
      fonte: atual.logoFonte,
    });
    const logo2 = parteDoLogo(2, {
      texto: atual.logoTexto2,
      cor: atual.logoCor2,
      fonte: atual.logoFonte2,
    });
    const duasPartes = document.createElement('div');
    duasPartes.className = 'logo-partes';
    duasPartes.append(logo1.caixa, logo2.caixa);

    secaoMarca.append(imgFavicon.wrapper, imgLogo.wrapper, duasPartes);

    // ---------------- Cor e fonte ----------------

    // ---------------- 4. O visual do site ----------------
    //
    // Tema, cor de destaque, fonte e as cores das áreas eram DOIS blocos
    // separados por um de palavras. São a mesma decisão — "como este site se
    // parece" —, e decidir cor num lugar e tema em outro é o que faz alguém
    // salvar uma metade e esquecer a outra.
    const secaoTema = bloco(
      'O visual do site',
      'Estrutural: vale para todas as telas, para todo mundo. Você escolhe UMA ' +
        'cor de destaque e as variações — o gradiente, o tom do botão ' +
        'pressionado — saem dela sozinhas.',
    );

    const linhaCor = document.createElement('div');
    linhaCor.className = 'campo';
    const rotuloCor = document.createElement('label');
    rotuloCor.textContent = 'Cor de destaque';
    const caixaCor = document.createElement('div');
    caixaCor.className = 'campo-cor';
    const seletor = document.createElement('input');
    seletor.type = 'color';
    seletor.value = ehCorValida(atual.corDestaque) ? atual.corDestaque : '#4f46e5';
    const hex = document.createElement('input');
    hex.type = 'text';
    hex.className = 'input';
    hex.value = seletor.value;
    hex.placeholder = '#4f46e5';
    caixaCor.append(seletor, hex);
    linhaCor.append(rotuloCor, caixaCor);

    // Os dois campos são a MESMA escolha em duas formas: quem tem o código da
    // marca cola; quem não tem, escolhe no olho.
    seletor.addEventListener('input', () => {
      hex.value = seletor.value;
      previa();
    });
    hex.addEventListener('input', () => {
      if (ehCorValida(hex.value)) {
        seletor.value = hex.value.trim();
        previa();
      }
    });

    // ---------------- As fontes ----------------
    //
    // NOME DE FONTE NÃO É AMOSTRA DE FONTE.
    //
    // A lista era um `<select>` com "Editorial (Playfair + Inter)" escrito na
    // fonte do sistema. Quem não é de design não faz ideia do que sai daquilo —
    // e a única forma de descobrir era salvar, olhar o site e voltar. Escolha
    // que exige tentativa e erro não é escolha, é sorteio.
    //
    // Agora cada opção MOSTRA a si mesma: o título na fonte de título, o texto
    // na de texto. A decisão acontece com o olho, que é o órgão certo para ela.
    //
    // ⚠️ ESTA TELA BAIXA TODAS AS FAMÍLIAS, e isso é deliberado. São oito folhas
    // de estilo — que a tela do ALUNO nunca baixa, porque lá entram só as duas
    // escolhidas. Pagar oito pedidos numa tela de administração que se abre uma
    // vez por mês, para não pagar nenhum na tela que se abre todo dia, é a troca
    // certa.
    for (const chave of Object.keys(FAMILIAS)) carregarFamilia(chave);

    const linhaFonte = document.createElement('div');
    linhaFonte.className = 'campo';
    const rotuloFonte = document.createElement('label');
    rotuloFonte.textContent = 'Combinações prontas';
    linhaFonte.appendChild(rotuloFonte);

    const grade = document.createElement('div');
    grade.className = 'fontes-grade';
    // `<input type=radio>` de verdade, e não um `div` que finge: o navegador já
    // entrega as setas do teclado, o agrupamento para o leitor de tela e o
    // "só um por vez", de graça e para sempre.
    const radios = {};
    const escolhidoInicial = FONTES[atual.fonte] ? atual.fonte : 'padrao';

    for (const [chave, f] of Object.entries(FONTES)) {
      const cartao = document.createElement('label');
      cartao.className = 'fonte-cartao';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'par-de-fonte';
      radio.value = chave;
      radio.checked = chave === escolhidoInicial;
      radio.addEventListener('change', () => {
        // Escolher um par PREENCHE as duas escolhas individuais. Sem isso, as
        // duas listas continuariam mostrando a escolha anterior e ninguém
        // saberia qual das duas está valendo.
        selTitulo.value = f.titulo;
        selTexto.value = f.texto;
        previa();
      });
      radios[chave] = radio;

      const amostra = document.createElement('span');
      amostra.className = 'fonte-amostra';
      const t = document.createElement('strong');
      t.style.fontFamily = FAMILIAS[f.titulo].pilha;
      t.textContent = 'Sua primeira venda';
      const c = document.createElement('span');
      c.style.fontFamily = FAMILIAS[f.texto].pilha;
      c.textContent = 'O caminho de quem começa do zero absoluto.';
      amostra.append(t, c);

      const nome = document.createElement('span');
      nome.className = 'fonte-nome';
      nome.textContent = f.nome;
      const porque = document.createElement('span');
      porque.className = 'fonte-porque';
      porque.textContent = f.descricao;

      cartao.append(radio, amostra, nome, porque);
      grade.appendChild(cartao);
    }
    linhaFonte.appendChild(grade);

    // ---- Uma a uma, para quem quer sair do par ----
    const linhaIndividual = document.createElement('div');
    linhaIndividual.className = 'campo';
    const rotIndividual = document.createElement('label');
    rotIndividual.textContent = 'Ou escolha uma a uma';
    linhaIndividual.appendChild(rotIndividual);

    const duplaFonte = document.createElement('div');
    duplaFonte.className = 'fontes-dupla';

    function seletorDeFamilia(rotulo, valorAtual) {
      const caixa = document.createElement('div');
      caixa.className = 'fonte-individual';

      const l = document.createElement('span');
      l.className = 'fonte-individual-rotulo';
      l.textContent = rotulo;

      const sel = document.createElement('select');
      sel.className = 'input';
      for (const [chave, fam] of Object.entries(FAMILIAS)) {
        const o = document.createElement('option');
        o.value = chave;
        o.textContent = fam.nome;
        // Alguns navegadores desenham a opção na própria fonte; outros ignoram.
        // Por isso a amostra ao lado NÃO depende disto.
        o.style.fontFamily = fam.pilha;
        if (chave === valorAtual) o.selected = true;
        sel.appendChild(o);
      }

      const amostra = document.createElement('div');
      amostra.className = 'fonte-amostra-linha';

      const repintar = () => {
        const fam = FAMILIAS[sel.value];
        amostra.style.fontFamily = fam ? fam.pilha : '';
        amostra.textContent = 'Aa — Sua primeira venda 123';
      };
      sel.addEventListener('change', () => {
        repintar();
        // Mexer numa fonte individual desmarca o par: o que está na tela deixou
        // de ser aquele par, e um radio marcado dizendo o contrário seria a
        // tela mentindo.
        for (const r of Object.values(radios)) r.checked = false;
        previa();
      });
      repintar();

      caixa.append(l, sel, amostra);
      return { caixa, sel };
    }

    const doTitulo = seletorDeFamilia(
      'Títulos',
      atual.fonteTitulo || FONTES[escolhidoInicial].titulo,
    );
    const doTexto = seletorDeFamilia('Texto', atual.fonteTexto || FONTES[escolhidoInicial].texto);
    const selTitulo = doTitulo.sel;
    const selTexto = doTexto.sel;
    duplaFonte.append(doTitulo.caixa, doTexto.caixa);
    linhaIndividual.appendChild(duplaFonte);

    // ---------------- Claro ou escuro ----------------
    //
    // É ESCOLHA DO DONO, e não de quem usa. Não é preferência de usuário: é a
    // identidade do produto, do mesmo jeito que a cor da marca e a fonte. Um
    // sistema em que cada pessoa escolhe o tema é um sistema sem cara nenhuma —
    // e quem desenhou uma imagem para fundo claro perde o trabalho na conta de
    // quem virou a chave.
    const linhaTema = document.createElement('div');
    linhaTema.className = 'campo';
    const rotuloTema = document.createElement('label');
    rotuloTema.textContent = 'Tema do site';
    const selTema = document.createElement('select');
    selTema.className = 'input';
    for (const t of TEMAS) {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t === 'claro' ? 'Claro (padrão)' : 'Escuro';
      if (temaValido(atual.tema) === t) o.selected = true;
      selTema.appendChild(o);
    }
    selTema.addEventListener('change', previa);
    linhaTema.append(rotuloTema, selTema);

    // ⚠️ AS QUATRO ENTRAM AQUI, e esta linha já se perdeu uma vez.
    //
    // Em 07/09/2026 ela foi removida por acidente, junto com a seção das capas
    // que vinha logo abaixo. O efeito: "O visual do site" continuou aparecendo
    // na tela, com título e explicação, e VAZIA por dentro — tema claro/escuro,
    // cor de destaque e fontes sumiram da Identidade.
    //
    // Nada quebrou. Os quatro controles continuaram sendo construídos, ligados
    // à prévia e SALVOS no banco ao clicar em Salvar. Só não estavam na tela.
    // Seção montada e não anexada é trabalho invisível — e a suíte inteira
    // ficou verde, porque nenhum teste cobrava que uma seção tivesse conteúdo.
    //
    // Agora cobra: ver `test/unit/identidade.test.js`.
    secaoTema.append(linhaTema, linhaCor, linhaFonte, linhaIndividual);

    // ---------------- As três áreas ----------------

    const secaoAreas = bloco(
      'Cores das áreas (opcional)',
      'Deixe em branco para a área seguir o tema — que já é o certo na maioria ' +
        'dos casos. Mexer aqui é para quando a marca pede uma barra de topo ' +
        'escura num site claro, ou coisa parecida.',
    );

    const areas = [
      ['corTopo', 'Barra do topo', 'A faixa fina com o sino, no alto da tela.'],
      ['corConteudo', 'Corpo do site', 'O fundo de trás das telas e dos cartões.'],
      ['corRodape', 'Rodapé', 'A faixa do fim da página, com os direitos autorais.'],
    ];
    const camposDeArea = {};
    for (const [chave, rotulo, ajuda] of areas) {
      const linha = document.createElement('div');
      linha.className = 'campo';
      const l = document.createElement('label');
      l.textContent = rotulo;

      const caixaArea = document.createElement('div');
      caixaArea.className = 'campo-cor';
      const cor = document.createElement('input');
      cor.type = 'color';
      const texto = document.createElement('input');
      texto.type = 'text';
      texto.className = 'input';
      texto.placeholder = 'segue o tema';
      texto.value = ehCorValida(atual[chave]) ? atual[chave] : '';
      cor.value = texto.value || '#ffffff';

      // O BOTÃO DE LIMPAR NÃO É ENFEITE. `<input type=color>` não tem estado
      // "nenhuma cor": ele sempre devolve alguma. Sem uma saída explícita, quem
      // pintasse o topo por engano não teria como voltar ao tema.
      const limpar = document.createElement('button');
      limpar.type = 'button';
      limpar.className = 'btn btn--secundario btn--mini';
      limpar.textContent = 'Seguir o tema';
      limpar.addEventListener('click', () => {
        texto.value = '';
        previa();
      });

      cor.addEventListener('input', () => {
        texto.value = cor.value;
        previa();
      });
      texto.addEventListener('input', () => {
        if (ehCorValida(texto.value)) cor.value = texto.value.trim();
        previa();
      });

      const dica = document.createElement('p');
      dica.className = 'campo-imagem-dica';
      dica.textContent = ajuda;

      caixaArea.append(cor, texto, limpar);
      linha.append(l, caixaArea, dica);
      camposDeArea[chave] = texto;
      secaoAreas.appendChild(linha);
    }

    // ---------------- Palavras ----------------

    // ---------------- 5. O rodapé ----------------
    //
    // Sozinho no fim porque é a única coisa desta tela que não é imagem nem
    // cor.
    //
    // ⚠️ TEXTO QUE ACOMPANHA UMA IMAGEM MORA JUNTO DELA, e não aqui. Esta
    // seção já foi o depósito de "todos os textos", e acertar o contraste de
    // uma frase escrita por cima de uma foto virava um vai e volta entre dois
    // pontos distantes da mesma tela.
    const secaoTextos = bloco(
      'O rodapé',
      'A linha que aparece no fim de toda tela. Deixe vazia para não mostrar ' + 'rodapé nenhum.',
    );
    const { wrapper: wRodape, input: inRodape } = ui.campo('Rodapé (direitos autorais)');
    inRodape.value = atual.rodape || '';
    secaoTextos.append(wRodape);

    // ---------------- Salvar ----------------

    const acoes = document.createElement('div');
    acoes.className = 'conteudo-editor-acoes';
    const btSalvar = ui.botao('Salvar identidade', salvar);
    acoes.appendChild(btSalvar);

    // A ORDEM DOS BLOCOS É A ORDEM DAS PERGUNTAS, do que decide tudo ao que
    // decide pouco:
    //
    //   1. A MARCA           quem é este produto (ícone, logo)
    //   2. A TELA DE ENTRADA a primeira coisa que alguém vê, antes de entrar
    //   3. A PÁGINA INICIAL  a primeira coisa que ele vê depois de entrar
    //   4. O VISUAL          como o site inteiro se parece (estrutural)
    //   5. O RODAPÉ          a linha solta do fim
    //
    // A ordem antiga começava pela tela de entrada e deixava a marca em
    // terceiro — pedia a foto de fundo antes de perguntar de quem é a casa.
    caixa.append(secaoMarca, secaoEntrada, secaoTema, secaoAreas, secaoTextos, acoes);

    // A PRÉVIA É A TELA INTEIRA, e não um quadradinho de amostra. A cor e a
    // fonte já valem enquanto o dono mexe: ele vê o menu, o botão e o texto
    // mudando de verdade. Amostra pequena mente — cor que fica boa num quadrado
    // de 40px pode ficar ilegível num botão.
    // A PRÉVIA É A TELA INTEIRA, e não um quadradinho de amostra. A cor, a
    // fonte e o logo já valem enquanto o dono mexe: ele vê o menu, o botão e o
    // texto mudando de verdade. Amostra pequena mente — cor que fica boa num
    // quadrado de 40px pode ficar ilegível num botão.
    function comoEstaAgora() {
      return {
        corDestaque: seletor.value,
        tema: selTema.value,
        // O par marcado só entra se ainda houver um marcado: mexer numa fonte
        // individual desmarca todos, e aí quem manda são as duas escolhas.
        fonte: Object.entries(radios).find(([, r]) => r.checked)?.[0] || '',
        fonteTitulo: selTitulo.value,
        fonteTexto: selTexto.value,
        corTopo: camposDeArea.corTopo.value,
        corConteudo: camposDeArea.corConteudo.value,
        corRodape: camposDeArea.corRodape.value,
        logoCor: logo1.hexCor.value,
        logoFonte: logo1.sel.value,
        logoCor2: logo2.hexCor.value,
        logoFonte2: logo2.sel.value,
      };
    }

    function previa() {
      // ⚠️ A PRÉVIA MISTURA COM O QUE JÁ ESTÁ SALVO, e isto não é zelo — é a
      // correção de um estrago silencioso.
      //
      // `comoEstaAgora()` devolve só os treze campos que ESTA seção controla:
      // cor, tema, fontes e logo. Mas `aplicarTema` aplica a identidade
      // INTEIRA — e todo campo ausente do objeto vira o padrão dele.
      //
      // Na prática, no produto em que isto aconteceu: bastava mexer numa cor
      // aqui para várias escolhas de outras seções voltarem ao padrão de
      // fábrica de uma vez. Nada disso é salvo no banco, então recarregar
      // consertava — e é justamente por isso que o estrago passou
      // despercebido por semanas: quem configurou uma coisa, foi ajustar uma
      // cor, e viu a primeira desfeita sem nenhuma pista do motivo.
      //
      // ⚠️ VALE PARA TODA SEÇÃO NOVA QUE ENTRAR NESTA TELA. A armadilha não é
      // dos campos que existiam; é do padrão de chamar uma função que aplica o
      // documento inteiro com um recorte dele.
      //
      // Espalhar `atual` por baixo devolve a regra certa: a prévia manda no
      // que ela edita, e não encosta no resto.
      const agora = { ...atual, ...comoEstaAgora() };
      aplicarTema(agora);
      carregarFontes(agora);

      // O logo na tela, enquanto se digita. Só sem imagem: com ela, quem manda
      // é a imagem, e trocar o texto por baixo confundiria.
      if (!ehUrlSegura(atual.logoUrl)) {
        for (const alvo of document.querySelectorAll('.app-logo, .app-marca')) {
          alvo.replaceChildren(...pedacosDoLogo());
        }
      }
    }

    // As duas partes viradas em elementos. A segunda só existe quando tem
    // texto — `<span>` vazio no meio do logo abriria um espaço sem motivo.
    function pedacosDoLogo() {
      const um = logo1.inTexto.value.trim() || MARCA.nome;
      const dois = logo2.inTexto.value.trim();
      const a = document.createElement('strong');
      a.textContent = um;
      if (!dois) return [a];
      const b = document.createElement('strong');
      b.className = 'app-logo-2';
      b.textContent = dois;
      return [a, b];
    }
    previa();

    async function salvar() {
      btSalvar.disabled = true;
      const rotuloOriginal = btSalvar.textContent;
      btSalvar.textContent = 'Salvando…';
      try {
        // As imagens sobem ANTES da gravação. Se uma falhar, o documento não é
        // tocado — melhor não salvar nada do que gravar metade.
        const [loginImagemUrl, loginImagemMobileUrl, logoUrl, faviconUrl] = await Promise.all([
          imgLogin.resolver(servicos, PASTA),
          imgLoginMobile.resolver(servicos, PASTA),
          imgLogo.resolver(servicos, PASTA),
          imgFavicon.resolver(servicos, PASTA),
        ]);

        if (!ehCorValida(hex.value)) {
          throw new Error('A cor precisa ser um código tipo #4f46e5.');
        }

        // `merge: false` de propósito: o documento é a identidade inteira, e
        // esta tela mostra todos os campos dela. Com merge, apagar uma imagem
        // não apagaria nada — o campo antigo ficaria lá.
        await firestore.setDoc(ref, {
          loginImagemUrl,
          loginImagemMobileUrl,
          logoUrl,
          faviconUrl,
          corDestaque: hex.value.trim(),
          fonte: Object.entries(radios).find(([, r]) => r.checked)?.[0] || '',
          fonteTitulo: FAMILIAS[selTitulo.value] ? selTitulo.value : '',
          fonteTexto: FAMILIAS[selTexto.value] ? selTexto.value : '',
          // ⚠️ PRESERVADO, e não editado aqui. A escolha mora na aba "Áreas".
          //
          // Esta tela grava o documento INTEIRO (`merge: false`, de propósito:
          // apagar uma imagem precisa apagar o campo). Sem esta linha, mexer
          // numa cor religaria todas as áreas em silêncio — e ninguém
          // entenderia por que a Comunidade voltou sozinha.
          // Pelo MESMO motivo, e da aba Pagamento: sem estas três linhas, mexer
          // numa cor apagaria o botão de renovar de quem venceu e os links de
          // termos do checkout — em silêncio, e sem ninguém ligar uma coisa à
          // outra.
          ofertaRenovacao: atual.ofertaRenovacao || '',
          termosUrl: atual.termosUrl || '',
          privacidadeUrl: atual.privacidadeUrl || '',
          rodape: inRodape.value.trim(),
          tema: temaValido(selTema.value),
          // Campo vazio grava vazio, e não uma cor: é assim que a área volta a
          // seguir o tema.
          corTopo: ehCorValida(camposDeArea.corTopo.value) ? camposDeArea.corTopo.value.trim() : '',
          corConteudo: ehCorValida(camposDeArea.corConteudo.value)
            ? camposDeArea.corConteudo.value.trim()
            : '',
          corRodape: ehCorValida(camposDeArea.corRodape.value)
            ? camposDeArea.corRodape.value.trim()
            : '',
          logoTexto: logo1.inTexto.value.trim(),
          logoCor: ehCorValida(logo1.hexCor.value) ? logo1.hexCor.value.trim() : '',
          logoFonte: FAMILIAS[logo1.sel.value] ? logo1.sel.value : '',
          logoTexto2: logo2.inTexto.value.trim(),
          logoCor2: ehCorValida(logo2.hexCor.value) ? logo2.hexCor.value.trim() : '',
          logoFonte2: FAMILIAS[logo2.sel.value] ? logo2.sel.value : '',
        });

        atual = { ...atual, loginImagemUrl, loginImagemMobileUrl, logoUrl, faviconUrl };
        avisar('ok', 'Identidade salva! Recarregue para ver o logo na barra.');
      } catch (e) {
        console.error(e);
        avisar('erro', mensagem(e));
      } finally {
        btSalvar.disabled = false;
        btSalvar.textContent = rotuloOriginal;
      }
    }

    function mensagem(e) {
      const m = e && e.message;
      if (!m) return 'Não consegui salvar.';
      // O Firestore recusa a gravação inteira quando um campo sai da lista
      // branca, e o erro dele não diz isso em português.
      if (/permission|insufficient/i.test(m)) {
        return 'O banco recusou. Isso costuma ser campo fora da lista permitida — me avise.';
      }
      return m;
    }

    function bloco(nome, explicacao) {
      const s = document.createElement('section');
      s.className = 'ident-bloco';
      const h = document.createElement('h3');
      h.textContent = nome;
      s.appendChild(h);
      if (explicacao) {
        const p = document.createElement('p');
        p.className = 'ident-explica';
        p.textContent = explicacao;
        s.appendChild(p);
      }
      return s;
    }
  },
};
