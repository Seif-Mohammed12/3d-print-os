# Deployment (free, no card)

| Part                                  | Where                                             | Config in repo                         |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Web app (staff app + customer portal) | Vercel — https://3d-print-os.vercel.app           | `apps/web-admin/vercel.json`           |
| API (NestJS)                          | This PC, published with a Cloudflare quick tunnel | `tools/start-server.ps1`, root `.env`  |
| Slicer / geometry service             | This PC, private (only the API calls it)          | `apps/geometry-service/.env`           |
| Database + file storage               | Supabase                                          | `infra/migrations` (`pnpm db:migrate`) |

Render, Koyeb, Oracle and Hugging Face Docker Spaces all need a payment card now, so the
backend runs on a PC. **The whole app (sign-in included) only works while that PC is on and
`tools/start-server.ps1` is running.** `render.yaml` and the Dockerfiles stay ready for a VPS
or paid host later; only `VITE_API_BASE_URL` on Vercel changes.

## One-time setup on the PC

1. Install Node 22, pnpm 9, Python 3.10+ and PrusaSlicer.
2. cloudflared: `winget install --id Cloudflare.cloudflared`. The script does not use or change
   Tailscale or any other app on the machine.
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

It starts the slicer (127.0.0.1:8000, private), the API (127.0.0.1:3000) and a Cloudflare quick
tunnel, and prints the public API address (`https://<random>.trycloudflare.com/api/v1`).
**The address changes on every start**, so the script publishes it with
`tools/publish-api-address.ps1` to the public Supabase Storage file
`<SUPABASE_URL>/storage/v1/object/public/runtime-config/api.json` (bucket created on first run).
The web app reads that file on every load, so no Vercel redeploy is needed. To republish by hand:
`powershell -ExecutionPolicy Bypass -File tools\publish-api-address.ps1 -ApiBaseUrl <address>/api/v1`.
Ctrl+C stops everything.

## Vercel

Project root `apps/web-admin`, environment variables:

- `VITE_RUNTIME_CONFIG_URL` = `<SUPABASE_URL>/storage/v1/object/public/runtime-config/api.json`
  (set once; this is where the app finds the current API address)
- `VITE_API_BASE_URL` = fallback API address, used only if that file can't be read
- `VITE_PORTAL_TENANT_SLUG` = your shop's address (e.g. `3d-print-it`)

Redeploy after changing them (they are baked in at build time). The API allows
`https://3d-print-os.vercel.app` via CORS; pass `-WebOrigin` to the script for another domain.

## Printer laptop (Linux, always on)

The backend's main home: the laptop that runs the printer (`ssh klipper`, Linux Mint 22). It starts
on boot and has a fixed address, so nothing needs republishing:

    https://klipper.taila93359.ts.net:8443/api/v1

The PC method above stays as the fallback. Running it republishes its own tunnel address, so
afterwards publish the laptop's address again (below).

| What              | Where                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| Code              | `/opt/3d-print-os`, owned by the no-login user `printos`                       |
| Secrets           | `/opt/3d-print-os/.env` and `apps/geometry-service/.env` there, mode 600       |
| PrusaSlicer 2.6.1 | `/opt/prusaslicer-2.6.1` (extracted AppImage, same version as the PC)          |
| OrcaSlicer 2.5.1  | `/opt/orcaslicer-2.5.1` (extracted AppImage, only with `--slicer orca`)        |
| Services          | `printos-geometry` (127.0.0.1:8000), `printos-api` (127.0.0.1:3000)            |
| Public address    | Tailscale Funnel on port 8443; the tailnet-only Serve entry on 443 is not ours |
| Root's scripts    | `/usr/local/lib/printos` (copies; services can't change them)                  |

### Protecting the printer

Both services, and every install or update, are limited to CPUs 2-3 (one physical core) at the
lowest CPU and disk priority, with memory caps (2500 MB slicer, 700 MB API). Klipper has a drop-in
with `CPUWeight=1000`. One slice runs at a time (`SLICER_MAX_PARALLEL=1`, shared by all requests).
Install and update refuse to run during a print unless given `--force`.

### Update

Push to GitHub, then from the PC (you type the laptop's sudo password):

```powershell
powershell -ExecutionPolicy Bypass -File tools\deploy-laptop.ps1
```

`-Branch <name>` switches the laptop to another branch. If `tools/linux` itself changed, run the
installer again instead.

### Install or re-install

Safe to repeat. From the repo root on the PC, in Git Bash (secrets are only needed the first time or
to replace them; the installer deletes the copies):

```bash
tar c -C tools/linux . | ssh klipper 'mkdir -p -m 700 ~/printos-install && tar x -C ~/printos-install'
ssh klipper 'umask 077; mkdir -p ~/printos-secrets; cat > ~/printos-secrets/root.env' < .env
ssh klipper 'umask 077; cat > ~/printos-secrets/geometry.env' < apps/geometry-service/.env
ssh -t klipper 'sudo bash ~/printos-install/install.sh --branch main --secrets ~/printos-secrets --publish'
```

Add `--slicer orca` to quote with OrcaSlicer, or `--slicer prusa` to go back; without it the laptop
keeps the slicer it has. The installer slices a test model before switching. Go back to `prusa` before
moving the laptop to a branch that has no Orca support.

Leave out `--secrets` to keep the secrets already on the laptop. Publish the address by hand with
`sudo /usr/local/lib/printos/publish-api-address.sh https://klipper.taila93359.ts.net:8443/api/v1`.
Also set that address as `VITE_API_BASE_URL` on Vercel, as the fallback.

### Looking after it

```bash
systemctl status printos-api printos-geometry
journalctl -u printos-api -u printos-geometry -f
journalctl -u printos-wifi-watchdog      # Wi-Fi reconnects
tailscale funnel --https=8443 off        # take the API off the internet (leaves other entries)
```

`printos-wifi-watchdog` checks Wi-Fi every two minutes and reconnects with the saved password: after
a failed handshake on weak signal NetworkManager otherwise waits for someone to type the password on
the laptop's screen. While Wi-Fi is down on purpose, stop it with
`sudo systemctl stop printos-wifi-watchdog.timer`.
