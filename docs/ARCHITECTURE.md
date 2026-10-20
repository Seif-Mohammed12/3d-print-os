# Architecture (summary)

Canonical decisions for 3D Print OS. Detailed ADRs live under `docs/adr/`.

Backend host wiring (config, DB pool, errors, logging, health): see [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md).  
Auth + multi-tenancy: see [AUTH_AND_TENANCY.md](./AUTH_AND_TENANCY.md).  
STL uploads: see [MODEL_UPLOADS.md](./MODEL_UPLOADS.md).  
Slicer-accurate quoting: see [QUOTING.md](./QUOTING.md).

## Shape

- **Modular monolith** first (NestJS API + Worker)
- **Clean Architecture** per bounded context under `modules/*`
- **API-first** (`/api/v1/...`)
- **Multi-tenant from day one** (`tenant_id` + RLS when persistence lands)
- Extract microservices only when geometry/ML/scheduling force isolation

## Bounded contexts (modules)

| Module          | Responsibility                            |
| --------------- | ----------------------------------------- |
| `tenancy`       | Tenants, shops, feature flags             |
| `identity`      | Users, memberships, roles                 |
| `catalog`       | Materials, variants, print profiles       |
| `geometry`      | Model assets, analysis                    |
| `pricing`       | Policies, rules, quote calculation        |
| `customers`     | CRM                                       |
| `orders`        | Orders, transitions, payments (shop-side) |
| `inventory`     | Lots, movements                           |
| `printers`      | Printer registry                          |
| `scheduling`    | Job assignment / capacity                 |
| `billing`       | SaaS subscriptions                        |
| `analytics`     | KPIs / read models                        |
| `ai`            | Assistant (advisory)                      |
| `notifications` | Email / SMS / WhatsApp                    |

## Apps

| App               | Role         |
| ----------------- | ------------ |
| `apps/api`        | HTTP surface |
| `apps/worker`     | Async jobs   |
| `apps/web-admin`  | Staff UI     |
| `apps/web-portal` | Customer UI  |

## Shared packages

| Package         | Role                               |
| --------------- | ---------------------------------- |
| `shared-kernel` | Branded IDs, `Result`              |
| `contracts`     | Shared API types / version         |
| `persistence`   | Postgres pool + connectivity check |
| `observability` | Pino logger factory                |
| `messaging`     | Outbox/queue (shell)               |
| `storage`       | Object storage (shell)             |
| `authz`         | Permissions helpers (shell)        |
| `testing`       | Test utilities                     |

## Non-goals (current milestone)

- Business endpoints (quotes, orders, …)
- AuthN/AuthZ wiring
- Database schema application
- Geometry / slicing workers

See the product roadmap in project planning notes / future `docs/ROADMAP.md`.
