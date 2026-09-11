import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  connectAuthEmulator,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {
  getStorage,
  connectStorageEmulator,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';
import {
  getFunctions,
  connectFunctionsEmulator,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';
import { usaEmulador } from './env.js';

// ⚠️ PRIMEIRA COISA A FAZER NUM PRODUTO NOVO: preencher isto.
//
// Esta é a MATRIZ. Ela nasce sem projeto Firebase de propósito — a versão
// anterior desta carcaça saiu de um produto real e levou junto as chaves dele,
// e um produto novo que esquecesse de trocar escreveria no banco do vizinho.
// Vazio quebra na primeira tela, alto e claro; herdado quebra em silêncio, no
// banco errado, e às vezes só semanas depois.
//
// Os valores estão em console.firebase.google.com › seu projeto ›
// Configurações › Seus aplicativos. Não são segredo: vão para o navegador de
// qualquer jeito, e quem protege os dados são as regras (`firestore.rules`).
//
// Preencha também `.firebaserc` (o projeto de deploy) e `config/marca.js`
// (o nome que aparece na tela). A região abaixo é sua escolha;
// `southamerica-east1` é São Paulo.
// Valores de demonstração para o emulador local. No projeto real, substitua por
// os dados do app web do Firebase do seu projeto.
const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-comunidade-ninja.firebaseapp.com',
  projectId: 'demo-comunidade-ninja',
  storageBucket: 'demo-comunidade-ninja.appspot.com',
  appId: '1:123456789:web:demo-comunidade-ninja',
};

if (!firebaseConfig.projectId) {
  // Falha ALTO, e não em silêncio: sem isto o SDK sobe pela metade e o erro
  // aparece três telas adiante, como "permissão negada" — que manda quem for
  // consertar procurar no lugar errado.
  throw new Error(
    'Firebase não configurado: preencha `firebaseConfig` em base/firebase.js ' +
      'com os dados do SEU projeto (console.firebase.google.com › Configurações).',
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'southamerica-east1');

if (usaEmulador(location.hostname)) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
