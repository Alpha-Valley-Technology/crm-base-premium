# CRM Base Premium — a matriz

> **Propriedade privada e segredo comercial.** Copyright © 2026 Sitacio Ossaka.
> Ver [AVISO-LEGAL.md](AVISO-LEGAL.md).

**Versão `v1.0.1` — Esta é A matriz da agência.**

Existe uma etiqueta só, e é de propósito: a que funciona. Etiqueta antiga numa
matriz é convite para alguém clonar a versão errada.

A carcaça de onde saem os produtos. Ela **não é um produto**: é tudo que todo
produto precisa e que ninguém quer escrever duas vezes.

Nasceu de uma área de membros premium que foi ao ar, vendeu e quebrou algumas
vezes. O produto saiu; ficou o que sobrevive a ele.

⚠️ **O `crm-base` antigo foi APOSENTADO** e a pasta local dele apagada, para não
haver duas matrizes. O histórico segue em `sitacioossaka-tech/crm-base`, só para
consulta — **não continue aquele repositório.**

## Como começar um produto a partir daqui

```
git clone https://github.com/sitacioossaka-tech/crm-base-premium.git meu-produto
cd meu-produto
rm -rf .git && git init          # história própria: a da matriz não é a sua
```

Depois, os passos abaixo. Os três primeiros são obrigatórios — a carcaça **não
sobe** sem eles, e é de propósito.

---

## O que ela entrega, pronto

|                     |                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Entrada**         | Google e e-mail/senha. Primeiro acesso e "esqueci a senha" são o mesmo caminho.         |
| **Papéis**          | `membro`, `gestor` e `admin`, cobrados em três camadas: barra, tela e regra do banco.   |
| **Primeiro acesso** | A primeira pessoa a entrar num banco vazio vira admin. Depois, só por convite.          |
| **Equipe**          | Cadastrar, promover, desativar e remover — com o aviso de cobrança pendente já escrito. |
| **Identidade**      | Logo, cores, fontes, tema claro/escuro e imagem de entrada, tudo pelo painel.           |
| **Avisos**          | O sino, e o painel que escreve nele.                                                    |
| **Suporte**         | Botões de contato na entrada e na tela de porta fechada.                                |
| **Cofre**           | `/segredos/**` que nem o admin lê pelo navegador — só as Cloud Functions.               |
| **Módulos**         | Registro, barra lateral recolhível e roteamento por endereço (`#/modulo/aba`).          |
| **Segurança**       | CSP sem `unsafe-inline`, cabeçalhos, e três portões antes de publicar.                  |
| **Testes**          | 248 de tela · 20 de medida · 144 de regras · 82 de servidor.                            |

---

## Começando um produto novo

Nesta ordem. Os três primeiros são obrigatórios — a carcaça **não sobe** sem
eles, e é de propósito:

1. **`base/firebase.js`** — os dados do SEU projeto Firebase. Nasce vazio e
   estoura na primeira tela enquanto estiver assim.
2. **`.firebaserc`** — o projeto de deploy. Também vazio.
3. **`config/marca.js`** — o nome que aparece na tela.
4. `npm install && cd functions && npm install && cd ..`
5. `git config core.hooksPath .githooks` — liga os hooks (eles não vêm ligados
   numa cópia nova; ver `docs/DEPLOY-E-SEGURANCA.md`).
6. `npm run test:tudo` — tem que estar verde antes de você escrever a primeira
   linha do seu produto.

7. **Publique e ENTRE VOCÊ, imediatamente.** A primeira pessoa que fizer login
   num banco vazio vira admin — é o que dispensa abrir um terminal para criar o
   primeiro dono. Fechada essa janela, ela não reabre. Não mande o endereço para
   ninguém antes de fazer isso. (Detalhes em `docs/decisoes.md`.)

Depois, pendure o primeiro módulo em `modules/modulos.config.js`. O passo a
passo está no comentário no topo daquele arquivo.

---

## Leia antes de construir

| Arquivo                            | Para quê                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **`CLAUDE.md`, Bloco 00**          | Como se opera aqui: commitar por etapa, não publicar o que não está commitado, atualizar a base antes de fechar. |
| **`docs/PLAYBOOK-DA-CARCACA.md`**  | As armadilhas que custaram tempo. Leia antes, não depois.                                                        |
| **`docs/decisoes.md`**             | O que foi decidido fora do padrão, e por quê.                                                                    |
| **`docs/DEPLOY-E-SEGURANCA.md`**   | Os três portões, e a saída de emergência.                                                                        |
| **`docs/BACKUP-E-RESTAURACAO.md`** | Backup dos dados e do código — são dois, e nenhum vale sozinho.                                                  |

---

## Os comandos

```
npm run test:unit      # tela, em jsdom          (~7s)
npm run test:medida    # geometria e CSP, Chrome (~25s)
npm test               # regras, sobe emulador
npm run test:tudo      # os três acima
cd functions && npm test

npm run serve          # emuladores
npx firebase deploy    # passa pelos portões antes de subir
```
