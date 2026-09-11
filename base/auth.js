import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';
import { auth, db, functions } from './firebase.js';

// DUAS PORTAS, e as duas precisam existir.
//
// Só Google trava quem comprou com email corporativo, do Outlook, do provedor
// da empresa — e numa comunidade vendida a cliente final isso é venda perdida e
// enxurrada de suporte. Só senha joga fora o login de um clique e devolve o
// problema de senha esquecida.
//
// O Firebase aceita os dois provedores no mesmo projeto, e o MESMO EMAIL cai na
// mesma conta: quem foi cadastrado e define uma senha continua entrando com o
// Google se preferir, e vice-versa.
export function entrarComGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function entrarComSenha(email, senha) {
  return signInWithEmailAndPassword(auth, String(email || '').trim(), senha);
}

// O MESMO EMAIL SERVE PARA TRÊS COISAS: primeiro acesso, esqueci minha senha, e
// reenviar convite. É o mesmo mecanismo do Firebase, e tratar como três coisas
// diferentes só criaria três caminhos para manter.
//
// `languageCode` é o que faz o email chegar em PORTUGUÊS. Sem isso ele vai em
// inglês dizendo "reset your password", e metade das pessoas não abre. Trocar o
// TEXTO do email exige o console do Firebase (a API recusa por antiabuso), mas
// o idioma não.
export function enviarDefinicaoDeSenha(email) {
  auth.languageCode = 'pt-BR';
  return sendPasswordResetEmail(auth, String(email || '').trim(), {
    // Depois de definir a senha, a pessoa volta para a NOSSA tela de entrada, e
    // não fica parada na página do Google sem saber o que fazer.
    url: `${location.origin}/login.html`,
  });
}

// As mensagens do Firebase vêm em inglês e falam de código de erro. Quem lê é
// uma pessoa tentando entrar na área de membros que ela pagou.
const RECADOS = {
  'auth/invalid-email': 'Esse email não parece certo.',
  'auth/user-disabled': 'Esta conta foi desativada. Fale com o suporte.',
  'auth/user-not-found': 'Email ou senha não conferem.',
  'auth/wrong-password': 'Email ou senha não conferem.',
  'auth/invalid-credential': 'Email ou senha não conferem.',
  'auth/invalid-login-credentials': 'Email ou senha não conferem.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
  'auth/missing-password': 'Escreva a sua senha.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
};

// EMAIL E SENHA ERRADOS DÃO A MESMA RESPOSTA, de propósito. Dizer "esse email
// não existe" conta a um estranho quem é membro da comunidade — e é assim que
// se monta uma lista de alvos.
export function recadoDoErro(e) {
  const codigo = (e && e.code) || '';
  if (codigo in RECADOS) return RECADOS[codigo];
  return 'Não consegui agora. Tente de novo.';
}
export function sair() {
  return signOut(auth);
}
export function observarSessao(cb) {
  return onAuthStateChanged(auth, cb);
}

// Carrega o doc do usuário logado. No 1º acesso do sistema, pede ao servidor
// (bypass-proof) para criar o primeiro usuário como admin. Retorna null se a
// pessoa não é a primeira e não foi convidada (sem doc = sem acesso).
export async function carregarUsuarioAtual() {
  const u = auth.currentUser;
  if (!u) return null;
  const ref = doc(db, 'usuarios', u.uid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    try {
      const r = await httpsCallable(functions, 'bootstrapAdmin')();
      if (r.data && r.data.criado) {
        // RENOVA O TOKEN NA HORA, e esta linha não é detalhe.
        //
        // O carimbo `equipe` é posto pelo servidor durante o bootstrap, mas o
        // token que o navegador tem na mão foi emitido ANTES disso — e o
        // Firebase só o renova sozinho perto de expirar, o que pode levar uma
        // hora.
        //
        // Sem renovar aqui, a pessoa que acabou de virar dona do sistema passa
        // a primeira hora sem conseguir enviar imagem nenhuma: a regra do
        // Storage lê o carimbo do token, e o token dela ainda não tem. Ela
        // tentaria subir o logo, levaria 403, e não teria como adivinhar que a
        // solução é recarregar a página.
        await u.getIdToken(true);
        snap = await getDoc(ref);
      }
    } catch (e) {
      console.error('bootstrapAdmin falhou:', e);
    }
    if (!snap.exists()) return null;
  }
  return { uid: u.uid, ...normalizarCadastro(snap.data()) };
}

// A FRONTEIRA entre o nome gravado e o nome que o sistema usa.
//
// O campo que diz onde a pessoa atua nasceu no primeiro produto feito nesta
// Base, que era de blogs, e continua com esse nome no banco: renomear campo
// gravado é migração de dados em produto que já está no ar, e o ganho seria
// puramente estético.
//
// Traduzir aqui, no único ponto do site que lê o documento cru, faz o nome
// antigo parar nesta função. Do lado de dentro, tudo fala `projetos` — inclusive
// o que a função `listarUsuarios` devolve, que é a outra porta de entrada da
// mesma informação. Sem esta tradução, as duas portas entregariam formatos
// diferentes e a tela leria o campo errado em uma delas.
const CAMPO_ALCANCE_GRAVADO = 'blogs';

export function normalizarCadastro(dados) {
  const d = { ...(dados || {}) };
  if (CAMPO_ALCANCE_GRAVADO in d) {
    d.projetos = d[CAMPO_ALCANCE_GRAVADO];
    delete d[CAMPO_ALCANCE_GRAVADO];
  }
  return d;
}
