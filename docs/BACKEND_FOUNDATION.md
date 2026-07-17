# Backend foundation

How the NestJS API host is structured before business modules are implemented.

See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [ENGINEERING_STANDARDS.md](./ENGINEERING_STANDARDS.md).

## Goals

- Boot a production-shaped API with config, DB pool, errors, logging, security, validation
- Keep `/api/v1` versioning
- Preserve `GET /api/v1/health` response shape
- Provide extension points for future bounded contexts under `modules/*`

## Layout (`apps/api/src`)

```text
main.ts                         # Bootstrap: dotenv, helmet, CORS, pipes, prefix
app.module.ts                   # Root module wiring
config/
  env.schema.ts                 # Zod env validation
  configuration.ts              # Typed AppConfig loader
  tokens.ts                     # DI tokens
health/
  health.module.ts
  health.controller.ts          # Controllers (HTTP)
  health.service.ts             # Services (application)
infrastructure/
  persistence/
    persistence.module.ts       # DB pool provider (repository infrastructure)
shared/
  errors/                       # AppError model
  filters/                      # Global exception filter
  middleware/                   # Request ID
  interceptors/                 # HTTP logging
  pipes/                        # Validation pipe factory
```

Clean Architecture mapping:

| Concern       | Location                                           |
| ------------- | -------------------------------------------------- |
| Controllers   | `health/*.controller.ts` (later: module interface) |
| Services      | `health/*.service.ts` (later: module application)  |
| Repositories  | ports later; pool via `PersistenceModule` today    |
| Models        | `shared/errors`, `packages/contracts`              |
| Routes        | Nest decorators + global prefix `api/v1`           |
| Utilities     | `shared/*`                                         |
| Configuration | `config/*`                                         |

Shared libraries:

| Package                      | Role                                        |
| ---------------------------- | ------------------------------------------- |
| `@3d-print-os/persistence`   | Postgres pool + connectivity check          |
| `@3d-print-os/observability` | Pino logger factory                         |
| `@3d-print-os/contracts`     | API version + health/error TypeScript types |

## HTTP surface (foundation)

| Method | Path                     | Purpose                                     |
| ------ | ------------------------ | ------------------------------------------- |
| GET    | `/api/v1/health`         | Liveness (`{ status, service, timestamp }`) |
| GET    | `/api/v1/health/version` | API version                                 |
| GET    | `/api/v1/health/ready`   | Readiness (DB/Redis); `503` if degraded     |

All responses include `x-request-id`. Errors use:

```json
{
  "error": {
    "code": "validation.failed",
    "message": "Validation failed",
    "details": [],
    "request_id": "..."
  }
}
```

## Cross-cutting behavior

- **Config** — Zod-validated env; fail fast on invalid/missing `DATABASE_URL`
- **DB** — Pool created at boot; connectivity verified; optional hard-fail via `DB_REQUIRED_ON_BOOT`
- **Security** — Helmet headers, CORS allowlist, global throttling (health skipped)
- **Validation** — Global `ValidationPipe` (whitelist + forbid unknown) for future DTOs
- **Logging** — Structured Pino logs with `request_id`, method, path, status, latency

## How future modules integrate

1. Implement domain/application/infrastructure/interface under `modules/<context>/`.
2. Export a Nest module from the interface layer (e.g. `OrdersHttpModule`).
3. Import that module into `AppModule` (or a `ModulesRootModule`).
4. Controllers stay thin: validate DTO → call application service → map result.
5. Repositories use `DATABASE_POOL` (+ later RLS session helpers in `@3d-print-os/persistence`).
6. Throw `AppError` (or subclasses) for domain/HTTP mapping — do not invent ad-hoc error shapes.
7. Do not access another module’s tables; use ports/events.

Example (future):

```text
modules/orders/
  domain/
  application/
  infrastructure/
  interface/orders.http.module.ts  → imported by AppModule
```

## Running the backend

```bash
pnpm install
cp .env.example .env

# Optional local infra
docker compose up postgres redis -d

# Build workspace libs used by API
pnpm --filter @3d-print-os/contracts --filter @3d-print-os/observability --filter @3d-print-os/persistence run build

pnpm dev:api
```

Verify:

```bash
curl -i http://localhost:3000/api/v1/health
curl -i http://localhost:3000/api/v1/health/ready
```

Production-style:

```bash
pnpm --filter @3d-print-os/api run build
pnpm --filter @3d-print-os/api run start
```
