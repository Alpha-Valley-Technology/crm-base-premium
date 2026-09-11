import { test, before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { ref, uploadString, uploadBytes, getBytes } from 'firebase/storage';

// A regra le o carimbo `equipe` do proprio token, entao o teste simula
// exatamente o que o servidor poe la (ver functions/_lib/claims.js).
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-comunidade-ninja',
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
const daEquipe = (uid) =>
  env.authenticatedContext(uid, { equipe: true, papel: 'membro' }).storage();
after(async () => {
  await env.cleanup();
});

const imagem = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const comoPng = { contentType: 'image/png' };

test('anônimo não envia arquivo', async () => {
  const s = env.unauthenticatedContext().storage();
  await assertFails(uploadBytes(ref(s, 'conteudo/a.png'), imagem(), comoPng));
});

// "Estar autenticado" não quer dizer nada aqui: entrar com o Google cria a
// conta de login MESMO com o acesso ao sistema negado. Sem esta trava, qualquer
// pessoa do planeta com uma conta Google usava o nosso Storage.
test('conta Google que não está na equipe NÃO envia nem lê', async () => {
  const s = env.authenticatedContext('estranho').storage(); // sem o carimbo
  await assertFails(uploadBytes(ref(s, 'conteudo/b.png'), imagem(), comoPng));
  await assertFails(getBytes(ref(s, 'conteudo/b.png')));
});

test('quem foi desativado perde o Storage junto', async () => {
  // Desativar tira o carimbo do token (claims.js) alem de revogar a sessao.
  const s = env.authenticatedContext('inativo1', { equipe: false }).storage();
  await assertFails(uploadBytes(ref(s, 'conteudo/c.png'), imagem(), comoPng));
});

const comoAdmin = (uid) =>
  env.authenticatedContext(uid, { equipe: true, papel: 'admin' }).storage();

// ⚠️ O MEMBRO LÊ O CATALOGO, E NAO ESCREVE NELE. Isto foi um conserto.
//
// Antes bastava estar na equipe — ou seja, qualquer aluno. Ele nunca ve um
// botao que envie para ca: quem envia e o editor de conteudo, que so o admin
// abre. Mas as regras nao protegem botoes, protegem caminhos, e pelo console
// qualquer membro trocava a capa de todos os cursos — ou apagava o catalogo
// visual inteiro, arquivo por arquivo, sem nada quebrar na tela.
test('membro ativo LE o catalogo, e NAO escreve nem apaga', async () => {
  const dono = comoAdmin('admin1');
  await assertSucceeds(uploadBytes(ref(dono, 'conteudo/ok.png'), imagem(), comoPng));

  const aluno = daEquipe('membro1');
  await assertSucceeds(getBytes(ref(aluno, 'conteudo/ok.png')));
  await assertFails(uploadBytes(ref(aluno, 'conteudo/ok.png'), imagem(), comoPng));
  await assertFails(uploadBytes(ref(aluno, 'conteudo/nova.png'), imagem(), comoPng));
});

// ---- A foto de perfil: a UNICA pasta onde o membro escreve ----
//
// Sem o recorte por uid, "membro pode enviar foto" viraria "membro pode trocar
// a foto de qualquer pessoa" — e a Conexao inteira depende de a foto ser de
// quem ela diz ser.
test('cada pessoa escreve na PROPRIA pasta de perfil, e so nela', async () => {
  const s = daEquipe('membro1');
  await assertSucceeds(uploadBytes(ref(s, 'perfis/membro1/eu.png'), imagem(), comoPng));
  await assertFails(uploadBytes(ref(s, 'perfis/outro9/eu.png'), imagem(), comoPng));
});

test('todo membro LE as fotos — a lista da Conexao mostra todas', async () => {
  const outro = daEquipe('membro2');
  await assertSucceeds(getBytes(ref(outro, 'perfis/membro1/eu.png')));
});

test('a pasta de perfil continua sendo so imagem', async () => {
  const s = daEquipe('membro1');
  await assertFails(
    uploadString(ref(s, 'perfis/membro1/x.txt'), 'oi', 'raw', { contentType: 'text/plain' }),
  );
});

// Arquivo grande aqui e celular mandando o original de 12 MP — que custa banda
// de quem abre a lista, nao de quem enviou.
test('foto de perfil tem teto menor que o do catalogo', async () => {
  const s = daEquipe('membro1');
  const gorda = new Uint8Array(4 * 1024 * 1024);
  await assertFails(uploadBytes(ref(s, 'perfis/membro1/gorda.png'), gorda, comoPng));
});

test('quem nao esta na equipe nao chega nas fotos', async () => {
  const estranho = env.authenticatedContext('estranho').storage();
  await assertFails(getBytes(ref(estranho, 'perfis/membro1/eu.png')));
  await assertFails(uploadBytes(ref(estranho, 'perfis/estranho/x.png'), imagem(), comoPng));
});

// Sem isto o Storage vira hospedagem grátis de qualquer arquivo — inclusive
// executável — paga pela conta do dono.
test('membro ativo NÃO envia o que não é imagem', async () => {
  const s = daEquipe('membro1');
  await assertFails(
    uploadString(ref(s, 'conteudo/script.js'), 'alert(1)', 'raw', {
      contentType: 'application/javascript',
    }),
  );
  await assertFails(
    uploadString(ref(s, 'conteudo/nota.txt'), 'oi', 'raw', { contentType: 'text/plain' }),
  );
});

// ===========================================================================
// A IDENTIDADE VISUAL: as unicas imagens publicas
//
// A tela de entrada mostra logo e fundo ANTES de qualquer login. Sob a regra
// geral elas voltariam 403 para o visitante — a tela de login apareceria
// quebrada para exatamente quem ela existe para receber.
// ===========================================================================

test('QUEM NAO ESTA LOGADO LE a identidade — e disso depende a tela de entrada', async () => {
  await assertSucceeds(
    uploadBytes(ref(comoAdmin('a1'), 'publico/identidade/fundo.png'), imagem(), comoPng),
  );
  const visitante = env.unauthenticatedContext().storage();
  await assertSucceeds(getBytes(ref(visitante, 'publico/identidade/fundo.png')));
});

test('so ADMIN escreve na identidade — nao e trabalho de aluno', async () => {
  await assertFails(
    uploadBytes(ref(daEquipe('membro1'), 'publico/identidade/logo.png'), imagem(), comoPng),
  );
  await assertSucceeds(
    uploadBytes(ref(comoAdmin('a1'), 'publico/identidade/logo.png'), imagem(), comoPng),
  );
});

test('a pasta publica NAO vira hospedagem: continua so imagem', async () => {
  await assertFails(
    uploadString(ref(comoAdmin('a1'), 'publico/identidade/script.js'), 'alert(1)', 'raw', {
      contentType: 'application/javascript',
    }),
  );
});

test('anonimo nao ESCREVE na pasta publica, so le', async () => {
  const visitante = env.unauthenticatedContext().storage();
  await assertFails(
    uploadBytes(ref(visitante, 'publico/identidade/invasao.png'), imagem(), comoPng),
  );
});

// O resto do Storage continua fechado. Se a regra publica vazasse para fora da
// pasta, a capa de aula viraria arquivo aberto na internet.
// Quem envia a capa e o ADMIN — o membro perdeu a escrita no catalogo quando a
// brecha foi fechada. O que este teste guarda continua sendo o outro lado: o
// arquivo existe, e mesmo assim o visitante nao chega nele.
test('FORA da pasta publica, o visitante continua sem ler nada', async () => {
  await assertSucceeds(
    uploadBytes(ref(comoAdmin('a1'), 'conteudo/cursos/c1/capa.png'), imagem(), comoPng),
  );
  const visitante = env.unauthenticatedContext().storage();
  await assertFails(getBytes(ref(visitante, 'conteudo/cursos/c1/capa.png')));
});

// PASTA SEM BLOCO DECLARADO E RECUSADA. E o que substitui o curinga que existia
// antes: em vez de liberar tudo que ninguem trancou, nega tudo que ninguem
// abriu. Pasta nova exige bloco novo, e esquecer trava o envio na hora.
test('pasta que ninguem declarou e recusada, ate para admin', async () => {
  await assertFails(uploadBytes(ref(comoAdmin('a1'), 'inventada/x.png'), imagem(), comoPng));
  await assertFails(uploadBytes(ref(daEquipe('membro1'), 'imgs/x.png'), imagem(), comoPng));
});

// ===========================================================================
// O BACKUP DAS CONTAS: o arquivo que NINGUEM le pelo navegador
// ===========================================================================
//
// `backup-contas/` guarda o e-mail de todo mundo que tem conta. Ele nao tem
// senha nenhuma — mas uma lista de e-mails de comunidade paga e exatamente o
// que um concorrente pagaria uma mensalidade para levar.
//
// Nao existe regra declarando esse prefixo, e e isso que o protege: o padrao do
// Firebase e recusar o que ninguem abriu. So o SERVIDOR escreve e le ali, e o
// servidor passa por cima das regras.
//
// Este teste existe para o dia em que alguem acrescentar um curinga "so para
// facilitar" — e abrir a lista inteira sem perceber.

test('o backup de contas nao e lido nem pelo admin', async () => {
  const dono = comoAdmin('a1');
  await assertFails(getBytes(ref(dono, 'backup-contas/2026-08-24.json')));

  const aluno = daEquipe('membro1');
  await assertFails(getBytes(ref(aluno, 'backup-contas/2026-08-24.json')));

  const estranho = env.unauthenticatedContext().storage();
  await assertFails(getBytes(ref(estranho, 'backup-contas/2026-08-24.json')));
});

test('ninguem escreve na pasta de backup pelo navegador', async () => {
  await assertFails(
    uploadString(ref(comoAdmin('a1'), 'backup-contas/falso.json'), '{}', 'raw', {
      contentType: 'application/json',
    }),
  );
});

// ===========================================================================
// OS MATERIAIS DA AULA: a única pasta que aceita PDF
// ===========================================================================

const pdf = () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const comoPdf = { contentType: 'application/pdf' };

test('admin envia PDF em materiais, e a equipe inteira lê', async () => {
  await assertSucceeds(
    uploadBytes(ref(comoAdmin('admin1'), 'materiais/aulas/a1/x.pdf'), pdf(), comoPdf),
  );
  await assertSucceeds(getBytes(ref(daEquipe('membro1'), 'materiais/aulas/a1/x.pdf')));
});

// ⚠️ A LISTA CURTA É A TRAVA. Sem limite de tipo, o Storage vira hospedagem
// grátis de qualquer arquivo — inclusive executável — paga pela conta do dono.
//
// Office e ZIP ficaram de fora de propósito: carregam macro e executável, e o
// aluno abre confiando que veio da comunidade. Para eles existe o link da pasta
// do Drive, que é do cliente e não da nossa conta.
test('em materiais NÃO sobe executável, ZIP, Office nem vídeo', async () => {
  const s = comoAdmin('admin1');
  const bytes = new Uint8Array([1, 2, 3, 4]);
  for (const tipo of [
    'application/x-msdownload',
    'application/zip',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'image/png',
  ]) {
    await assertFails(uploadBytes(ref(s, `materiais/aulas/a1/y`), bytes, { contentType: tipo }));
  }
});

// 25 MB porque apostila em PDF passa dos 10 MB das imagens. O que passa disso
// quase sempre é vídeo disfarçado — e vídeo tem lugar próprio, que é o player.
test('PDF acima de 25 MB é recusado', async () => {
  const grande = new Uint8Array(26 * 1024 * 1024);
  await assertFails(
    uploadBytes(ref(comoAdmin('admin1'), 'materiais/aulas/a1/g.pdf'), grande, comoPdf),
  );
});

// As regras protegem CAMINHOS, e não botões: o membro nunca vê o editor, mas
// pelo console trocaria a apostila de todas as aulas.
test('membro comum lê o material, e não escreve nem apaga', async () => {
  const s = daEquipe('membro9');
  await assertFails(uploadBytes(ref(s, 'materiais/aulas/a1/z.pdf'), pdf(), comoPdf));
});

test('quem não está na equipe não lê material de aula', async () => {
  const s = env.authenticatedContext('estranho2').storage();
  await assertFails(getBytes(ref(s, 'materiais/aulas/a1/x.pdf')));
  const anon = env.unauthenticatedContext().storage();
  await assertFails(getBytes(ref(anon, 'materiais/aulas/a1/x.pdf')));
});

// ⚠️ A PASTA DE IMAGEM CONTINUA SÓ DE IMAGEM. O dia em que alguém afrouxar
// `arquivoAceitavel` para caber um PDF, ela passa a aceitar PDF em TODA capa de
// curso, módulo e aula — e a separação por finalidade deixa de existir.
test('PDF não entra na pasta das capas', async () => {
  await assertFails(
    uploadBytes(ref(comoAdmin('admin1'), 'conteudo/aulas/a1/x.pdf'), pdf(), comoPdf),
  );
});

// ===========================================================================
// O GESTOR NO STORAGE
// ===========================================================================
//
// ⚠️ SEM ISTO, ELE PUBLICA A AULA E NÃO CONSEGUE SUBIR A CAPA — a meia-permissão
// que gera chamado de suporte no primeiro dia: o texto salva, a imagem volta
// 403, e a pessoa não tem como adivinhar que o problema é o papel dela.
const comoGestor = (uid) =>
  env.authenticatedContext(uid, { equipe: true, papel: 'gestor' }).storage();

test('o gestor sobe capa de curso e material de aula', async () => {
  await assertSucceeds(
    uploadBytes(ref(comoGestor('gestor1'), 'conteudo/aulas/a1/capa.png'), imagem(), comoPng),
  );
  await assertSucceeds(
    uploadBytes(
      ref(comoGestor('gestor1'), 'materiais/aulas/a1/apostila.pdf'),
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      { contentType: 'application/pdf' },
    ),
  );
});

// A identidade do site é do dono, não de quem publica aula: trocar o logo muda
// o produto inteiro, para todos, de uma vez.
test('o gestor NÃO troca a identidade do site', async () => {
  await assertFails(uploadBytes(ref(comoGestor('gestor1'), 'publico/logo.png'), imagem(), comoPng));
});

// O papel vem do TOKEN, e o token não conhece papel inventado: `claims.js`
// derruba para `membro` qualquer coisa fora da lista. Papel estragado no banco
// não pode virar permissão.
test('papel inventado no token não vale como gestor', async () => {
  const s = env.authenticatedContext('x1', { equipe: true, papel: 'supervisor' }).storage();
  await assertFails(uploadBytes(ref(s, 'conteudo/aulas/a1/x.png'), imagem(), comoPng));
});
