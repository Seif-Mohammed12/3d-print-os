# Migrations

Apply with:

```bash
pnpm db:migrate
```

Requires `DATABASE_URL` (see `.env.example`).

Current:

- `0001_identity_tenancy.sql` — tenants, shops, users, RBAC, refresh tokens, RLS
- `0002_model_files.sql` — model file metadata, models permissions, storage bucket seed
- `012_business_rls.sql` — RLS on the business tables from 002–011 (child tables scoped through their parent), analytics views as `security_invoker`
