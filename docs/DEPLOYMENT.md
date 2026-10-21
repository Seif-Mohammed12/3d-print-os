# Deployment (free, no card)

| Part                                  | Where                                    | Config in repo                         |
| ------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Web app (staff app + customer portal) | Vercel — https://3d-print-os.vercel.app  | `apps/web-admin/vercel.json`           |
| API (NestJS)                          | This PC, published with Tailscale Funnel | `tools/start-server.ps1`, root `.env`  |
| Slicer / geometry service             | This PC, private (only the API calls it) | `apps/geometry-service/.env`           |
| Database + file storage               | Supabase                                 | `infra/migrations` (`pnpm db:migrate`) |

Render, Koyeb, Oracle and Hugging Face Docker Spaces all need a payment card now, so the
backend runs on a PC. **The whole app (sign-in included) only works while that PC is on and
`tools/start-server.ps1` is running.** `render.yaml` and the Dockerfiles stay ready for a VPS
or paid host later; only `VITE_API_BASE_URL` on Vercel changes.

## One-time setup on the PC

1. Install Node 22, pnpm 9, Python 3.10+ and PrusaSlicer.
2. Tailscale: install, sign in, and allow Funnel for this machine (the first
   `tailscale funnel` prints a link if it isn't allowed yet). The public address is
   `https://<machine>.<tailnet>.ts.net` and never changes.
3. Root `.env`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET` (see `.env.example`).
4. `apps/geometry-service/.env` (not committed):
   ```
   SLICER_EXECUTABLE=C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe
   SLICER_ALLOWED_DOWNLOAD_HOSTS=<your-project>.supabase.co
   SERVICE_API_KEY=<long random secret>
   ```
5. Slicer venv:
   `cd apps/geometry-service; python -m venv .venv; .venv\Scripts\pip install -r requirements.txt`
6. Build the API: `pnpm install; pnpm --filter "@3d-print-os/api..." run build`
   (rebuild after pulling API changes).

## Every time

From the repo root, in a terminal you keep open:

```powershell
powershell -ExecutionPolicy Bypass -File tools\start-server.ps1
```

It starts the slicer (127.0.0.1:8000, private), the API (127.0.0.1:3000) and Tailscale
Funnel, and prints the public API address. Ctrl+C stops everything and turns Funnel off.

## Vercel

Project root `apps/web-admin`, environment variables:

- `VITE_API_BASE_URL` = `https://<machine>.<tailnet>.ts.net/api/v1`
- `VITE_PORTAL_TENANT_SLUG` = your shop's address (e.g. `3d-print-it`)

Redeploy after changing them (they are baked in at build time). The API allows
`https://3d-print-os.vercel.app` via CORS; pass `-WebOrigin` to the script for another domain.
