// O campo de imagem: enviar um arquivo OU colar um link.
//
// POR QUE OS DOIS, e não só o link.
//
// "Cole uma URL https da imagem" é um beco para quem não é programador: a
// pessoa tem o arquivo no computador e não tem onde hospedar. Ela ia parar num
// site aleatório de imagens, colar um link que expira em três meses, e a capa
// sumiria sozinha do curso — sem ninguém entender por quê.
//
// O link continua existindo porque quem JÁ tem a imagem hospedada (num site,
// numa CDN) não deve ser obrigado a subir uma segunda cópia.
//
// A REGRA DE DESEMPATE É O ARQUIVO. Se a pessoa escolheu um arquivo, é ele que
// vale, mesmo com o campo de link preenchido — escolher um arquivo é a ação
// mais recente e mais deliberada das duas.

const TETO_BYTES = 10 * 1024 * 1024; // o mesmo que storage.rules aceita
const TIPOS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

// Conferência do arquivo ANTES de subir. A regra do Storage recusaria de
// qualquer jeito, mas com um erro cru em inglês, depois de gastar a subida
// inteira de um arquivo de 40 MB no 4G de quem está com pressa.
// O TETO É DE QUEM CHAMA, porque ele muda por pasta: o catálogo aceita 10 MB,
// a foto de perfil aceita 3. Se ficasse cravado aqui, o campo diria "pode" e o
// Storage recusaria depois da subida inteira, com erro cru em inglês.
export function conferirArquivo(arquivo, tetoBytes = TETO_BYTES) {
  if (!arquivo) return null;
  if (!TIPOS.includes(arquivo.type)) {
    return 'Só imagem (PNG, JPG, WEBP ou GIF).';
  }
  if (arquivo.size > tetoBytes) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1);
    const limite = Math.round(tetoBytes / 1024 / 1024);
    return `Imagem grande demais (${mb} MB). O limite é ${limite} MB.`;
  }
  return null;
}

export function conferirLink(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  if (!u.startsWith('https://')) return 'O link da imagem precisa começar com https://';
  return null;
}

// O nome do arquivo entra no endereço público. Acento, espaço e caractere solto
// viram lixo escapado, e um nome inventado por alguém pode carregar coisa que
// não deveria ir para uma URL.
export function nomeLimpo(nome) {
  return String(nome || 'imagem')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
}

/**
 * @param {object} opcoes
 * @param {string} opcoes.rotulo     o que se pede
 * @param {string} opcoes.dica       a medida recomendada, em português de gente
 * @param {string} opcoes.urlAtual   o que já está gravado
 * @returns {{ wrapper: HTMLElement, resolver: Function }}
 */
export function campoImagem({ rotulo, dica, urlAtual, tetoBytes = TETO_BYTES }) {
  const wrapper = document.createElement('fieldset');
  wrapper.className = 'campo-imagem';

  const legenda = document.createElement('legend');
  legenda.textContent = rotulo;
  wrapper.appendChild(legenda);

  if (dica) {
    const p = document.createElement('p');
    p.className = 'campo-imagem-dica';
    p.textContent = dica;
    wrapper.appendChild(p);
  }

  const previa = document.createElement('img');
  previa.className = 'campo-imagem-previa';
  previa.alt = '';
  previa.hidden = !urlAtual;
  if (urlAtual) previa.src = urlAtual;
  wrapper.appendChild(previa);

  const linhaArquivo = document.createElement('label');
  linhaArquivo.className = 'campo-imagem-linha';
  linhaArquivo.append(document.createTextNode('Enviar do computador'));
  const arquivo = document.createElement('input');
  arquivo.type = 'file';
  arquivo.accept = 'image/png,image/jpeg,image/webp,image/gif';
  linhaArquivo.appendChild(arquivo);

  const linhaLink = document.createElement('label');
  linhaLink.className = 'campo-imagem-linha';
  linhaLink.append(document.createTextNode('ou colar um link (https)'));
  const link = document.createElement('input');
  link.type = 'url';
  link.className = 'input';
  link.placeholder = 'https://…';
  link.value = urlAtual || '';
  linhaLink.appendChild(link);

  // Prévia na hora, do arquivo escolhido. Sem isso a pessoa só descobre que
  // pegou a imagem errada depois de salvar e recarregar.
  arquivo.addEventListener('change', () => {
    const f = arquivo.files[0];
    if (!f) return;
    const erro = conferirArquivo(f, tetoBytes);
    if (erro) {
      arquivo.value = '';
      throw new Error(erro);
    }
    previa.src = URL.createObjectURL(f);
    previa.hidden = false;
  });

  const limpar = document.createElement('button');
  limpar.type = 'button';
  limpar.className = 'btn btn--secundario btn--mini';
  limpar.textContent = 'Tirar imagem';
  limpar.onclick = () => {
    arquivo.value = '';
    link.value = '';
    previa.hidden = true;
    previa.removeAttribute('src');
  };

  wrapper.append(linhaArquivo, linhaLink, limpar);

  // Devolve o endereço final: sobe o arquivo, ou usa o link, ou vazio.
  // LANÇA com mensagem de gente — quem chama mostra no aviso e não salva.
  async function resolver(servicos, prefixo) {
    const f = arquivo.files[0];
    if (f) {
      const erro = conferirArquivo(f, tetoBytes);
      if (erro) throw new Error(erro);
      // A PASTA VEM INTEIRA DE QUEM CHAMA, e não montada aqui.
      //
      // Este arquivo cravava `conteudo/` na frente. Quando a identidade passou a
      // usar o mesmo campo, o caminho virou `conteudo/publico/identidade/...` —
      // que não é a pasta pública, e o envio voltou 403. A pasta é decisão de
      // quem usa o campo, porque é ela que decide quem pode ler o arquivo.
      const caminho = `${prefixo}/${Date.now()}-${nomeLimpo(f.name)}`;
      return servicos.storage.enviar(caminho, f);
    }
    const erroLink = conferirLink(link.value);
    if (erroLink) throw new Error(erroLink);
    return link.value.trim();
  }

  return { wrapper, resolver };
}
