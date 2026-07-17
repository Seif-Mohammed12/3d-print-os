---
status: Accepted
date: 2026-07-17
---

# ADR 0003 — AuthN/AuthZ and multi-tenancy

## Context

3D Print OS must isolate data per business (tenant) and enforce RBAC for Shop Owner, Admin, Employee, and Customer roles.

## Decision

- **AuthN:** Self-hosted JWT access tokens + opaque hashed refresh tokens; passwords with argon2id
- **AuthZ:** Permission codes bound to tenant-scoped roles; Nest guards enforce permissions
- **Tenancy:** `tenants` + `shops`; every tenant business table carries `tenant_id`
- **Isolation:** Application filters by tenant from JWT `tid` + Postgres RLS session (`app.tenant_id` / `app.bypass_rls`)
- **Clerk:** Deferred; can replace credential issuance later behind the same session/RBAC model

## Consequences

- Register creates tenant + default shop + owner membership in one transaction
- Cross-tenant access returns 404/empty via RLS and service checks
- Secrets required via env (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
