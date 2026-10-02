FROM node:26.10.0-alpine3.24 AS base
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache tini
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

FROM base AS build
RUN apk upgrade --no-cache
COPY app ./
ARG BUILD_REVISION=local
RUN npm ci --include=optional && npm run build

FROM base AS development
RUN apk upgrade --no-cache && apk add --no-cache chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --chown=node:node --chmod=755 .docker/app/entrypoint.sh /entrypoint.sh
COPY --chown=node:node app ./
USER node
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM base AS production
RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
