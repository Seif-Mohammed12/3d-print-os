# 3D Print OS — Engineering Standards

These standards keep the repository maintainable for a multi-engineer team over years.  
They align with the modular monolith, Clean Architecture, multi-tenant SaaS design.

**Priority order when standards conflict:** Security → Reliability → Maintainability → Scalability → Performance → Speed of delivery.

If you must violate a standard, document the trade-off in the PR and add a follow-up issue.

---

## 1. Folder naming

### Rules

- Use **kebab-case** for all directories: `print-profiles`, `geometry-analyses`, `web-admin`.
- Never use spaces, PascalCase, or snake_case for directories.
- Pluralize only for collections of things: `modules/orders`, `packages/contracts`.
- One concept per folder; do not create catch-all folders (`utils/`, `helpers/`, `common/` dumps).

### Canonical top-level layout

```text
apps/           # Deployable applications
modules/        # Bounded contexts (backend domain modules)
packages/       # Shared libraries (no tenant business rules)
infra/          # Terraform, deploy manifests, migration runners
tools/          # Codegen, architecture guards, scripts
docs/           # ADRs, standards, runbooks
```

### Backend module layout (every module)

```text
modules/<context>/
  domain/           # Entities, value objects, domain events, policies
  application/      # Use cases / commands / queries / ports
  infrastructure/   # DB, S3, Clerk, queue adapters
  interface/        # HTTP controllers, DTOs, job consumers
```

### Frontend app layout

```text
apps/web-admin/src/
  app/              # Routes / pages only
  features/         # Feature folders (kebab-case)
  shared/           # Reusable UI, hooks, API client wrappers
  styles/           # Global tokens only
```

### Feature folder (frontend)

```text
features/quotes/
  components/
  hooks/
  api/
  model/            # Types, mappers, validators
  index.ts          # Public exports only
```

---

## 2. File naming

| Kind              | Convention                       | Example                                                             |
| ----------------- | -------------------------------- | ------------------------------------------------------------------- |
| TypeScript source | `kebab-case.ts`                  | `create-quote.handler.ts`                                           |
| React components  | `PascalCase.tsx`                 | `QuoteSummary.tsx`                                                  |
| React hooks       | `use-*.ts`                       | `use-quote-form.ts`                                                 |
| Tests             | Same name + suffix               | `create-quote.handler.spec.ts`                                      |
| Nest modules      | `*.module.ts`                    | `orders.module.ts`                                                  |
| Nest controllers  | `*.controller.ts`                | `quotes.controller.ts`                                              |
| Domain entities   | `*.entity.ts` or bare noun       | `quote.ts` / `quote.entity.ts` (pick one per module; be consistent) |
| DTOs              | `*.request.ts` / `*.response.ts` | `create-quote.request.ts`                                           |
| Migrations        | `YYYYMMDDHHMMSS_description.sql` | `20260717120000_add_quotes.sql`                                     |
| ADRs              | `NNNN-title.md`                  | `0001-modular-monolith.md`                                          |
| Cursor rules      | `kebab-case.mdc`                 | `dependency-rules.mdc`                                              |

### Naming content rules

- Prefer **intention-revealing** names over layer noise: `PriceQuote`, not `QuoteHelperManagerUtil`.
- Boolean names: `is_`, `has_`, `can_`, `should_`.
- Event names: past tense domain events — `QuoteIssued`, `OrderStatusChanged`.
- API error codes: `dot.case` — `quote.expired`, `order.invalid_transition`.
- DB tables/columns: `snake_case`.
- JSON API fields: `snake_case` (stable public contract).
- TypeScript code identifiers: `camelCase` / `PascalCase` as usual; map at HTTP boundary.

---

## 3. Component organization

### Backend (Clean Architecture)

1. **Domain** has zero imports from Nest, Drizzle, HTTP, or other modules’ infrastructure.
2. **Application** orchestrates domain + ports; no SQL, no Express/Nest decorators.
3. **Infrastructure** implements ports; may import frameworks.
4. **Interface** adapts HTTP/jobs to application use cases; thin controllers.

Cross-module communication:

- Prefer **application-level ports** or **domain/integration events** (outbox).
- Forbidden: importing another module’s `infrastructure/` or DB tables directly.

### Frontend

- **Pages** compose features; they do not contain business rules.
- **Features** own their UI + API calls + local state.
- **Shared** contains only truly reusable primitives (Button, DataTable, `apiClient`).
- Server state: TanStack Query. Do not duplicate cache in global stores without justification.
- Forms: schema (Zod) lives next to the feature; reuse API contract types where possible.

### Public exports

Every package/feature exposes a small `index.ts` barrel for **intentional** public API.  
Do not re-export entire internal trees.

---

## 4. Dependency rules

### Allowed dependency directions

```text
apps → modules | packages
modules/<x>/interface → modules/<x>/application → modules/<x>/domain
modules/<x>/infrastructure → modules/<x>/application | domain | packages
modules/<x> ⇢ modules/<y>   ONLY via packages/contracts or published application ports
packages/* must not import apps/* or modules/*
```

### Hard bans

| Ban                                               | Reason                                 |
| ------------------------------------------------- | -------------------------------------- |
| Module A infrastructure importing Module B tables | Breaks extraction & tenancy boundaries |
| Domain importing Nest/Drizzle/React               | Framework lock-in in the core          |
| Circular module imports                           | Undeployable / untestable graphs       |
| Shared `utils` grabbing unrelated concerns        | Hidden coupling                        |
| New runtime dependency without PR justification   | Supply chain + maintainability cost    |

### Adding a dependency

PR must answer:

1. Why not use an existing package?
2. What is the maintenance/license risk?
3. Is it runtime or dev-only?
4. Does it run in the browser, API, or worker?

### Architecture guards

CI should fail on forbidden imports (e.g. dependency-cruiser / ESLint boundaries).  
Treat boundary violations like test failures.

---

## 5. Testing strategy

### Pyramid

| Layer       | What                                           | Where                      | Required for                 |
| ----------- | ---------------------------------------------- | -------------------------- | ---------------------------- |
| Unit        | Domain policies, pricing rules, state machines | `*.spec.ts` next to code   | All domain logic             |
| Integration | API + DB + RLS                                 | `*.integration.spec.ts`    | Persistence & HTTP contracts |
| Contract    | OpenAPI response shapes                        | CI against generated types | Public API changes           |
| E2E (smoke) | Critical journeys                              | `apps/*/e2e`               | Pre-release Train A paths    |
| Manual      | Checklist in PR for UX                         | PR description             | UI-heavy milestones          |

### Rules

- **No production merge** of pricing, orders, inventory, or authz without automated tests.
- Prefer testing **behavior** over implementation details.
- Multi-tenant tests must include a **cross-tenant isolation** case for every new tenant-scoped table/API.
- Flaky tests are bugs; quarantine with a ticket within 24 hours or fix immediately.
- Test data builders/factories live in `packages/testing` — do not copy fixtures across modules.
- Golden-file tests for pricing inputs/outputs as rule types expand.

### Minimum coverage expectations (guidance, not vanity)

- Domain & application (orders, quotes, pricing, inventory): high coverage of branches.
- Controllers: integration tests for authz + validation, not line-count chasing.
- UI: test critical flows and money-display logic; don’t screenshot-test everything.

---

## 6. Error handling

### Principles

- Fail **closed** for authz, tenancy, and payments.
- Never leak other tenants’ existence (`404` not `403` for cross-tenant IDs).
- Map domain errors → stable API `error.code` values.
- Do not swallow errors; log then rethrow or return typed failure.
- No empty `catch` blocks.

### Backend pattern

1. Domain throws / returns typed domain errors (`QuoteExpiredError`).
2. Application preserves meaning; may wrap with context.
3. Interface layer maps to HTTP status + error envelope.
4. Unexpected errors → `500` with `request_id`; message sanitized.

### Standard error envelope

```json
{
  "error": {
    "code": "order.invalid_transition",
    "message": "Cannot transition from completed to in_production",
    "details": [],
    "request_id": "req_..."
  }
}
```

### Status mapping (summary)

| Situation                                         | Status |
| ------------------------------------------------- | ------ |
| Validation                                        | `400`  |
| Unauthenticated                                   | `401`  |
| Authenticated, forbidden action                   | `403`  |
| Missing in tenant                                 | `404`  |
| Conflict / duplicate idempotency / bad transition | `409`  |
| Business rule failure                             | `422`  |
| Rate limit                                        | `429`  |
| Unhandled                                         | `500`  |

### Idempotency

Mutating commercial endpoints (`POST` quotes, orders, payments, stock movements) must honor `Idempotency-Key` where specified in the API design.

---

## 7. Logging

### Rules

- Use structured JSON logs (**Pino**).
- Every request log includes: `request_id`, `tenant_id`, `user_id` (if any), `route`, `latency_ms`, `status_code`.
- **Never** log secrets, tokens, password hashes, raw card data, or full STL payloads.
- Prefer `warn`/`error` with error codes; avoid logging entire unbounded objects.
- Domain-significant actions also write `audit_logs` where required (pricing publish, role changes, refunds).

### Levels

| Level   | Use                                      |
| ------- | ---------------------------------------- |
| `debug` | Dev-only diagnostics                     |
| `info`  | Request completed, job completed         |
| `warn`  | Recoverable unexpected (retry, fallback) |
| `error` | Failed operation needing attention       |
| `fatal` | Process cannot continue                  |

### Tracing

- Propagate OpenTelemetry `trace_id` across API → queue → worker.
- Job logs must include `job_id`, `job_name`, `tenant_id`, and causative `request_id` when available.

---

## 8. Documentation

### What lives where

| Doc                             | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `docs/ENGINEERING_STANDARDS.md` | This file — how we work                              |
| `docs/adr/NNNN-*.md`            | Architecture Decision Records                        |
| `docs/runbooks/*.md`            | Ops incident procedures                              |
| `packages/contracts/`           | OpenAPI / AsyncAPI — source of truth for HTTP/events |
| Module `README.md`              | Only if the module has non-obvious invariants        |
| PR description                  | Context, risk, test plan                             |

### ADR rules

- Write an ADR when changing: tenancy, auth, data model strategy, messaging, payments, or extracting a service.
- ADRs are immutable; supersede with a new ADR.
- Template: Context → Decision → Consequences → Status.

### Code comments

- Comment **why**, not what.
- Public ports and non-obvious domain invariants deserve brief comments.
- Do not leave commented-out code; delete it.

### API docs

- OpenAPI must be updated in the same PR as endpoint changes.
- Breaking changes require `/api/v2` (or explicit version plan) — not silent breakage.

---

## 9. Commit message convention

Follow **Conventional Commits**:

```text
<type>(<scope>): <summary>

[optional body]

[optional footer]
```

### Types

| Type       | Use                             |
| ---------- | ------------------------------- |
| `feat`     | New user-facing capability      |
| `fix`      | Bug fix                         |
| `refactor` | Behavior-preserving restructure |
| `perf`     | Performance improvement         |
| `test`     | Tests only                      |
| `docs`     | Documentation only              |
| `chore`    | Tooling, deps, housekeeping     |
| `ci`       | CI configuration                |
| `build`    | Build system                    |

### Scopes (examples)

`tenancy`, `auth`, `quotes`, `orders`, `pricing`, `geometry`, `inventory`, `printers`, `analytics`, `admin`, `portal`, `infra`, `contracts`

### Rules

- Summary: imperative mood, ≤72 chars, no trailing period.
- Body explains **why** when non-obvious.
- Breaking change: `BREAKING CHANGE:` footer or `!` after type.
- One logical change per commit when practical; never mix unrelated refactors with feature work in the same commit without note.

**Examples**

```text
feat(quotes): issue immutable quote snapshots from pricing policy
fix(inventory): prevent negative lot quantity under concurrent consume
docs(standards): add engineering standards for monorepo
```

---

## 10. Branch strategy

### Model

**Trunk-based development** with short-lived branches.

| Branch                     | Purpose                          |
| -------------------------- | -------------------------------- |
| `main`                     | Always deployable; protected     |
| `feat/<ticket>-short-name` | Feature work                     |
| `fix/<ticket>-short-name`  | Bug fixes                        |
| `chore/<short-name>`       | Tooling                          |
| `hotfix/<short-name>`      | Production emergency from `main` |

### Rules

- Branch from latest `main`.
- Prefer branches living **< 3 days**; integrate behind feature flags if needed.
- No long-lived `develop` branch unless explicitly reintroduced by ADR.
- Delete remote branches after merge.
- `main` requires: green CI, review approval, no direct pushes.

### Releases

- Deploy from `main` (or tagged `vX.Y.Z` for prod promotion).
- Hotfixes merge to `main` and deploy immediately; no parallel release branch unless ADR says otherwise.

### Feature flags

Use tenant feature flags for incomplete work that must merge to `main` for integration.  
Do not merge half-broken money paths dark without tests and a kill switch.

---

## 11. Code review checklist

Reviewers verify **behavior and boundaries**, not only style.

### Security & tenancy

- [ ] Every DB query / storage key is tenant-scoped
- [ ] AuthZ permission checked for the action
- [ ] No secrets in code, logs, or fixtures
- [ ] Uploads validated (type/size) and not trusted from client metadata alone
- [ ] Cross-tenant access returns `404`

### Architecture

- [ ] Changes sit in the correct module/layer
- [ ] No forbidden dependency direction
- [ ] New cross-module coupling uses ports/events, not table sharing
- [ ] API/OpenAPI updated if HTTP changed
- [ ] Migration is expand/contract safe when needed

### Domain & money

- [ ] Money is integer minor units + currency
- [ ] Issued quotes/orders are not silently repriced
- [ ] State transitions are explicit and tested
- [ ] Idempotency considered for creates/payments/movements

### Quality

- [ ] Tests match the risk of the change
- [ ] Errors use stable codes + correct HTTP status
- [ ] Logging has tenant/request correlation; no PII dumps
- [ ] Naming matches standards
- [ ] No unnecessary new dependency

### Operability

- [ ] Failure modes are clear (retries, dead letters, user-visible errors)
- [ ] Metrics/logs sufficient to debug in prod
- [ ] Feature flag / rollback path identified for risky changes

### Reviewer conduct

- Ask questions for clarity; prefer alternatives over vague “nit”.
- Approve when standards are met — do not block on pure taste.
- Request changes for security, tenancy, data loss, or boundary violations.

---

## 12. PR requirements

Every PR description includes:

1. **Summary** — what and why
2. **Risk** — tenancy, money, data migration, security
3. **Test plan** — commands run + manual steps
4. **Screenshots** — for UI
5. **ADR link** — if architectural

Prefer small PRs (< ~400 lines meaningful diff when possible).

---

## 13. Language & formatting

- TypeScript strict mode on.
- ESLint + Prettier enforced in CI; no format debates in review.
- No `any` without justification and `eslint-disable` scoped to one line with comment.
- Prefer `unknown` + narrowing over `any`.
- Python workers: `ruff` + type hints; same tenancy/logging discipline.

---

## 14. Multi-tenant non-negotiables

1. `tenant_id` on all tenant data; RLS enabled.
2. Storage keys prefixed by tenant.
3. Cache keys include tenant.
4. Jobs carry tenant context.
5. Metrics may be aggregated globally but logs/traces must be tenant-attributable for support.
6. Automated isolation tests for new bounded contexts.

---

## 15. When standards change

1. Propose change in PR updating this document.
2. If architectural, add/supersede an ADR.
3. Announce in team channel.
4. Update Cursor rules if enforcement text changes.

---

## Related documents

- Architecture blueprint (project ADRs — add under `docs/adr/` as decisions are ratified)
- API design — keep OpenAPI as the living contract under `packages/contracts`
- Database design — migrations under `infra/migrations` once implementation starts

_Last updated: 2026-07-17_
