# syntax=docker/dockerfile:1
# API and worker images. The web apps are deployed separately (Vercel) and excluded via
# .dockerignore; the geometry service has its own Dockerfile in apps/geometry-service.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS build
COPY . .
# `...` selects the app plus every workspace package it depends on, built in order.
RUN pnpm install --frozen-lockfile --filter "@3d-print-os/api..." --filter "@3d-print-os/worker..." \
  && pnpm --filter "@3d-print-os/api..." --filter "@3d-print-os/worker..." run build

FROM node:22-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]

# Keep the API last: hosts that build without a --target (Render) use the final stage.
FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
