# Você recebeu a matriz da agência

**Isto não é um produto. É a carcaça de onde os produtos saem.**

Ela entrega o que todo sistema precisa e ninguém quer escrever duas vezes:
entrar com Google ou senha, papéis e permissões cobrados em três camadas,
cadastro de equipe, customização da marca pelo painel, avisos com sino,
suporte, e os cabeçalhos de segurança. **251 testes.**

---

## Em 5 minutos

```
npm install
cd functions && npm install && cd ..
git config core.hooksPath .githooks
npm run test:unit
```

⚠️ **O terceiro comando não é opcional.** Os hooks vivem em `.githooks/` e o git
não os liga sozinho numa cópia nova — sem ele, a trava que impede uma
credencial de entrar no histórico fica desligada, parecendo ligada.

Se os testes passarem, a matriz está de pé na sua máquina.

---

## Para começar um produto

**Os três primeiros passos são obrigatórios.** A carcaça **não sobe** sem eles,
e isso é de propósito:

1. **`base/firebase.js`** — os dados do projeto Firebase DELE. Nasce vazio e
   estoura na primeira tela enquanto estiver assim.
2. **`.firebaserc`** — o projeto de deploy.
3. **`config/marca.js`** — o nome que aparece na tela.

Depois: `npm install` nos dois lugares, ligar os hooks, e `npm run test:tudo`
verde **antes** de escrever a primeira linha do produto.

E o passo que ninguém lembra: **publique e entre você primeiro.** A primeira
pessoa a fazer login num banco vazio vira administrador, e essa janela fica
aberta do deploy até o primeiro login.

⚠️ **POR QUE OS TRÊS NASCEM VAZIOS.** A carcaça anterior desta casa vinha com as
chaves de um produto real dentro. Quem esquecesse de trocar passava a escrever
**no banco do produto anterior** — calado, e às vezes descoberto semanas depois.
Vazio quebra na primeira tela, com um recado dizendo o que fazer.

---

## Antes de escrever código, leia dois arquivos

| Arquivo                           | Por quê                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **`CLAUDE.md`, Bloco 00**         | como se opera aqui: commitar por etapa, não publicar o que não está commitado, conserto vai sozinho no deploy |
| **`docs/PLAYBOOK-DA-CARCACA.md`** | 17 armadilhas que já custaram tempo. Quase todas **não quebram nada visível** — é isso que as torna caras     |

Depois, quando precisar: `docs/decisoes.md` (o que foi decidido fora do padrão e
por quê) e `docs/DEPLOY-E-SEGURANCA.md` (os três portões, e a saída de
emergência).

---

## Este pacote está atrasado?

Ele é uma foto. A matriz continua evoluindo em
`github.com/sitacioossaka-tech/crm-base-premium` (privado), e o remoto já vem
configurado aqui dentro:

```
git fetch origin && git log HEAD..origin/master --oneline
```

Se listar commits, há novidade — e você pode trazer com `git pull`.

⚠️ **Se você vai trabalhar na matriz de verdade, peça acesso ao repositório em
vez de usar este .zip.** Pacote não recebe correção: no dia em que alguém
consertar um defeito da carcaça, quem estiver com a cópia solta não fica
sabendo.

---

## Os comandos

```
npm run test:unit      # tela, em jsdom            (~7s)
npm run test:medida    # geometria e CSP, Chrome   (~25s)
npm test               # regras, sobe o emulador
npm run test:tudo      # os três acima

npm run serve          # emuladores
npx firebase deploy    # passa pelos portões antes de subir
```

⚠️ **`npx firebase deploy` recusa publicar com a árvore git suja.** É de
propósito: se está no ar, está no histórico. Emergência com o site fora do ar se
resolve com `firebase hosting:rollback`, nunca burlando o portão.
