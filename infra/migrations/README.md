# Migrations

Apply with:

```bash
pnpm db:migrate
```

Requires `DATABASE_URL` (see `.env.example`).

Current:

- `0001_identity_tenancy.sql` — tenants, shops, users, RBAC, refresh tokens, RLS
