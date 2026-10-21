# Deployment (free tier)

| Part                                  | Host                              | Config in repo                                         |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| Web app (staff app + customer portal) | Vercel                            | `apps/web-admin/vercel.json`                           |
| API (NestJS)                          | Render, free web service          | `render.yaml`, root `Dockerfile`                       |
| Slicer / geometry service             | This PC + Cloudflare quick tunnel | `tools/start-slicer.ps1`, `apps/geometry-service/.env` |
| Database + file storage               | Supabase                          | `infra/migrations` (`pnpm db:migrate`)                 |

Render's free tier sleeps when idle, so the first request after a quiet period can take about
a minute, and quotes need the slicer PC to be on. Fine for testing; move to a VPS or an
always-on machine for real customers.

## 1. Shared service key

Generate one random secret; it goes into both Render (`GEOMETRY_SERVICE_KEY`) and the slicer's
`.env` (`SERVICE_API_KEY`). PowerShell:

```powershell
-join ((48..57 + 97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
```

## 2. Slicer on this PC

Hugging Face Docker Spaces now need a paid plan, so the slicer runs on a PC with PrusaSlicer
installed and is exposed through a free Cloudflare quick tunnel.

1. Install cloudflared: `winget install --id Cloudflare.cloudflared`
2. Create `apps/geometry-service/.env` (not committed):
   ```
   SLICER_EXECUTABLE=C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe
   SLICER_ALLOWED_DOWNLOAD_HOSTS=<your-project>.supabase.co
   SERVICE_API_KEY=<the shared key>
   ```
3. Start it from the repo root and keep the window open:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\start-slicer.ps1
   ```
   It prints `GEOMETRY_SERVICE_URL = https://<random>.trycloudflare.com/api/v1`.
4. Quick-tunnel addresses change on every start: paste the new one into Render's
   `GEOMETRY_SERVICE_URL` (Render restarts the API). Quotes only price while the PC is on.

The Docker image in `apps/geometry-service` still works for a VPS later; only the URL changes.

## 3. API on Render

1. Render → New → Blueprint → pick this repository (uses `render.yaml`).
2. Fill the prompted values:
   - `DATABASE_URL` — Supabase session pooler connection string (port 5432)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GEOMETRY_SERVICE_URL` = the address `tools/start-slicer.ps1` prints
   - `GEOMETRY_SERVICE_KEY` = the shared key
3. Check `https://print-os-api.onrender.com/api/v1/health/ready` (database should be `up`).

## 4. Point the web app at the API

Vercel project → Settings → Environment Variables:
`VITE_API_BASE_URL` = `https://print-os-api.onrender.com/api/v1`, then redeploy.
If the Vercel domain changes, update `CORS_ORIGINS` on Render.
