import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';
import { db, storage, functions } from './firebase.js';
import { ui } from '../ui/ui.js';
import { caminhoColecao, montarRegistro, MARCA_TEMPO } from './db-core.js';
import { fatiar } from './escopo.js';

function resolverTempo(registro) {
  const r = { ...registro };
  for (const k in r) if (r[k] === MARCA_TEMPO) r[k] = serverTimestamp();
  return r;
}

export function montarServicos(usuario) {
  const servidor = (nomeFn, dados) => httpsCallable(functions, nomeFn)(dados).then((r) => r.data);

  return {
    usuario,
    db: {
      async criar(colecao, dados) {
        const cam = caminhoColecao(colecao); // ['dados','app',<colecao>]
        const registro = resolverTempo(montarRegistro(dados, usuario.uid));
        const r = await addDoc(collection(db, ...cam), registro);
        return r.id;
      },
      async listar(colecao) {
        const cam = caminhoColecao(colecao);
        const snap = await getDocs(collection(db, ...cam));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      },
      // Um registro só. Devolve null quando não existe, em vez de estourar:
      // quem chama costuma estar percorrendo uma lista de IDs guardada antes,
      // e um deles pode ter sido excluído no meio do caminho.
      async ler(colecao, id) {
        const cam = caminhoColecao(colecao);
        const snap = await getDoc(doc(db, ...cam, id));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      },
      // Listagem filtrada por um campo. Existe porque a regra de segurança por
      // projeto obriga: quando a regra olha um campo do documento, o Firestore
      // recusa a listagem inteira se a consulta não filtrar por esse campo.
      // O `in` aceita 30 valores por consulta — passar disso dá erro, não
      // resultado parcial —, então a lista é fatiada e as partes se juntam.
      async listarOnde(colecao, campo, valores) {
        const lista = valores || [];
        if (!lista.length) return [];
        const cam = caminhoColecao(colecao);
        const partes = await Promise.all(
          fatiar(lista).map((fatia) =>
            getDocs(query(collection(db, ...cam), where(campo, 'in', fatia))),
          ),
        );
        return partes.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      // Gravar num id ESCOLHIDO, criando o documento se ele ainda não existe.
      // `atualizar` não serve: `updateDoc` recusa documento inexistente, e a
      // configuração que nunca foi salva é exatamente o caso do primeiro uso.
      definir(colecao, id, dados) {
        const cam = caminhoColecao(colecao);
        return setDoc(doc(db, ...cam, id), resolverTempo(montarRegistro(dados, usuario.uid)));
      },
      atualizar(colecao, id, dados) {
        const cam = caminhoColecao(colecao);
        return updateDoc(doc(db, ...cam, id), resolverTempo(dados));
      },
      remover(colecao, id) {
        const cam = caminhoColecao(colecao);
        return deleteDoc(doc(db, ...cam, id));
      },
      observar(colecao, callback) {
        const cam = caminhoColecao(colecao);
        return onSnapshot(collection(db, ...cam), (snap) =>
          callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );
      },
    },
    storage: {
      async enviar(caminho, blob) {
        const r = ref(storage, caminho);
        await uploadBytes(r, blob);
        return getDownloadURL(r);
      },
    },
    servidor,
    // Não existe `conta.trocarSenha`. Quem entra pelo Google não tem senha
    // aqui — quem cuida dela é a conta Google. E quem entra por email e senha
    // troca a dele pelo mesmo caminho do primeiro acesso, na tela de entrada:
    // o link chega por email, que é o único jeito de provar que a caixa é dela.
    // Uma tela de troca aqui dentro seria um segundo caminho para manter, sem
    // nada a mais que o primeiro já não faça.
    ui,
    avisar: (tipo, mensagem) => ui.aviso(tipo, mensagem),
  };
}
