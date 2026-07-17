# 3D Print OS

Standalone **multi-tenant manufacturing platform** for 3D printing businesses.  
First customer: **3D Print It Egypt**. Later: SaaS for other print shops.

> This is **not** a marketing website. It is an operations platform (quotes, geometry, orders, printers, inventory, analytics).

## Status

**Milestone M0 — Platform foundation** (in progress)

- Monorepo structure
- Tooling (lint, format, test, CI)
- Docker Compose (Postgres + Redis + API + Worker)
- Health endpoint only
- **No business logic yet**

## Stack (committed)

| Layer          | Choice                   |
| -------------- | ------------------------ |
| Monorepo       | pnpm workspaces          |
| API / Worker   | NestJS + TypeScript      |
| Admin / Portal | React + Vite             |
| Database       | PostgreSQL (wired later) |
| Queue / Cache  | Redis (wired later)      |
| Lint / Format  | ESLint 9 + Prettier      |
| Test           | Vitest                   |
| CI             | GitHub Actions           |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md).

## Repository layout

```text
apps/
  api/           # HTTP API (modular monolith host)
  worker/        # Background job host
  web-admin/     # Shop staff console
  web-portal/    # End-customer portal
modules/         # Bounded contexts (Clean Architecture shells)
packages/        # Shared libraries (contracts, kernel, observability, …)
infra/           # Migrations + future Terraform
tools/           # Codegen / architecture guards
docs/            # Standards, ADRs, architecture
```

## Prerequisites

- Node.js **22+** (see `.nvmrc`)
- pnpm **9.15+** (`npm install -g pnpm@9.15.4`)
- Docker (optional, for Compose)

## Quick start

```bash
# Install
pnpm install

# Copy env
cp .env.example .env

# Build shared packages
pnpm --filter @3d-print-os/shared-kernel --filter @3d-print-os/contracts --filter @3d-print-os/observability run build

# Run API (health only)
pnpm dev:api

# In another terminal — admin UI scaffold
pnpm dev:admin
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

### Docker Compose

```bash
docker compose up --build
```

- API: `http://localhost:3000/api/v1/health`
- Postgres: `localhost:5432` (user/pass/db: `printos`)
- Redis: `localhost:6379`

## Scripts

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm lint`         | ESLint                                     |
| `pnpm format`       | Prettier write                             |
| `pnpm format:check` | Prettier check                             |
| `pnpm test`         | Vitest                                     |
| `pnpm typecheck`    | TypeScript across workspaces               |
| `pnpm build`        | Build all packages/apps with build scripts |
| `pnpm dev:api`      | API watch mode                             |
| `pnpm dev:worker`   | Worker watch mode                          |
| `pnpm dev:admin`    | Admin Vite dev server (`:5173`)            |
| `pnpm dev:portal`   | Portal Vite dev server (`:5174`)           |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [engineering standards](docs/ENGINEERING_STANDARDS.md).

**Priority:** Security → Reliability → Maintainability → Scalability → Performance → Speed.

## License

Proprietary — All rights reserved.
