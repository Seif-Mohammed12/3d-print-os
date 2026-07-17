# Development setup

## Install tooling

```bash
node -v   # >= 22
npm install -g pnpm@9.15.4
pnpm -v
```

## Bootstrap

```bash
pnpm install
cp .env.example .env
pnpm --filter @3d-print-os/shared-kernel --filter @3d-print-os/contracts --filter @3d-print-os/observability run build
```

## Run locally (without Docker for app processes)

Terminal A — infrastructure (optional until DB is used):

```bash
docker compose up postgres redis
```

Terminal B — API:

```bash
pnpm dev:api
```

Terminal C — Admin UI:

```bash
pnpm dev:admin
```

## Quality gates (run before PR)

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm typecheck
```

## Docker full stack

```bash
docker compose up --build
```

## IDE

Recommended VS Code extensions are listed in `.vscode/extensions.json` (ESLint, Prettier, Vitest).
