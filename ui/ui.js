// Montadores de UI reutilizáveis. Só manipulam DOM — funcionam em jsdom e no navegador.
export const ui = {
  limpar(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  },

  botao(texto, aoClicar, variante) {
    const b = document.createElement('button');
    b.className = 'btn' + (variante === 'secundario' ? ' btn--secundario' : '');
    b.textContent = texto;
    if (aoClicar) b.addEventListener('click', aoClicar);
    return b;
  },

  campo(rotulo, tipo = 'text') {
    const wrapper = document.createElement('div');
    wrapper.className = 'campo';
    const label = document.createElement('label');
    label.textContent = rotulo;
    const input = document.createElement('input');
    input.className = 'input';
    input.type = tipo;
    wrapper.append(label, input);
    return { wrapper, input };
  },

  tabela(colunas, linhas) {
    const t = document.createElement('table');
    t.className = 'tabela';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const c of colunas) {
      const th = document.createElement('th');
      th.textContent = c;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    const tbody = document.createElement('tbody');
    for (const linha of linhas) {
      const tr = document.createElement('tr');
      for (const c of colunas) {
        const td = document.createElement('td');
        td.textContent = linha[c] ?? '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    t.append(thead, tbody);
    return t;
  },

  // `rotuloBotao` existe porque "Enviar" quase nunca é o que a ação faz —
  // cada tela diz o próprio verbo ("Adicionar", "Salvar", "Convidar").
  form(campos, aoEnviar, rotuloBotao = 'Enviar') {
    // campos: [{ nome, rotulo, tipo }]
    const f = document.createElement('form');
    const refs = {};
    for (const c of campos) {
      const { wrapper, input } = ui.campo(c.rotulo, c.tipo || 'text');
      refs[c.nome] = input;
      f.appendChild(wrapper);
    }
    f.appendChild(ui.botao(rotuloBotao, null));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = {};
      for (const k in refs) dados[k] = refs[k].value;
      aoEnviar(dados);
    });
    return f;
  },

  modal(titulo, conteudo) {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    const caixa = document.createElement('div');
    caixa.className = 'modal';
    const h = document.createElement('h3');
    h.textContent = titulo;
    caixa.append(h, conteudo);
    fundo.appendChild(caixa);
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo) fundo.remove();
    });
    document.body.appendChild(fundo);
    return { fechar: () => fundo.remove(), elemento: fundo };
  },

  // Pergunta antes de fazer o que não dá pra desfazer. Devolve true/false.
  // Fechar pelo fundo ou pelo Cancelar conta como "não".
  confirmar(titulo, mensagem, rotuloConfirmar = 'Confirmar') {
    return new Promise((resolver) => {
      const caixa = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = mensagem;
      p.style.cssText = 'color:var(--cor-texto-fraco);line-height:1.55;margin:6px 0 18px';

      const acoes = document.createElement('div');
      acoes.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
      const cancelar = ui.botao(
        'Cancelar',
        () => {
          modal.fechar();
          resolver(false);
        },
        'secundario',
      );
      const confirmar = ui.botao(rotuloConfirmar, () => {
        modal.fechar();
        resolver(true);
      });
      confirmar.classList.add('btn--perigo');
      acoes.append(cancelar, confirmar);

      caixa.append(p, acoes);
      const modal = ui.modal(titulo, caixa);
      modal.elemento.addEventListener('click', (e) => {
        if (e.target === modal.elemento) resolver(false);
      });
    });
  },

  aviso(tipo, mensagem) {
    const a = document.createElement('div');
    a.className = 'aviso aviso--' + tipo;
    a.textContent = mensagem;
    document.body.appendChild(a);
    setTimeout(() => a.remove(), 3500);
    return a;
  },
};
