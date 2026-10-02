FROM node:24.21.0-alpine3.24 AS base
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache tini
EXPOSE 4000

FROM base AS development
RUN apk upgrade --no-cache
COPY --chown=node:node --chmod=755 .docker/api/entrypoint.sh /entrypoint.sh
COPY --chown=node:node api ./
USER node
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM base AS build
RUN apk upgrade --no-cache
COPY api ./
RUN npm ci --include=optional && npm run build && npm prune --omit=dev && date -u +%Y%m%dT%H%M%SZ > BUILD_ID

FROM base AS production
RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json /app/BUILD_ID ./
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
