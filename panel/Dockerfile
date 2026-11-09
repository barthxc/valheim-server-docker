FROM node:20-alpine
# docker + compose para reiniciar/aplicar ajustes, zip/unzip para mods y copias de seguridad
RUN apk add --no-cache docker-cli docker-cli-compose zip unzip
WORKDIR /app
COPY server.js index.html items.js extra.js i18n.js ./
CMD ["node", "server.js"]
