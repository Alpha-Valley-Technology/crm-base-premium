# Backup e restauração

⚠️ **TROQUE `SEU-PROJETO` PELO ID DO SEU PROJETO** em todos os comandos abaixo.
A matriz não traz o id de ninguém: um comando de RESTAURAÇÃO copiado com o
projeto errado sobrescreve o banco de outro produto, e essa é a única operação
deste documento que não tem desfazer.

**E nada aqui está ligado numa instalação nova.** Agendamento de backup, PITR e
versionamento do Storage são configurações do PROJETO, não do código — elas não
viajam na cópia. O procedimento está pronto; ligá-lo é o primeiro item do
checklist de quem for ao ar.

---

## ⚠️ São DOIS backups, e nenhum vale sozinho

|            | Guarda                                                              | Onde                                             |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| **Código** | o sistema: telas, regras, functions, testes, histórico              | GitHub privado + retratos em pasta (abaixo)      |
| **Dados**  | o negócio: o que o seu produto guarda, mais as pessoas e as imagens | Firestore/Storage/Auth — o resto deste documento |

Restaurar só o código devolve **um site vazio**. Restaurar só os dados devolve
dados sem sistema para exibi-los. O procedimento de verdade usa os dois.

### Retratos do código (pontos de restauração)

Ficam **fora do repositório**, uma pasta por retrato, com o histórico git
inteiro dentro e um `LEIA-ISTO-PRIMEIRO.md` explicando como voltar. As
bibliotecas (`node_modules`) ficam de fora porque se baixam de novo com
`npm install`.

Fora do repositório de propósito: dentro, um retrato viraria commit e deploy por
acidente.

O mesmo ponto ganha uma etiqueta no git (`git tag -a retrato-AAAA-MM-DD`), que é
o caminho normal para voltar. **A pasta existe para o caso de não haver git nem
remoto para consultar** — que é justamente o cenário em que um backup importa.

⚠️ **O NOME DO RETRATO SEGUE UM PADRÃO, e ele não é enfeite:**

```
projeto--data--commit--o-que-e
```

O primeiro retrato desta casa se chamava `2026-09-07-35d32cd`: data e commit,
sem dizer de que projeto era. Um mês depois, ninguém saberia sem abrir a pasta —
e com dois projetos vivos, abrir para descobrir é o começo de restaurar o
errado. Tudo que se precisa saber tem que caber no nome.

| Forma                                             | Exemplo do que ela guarda           |
| ------------------------------------------------- | ----------------------------------- |
| `<matriz>--AAAA-MM-DD--<commit>--MATRIZ-<versão>` | a carcaça, de onde sai todo produto |
| `<produto>--AAAA-MM-DD--<commit>--producao`       | um produto que está no ar           |

**Retrato novo substitui o anterior do mesmo projeto** — mas só depois de
provar que o antigo é redundante, e isso se confere ANTES de apagar:

```
cd <retrato novo> && git cat-file -e <commit do retrato antigo>
```

Se o commit existe no histórico do novo, nada se perde. Se não existe, o antigo
guarda algo que o novo não tem, e apagar é perda de verdade.

**Antes de restaurar código, tente o caminho barato:** `firebase hosting:rollback`
devolve a versão publicada anterior em segundos, sem tocar em nada disto.

**Um backup que nunca foi restaurado é uma esperança, não um backup.** Este
documento existe para ser lido no pior dia, quando ninguém vai ter paciência de
descobrir o comando na documentação do Google.

Foi ligado assim no produto de origem. Projeto `SEU-PROJETO`, região
`southamerica-east1`.

---

## O que protege o quê

São três coisas diferentes, e usar a errada custa horas.

| Proteção                        | Do que salva                                     | Quanto tempo cobre             |
| ------------------------------- | ------------------------------------------------ | ------------------------------ |
| **Recuperação no tempo (PITR)** | "apaguei a coisa errada há vinte minutos"        | 7 dias, com precisão de minuto |
| **Backup diário**               | "o banco foi corrompido ontem"                   | 7 dias                         |
| **Backup semanal**              | "descobri em outubro que algo quebrou em agosto" | 14 semanas                     |
| **Versionamento do Storage**    | "a imagem foi trocada ou apagada por engano"     | 30 dias, ou 5 versões          |
| **Proteção contra exclusão**    | alguém apaga o banco inteiro por engano          | sempre                         |

**A escolha, em uma linha:** se o estrago foi hoje ou ontem, use PITR — ele é
cirúrgico. Se foi antes disso, use backup.

---

## Caso 1 — Apaguei dados hoje (o mais comum)

O PITR guarda o banco como ele era em **qualquer minuto dos últimos 7 dias**. Dá
para tirar de lá só o que se perdeu e devolver ao banco que está no ar, sem
derrubar nada.

```bash
# 1. Exporte o estado de ANTES do estrago. A hora é em UTC, no formato do exemplo.
gcloud firestore export gs://SEU-PROJETO.firebasestorage.app/resgate \
  --database="(default)" \
  --snapshot-time=2026-08-24T17:00:00Z \
  --collection-ids=posts,comentarios \
  --project=SEU-PROJETO

# 2. Confira o que veio (o export é uma pasta no Storage) antes de importar.

# 3. Importe de volta para o banco que está no ar.
gcloud firestore import gs://SEU-PROJETO.firebasestorage.app/resgate \
  --database="(default)" \
  --project=SEU-PROJETO
```

⚠️ **`--collection-ids` não é opcional na prática.** Sem ele você exporta e
reimporta o banco INTEIRO, sobrescrevendo com dados velhos tudo que aconteceu
depois do estrago — inclusive o que estava certo. Exporte só as coleções que
perderam dados.

⚠️ **Importar SOBRESCREVE documento por id.** Documento que existe no export
substitui o que está no ar. Documento criado depois e que não está no export
fica intacto.

---

## Caso 2 — O estrago é de dias atrás

Backup restaura para um banco **NOVO** — não dá para restaurar por cima do que
está no ar, e isso é proposital: você compara antes de trocar.

```bash
# 1. Veja o que existe.
gcloud firestore backups list --location=southamerica-east1 \
  --project=SEU-PROJETO

# 2. Restaure para um banco novo (o nome é seu; use a data).
gcloud firestore databases restore \
  --source-backup=projects/SEU-PROJETO/locations/southamerica-east1/backups/BACKUP_ID \
  --destination-database=resgate-24-08 \
  --project=SEU-PROJETO

# 3. Olhe o banco restaurado no console e confirme que ele tem o que falta.

# 4. Tire de lá só o que interessa e traga para o banco do ar:
gcloud firestore export gs://SEU-PROJETO.firebasestorage.app/resgate \
  --database=resgate-AAAA-MM-DD --collection-ids=COLECAO_1,COLECAO_2 \
  --project=SEU-PROJETO
gcloud firestore import gs://SEU-PROJETO.firebasestorage.app/resgate \
  --database="(default)" --project=SEU-PROJETO

# 5. Apague o banco de resgate quando terminar — ele custa como qualquer outro.
gcloud firestore databases delete --database=resgate-24-08 \
  --project=SEU-PROJETO
```

---

## Caso 3 — Uma imagem foi trocada ou apagada

O bucket guarda as versões antigas por 30 dias.

```bash
# Ver as versões de um arquivo, inclusive as apagadas.
gcloud storage ls -a gs://SEU-PROJETO.firebasestorage.app/conteudo/...

# Voltar uma versão (o número comprido no fim do nome é a geração).
gcloud storage cp gs://.../arquivo.png#1724500000000000 gs://.../arquivo.png
```

---

## O que NÃO está no backup

Dito com todas as letras, porque é o que surpreende:

- **As SENHAS.** As contas de login são exportadas todo dia (ver abaixo), mas
  sem senha, sem hash e sem sal — de propósito. Guardar isso num balde seria
  trocar um risco raro por um arquivo perigoso todos os dias.
- **As regras e as funções** não estão no backup — estão no Git, que é onde
  devem estar. `firebase deploy` recoloca as duas.
- **O conteúdo dos vídeos** nunca esteve aqui: mora no YouTube.

---

## Caso 4 — As contas de login sumiram

O backup do Firestore guarda o CADASTRO (`/usuarios`: nome, e-mail, papel). Não
guarda a CONTA — a credencial que o Firebase Auth reconhece. Sem ela o cadastro
continua lá, intacto e inútil: ninguém entra.

Por isso existe uma função agendada (`exportarContasDeLogin`, todo dia às 4h)
que grava a lista em `gs://SEU-PROJETO.firebasestorage.app/backup-contas/AAAA-MM-DD.json`.

```bash
# Ver o que existe
gcloud storage ls -l "gs://SEU-PROJETO.firebasestorage.app/backup-contas/" --project=SEU-PROJETO

# Baixar o do dia que interessa
gcloud storage cat "gs://SEU-PROJETO.firebasestorage.app/backup-contas/2026-08-24.json" --project=SEU-PROJETO > contas.json
```

**Como restaurar, na prática:** para cada conta do arquivo, use a função
`criarUsuario` que já existe no painel de Equipe — ela cria a conta e dispara o
convite de definição de senha. O campo `provedores` diz o caminho de cada uma:

- `password` → a pessoa recebe o convite e define uma senha nova
- `google.com` → ela só entra de novo com o Google; não há senha para definir

⚠️ **O arquivo não é lido pelo navegador — nem pelo admin.** Não existe regra
declarando `backup-contas/` no Storage, e o padrão do Firebase é recusar o que
ninguém abriu. Só o servidor e o `gcloud` alcançam. É uma lista de e-mails de
comunidade paga: exatamente o que um concorrente pagaria uma mensalidade para
levar.

---

## Conferir se está funcionando

O primeiro backup diário leva até 24 horas para aparecer. Depois disso, um
comando por mês responde se a proteção continua de pé:

```bash
gcloud firestore backups list --location=southamerica-east1 \
  --project=SEU-PROJETO \
  --format="table(name.basename(),snapshotTime,expireTime,state)"
```

Se a lista vier vazia, **a proteção não existe** — por mais que as agendas
apareçam configuradas.

---

## O alerta de gasto

Orçamento de **R$ 50/mês** no projeto, com aviso em 50%, 90%, 100% e mais um
quando a projeção do mês aponta para estourar. Os avisos vão por e-mail para os
administradores da conta de faturamento.

O valor não é uma previsão de custo: o uso normal cabe na cota gratuita e deve
ficar perto de zero. **R$ 50 é o tamanho do susto aceitável** — qualquer coisa
que passe disso é sinal de que algo mudou (um laço de leitura, um vídeo pesado
no Storage, alguém martelando a API), e o aviso chega enquanto ainda é barato.

---

## O que falta nesta frente

- [x] ~~Exportar as contas de login de forma agendada~~ — feito em 24/08/2026,
      rodado uma vez à mão para conferir: 1 conta exportada, sem senha
- [ ] **App Check**, para a API só aceitar chamadas do nosso próprio site
- [ ] **Um teste de restauração de verdade** — restaurar num banco de resgate e
      conferir, uma vez, antes de precisar. Enquanto isso não for feito, este
      documento é teoria bem escrita.
