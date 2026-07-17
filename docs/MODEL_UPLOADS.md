# Model uploads (STL file management)

File management only — no geometry analysis.

## Flow

1. `POST /api/v1/models/uploads` — create `model_files` row + signed upload URL
2. Client `PUT`s STL bytes to the signed URL
3. `POST /api/v1/models/:id/complete` — verify object in storage, status → `uploaded`
4. `GET /api/v1/models/:id` — status + metadata
5. `DELETE /api/v1/models/:id` — soft-delete + remove storage object

## Permissions

- `models:read`
- `models:write`

Re-login after migration so JWTs include the new permissions.

## Env

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
UPLOAD_BUCKET=model-files
UPLOAD_MAX_BYTES=52428800
```

Service role key is **server-only**.

## Migrate

```bash
pnpm db:migrate
```

Creates `model_files` and seeds the private `model-files` storage bucket when possible.
