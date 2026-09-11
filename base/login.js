// A TELA DE ENTRADA.
//
// ===========================================================================
// POR QUE ISTO SAIU DE DENTRO DO `login.html`
// ===========================================================================
//
// Era um `<script type="module">` embutido na página, e funcionava. O que ele
// impedia estava fora dele: uma Política de Segurança de Conteúdo (CSP) séria.
//
// A CSP é o cabeçalho que diz ao navegador de onde ele PODE executar código. A
// defesa dela contra injeção depende de proibir script escrito dentro do HTML —
// que é exatamente a forma que um ataque de injeção toma. Enquanto esta página
// tivesse um, a política inteira precisava liberar `unsafe-inline`, e liberar
// `unsafe-inline` é desligar a parte da CSP que protege.
//
// Um arquivo próprio custa uma requisição e devolve a política.

import {
  entrarComGoogle,
  entrarComSenha,
  enviarDefinicaoDeSenha,
  recadoDoErro,
  observarSessao,
} from './auth.js';
import { MARCA } from '../config/marca.js';
import { ehUrlSegura } from './identidade.js';

// O TÍTULO DA ABA VEM DA MARCA DO PRODUTO. Ele já esteve cravado em "CRM
// Base" no HTML — e o montador não substitui nada aqui, então todo produto
// novo nascia com a marca da carcaça na primeira tela que alguém vê.
document.title = MARCA.versao ? `Entrar — ${MARCA.nome} ${MARCA.versao}` : `Entrar — ${MARCA.nome}`;

// A marca por `textContent`, nunca `innerHTML` — o nome vem de um arquivo
// de configuração que um integrador edita, e config de produto não é lugar
// para abrir caminho de injeção na tela de login.
const marca = document.getElementById('marca');
const nome = document.createElement('strong');
nome.textContent = MARCA.nome;
marca.appendChild(nome);
if (MARCA.versao) {
  const v = document.createElement('span');
  v.className = 'app-versao';
  v.textContent = MARCA.versao;
  marca.appendChild(v);
}

// A IDENTIDADE CARREGA DEPOIS, e a tela já está de pé sem ela.
//
// O desenho (duas metades, caixa no centro) não depende de imagem nenhuma:
// o que a identidade faz é trocar o gradiente por uma foto e o texto por um
// logo. Se ela demorar ou falhar, ninguém fica esperando para entrar.
(async () => {
  try {
    const [{ db }, firestore, ident] = await Promise.all([
      import('./firebase.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
      import('./identidade.js'),
    ]);
    const identidade = await ident.lerIdentidade(db, firestore);
    ident.aplicarTema(identidade);

    // O logo escrito também vale aqui: a tela de entrada é a PRIMEIRA que
    // alguém vê, e mostrar nela o nome de fábrica enquanto o resto do
    // sistema mostra a marca do cliente seria o pior lugar para deixar a
    // ponta solta.
    const parte1 = String(identidade.logoTexto || '').trim();
    const parte2 = String(identidade.logoTexto2 || '').trim();
    if (parte1 || parte2) {
      const pedacos = [];
      const a = document.createElement('strong');
      a.textContent = parte1 || MARCA.nome;
      pedacos.push(a);
      if (parte2) {
        const b = document.createElement('strong');
        b.className = 'app-logo-2';
        b.textContent = parte2;
        pedacos.push(b);
      }
      marca.replaceChildren(...pedacos);
    }
    ident.carregarFontes(identidade);
    ident.aplicarFavicon(identidade);

    // No celular vale a imagem de celular, se houver; senão a mesma do
    // desktop, que o `cover` recorta. É isso que faz "uma só que se
    // redimensiona" ser o padrão e a segunda imagem ser opcional.
    const estreito = window.matchMedia('(max-width: 900px)').matches;
    const escolhida =
      (estreito && identidade.loginImagemMobileUrl) ||
      identidade.loginImagemUrl ||
      identidade.loginImagemMobileUrl;

    if (ehUrlSegura(escolhida)) {
      const painel = document.getElementById('entrada-imagem');
      // Aspas viram %22 antes de entrar no `url(...)`. `ehUrlSegura` já
      // barrou tudo que não começa com https, mas o endereço pode ter sido
      // colado à mão no painel — e aspas soltas dentro de `url()` fecham a
      // função e deixam o resto virar CSS.
      painel.style.backgroundImage = `url("${escolhida.replace(/"/g, '%22')}")`;
      document.body.classList.add('entrada--com-imagem');
    }

    if (ehUrlSegura(identidade.logoUrl)) {
      const logo = document.getElementById('logo');
      logo.src = identidade.logoUrl;
      logo.alt = MARCA.nome;
      logo.hidden = false;
      marca.hidden = true; // logo E nome seria dizer duas vezes
    }
  } catch (e) {
    console.warn('identidade: sigo com o visual padrão.', e && e.message);
  }
})();

// OS CONTATOS SÃO ACESSÓRIOS E CARREGAM DEPOIS. Nada aqui pode atrasar nem
// derrubar o login: `lerContatos` já engole o próprio erro, e cada botão só
// aparece se houver número.
(async () => {
  try {
    const [{ db }, firestore, contatosLib] = await Promise.all([
      import('./firebase.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
      import('./suporte.js'),
    ]);
    const dados = await contatosLib.lerContatos(db, firestore);
    document.getElementById('contatos').append(...contatosLib.criarBotoesDeContato(dados));
  } catch (e) {
    console.warn('contatos: não consegui montar os botões.', e && e.message);
  }
})();

const erro = document.getElementById('erro');
const email = document.getElementById('email');
const senha = document.getElementById('senha');

function avisar(texto, ehBom) {
  erro.textContent = texto;
  erro.classList.toggle('entrada-erro--ok', !!ehBom);
}

observarSessao((u) => {
  if (u) location.replace('index.html');
});

document.getElementById('btGoogle').onclick = async () => {
  avisar('');
  try {
    await entrarComGoogle();
  } catch (e) {
    // Fechar a janela do Google é ação do usuário, não erro pra mostrar.
    const recado = recadoDoErro(e);
    if (!recado) return;
    console.error(e);
    avisar(recado);
  }
};

document.getElementById('formSenha').onsubmit = async (ev) => {
  ev.preventDefault();
  avisar('');
  if (!email.value.trim()) {
    avisar('Escreva o seu email.');
    email.focus();
    return;
  }
  if (!senha.value) {
    avisar('Escreva a sua senha.');
    senha.focus();
    return;
  }

  const botao = ev.target.querySelector('button');
  botao.disabled = true;
  const antes = botao.textContent;
  botao.textContent = 'Entrando…';
  try {
    await entrarComSenha(email.value, senha.value);
  } catch (e) {
    console.warn('entrada por senha recusada:', e && e.code);
    avisar(recadoDoErro(e));
  } finally {
    botao.disabled = false;
    botao.textContent = antes;
  }
};

document.getElementById('btEsqueci').onclick = async () => {
  avisar('');
  const endereco = email.value.trim();
  if (!endereco) {
    avisar('Escreva o seu email acima e clique de novo.');
    email.focus();
    return;
  }
  try {
    await enviarDefinicaoDeSenha(endereco);
  } catch (e) {
    // Erro só quando o email está mal escrito ou a rede caiu. Conta que não
    // existe NÃO vira erro: ver a resposta mudar conforme o email contaria a
    // um estranho quem é membro da comunidade.
    if (e && e.code === 'auth/invalid-email') {
      avisar(recadoDoErro(e));
      return;
    }
    console.warn('envio de senha:', e && e.code);
  }
  // A MESMA RESPOSTA SEMPRE, exista a conta ou não.
  avisar('Se esse email estiver cadastrado, o link para definir a senha acabou de sair.', true);
};
