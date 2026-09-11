import { test, before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-comunidade-ninja',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  // Semear usuarios com dados privilegiados, ignorando regras.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), {
      papel: 'admin',
      ativo: true,
      nome: 'A',
      email: 'a@x.com',
    });
    await setDoc(doc(db, 'usuarios/membro1'), {
      papel: 'membro',
      ativo: true,
      nome: 'M',
      email: 'm@x.com',
    });
    await setDoc(doc(db, 'usuarios/inativo1'), {
      papel: 'membro',
      ativo: false,
      nome: 'I',
      email: 'i@x.com',
    });

    await setDoc(doc(db, 'dados/app/producoes/prod2'), {
      blogId: 'b2',
      status: 'rodando',
      feitos: 0,
      total: 30,
    });

    // Conteúdo da comunidade, para os testes de leitura e de listagem.
    await setDoc(doc(db, 'dados/app/cursos/c1'), { titulo: 'Curso 1', visivel: true, ordem: 10 });
    await setDoc(doc(db, 'dados/app/secoes/s1'), {
      cursoId: 'c1',
      titulo: 'Modulo 1',
      visivel: true,
      ordem: 10,
    });
    await setDoc(doc(db, 'dados/app/aulas/a1'), {
      cursoId: 'c1',
      secaoId: 's1',
      titulo: 'Aula 1',
      visivel: true,
      ordem: 10,
    });
    await setDoc(doc(db, 'dados/app/vitrine/v1'), {
      titulo: 'Outro produto',
      visivel: true,
      ordem: 10,
    });
    await setDoc(doc(db, 'dados/app/estado/membro1'), { aulasConcluidas: [] });
    await setDoc(doc(db, 'dados/app/estado/outro1'), { aulasConcluidas: [] });
    await setDoc(doc(db, 'publico/identidade'), { corDestaque: '#4f46e5' });

    // Para os RECADOS: um post do membro1, e respostas de gente diferente. A
    // regra confere no banco quem e o dono de cada um — semear e o que permite
    // testar a conferencia de verdade, em vez de acreditar no que o teste diz.
    await setDoc(doc(db, 'dados/app/posts/doMembro1'), {
      titulo: 'Como comeco?',
      corpo: 'x',
      tipo: 'pergunta',
      autorUid: 'membro1',
      autorNome: 'M',
      emMs: 1,
      visivel: true,
      fixado: false,
    });
    await setDoc(doc(db, 'dados/app/comentarios/doAdmin'), {
      postId: 'doMembro1',
      corpo: 'tenta assim',
      autorUid: 'admin1',
      autorNome: 'A',
      emMs: 2,
      visivel: true,
    });
    await setDoc(doc(db, 'dados/app/comentarios/doMembro1'), {
      postId: 'doMembro1',
      corpo: 'eu mesmo',
      autorUid: 'membro1',
      autorNome: 'M',
      emMs: 3,
      visivel: true,
    });
  });
});

after(async () => {
  await env.cleanup();
});

test('anônimo não lê /dados', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'dados/app/exemplos/x')));
});

// O ALUNO LÊ E NÃO ESCREVE — nem em coleção que ninguém trancou.
//
// A carcaça nasceu para CRM, onde a equipe cria registro o dia todo, e liberava
// `write` na regra genérica. Numa comunidade quem entra é aluno: ele navega e
// assiste. Escreve em dois lugares só — o próprio progresso e, quando existir,
// o fórum —, e os dois têm regra própria.
//
// Com o padrão aberto, criar uma coleção nova e esquecer de trancá-la deixava
// todo aluno escrevendo nela, sem nada quebrar e sem nada avisar. Fechado, o
// esquecimento trava a função e aparece na hora.
test('membro ativo LÊ /dados, e NÃO escreve nem em coleção sem regra própria', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(db, 'dados/app/exemplos/x')));
  await assertFails(setDoc(doc(db, 'dados/app/exemplos/x'), { criadoPor: 'membro1', texto: 'oi' }));
  await assertFails(setDoc(doc(db, 'dados/app/coisa_nova_qualquer/z'), { x: 1 }));
});

test('admin escreve em /dados', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'dados/app/exemplos/x'), { criadoPor: 'admin1', texto: 'oi' }),
  );
});

test('membro inativo é bloqueado', async () => {
  const db = env.authenticatedContext('inativo1').firestore();
  await assertFails(getDoc(doc(db, 'dados/app/exemplos/x')));
  await assertFails(setDoc(doc(db, 'dados/app/exemplos/y'), { criadoPor: 'inativo1' }));
});

test('membro NÃO escreve em /usuarios (só admin)', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'usuarios/novo'), { papel: 'membro', ativo: true }));
});

test('admin escreve em /usuarios e /config', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'usuarios/novo'), { papel: 'membro', ativo: true, nome: 'N', email: 'n@x.com' }),
  );
  await assertSucceeds(setDoc(doc(db, 'config/geral'), { tema: 'claro' }));
});

// Regressão do 1º login: um usuário SEM doc precisa conseguir ler o PRÓPRIO doc
// (getDoc retorna "não existe" sem erro), senão carregarUsuarioAtual trava antes
// de chamar o bootstrap. Descoberto pelo e2e no navegador.
test('usuário sem doc lê o próprio doc de /usuarios (1º login)', async () => {
  const db = env.authenticatedContext('semdoc').firestore();
  await assertSucceeds(getDoc(doc(db, 'usuarios/semdoc')));
});

test('membro lê o próprio doc de /usuarios', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(db, 'usuarios/membro1')));
});

test('usuário sem doc NÃO lê o doc de OUTRO usuário', async () => {
  const db = env.authenticatedContext('semdoc').firestore();
  await assertFails(getDoc(doc(db, 'usuarios/admin1')));
});

// --- Cofre: o passe do Blogger é uma credencial. Ninguém lê pelo navegador. ---

test('membro não lê nem grava no cofre de segredos', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(getDoc(doc(db, 'segredos/blogger_b1')));
  await assertFails(setDoc(doc(db, 'segredos/blogger_b1'), { refreshToken: 'roubado' }));
});

test('nem o admin lê o cofre de segredos pelo navegador', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(getDoc(doc(db, 'segredos/blogger_b1')));
  await assertFails(setDoc(doc(db, 'segredos/blogger_b1'), { refreshToken: 'x' }));
});

test('ninguém forja um estado de autorização do Blogger', async () => {
  const dbAdmin = env.authenticatedContext('admin1').firestore();
  const dbMembro = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(dbAdmin, 'oauth_estados/forjado'), { blogId: 'b1', criadoEm: 1 }));
  await assertFails(getDoc(doc(dbMembro, 'oauth_estados/forjado')));
});

test('só admin lê e grava a configuração do Blogger', async () => {
  const admin = env.authenticatedContext('admin1').firestore();
  const membro = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(
    setDoc(doc(admin, 'config/blogger'), { clientId: 'abc.apps.googleusercontent.com' }),
  );
  await assertFails(getDoc(doc(membro, 'config/blogger')));
  await assertFails(setDoc(doc(membro, 'config/blogger'), { clientId: 'meu' }));
});

// ---- /publico/suporte: o ÚNICO documento que qualquer um lê ----
//
// A regra parece aberta e é fechada. Estes testes existem para provar as duas
// metades: que a leitura pública funciona (senão o botão de suporte nunca
// aparece para quem precisa dele) e que a porta tem o tamanho exato.

test('QUEM NÃO ESTÁ LOGADO LÊ o contato de suporte', async () => {
  // É o ponto inteiro: o botão serve a quem NÃO consegue entrar. Se exigisse
  // sessão, apareceria só para quem não precisa dele.
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'publico/suporte')));
});

test('administrador grava o contato de suporte', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511999999999',
      mensagem: 'Olá, preciso de ajuda',
    }),
  );
});

test('MEMBRO COMUM NÃO grava o contato de suporte', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'publico/suporte'), { whatsapp: '5511', mensagem: '' }));
});

test('ANÔNIMO NÃO grava o contato de suporte', async () => {
  // Ler é público; escrever não. Sem isto, qualquer um na internet trocaria o
  // número de suporte do painel pelo dele.
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'publico/suporte'), { whatsapp: '5511', mensagem: '' }));
});

test('administrador grava os QUATRO campos de uma vez', async () => {
  // É o que o painel faz ao salvar: suporte e financeiro no mesmo documento,
  // numa gravação só.
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511999999999',
      mensagem: 'Olá, preciso de ajuda',
      financeiroWhatsapp: '551133334444',
      financeiroMensagem: 'Quero renovar',
    }),
  );
});

test('O DOCUMENTO ANTIGO, de dois campos, continua gravável', async () => {
  // Os produtos que já estão no ar têm só `whatsapp`/`mensagem`. Se a regra
  // exigisse os quatro, o painel deles pararia de salvar no dia da atualização.
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511999999999',
      mensagem: 'oi',
    }),
  );
});

test('UM CAMPO A MAIS DERRUBA A GRAVAÇÃO INTEIRA', async () => {
  // A trava que importa de verdade. Sem ela, o dia em que alguém guardasse
  // aqui "só mais um campinho" com dado de cliente, ele nasceria legível pela
  // internet inteira, em silêncio.
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511999999999',
      mensagem: 'oi',
      emailDoCliente: 'x@y.com',
    }),
  );
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511',
      mensagem: 'oi',
      financeiroWhatsapp: '5511',
      financeiroMensagem: 'oi',
      emailDoCliente: 'x@y.com',
    }),
  );
});

test('número ou mensagem grandes demais são recusados — nos dois contatos', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '1'.repeat(21),
      mensagem: 'oi',
    }),
  );
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      whatsapp: '5511999999999',
      mensagem: 'x'.repeat(301),
    }),
  );
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      financeiroWhatsapp: '1'.repeat(21),
      financeiroMensagem: 'oi',
    }),
  );
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      financeiroWhatsapp: '551133334444',
      financeiroMensagem: 'x'.repeat(301),
    }),
  );
});

test('MEMBRO COMUM NÃO grava o contato do financeiro', async () => {
  // O botão do financeiro é o caminho do dinheiro: quem troca esse número
  // desvia o cliente que ia pagar. Escrita continua só de administrador.
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), {
      financeiroWhatsapp: '551199999999',
      financeiroMensagem: '',
    }),
  );
});

test('campo de tipo errado é recusado', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(doc(db, 'publico/suporte'), { whatsapp: 5511999999999, mensagem: 'oi' }),
  );
  await assertFails(setDoc(doc(db, 'publico/suporte'), { financeiroWhatsapp: 551133334444 }));
});

test('QUALQUER OUTRO documento de /publico é recusado, até para admin', async () => {
  // Só `suporte` tem regra. Todo o resto cai no padrão do Firestore, que é
  // negar — e é isso que impede a coleção de virar um depósito público.
  const anon = env.unauthenticatedContext().firestore();
  const adm = env.authenticatedContext('admin1').firestore();
  await assertFails(getDoc(doc(anon, 'publico/outra-coisa')));
  await assertFails(getDoc(doc(adm, 'publico/outra-coisa')));
  await assertFails(setDoc(doc(adm, 'publico/outra-coisa'), { x: 1 }));
});

// ===========================================================================
// O CONTEÚDO DA COMUNIDADE
//
// Estes testes existem por causa de uma linha da carcaça:
//
//   match /dados/app/{colecao}/{id} {
//     allow read, write: if ehDaEquipe() && !temDono(colecao);
//   }
//
// `ehDaEquipe()` é QUALQUER pessoa cadastrada — inclusive aluno comum. Sem
// excluir as coleções de conteúdo dessa regra, todo aluno reescreve o curso
// inteiro pelo console do navegador. E como as regras do Firestore são OU,
// escrever uma regra estrita depois não adianta: a genérica continua liberando.
//
// Por isso os testes vêm antes do conteúdo existir. Regra escrita depois de já
// haver o que proteger é regra escrita com pressa.
// ===========================================================================

const CONTEUDO = ['cursos', 'secoes', 'aulas', 'vitrine'];

for (const colecao of CONTEUDO) {
  test(`MEMBRO COMUM NÃO escreve em ${colecao} — mas lê`, async () => {
    const db = env.authenticatedContext('membro1').firestore();
    await assertSucceeds(getDoc(doc(db, `dados/app/${colecao}/c1`)));
    await assertFails(setDoc(doc(db, `dados/app/${colecao}/invadido`), { titulo: 'meu' }));
    await assertFails(updateDoc(doc(db, `dados/app/${colecao}/c1`), { titulo: 'mudei' }));
    await assertFails(deleteDoc(doc(db, `dados/app/${colecao}/c1`)));
  });

  test(`admin escreve em ${colecao}`, async () => {
    const db = env.authenticatedContext('admin1').firestore();
    await assertSucceeds(
      setDoc(doc(db, `dados/app/${colecao}/novo`), { titulo: 'Novo', visivel: false, ordem: 20 }),
    );
  });

  test(`anônimo não alcança ${colecao}`, async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `dados/app/${colecao}/c1`)));
  });

  test(`quem foi desativado perde ${colecao} junto`, async () => {
    const db = env.authenticatedContext('inativo1').firestore();
    await assertFails(getDoc(doc(db, `dados/app/${colecao}/c1`)));
  });
}

// A armadilha nº 2 da carcaça: regra que olha CAMPO do documento faz o Firestore
// recusar a LISTAGEM inteira. As regras de conteúdo checam só quem é a pessoa,
// nunca `resource.data` — então listar o catálogo tem que funcionar. Se um dia
// alguém puser `resource.data.visivel` na regra, este teste cai.
test('membro LISTA o catálogo — regra de conteúdo não olha campo do documento', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDocs(collection(db, 'dados/app/cursos')));
  await assertSucceeds(
    getDocs(query(collection(db, 'dados/app/aulas'), where('cursoId', '==', 'c1'))),
  );
});

// ---------------------------------------------------------------------------
// O PROGRESSO — o contrário do conteúdo: aqui o dono escreve, e SÓ o dono.
// ---------------------------------------------------------------------------

test('NINGUÉM escreve no progresso de outra pessoa', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/estado/outro1'), { aulasConcluidas: ['a1'] }));
});

// ---------------------------------------------------------------------------
// A IDENTIDADE VISUAL — pública de propósito, e por isso com lista branca.
//
// A tela de login mostra logo e fundo ANTES de qualquer autenticação. Se a
// identidade exigisse sessão, ela só apareceria para quem já entrou.
//
// O que a lista branca protege é o TAMANHO da porta: sem ela, o dia em que
// alguém guardar "só mais um campinho" aqui com dado de membro, esse dado nasce
// legível pela internet inteira, em silêncio.
// ---------------------------------------------------------------------------

test('QUALQUER UM lê a identidade, sem estar logado', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'publico/identidade')));
});

test('membro comum NÃO muda a identidade do site', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'publico/identidade'), { corDestaque: '#000000' }));
});

test('admin muda a identidade', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'publico/identidade'), {
      corDestaque: '#4f46e5',
      tema: 'escuro',
      rodape: '© 2026',
    }),
  );
});

test('CAMPO FORA DA LISTA é recusado — nem o admin abre esta porta', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(doc(db, 'publico/identidade'), {
      corDestaque: '#4f46e5',
      emailDoCliente: 'fulano@x.com',
    }),
  );
});

test('QUALQUER OUTRO documento de /publico é recusado, até para admin', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(setDoc(doc(db, 'publico/inventado'), { x: 1 }));
});

// Bônus e o feed da comunidade entram na mesma trava do resto do conteúdo:
// aluno lê, só admin escreve. Coleção nova que não é declarada em
// `temRegraPropria` cai na genérica — e a genérica hoje é fechada para escrita,
// mas o teste existe para o dia em que alguém mexer nela.
for (const colecao of ['bonus', 'posts']) {
  test(`membro comum NÃO escreve em ${colecao}`, async () => {
    const db = env.authenticatedContext('membro1').firestore();
    await assertFails(setDoc(doc(db, `dados/app/${colecao}/x`), { titulo: 'meu' }));
  });

  test(`admin escreve em ${colecao}, e o membro lê`, async () => {
    const admin = env.authenticatedContext('admin1').firestore();
    // `posts` virou o fórum: todo post tem autor e corpo, inclusive o da
    // equipe. Este teste nasceu na época em que `posts` era só um mural de
    // comunicados, e o formato mudou junto com a regra.
    const dados =
      colecao === 'posts'
        ? {
            titulo: 'oficial',
            corpo: 'Comunicado da equipe.',
            autorUid: 'admin1',
            autorNome: 'A',
            tipo: 'post',
            emMs: 1,
            visivel: true,
            fixado: false,
          }
        : { titulo: 'oficial', visivel: true, ordem: 10 };
    await assertSucceeds(setDoc(doc(admin, `dados/app/${colecao}/y`), dados));
    const membro = env.authenticatedContext('membro1').firestore();
    await assertSucceeds(getDoc(doc(membro, `dados/app/${colecao}/y`)));
  });
}

// ===========================================================================
// A PESSOA MUDA O PRÓPRIO NOME, e MAIS NADA
//
// O nome é o que vai aparecer no fórum e na Conexão. Deixar a pessoa presa ao
// nome que veio do Google é começar a comunidade com gente que não se
// reconhece — e é chamado de suporte para uma coisa que ela resolve sozinha.
//
// Mas a porta tem que ser do tamanho exato: `papel` é permissão, e quem se
// promove sozinho não tem permissão nenhuma. `ativo` é acesso. `blogs` é
// escopo. A lista branca é o que separa "mudar o nome" de "virar admin".
// ===========================================================================

test('membro muda o PRÓPRIO nome', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'usuarios/membro1'), { nome: 'Maria de Novo' }));
});

test('membro NÃO se promove a admin', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { papel: 'admin' }));
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { nome: 'M', papel: 'admin' }));
});

// Os valores aqui são DIFERENTES dos gravados de propósito. Gravar o mesmo
// valor não altera campo nenhum — `affectedKeys` vem vazio, `hasOnly` passa, e
// a gravação é aceita. Isso não é brecha: é escrita que não muda nada. Cobrar
// isso como se fosse falha faria o teste reprovar a regra certa.
test('membro NÃO muda acesso nem escopo — nem os próprios', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { ativo: false }));
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { blogs: ['b1'] }));
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { email: 'outro@x.com' }));
});

test('membro NÃO muda o nome de OUTRA pessoa', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'usuarios/admin1'), { nome: 'Invadido' }));
});

test('nome vazio ou absurdo é recusado pelo banco, não só pela tela', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { nome: '' }));
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { nome: 'x'.repeat(101) }));
  await assertFails(updateDoc(doc(db, 'usuarios/membro1'), { nome: 123 }));
});

test('quem foi desativado não muda o próprio nome', async () => {
  const db = env.authenticatedContext('inativo1').firestore();
  await assertFails(updateDoc(doc(db, 'usuarios/inativo1'), { nome: 'Voltei' }));
});

test('admin continua podendo tudo em /usuarios', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'usuarios/membro1'), { papel: 'membro', ativo: true }));
});

// ===========================================================================
// O FÓRUM: o ÚNICO lugar onde o aluno escreve
//
// Todo o resto do sistema é "membro lê, admin escreve". Aqui a porta abre — e
// abrir porta é onde se erra. Três coisas precisam ser verdade ao mesmo tempo:
//
//   1. O membro escreve.
//   2. Ele só mexe no QUE É DELE. Sem isso, um aluno reescreve o post de outro.
//   3. Ele não se promove a moderador pela porta dos fundos: `fixado`,
//      `visivel` e `respostaAceitaId` não são campos que o autor mexe.
// ===========================================================================

const POST = {
  titulo: 'Como começo?',
  corpo: 'Sou novo por aqui.',
  tipo: 'pergunta',
  autorUid: 'membro1',
  autorNome: 'M',
  emMs: 1700000000000,
  visivel: true,
  fixado: false,
};

// Sem isto, um aluno assina o post com o nome de outro — e a comunidade perde a
// única coisa que o fórum precisa ter: saber quem disse o quê.
test('ninguém escreve assinando com o uid de OUTRA pessoa', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/posts/falso'), { ...POST, autorUid: 'admin1' }));
});

test('post nasce VISÍVEL e NÃO fixado — moderação não se autoconcede', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/posts/x1'), { ...POST, fixado: true }));
  await assertFails(setDoc(doc(db, 'dados/app/posts/x2'), { ...POST, visivel: false }));
});

test('post sem título ou sem corpo é recusado pelo banco, não só pela tela', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/posts/y1'), { ...POST, titulo: '' }));
  await assertFails(setDoc(doc(db, 'dados/app/posts/y2'), { ...POST, corpo: '' }));
  await assertFails(setDoc(doc(db, 'dados/app/posts/y3'), { ...POST, titulo: 'x'.repeat(201) }));
});

test('o autor NÃO fixa nem esconde o próprio post', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/posts/meu1'), { fixado: true }));
  await assertFails(updateDoc(doc(db, 'dados/app/posts/meu1'), { visivel: false }));
});

test('o autor NÃO troca a autoria depois de publicar', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/posts/meu1'), { autorUid: 'admin1' }));
  await assertFails(updateDoc(doc(db, 'dados/app/posts/meu1'), { autorNome: 'Outro' }));
});

// É ISTO que separa um fórum de um mural onde qualquer um apaga qualquer coisa.
test('MEMBRO NÃO MEXE NO POST DE OUTRO — nem edita, nem apaga', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'dados/app/posts/doOutro'), { ...POST, autorUid: 'outro9' });
  });
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/posts/doOutro'), { corpo: 'invadi' }));
  await assertFails(deleteDoc(doc(db, 'dados/app/posts/doOutro')));
});

// Moderação existe porque comunidade sem ela vira terra de ninguém — e quem
// responde por isso é a equipe.
test('o ADMIN fixa, esconde e remove qualquer post', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'dados/app/posts/doOutro'), { fixado: true }));
  await assertSucceeds(updateDoc(doc(db, 'dados/app/posts/doOutro'), { visivel: false }));
  await assertSucceeds(deleteDoc(doc(db, 'dados/app/posts/doOutro')));
});

test('quem foi desativado não escreve no fórum', async () => {
  const db = env.authenticatedContext('inativo1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/posts/z1'), { ...POST, autorUid: 'inativo1' }));
});

test('anônimo não lê nem escreve no fórum', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'dados/app/posts/meu1')));
  await assertFails(setDoc(doc(db, 'dados/app/posts/z2'), POST));
});

// ---- Comentários: a mesma régua ----

const COMENTARIO = {
  postId: 'meu1',
  corpo: 'Comece pela trilha 1.',
  autorUid: 'membro1',
  autorNome: 'M',
  emMs: 1700000000000,
  visivel: true,
};

test('membro NÃO mexe no comentário de outro', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'dados/app/comentarios/doOutro'), {
      ...COMENTARIO,
      autorUid: 'outro9',
    });
  });
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/comentarios/doOutro'), { corpo: 'invadi' }));
  await assertFails(deleteDoc(doc(db, 'dados/app/comentarios/doOutro')));
});

test('o admin modera comentário de qualquer um', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'dados/app/comentarios/doOutro'), { visivel: false }));
  await assertSucceeds(deleteDoc(doc(db, 'dados/app/comentarios/doOutro')));
});

test('quem NÃO perguntou não marca a resposta como aceita', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'dados/app/posts/deOutro2'), { ...POST, autorUid: 'outro9' });
  });
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/posts/deOutro2'), { respostaAceitaId: 'c1' }));
});

// AVISOS: recado da EQUIPE para todo mundo. Mesma régua do resto do conteúdo —
// e de propósito: aviso que o membro escreve é aviso que o membro usa para
// alcançar a comunidade inteira sem passar pela equipe.
test('membro comum NÃO escreve avisos', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/avisos/x'), { titulo: 'meu', corpo: 'a', emMs: 1, visivel: true }),
  );
});

test('admin escreve aviso, e o membro lê', async () => {
  const admin = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(admin, 'dados/app/avisos/a1'), {
      titulo: 'Live de quinta',
      corpo: '20h',
      linkUrl: '',
      emMs: 1,
      visivel: true,
    }),
  );
  const membro = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(membro, 'dados/app/avisos/a1')));
});

// O SINO PRECISA SABER O QUE JÁ FOI VISTO, e quem sabe isso é a própria pessoa.
// O carimbo mora no documento de progresso — o único que o membro já escreve —,
// então nenhuma porta nova foi aberta para isto funcionar.
test('o membro carimba no próprio estado quando abre o sino', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(
    setDoc(
      doc(db, 'dados/app/estado/membro1'),
      { avisosVistosEmMs: 1700000000000 },
      { merge: true },
    ),
  );
});

test('ninguém carimba o sino de outra pessoa', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/estado/outro1'), { avisosVistosEmMs: 1 }, { merge: true }),
  );
});

// ===========================================================================
// OS RECADOS PESSOAIS
// ===========================================================================
//
// A porta mais delicada do sistema: e a unica coisa que um membro escreve
// DENTRO da caixa de outro. Se ela fosse um formulario livre, seria um megafone
// privado sem moderacao — daria para encher o sino de qualquer pessoa.
//
// A trava e o par de conferencias no banco: quem manda tem que ter escrito o
// comentario, e quem recebe tem que ser o dono do post.

const recado = (extra) => ({
  tipo: 'resposta',
  paraUid: 'membro1',
  deUid: 'admin1',
  deNome: 'A',
  postId: 'doMembro1',
  postTitulo: 'Como comeco?',
  comentarioId: 'doAdmin',
  emMs: 10,
  ...extra,
});

test('quem respondeu manda o recado para quem perguntou', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(setDoc(doc(db, 'dados/app/recados/ok1'), recado({})));
});

// Sem esta conferencia, mandar recado seria um formulario livre: dava para
// apontar para qualquer post e encher o sino de qualquer pessoa.
test('NAO da para mandar recado por uma resposta que nao e minha', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(
      doc(db, 'dados/app/recados/x1'),
      recado({
        deUid: 'membro1',
        paraUid: 'admin1',
        comentarioId: 'doAdmin',
      }),
    ),
  );
});

test('NAO da para mandar recado para quem nao e o dono do post', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(
      doc(db, 'dados/app/recados/x2'),
      recado({
        deUid: 'membro1',
        paraUid: 'inativo1',
        comentarioId: 'doMembro1',
      }),
    ),
  );
});

test('ninguem assina recado com o nome de outra pessoa', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/recados/x3'), recado({ deUid: 'membro1' })));
});

// O recado nao carrega texto livre: a frase e montada na tela a partir do tipo.
// Um campo a mais aqui e um canal de mensagem sem moderacao.
test('campo que nao esta na lista derruba a gravacao inteira', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/recados/x4'), recado({ mensagem: 'compre meu curso' })),
  );
});

// So quem PERGUNTOU marca a resposta que resolveu — entao so ele manda o recado
// de "sua resposta resolveu".
test('o "sua resposta resolveu" vem de quem perguntou', async () => {
  const dono = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(
    setDoc(
      doc(dono, 'dados/app/recados/ok2'),
      recado({
        tipo: 'aceita',
        deUid: 'membro1',
        paraUid: 'admin1',
        comentarioId: 'doAdmin',
      }),
    ),
  );

  const outro = env.authenticatedContext('admin1').firestore();
  await assertFails(
    setDoc(
      doc(outro, 'dados/app/recados/x5'),
      recado({
        tipo: 'aceita',
        deUid: 'admin1',
        paraUid: 'admin1',
        comentarioId: 'doAdmin',
      }),
    ),
  );
});

// Recado para si mesmo e bolinha vermelha por causa da propria escrita — o jeito
// mais rapido de ensinar a ignorar o sino.
test('ninguem manda recado para si mesmo', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(
      doc(db, 'dados/app/recados/x6'),
      recado({
        deUid: 'membro1',
        paraUid: 'membro1',
        comentarioId: 'doMembro1',
      }),
    ),
  );
});

// A CAIXA E DO DONO, e isso inclui o administrador. Ele nao precisa: o que
// gerou o recado e uma resposta no forum, que ele ja le e ja modera. Ler a
// caixa de todo mundo seria pagar privacidade por informacao que ele ja tem.
test('so o destinatario le o proprio recado — nem o admin le a caixa dos outros', async () => {
  const dono = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(
    getDocs(query(collection(dono, 'dados/app/recados'), where('paraUid', '==', 'membro1'))),
  );

  const admin = env.authenticatedContext('admin1').firestore();
  await assertFails(
    getDocs(query(collection(admin, 'dados/app/recados'), where('paraUid', '==', 'membro1'))),
  );
});

// Recado e o registro de uma coisa que aconteceu. Muda-lo depois seria
// reescrever o passado no sino de outra pessoa.
test('recado nao se edita — nem o dono da caixa muda o que ele diz', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/recados/ok1'), { deNome: 'Outro' }));
});

test('o dono limpa a propria caixa; os outros nao', async () => {
  const estranho = env.authenticatedContext('admin1').firestore();
  await assertFails(deleteDoc(doc(estranho, 'dados/app/recados/ok1')));

  const dono = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(deleteDoc(doc(dono, 'dados/app/recados/ok1')));
});

// ===========================================================================
// A ESCADA DE NIVEIS
// ===========================================================================
//
// Ela decide qual selo aparece ao lado de quem escreve — entao todo membro
// precisa LER. Quem edita a propria escada chega ao ultimo nivel mudando um
// numero, entao so o admin ESCREVE.

test('a escada de niveis: o admin escreve, o membro le', async () => {
  const admin = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(admin, 'dados/app/gamificacao/regra'), {
      metrica: 'perguntas',
      faixas: [{ minimo: 0, nome: 'Comecando', icone: 'usuario' }],
    }),
  );

  const membro = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(membro, 'dados/app/gamificacao/regra')));
});

test('quem sobe a propria regua nao precisa subir degrau nenhum', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/gamificacao/regra'), {
      metrica: 'perguntas',
      faixas: [{ minimo: 0, nome: 'Mestre', icone: 'estrela' }],
    }),
  );
});

// ===========================================================================
// A BLINDAGEM
// ===========================================================================

// ⚠️ O CADASTRO DE UMA PESSOA E SO DELA.
//
// Antes, qualquer membro ativo lia o cadastro de TODOS. Nao pela tela — pelo
// console, em dois comandos. E o cadastro tem e-mail: numa comunidade paga,
// isso e a lista de clientes exposta a qualquer um que entre, inclusive a um
// concorrente que pague uma mensalidade para leva-la embora. E some sem rastro,
// porque leitura nao aparece em lugar nenhum.
test('o membro le o PROPRIO cadastro, e nao o dos outros', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(db, 'usuarios/membro1')));
  await assertFails(getDoc(doc(db, 'usuarios/admin1')));
  await assertFails(getDocs(collection(db, 'usuarios')));
});

test('o admin continua lendo todo mundo — e dele que o suporte depende', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(getDoc(doc(db, 'usuarios/membro1')));
});

// ⚠️ O TIPO E PERMISSAO, e nao preferencia.
//
// `tipo: 'post'` e o que faz a tela desenhar o selo "Equipe" ao lado do texto.
// Sem a trava, qualquer membro publicava com o selo da equipe pelo console —
// falando pela comunidade com a autoridade de quem a administra.
test('membro NAO publica com o selo da equipe', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/posts/falso'), {
      titulo: 'Comunicado oficial',
      corpo: 'x',
      tipo: 'post',
      autorUid: 'membro1',
      autorNome: 'M',
      emMs: Date.now(),
      visivel: true,
      fixado: false,
      respostaAceitaId: '',
    }),
  );
});

test('a equipe publica com o selo dela — e essa e a diferenca', async () => {
  const db = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(db, 'dados/app/posts/oficial'), {
      titulo: 'Regras da casa',
      corpo: 'x',
      tipo: 'post',
      autorUid: 'admin1',
      autorNome: 'A',
      emMs: Date.now(),
      visivel: true,
      fixado: true,
      respostaAceitaId: '',
    }),
  );
});

// ⚠️ A DATA NAO PODE SER DO FUTURO.
//
// A lista ordena pelo mais recente. Com a data livre, bastava gravar `emMs` do
// ano 3000 pelo console para o proprio texto ficar no topo da comunidade PARA
// SEMPRE — um "fixado" que a moderacao nao pediu e que nenhum botao desfaz,
// porque a tela nao oferece editar data.
test('ninguem grava data do futuro para morar no topo da lista', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  const daquiA100Anos = Date.now() + 100 * 365 * 24 * 3600 * 1000;
  await assertFails(
    setDoc(doc(db, 'dados/app/posts/futuro'), {
      titulo: 'Eu no topo',
      corpo: 'x',
      tipo: 'pergunta',
      autorUid: 'membro1',
      autorNome: 'M',
      emMs: daquiA100Anos,
      visivel: true,
      fixado: false,
      respostaAceitaId: '',
    }),
  );
  await assertFails(
    setDoc(doc(db, 'dados/app/comentarios/futuro'), {
      postId: 'doMembro1',
      corpo: 'x',
      autorUid: 'membro1',
      autorNome: 'M',
      emMs: daquiA100Anos,
      visivel: true,
    }),
  );
});

// ===========================================================================
// A CONEXAO
// ===========================================================================

const perfil = (extra) => ({
  visivel: false,
  nome: 'Maria',
  fotoUrl: '',
  bio: 'faco trafego',
  instagram: '@maria',
  facebook: '',
  youtube: '',
  tiktok: '',
  outro: '',
  atualizadoEmMs: Date.now(),
  ...extra,
});

// ⚠️ SEM FOTO, NAO APARECE — e a trava e aqui, nao no botao.
//
// A premissa e do dono da comunidade: quem nao mostra quem e nao e gente com
// quem se faz negocio. Se ela vivesse so na tela, quem abrisse o console
// entraria na lista sem foto — e a regra anunciada em video para todo mundo
// valeria so para quem nao sabe mexer no navegador.
test('ninguem entra na Conexao sem foto, nem pelo console', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(doc(db, 'dados/app/perfis/membro1'), perfil({ visivel: true, fotoUrl: '' })),
  );
});

// Preencher aos poucos e ligar depois e o caminho normal de quem esta montando
// o perfil.
test('guardar os dados com o perfil DESLIGADO continua valendo sem foto', async () => {
  const db = env.authenticatedContext('inativo1').firestore();
  await assertFails(setDoc(doc(db, 'dados/app/perfis/inativo1'), perfil({})));
});

test('ninguem escreve no perfil de outra pessoa', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(
      doc(db, 'dados/app/perfis/admin1'),
      perfil({ visivel: true, fotoUrl: 'https://x/f.png' }),
    ),
  );
});

// Campo a mais aqui e um canal de mensagem que ninguem revisa, numa lista que
// a comunidade inteira le.
test('campo fora da lista derruba a gravacao inteira', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(
    setDoc(
      doc(db, 'dados/app/perfis/membro1'),
      perfil({ visivel: true, fotoUrl: 'https://x/f.png', telefone: '11999999999' }),
    ),
  );
});

// ===========================================================================
// AO VIVO
// ===========================================================================

test('a equipe marca a transmissao, o membro assiste', async () => {
  const admin = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(
    setDoc(doc(admin, 'dados/app/lives/l1'), {
      titulo: 'Live de quinta',
      videoUrl: 'https://youtu.be/abcdefghijk',
      quandoEmMs: Date.now(),
      visivel: true,
      descricao: '',
    }),
  );
  const membro = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(membro, 'dados/app/lives/l1')));
  await assertFails(
    setDoc(doc(membro, 'dados/app/lives/l2'), {
      titulo: 'Minha live',
      videoUrl: 'x',
      quandoEmMs: 1,
      visivel: true,
    }),
  );
});

// ===========================================================================
// A VARREDURA: "aluno so visualiza, e escreve so no forum"
// ===========================================================================
//
// Os testes acima cobrem cada porta uma a uma. Este cobre a LISTA INTEIRA de
// uma vez, e e o que responde a pergunta do dono sem depender de eu ter lembrado
// de escrever um teste para cada colecao nova.
//
// Colecao nova que ninguem trancar cai na regra generica — que e fechada para
// escrita — e este teste continua passando. O que ele garante e o outro lado:
// nenhuma das que EXISTEM esta aberta.

const SO_ADMIN_ESCREVE = [
  'cursos',
  'secoes',
  'aulas',
  'vitrine',
  'bonus',
  'produtos',
  'avisos',
  'gamificacao',
  'lives',
  // e uma que ninguem declarou, para provar que o padrao e fechado
  'colecao_que_ninguem_criou',
];

test('o aluno NAO escreve em nenhuma colecao de conteudo', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  for (const colecao of SO_ADMIN_ESCREVE) {
    await assertFails(
      setDoc(doc(db, `dados/app/${colecao}/tentativa`), { titulo: 'meu', visivel: true }),
    );
  }
});

test('o aluno LE tudo que e conteudo — ele entrou para estudar', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  for (const colecao of [
    'cursos',
    'secoes',
    'aulas',
    'vitrine',
    'bonus',
    'produtos',
    'avisos',
    'gamificacao',
    'lives',
  ]) {
    await assertSucceeds(getDoc(doc(db, `dados/app/${colecao}/qualquer`)));
  }
});

// Moderar e da equipe. Sem isto, "o aluno escreve no forum" viraria "o aluno
// manda no forum" — ele fixaria o proprio post no topo e esconderia o dos
// outros.
test('escrever no forum nao e moderar o forum', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertFails(updateDoc(doc(db, 'dados/app/posts/minhaPergunta'), { fixado: true }));
  await assertFails(updateDoc(doc(db, 'dados/app/posts/minhaPergunta'), { visivel: false }));
  // O post de OUTRA pessoa. `doMembro1` nao serve aqui: ele e do proprio
  // membro1, e reescrever o proprio texto e um direito, nao uma invasao — a
  // primeira versao deste teste usou ele e passou por engano.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'dados/app/posts/doVizinho'), {
      titulo: 'Pergunta do vizinho',
      corpo: 'original',
      tipo: 'pergunta',
      autorUid: 'vizinho9',
      autorNome: 'V',
      emMs: 1,
      visivel: true,
      fixado: false,
    });
  });
  await assertFails(updateDoc(doc(db, 'dados/app/posts/doVizinho'), { corpo: 'reescrevi o seu' }));
  await assertFails(deleteDoc(doc(db, 'dados/app/posts/doVizinho')));
});

// ===========================================================================
// A REGRA DA COMUNIDADE, nas palavras do dono
// ===========================================================================
//
//   "So admin pode escrever PUBLICACOES. Aluno pode fazer pergunta e apoiar
//    respondendo alguma pergunta."
//
// Os tres caminhos que essa frase abre — publicar, perguntar e apoiar — tem
// teste aqui. E o quarto, que a frase fecha por dentro: o aluno tambem nao pode
// VIRAR a propria pergunta em publicacao depois de ela estar no ar.

// ===========================================================================
// O PRAZO DO ACESSO — a trava que substitui o "robô que desativa"
// ===========================================================================
//
// Estes testes existem porque a alternativa (uma tarefa noturna que marca
// `ativo: false`) falha em silêncio: no dia em que ela não roda, quem venceu
// continua entrando e nada avisa. Aqui a conta é feita na hora da leitura,
// contra o relógio do servidor — não há tarefa para falhar.

const ONTEM = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
const DAQUI_A_UM_MES = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

test('quem passou da data NÃO entra mais, mesmo com ativo: true', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'usuarios/vencido1'), {
      papel: 'membro',
      ativo: true,
      nome: 'V',
      email: 'v@x.com',
      acessoAte: ONTEM(),
    });
  });
  const db = env.authenticatedContext('vencido1').firestore();
  // O acervo inteiro fecha junto: é a mesma função que governa tudo.
  await assertFails(getDoc(doc(db, 'dados/app/cursos/c1')));
  await assertFails(getDoc(doc(db, 'dados/app/aulas/a1')));
  await assertFails(getDocs(collection(db, 'dados/app/posts')));
});

test('quem ainda tem prazo entra normalmente', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'usuarios/noPrazo1'), {
      papel: 'membro',
      ativo: true,
      nome: 'P',
      email: 'p@x.com',
      acessoAte: DAQUI_A_UM_MES(),
    });
  });
  const db = env.authenticatedContext('noPrazo1').firestore();
  await assertSucceeds(getDoc(doc(db, 'dados/app/cursos/c1')));
});

// ⚠️ A LINHA QUE IMPEDE ESTA MUDANÇA DE EXPULSAR A COMUNIDADE INTEIRA.
// Ninguém tem `acessoAte` no dia em que isto sobe. Se campo ausente valesse
// como "prazo zero", todo membro perderia acesso de uma vez.
test('cadastro SEM data de acesso continua entrando (é todo mundo hoje)', async () => {
  const db = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(db, 'dados/app/cursos/c1')));
});

// Senão, um `acessoAte` gravado por engano no cadastro do dono tranca o dono
// para fora do próprio sistema — e ele precisa de um programador para voltar.
test('admin NUNCA vence, nem com data no passado', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'usuarios/adminVencido'), {
      papel: 'admin',
      ativo: true,
      nome: 'AV',
      email: 'av@x.com',
      acessoAte: ONTEM(),
    });
  });
  const db = env.authenticatedContext('adminVencido').firestore();
  await assertSucceeds(getDoc(doc(db, 'dados/app/cursos/c1')));
  await assertSucceeds(
    setDoc(doc(db, 'dados/app/exemplos/y'), { criadoPor: 'adminVencido', x: 1 }),
  );
});

// ===========================================================================
// AS OFERTAS — a página de venda é pública; o rascunho não é
// ===========================================================================

const OFERTA_OK = {
  nome: 'Acesso à Comunidade',
  titulo: 'Comunidade Ninja Digital',
  texto: 'Tudo liberado.',
  imagemUrl: 'https://x.com/i.png',
  precoMensal: 97,
  precoAnual: 970,
  mensalLigado: true,
  anualLigado: true,
  formas: ['PIX'],
  situacao: 'publicada',
  criadoPor: 'admin1',
  criadoEm: new Date(),
};

// É isto que faz "rascunho" valer alguma coisa: enquanto você escreve a página
// de um lote que ainda não abriu, ela não existe para o mundo.
test('rascunho e pausada NÃO vazam para quem não está logado', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await setDoc(doc(d, 'dados/app/ofertas/rascunho1'), { ...OFERTA_OK, situacao: 'rascunho' });
    await setDoc(doc(d, 'dados/app/ofertas/pausada1'), { ...OFERTA_OK, situacao: 'pausada' });
  });
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'dados/app/ofertas/rascunho1')));
  await assertFails(getDoc(doc(db, 'dados/app/ofertas/pausada1')));
});

test('o admin lê rascunho e lista tudo; o membro comum não escreve oferta', async () => {
  const adm = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(getDoc(doc(adm, 'dados/app/ofertas/rascunho1')));
  await assertSucceeds(getDocs(collection(adm, 'dados/app/ofertas')));
  await assertSucceeds(setDoc(doc(adm, 'dados/app/ofertas/nova'), OFERTA_OK));

  const mem = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(mem, 'dados/app/ofertas/minha'), OFERTA_OK));
});

// ===========================================================================
// OS CUPONS — a coleção que a página pública NÃO pode ler
// ===========================================================================

const CUPOM_OK = {
  tipo: 'percentual',
  valor: 10,
  validoAte: null,
  limiteUsos: 100,
  ofertas: [],
  ativo: true,
};

test('o admin cria e lê cupons', async () => {
  const adm = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(setDoc(doc(adm, 'dados/app/cupons/TURMA10'), CUPOM_OK));
  await assertSucceeds(getDoc(doc(adm, 'dados/app/cupons/TURMA10')));
  await assertSucceeds(getDocs(collection(adm, 'dados/app/cupons')));
});

// ===========================================================================
// OS PARCEIROS DA CONEXÃO
// ===========================================================================
//
// ⚠️ POR QUE ELES NÃO SÃO PERFIS.
//
// `/perfis` amarra cada documento ao `uid` do dono — é o que impede um membro
// de reescrever o perfil de outro. O parceiro NÃO TEM uid: ele não comprou
// acesso e não entra no sistema. Enfiá-lo lá exigiria inventar um dono para um
// documento sem dono, e afrouxar exatamente essa trava.

const PARCEIRO_OK = {
  nome: 'Estúdio Preto',
  oQueFaz: 'Criativos para tráfego pago',
  fotoUrl: 'https://x.com/logo.png',
  site: 'https://estudio.com',
  whatsapp: '11999998888',
  ordem: 10,
  visivel: true,
};

test('o admin cadastra parceiro; o membro lê e não escreve', async () => {
  const adm = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(setDoc(doc(adm, 'dados/app/parceiros/p1'), PARCEIRO_OK));

  const mem = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(mem, 'dados/app/parceiros/p1')));
  await assertSucceeds(getDocs(collection(mem, 'dados/app/parceiros')));
  await assertFails(setDoc(doc(mem, 'dados/app/parceiros/p2'), PARCEIRO_OK));
});

// Parceiro é uma indicação DA CASA. Se o membro pudesse cadastrar, a Conexão
// viraria mural de anúncio — e o selo "Parceiro" deixaria de valer alguma coisa.
test('quem não está na equipe não lê a lista de parceiros', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'dados/app/parceiros/p1')));
});

// ===========================================================================
// AS REGRAS DA CASA
// ===========================================================================

const REGRAS_OK = { titulo: 'Regras da casa', texto: 'Uma regra por linha.', ativo: true };

test('o admin escreve as regras; todo membro lê', async () => {
  const adm = env.authenticatedContext('admin1').firestore();
  await assertSucceeds(setDoc(doc(adm, 'dados/app/comunidade/regras'), REGRAS_OK));

  const mem = env.authenticatedContext('membro1').firestore();
  await assertSucceeds(getDoc(doc(mem, 'dados/app/comunidade/regras')));
  await assertFails(setDoc(doc(mem, 'dados/app/comunidade/regras'), REGRAS_OK));
});

// As regras são a lei da casa. Se um membro pudesse reescrevê-las, ele mudaria
// a linha do que é permitido — e a moderação passaria a se apoiar num texto que
// o próprio moderado editou.
test('quem não está na equipe não lê as regras', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'dados/app/comunidade/regras')));
});

// ===========================================================================
// O PAPEL DE GESTOR — a trava que o menu escondido NÃO é
// ===========================================================================
//
// Esconder a aba é conveniência. O que impede o gestor de tocar no dinheiro é
// esta lista, e é ela que precisa ser provada — porque o console do navegador
// não tem barra lateral.

const oGestor = () => env.authenticatedContext('gestor1').firestore();

test('o gestor existe e é da equipe', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'usuarios/gestor1'), {
      papel: 'gestor',
      ativo: true,
      nome: 'G',
      email: 'g@x.com',
    });
  });
  await assertSucceeds(getDoc(doc(oGestor(), 'dados/app/cursos/c1')));
});

// ---------------------------------------------------------------------------
// O QUE ELE PODE — e é o trabalho para o qual ele foi contratado
// ---------------------------------------------------------------------------

test('o gestor publica conteúdo: cursos, aulas, bônus, avisos, lives', async () => {
  const g = oGestor();
  await assertSucceeds(
    setDoc(doc(g, 'dados/app/cursos/gc1'), { titulo: 'Novo', visivel: true, ordem: 1 }),
  );
  await assertSucceeds(
    setDoc(doc(g, 'dados/app/aulas/ga1'), {
      cursoId: 'gc1',
      secaoId: 's1',
      titulo: 'Aula',
      visivel: true,
      ordem: 1,
    }),
  );
  await assertSucceeds(
    setDoc(doc(g, 'dados/app/bonus/gb1'), { titulo: 'B', visivel: true, ordem: 1 }),
  );
  await assertSucceeds(setDoc(doc(g, 'dados/app/avisos/gv1'), { titulo: 'A', emMs: Date.now() }));
  await assertSucceeds(setDoc(doc(g, 'dados/app/lives/gl1'), { titulo: 'L', emMs: Date.now() }));
});

test('o gestor modera a comunidade e escreve as regras da casa', async () => {
  const g = oGestor();
  await assertSucceeds(
    setDoc(doc(g, 'dados/app/comunidade/regras'), {
      titulo: 'Regras',
      texto: 'Uma regra.',
      ativo: true,
    }),
  );
  // Esconder o post de outra pessoa é exatamente o que se contrata alguém para
  // fazer — e era `ehAdmin()` antes deste papel existir.
  await assertSucceeds(updateDoc(doc(g, 'dados/app/posts/doMembro1'), { visivel: false }));
});

test('o gestor cadastra parceiro e mexe na escada de níveis', async () => {
  const g = oGestor();
  await assertSucceeds(
    setDoc(doc(g, 'dados/app/parceiros/gp1'), {
      nome: 'Estúdio',
      oQueFaz: 'Design',
      fotoUrl: 'https://x/l.png',
      site: '',
      whatsapp: '',
      ordem: 10,
      visivel: true,
    }),
  );
  await assertSucceeds(setDoc(doc(g, 'dados/app/gamificacao/regra'), { metrica: 'pessoas' }));
});

// ---------------------------------------------------------------------------
// O QUE ELE NÃO PODE — a razão de o papel existir
// ---------------------------------------------------------------------------

test('o gestor NÃO muda a identidade nem os contatos da tela de entrada', async () => {
  const g = oGestor();
  await assertFails(setDoc(doc(g, 'publico/identidade'), { corDestaque: '#000000' }));
  await assertFails(setDoc(doc(g, 'publico/suporte'), { whatsapp: '11999998888' }));
});

// Quem promove alguém dá as chaves de tudo. Se o gestor pudesse mexer aqui, ele
// se promoveria a administrador em dois cliques no console.
test('o gestor NÃO cria, apaga nem promove ninguém', async () => {
  const g = oGestor();
  await assertFails(
    setDoc(doc(g, 'usuarios/novo1'), {
      papel: 'admin',
      ativo: true,
      nome: 'N',
      email: 'n@x.com',
    }),
  );
  await assertFails(updateDoc(doc(g, 'usuarios/membro1'), { papel: 'admin' }));
  // Nem o próprio cadastro: mudar o nome é o único caminho, como todo membro.
  await assertFails(updateDoc(doc(g, 'usuarios/gestor1'), { papel: 'admin' }));
  await assertSucceeds(updateDoc(doc(g, 'usuarios/gestor1'), { nome: 'Gestor Novo' }));
});

// O aluno continua sendo aluno: o papel novo não afrouxou nada para ele.
test('o membro comum não ganhou nada com o papel novo', async () => {
  const m = env.authenticatedContext('membro1').firestore();
  await assertFails(setDoc(doc(m, 'dados/app/cursos/pirata'), { titulo: 'x' }));
  await assertFails(
    setDoc(doc(m, 'dados/app/comunidade/regras'), { titulo: 'x', texto: 'y', ativo: true }),
  );
  await assertFails(
    setDoc(doc(m, 'dados/app/parceiros/pirata'), {
      nome: 'x',
      oQueFaz: '',
      fotoUrl: 'https://x/a.png',
      site: '',
      whatsapp: '',
      ordem: 1,
      visivel: true,
    }),
  );
});
