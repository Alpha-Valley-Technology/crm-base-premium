# A máquina que roda a comunidade INTEIRA na sua máquina, sem instalar nada.
#
# ===========================================================================
# POR QUE ISTO EXISTE
# ===========================================================================
#
# Os emuladores do Firebase (Firestore, Storage) são programas Java, e não
# qualquer Java: o `firebase-tools` 15 exige a versão 21 ou acima. Quem clona o
# projeto com o Java errado — ou sem Java — descobre isso pela pior via
# possível: `npm run emu` sobe pela metade, o banco não responde, e a tela dá
# "permissão negada", que manda procurar no lugar errado, na regra do banco.
#
# Aqui o Java, o Node na versão certa (22, a MESMA que as Functions rodam em
# produção — Node diferente no local é defeito que só aparece publicado) e o
# `firebase-tools` vêm prontos dentro da imagem. Quem chega precisa de Docker
# e mais nada.
#
# ⚠️ Esta imagem é de DESENVOLVIMENTO. Não publica nada, não vai para servidor
# nenhum, e as portas só aparecem em 127.0.0.1 (ver `compose.yml`).

FROM node:22-bookworm-slim

# ⚠️ JAVA 21, E O NÚMERO IMPORTA.
#
# O `firebase-tools` 15 recusa Java anterior ao 21, e recusa TARDE: instala as
# dependências, anuncia os emuladores, e só então desliga tudo com "no longer
# supports Java version before 21". O Debian desta imagem só traz o 17 no
# repositório padrão — então o Java vem pronto da imagem oficial do Temurin.
#
# Copiar de outra imagem, em vez de instalar por apt, também prende a versão:
# ninguém descobre num dia qualquer que o repositório mudou de número por baixo.
COPY --from=eclipse-temurin:21-jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# O `ca-certificates` é o que permite ao `firebase-tools` baixar os jars dos
# emuladores no build. Sem ele, o download falha com erro de certificado — e
# só no primeiro `docker compose up` de quem for usar.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# A VERSÃO DO `firebase-tools` SAI DO `package.json`, e não é escrita aqui.
#
# Versão repetida em dois lugares é versão que diverge: o dia em que o projeto
# subir de major e a imagem continuar no anterior, o emulador local passa a
# aprovar regra que a produção recusa — e nada avisa.
COPY package.json /tmp/package.json
RUN VERSAO="$(node -p "require('/tmp/package.json').devDependencies['firebase-tools'].replace(/^\D*/, '')")" \
 && echo "  firebase-tools ${VERSAO} (a versão que o package.json declara)" \
 && npm install -g "firebase-tools@${VERSAO}" \
 && rm /tmp/package.json

# OS JARS DOS EMULADORES ENTRAM NO BUILD, não no primeiro `up`.
#
# Sem isto o primeiro `docker compose up` fica minutos parado baixando, sem
# dizer o que está fazendo, e volta a baixar tudo a cada container novo. Baixados
# aqui, ficam na camada da imagem: o `up` sobe em segundos e funciona offline.
ENV HOME=/root
RUN firebase setup:emulators:firestore \
 && firebase setup:emulators:storage \
 && firebase setup:emulators:ui

WORKDIR /app

# O comando real está no `compose.yml`. Ele mora ali, e não aqui, porque é
# `.docker/entrada.mjs` — arquivo montado do projeto, que se pode corrigir sem
# reconstruir a imagem.
CMD ["node", "/app/.docker/entrada.mjs"]
