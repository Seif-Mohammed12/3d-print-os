# Website quoter (embed)

Any shop on 3D Print OS can put the instant quoter on its own website. A visitor uploads an
STL, picks a printer, material, quality and quantity, sees a price from a real PrusaSlicer
slice with the shop's profiles, and orders as a guest with their name and an email or phone
number. The order lands in the console with every other order, under a new customer record.

The full console (`/app/*`) stays staff-only. The quoter can't reach it: it has its own public
API, and its visitor tokens aren't accepted by any staff route.

## For a shop: add it to your website

1. **Settings → Website quoter** in the console.
2. Add every address your site is served from under **Allowed websites**, exactly as the
   browser shows it, e.g. `https://www.yourshop.com` and `https://yourshop.com` if both are
   used. Plain `http://` is accepted only for `localhost`.
3. Tick **Take quotes and orders on my website**.
4. Copy the **Embed code** and paste it where the quoter should appear:

   ```html
   <script src="https://YOUR-3DPRINTOS-APP/embed.js" async></script>
   <print-quoter data-key="pk_..."></print-quoter>
   ```

   In site builders (WordPress, Wix, Squarespace, Webflow) use an "HTML" / "Embed code" block.

The quoter grows to fit its content, so the host page does the scrolling.

### Fitting your site's look

The console sets the shop default (accent colour, font). Each embed can override it:

| Attribute         | Example                                                     |
| ----------------- | ----------------------------------------------------------- |
| `data-accent`     | `#b4532a` (buttons, selection, focus ring)                  |
| `data-background` | `#f6f3ee` (default: transparent, the host page shows)       |
| `data-foreground` | `#1f1b16` (text)                                            |
| `data-radius`     | `12` (px, 0–24)                                             |
| `data-font`       | `Inter` (a font name; the frame can't use the host's fonts) |
| `data-font-url`   | a `https://fonts.googleapis.com/css2?...` stylesheet        |
| `data-mode`       | `light` or `dark`                                           |

### Reacting to an order

```js
document.querySelector('print-quoter').addEventListener('quoter:order', (event) => {
  // event.detail = { order: { id, order_number }, total_cents, currency }
});
```

`quoter:ready` fires once the quoter has loaded.

## How it works

```
shop website ──<script embed.js>──▶ <print-quoter> ──iframe──▶ web-admin /embed.html
                                                                  │  fetch, X-Embed-Session
                                                                  ▼
                                                    API /api/v1/public/embed/*
```

- **Loader** (`apps/web-admin/public/embed.js`): defines `<print-quoter>`, which inserts an
  iframe of `embed.html` from the same origin as the script. The iframe isolates the quoter
  from the host page's CSS and scripts. Messages between them are checked both ways: the frame
  posts only to the host's exact origin, and the loader accepts messages only from the frame's
  window and origin.
- **Frame** (`apps/web-admin/src/embed/*`): a separate Vite entry with no staff auth code
  paths in use. It reuses the portal's quote UI (`QuoteChoices`, `useLiveQuote`, `FileDrop`,
  the 3D preview). Theme values become the same CSS variables the app's tokens use.
- **API** (`apps/api/src/embed/*`), all under `/api/v1/public/embed` and `@Public()`:

  | Route                       | What it does                                      | Limit / IP / min |
  | --------------------------- | ------------------------------------------------- | ---------------- |
  | `GET  /:key/config`         | Shop name, theme, printers with materials, limits | 60               |
  | `POST /:key/sessions`       | Starts a visitor session (24 h)                   | 10               |
  | `POST /models/uploads`      | Signed upload URL for an STL                      | 10               |
  | `POST /models/:id/complete` | Marks the upload done                             | 10               |
  | `POST /quotes`              | Creates and slices a quote                        | 20               |
  | `POST /quotes/:id/price`    | Reprices after a change                           | 20               |
  | `POST /quotes/:id/order`    | Orders at the price shown                         | 5                |

  The session routes need the `X-Embed-Session` header from `/sessions`.

- **Staff API**: `GET/PUT /api/v1/embed-settings`, `POST /api/v1/embed-settings/rotate-key`
  (`settings:read` / `settings:write`).

### Security model

- **Publishable key** (`pk_...`) only names the shop, like a Stripe publishable key. Unknown,
  malformed and disabled keys get the same 404, so keys can't be probed.
- **Allowed origins** are exact matches, with no wildcards. Two checks enforce them:
  - A session starts only for an allowed host page. The frame reports the host from
    `location.ancestorOrigins` (Chrome, Safari) or the referrer (the loader sets
    `referrerpolicy="origin"` for Firefox). The host page can forge neither.
  - Every call's `Origin` header must be the quoter frame's own origin (`CORS_ORIGINS`), the
    shop's allowed list, or, once a session exists, the session's host. Browsers set
    `Origin`, and scripts can't change it.

  A non-browser client can still call the API without an `Origin`, as with any public key.
  Rate limits, the per-session caps and the upload limit bound that.

- **CORS** for `/public/embed/*` admits any origin _without credentials_, and the service
  refuses origins that aren't allowed. Every other route keeps the `CORS_ORIGINS` allowlist.
- **Visitor sessions** are random tokens, stored only as SHA-256 hashes. Every model and
  quote is scoped to its session. A session can't see another session's models or quotes,
  and its token is useless on staff routes.
- **Caps**: 20 uploads and 40 quotes per session, `EMBED_UPLOAD_MAX_BYTES` per file (default
  50 MB, also capped by `UPLOAD_MAX_BYTES`).
- **What visitors see** comes from the portal's customer-safe projection (`QUOTE_SELECT`,
  `toPortalQuote`): the price, time, weight and size. Cost lines, margins, slice output and
  internal notes are never included. Shop setup errors are reworded for customers.
- **Rotating the key** (console → New key) ends every open session at once.

### Data

Migration `015_embed_quoting.sql` adds `embed_settings` (one row per shop) and
`embed_sessions`. It also lets `model_files` and `quotes` be owned by an `embed_session_id`
instead of a user, and allows `quotes.source = 'embed'`.

Unordered embed quotes sit under one CRM customer per shop, **"Website visitors"**, because
`quotes.customer_id` is required and a visitor only identifies themselves when ordering.
Ordering creates a new customer from the details they typed, moves the quote to that customer
and creates the order, all atomically and only at the exact price shown. The customer is never
matched to an existing record by email (nothing is verified). If the email is already on file,
the new record notes that, so staff can merge them.

## Deploying

1. **Apply migrations 015 and 016 before deploying the API** (both are already applied to the
   current Supabase project). The upload insert now writes
   `model_files.embed_session_id`.
2. Deploy the API. Its `CORS_ORIGINS` must include the web app's origin: that origin serves the
   frame, and the API trusts it to vouch for the host page.
3. Deploy the web app (Vercel). The build emits `embed.html` next to `index.html`, and
   `public/embed.js` is served at `/embed.js`. Vercel serves files before applying the SPA
   rewrite, so both URLs work as they are.

## Trying it locally

1. Run the API (`pnpm dev:api`) and the web app (`pnpm dev:admin`, port 5173).
2. In the console, open Settings → Website quoter. Add `http://localhost:4173`, turn the
   quoter on and copy the key.
3. Serve the example host page from another origin:

   ```bash
   npx http-server docs/examples -p 4173
   ```

4. Open `http://localhost:4173/embed-host.html?key=pk_...&app=http://localhost:5173`, upload
   an STL, get a price and order. The order appears under Orders in the console.
