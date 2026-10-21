# Deployment (free tier)

| Part                                  | Host                        | Config in repo                                                                    |
| ------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Web app (staff app + customer portal) | Vercel                      | `apps/web-admin/vercel.json`                                                      |
| API (NestJS)                          | Render, free web service    | `render.yaml`, root `Dockerfile`                                                  |
| Slicer / geometry service             | Hugging Face Space (Docker) | `apps/geometry-service/Dockerfile`, `.github/workflows/deploy-geometry-space.yml` |
| Database + file storage               | Supabase                    | `infra/migrations` (`pnpm db:migrate`)                                            |

Free tiers sleep when idle: the first request after a quiet period can take about a minute
(Render) and a Space sleeps after ~48 h without visits. Fine for testing; move to a VPS or an
always-on machine for real customers.

## 1. Shared service key

Generate one random secret; it goes into both Render (`GEOMETRY_SERVICE_KEY`) and the Space
(`SERVICE_API_KEY`). PowerShell:

```powershell
-join ((48..57 + 97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
```

## 2. Slicer on Hugging Face

1. Create a **Docker** Space (blank template, CPU basic), e.g. `your-user/print-os-slicer`.
2. Space → Settings → Variables and secrets:
   - secret `SERVICE_API_KEY` = the shared key
   - variable `SLICER_ALLOWED_DOWNLOAD_HOSTS` = your Supabase host, e.g. `abcd.supabase.co`
3. Create a Hugging Face **write** token (Settings → Access Tokens).
4. GitHub repo → Settings → Secrets and variables → Actions:
   - secret `HF_TOKEN` = that token
   - variable `HF_SPACE` = `your-user/print-os-slicer`
5. Run the "Deploy geometry service to Hugging Face" workflow (Actions tab). Later pushes
   that touch `apps/geometry-service` redeploy automatically.
6. Check `https://your-user-print-os-slicer.hf.space/api/v1/health`.

## 3. API on Render

1. Render → New → Blueprint → pick this repository (uses `render.yaml`).
2. Fill the prompted values:
   - `DATABASE_URL` — Supabase session pooler connection string (port 5432)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GEOMETRY_SERVICE_URL` = `https://your-user-print-os-slicer.hf.space/api/v1`
   - `GEOMETRY_SERVICE_KEY` = the shared key
3. Check `https://print-os-api.onrender.com/api/v1/health/ready` (database should be `up`).

## 4. Point the web app at the API

Vercel project → Settings → Environment Variables:
`VITE_API_BASE_URL` = `https://print-os-api.onrender.com/api/v1`, then redeploy.
If the Vercel domain changes, update `CORS_ORIGINS` on Render.
