# Retomar daqui — matriz crm-base-premium

Ponto exato em que a matriz parou, para não precisar reler o projeto inteiro.

⚠️ **Este arquivo é da MATRIZ.** Ao clonar para um produto novo, apague o
conteúdo abaixo e comece a escrever o do seu produto — o "onde paramos" de outro
projeto é o pior tipo de documentação: parece atual e não é.

---

## Leia junto

- **`CLAUDE.md`, Bloco 00** — como se opera aqui. É a primeira coisa.
- **`docs/PLAYBOOK-DA-CARCACA.md`** — as armadilhas que custaram tempo.
- **`docs/decisoes.md`** — o que foi decidido fora do padrão, e por quê.

---

## Onde paramos — 08/09/2026

A matriz está pronta e auditada. Nasceu de uma área de membros premium que foi
ao ar e vendeu, com o produto removido em etapas — cada uma num commit, com o
motivo escrito.

**Estado:** carcaça limpa, 416 testes verdes, desarmada da produção de origem,
no GitHub privado (`sitacioossaka-tech/crm-base-premium`).

⚠️ **A etiqueta a usar é `v1.0.1`, nunca a `v1.0.0`.** A primeira foi publicada
com a seção "O visual do site" vazia na Identidade — o defeito e a regra que o
evita estão no playbook, 1.17. Etiqueta não se move: a v1.0.0 continua onde
está, com o aviso no README.

### A árvore

```
(vazio — o produto entra aqui)
─────────────────────────────────
Meu Perfil · Suporte · Administração
                       └─ Identidade · Avisos · Equipe · Pagamento
```

### O ambiente local agora sobe em container — 08/09/2026

`npm run docker:subir` põe a comunidade inteira de pé na máquina: banco, login,
arquivos, funções e o site, em http://localhost:5000. Guia completo em
`docs/AMBIENTE-LOCAL-DOCKER.md`.

⚠️ **Ele não altera nenhuma configuração do Firebase** — `firebase.json`,
`.firebaserc` e `base/firebase.js` são de homologação e produção, e o container
apenas os LÊ. Se um dia parecer necessário editar um deles para o local subir,
**é sinal de que algo quebrou**: leia a Exceção 3 em `docs/decisoes.md` antes.

As quatro armadilhas que isso custou estão no playbook, Parte 7. Uma delas —
o banco não ser guardado ao desligar — **não dá erro nenhum**.

### Existe uma instância de demonstração no ar

**https://crm-base-premium-demo.web.app** — projeto Firebase
`crm-base-premium-demo`, pasta `../crm-base-premium-demo`, GitHub privado
`sitacioossaka-tech/crm-base-premium-demo`.

⚠️ **Ela é um PRODUTO feito da matriz, não a matriz.** Serve para ver a carcaça
funcionando e para provar que o passo a passo do README fecha. A configuração dela (`base/firebase.js`, `.firebaserc`, `config/marca.js`) fica
FORA de qualquer sincronização com a matriz — se entrasse, todo produto futuro
nasceria apontando para a demonstração.

Ao sincronizar a demo com a matriz, lembre que **cópia não apaga**: use
`git ls-files` da matriz como lista do que deve existir (playbook 1.14).

### A auditoria de segurança, feita por ataque

Em 08/09/2026 a instalação publicada foi atacada com a chave web pública, sem
login e como membro comum. Toda leitura e escrita fora do permitido devolveu
`403`; todas as Functions devolveram `PERMISSION_DENIED`. **Não há buraco de
acesso.** O método está no playbook, 5.3 — e ele vale a cada entrega.

A auditoria achou UMA exposição real, agora documentada em `decisoes.md`: a
janela do primeiro acesso. Quem entra primeiro num banco vazio vira admin, e a
janela existe do deploy até o seu login. **A defesa é entrar você, primeiro.**

### O que está VAZIO de propósito

| O quê                     | Por quê                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base/firebase.js`        | Nasce sem projeto e estoura na primeira tela. A carcaça anterior levou as chaves de um produto real junto, e o seguinte escreveria no banco do vizinho — calado. |
| `.firebaserc`             | Idem, para o deploy.                                                                                                                                             |
| A barra de cima           | É onde o produto entra. Ver `modules/modulos.config.js`.                                                                                                         |
| A aba Pagamento           | O gateway saiu; o lugar e o raciocínio ficaram. Ver `modules/pagamento/module.js` e `functions/index.js`.                                                        |
| `functions/_lib/cofre.js` | Sem uso, e de propósito: é o cofre do Secret Manager, a peça que faz a chave de um gateway entrar pelo painel sem exigir deploy a cada troca.                    |

---

## O que a próxima sessão deve perguntar primeiro

1. **Esta cópia é a matriz ou já é um produto?** Se for produto, os três campos
   vazios acima precisam ser preenchidos antes de qualquer outra coisa — e o
   `RETOMAR-AQUI` do produto deve ser reescrito, não herdado.
2. **Já existe remoto?** A matriz nasceu sem, de propósito. Antes do primeiro
   push, varra o histórico INTEIRO por credencial: o `pre-commit` não existia
   quando os commits antigos nasceram, e segredo que sobe não desce mais.
3. **O primeiro login já aconteceu?** Se o produto foi publicado e ninguém
   entrou ainda, a janela do primeiro acesso está aberta. É o item mais urgente
   da lista, e leva trinta segundos.
