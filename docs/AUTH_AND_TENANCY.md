# Authentication & multi-tenancy

## Security decisions

| Decision         | Detail                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Passwords        | argon2id hashing                                                                         |
| Access token     | JWT (HS256 via `@nestjs/jwt`), ~15 minutes, claims: `sub`, `tid`, `roles`, `permissions` |
| Refresh token    | Opaque random string; **SHA-256 hash** stored; rotated on refresh; revoked on logout     |
| Tenant binding   | Access token `tid` is source of tenant context — not a client-supplied header alone      |
| RBAC             | Permission codes checked by `PermissionsGuard`                                           |
| Defense in depth | SQL always scoped + Postgres RLS (`app.tenant_id`)                                       |
| Bootstrap        | Registration uses `app.bypass_rls=on` inside a transaction                               |
| Transport        | HTTPS in production; Helmet + CORS + throttle already on API                             |

## Roles

| Code       | Display    | Typical access                           |
| ---------- | ---------- | ---------------------------------------- |
| `owner`    | Shop Owner | All current permissions                  |
| `admin`    | Admin      | Settings, members, shops                 |
| `employee` | Employee   | Read settings/members/shops/roles        |
| `customer` | Customer   | Minimal (`roles:read`) until portal APIs |

## Database changes

Migration: `infra/migrations/0001_identity_tenancy.sql`

Tables: `permissions`, `tenants`, `tenant_settings`, `shops`, `users`, `tenant_memberships`, `roles`, `role_permissions`, `membership_roles`, `refresh_tokens`, plus `schema_migrations`.

RLS enabled on tenant-scoped tables.

Apply:

```bash
pnpm db:migrate
```

## API endpoints

All under `/api/v1`.

| Method | Path               | Auth   | Permission       |
| ------ | ------------------ | ------ | ---------------- |
| POST   | `/auth/register`   | Public | —                |
| POST   | `/auth/login`      | Public | —                |
| POST   | `/auth/refresh`    | Public | —                |
| POST   | `/auth/logout`     | Public | —                |
| GET    | `/auth/me`         | Bearer | —                |
| GET    | `/tenants/current` | Bearer | `settings:read`  |
| PATCH  | `/tenants/current` | Bearer | `settings:write` |
| GET    | `/shops`           | Bearer | `shops:read`     |
| POST   | `/shops`           | Bearer | `shops:write`    |
| GET    | `/shops/:id`       | Bearer | `shops:read`     |
| PATCH  | `/shops/:id`       | Bearer | `shops:write`    |
| GET    | `/members`         | Bearer | `members:read`   |
| POST   | `/members/invite`  | Bearer | `members:manage` |
| PATCH  | `/members/:id`     | Bearer | `members:manage` |
| GET    | `/roles`           | Bearer | `roles:read`     |

Health endpoints remain public.

## Module layout

- `modules/identity` — auth/members/rbac application + repositories
- `modules/tenancy` — tenant/shop application + repositories
- `apps/api/src/identity` — Nest HTTP, JWT guards
- `apps/api/src/tenancy` — Nest HTTP for shops/tenants
