---
version: 1
slug: "apps-web-admin"
primary_target: "apps/web-admin"
related_targets: []
---

# Web admin (staff console + customer portal)

Scope: every route of `apps/web-admin` (`/app/*` staff, `/portal/*` customers, auth pages). Mode: Operate.

Audience and job: shop staff quote, price, schedule and track prints at a desk; on the floor they check printer state on a phone. Customers upload a model, get a slicer price and track orders on a phone. Constraints: API, hooks, routes and logic untouched; light and dark both first-class; 375px works. User asked (2026-11-03) to replace the T-card board: it felt old (beige/grey, boxy, dense, dated type). Keep: no glass, gradients or neon. Dark mode must not read as AI-generated (no near-black + neon accent, no glow).

## Data gaps (decided during the build)

- Orders carry no slice time, grams or print progress, so order rows show price, printer and age; quotes show their slice time and grams.
- No printer-hours or capacity data exists, so the fourth figure is "Printers ready".
- No search endpoint exists, so the top bar has no search.

## Direction contract

THESIS: Every order is a tracked parcel: one stage line (Accepted, Queued, Printing, QC, Ready, Delivered) read the same way by staff and customers. Refuses the boxy ruled board and the indigo-pill stat-tile SaaS console.

OWN-WORLD: Light: cool off-white ground #F6F7F9, white surfaces, ink #151A21, hairlines #E6E8EC, teal #0F9D8A as progress + primary + active nav, amber waiting, red failed, soft tinted pill chips, 14px card radius, 10px controls, Figtree with tabular figures. Dark: the workshop after hours: blue-graphite ground (not black), surfaces lifted by tone and 1px borders not glow, ink #E4E7EC, teal lifted for contrast, chips as low-chroma tints.

STORY: Staff see in one glance which printers run, what failed and what each order is waiting on, and act from the row (Reprint, Pass QC, Assign). Quotes show time and grams beside price.

FIRST VIEWPORT: Light rail (Sales/Production/Business, counts). Top bar: New quote, theme, user. Heading with one-line status. Four figures (revenue with 14-day bars). Failure notice when a print failed. Fleet row of printer cards. Orders in progress list, each row with its stage line and next action, beside Quotes to send.

FORM: Parcel Tracker, my ordered list position 1 (the pick); signature move: the order stage line (dots joined by a line, passed teal, current ringed, failed red) on dashboard rows, the orders table, order detail and the customer portal; a stage advance slides the fill along the line. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
