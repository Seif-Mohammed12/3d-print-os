---
version: 1
slug: "apps-web-admin"
primary_target: "apps/web-admin"
related_targets: []
---

# Web admin (staff console + customer portal)

Scope: every route of `apps/web-admin` (`/app/*` staff, `/portal/*` customers, auth pages). Mode: Operate.

Audience and job: shop staff quote, price, schedule and track prints at a desk; on the floor they check the rack and printer state on a phone. Customers upload a model, get a slicer price and track orders on a phone. Constraints: API, hooks, routes and logic untouched; light and dark both first-class; 375px works.

## Data gaps (decided during the build)

- Orders carry no slice time or grams, so rack cards show price and age; quotes show their slice time.
- No printer-hours or capacity data exists in the API, so the fourth figure is "Printers ready".
- No search endpoint exists, so the top bar has no search; Upload model is the existing New quote action.

## Direction contract

THESIS: Every job is a coloured T-card in a steel rack; its card colour is its status everywhere, its slot is its printer. Refuses the white-card SaaS console with indigo pills and stat tiles.

OWN-WORLD: Enamel steel-blue rail (#2B4557), warm grey board ground, flat card-stock fills (white draft, yellow quoted, green approved/next, blue printing, salmon QC, red failed), ink #1C2024, hairline slot rules, 2px corners max, no shadows except overlays, Archivo with tabular figures, one table size. Dark: the same rack at night — deep enamel-blue ground and slate card bodies, tab colours kept but deepened, warm off-white ink, no glow, no neon, no pure black.

STORY: Staff see what every printer is doing and what needs a hand within one glance, then act on the card itself (pass QC, reprint, start next). Every price shows its slice (time, grams) beside it.

FIRST VIEWPORT: Rail left (Sales / Production / Business, counts). Top bar: search + Upload model + New quote. Heading "Today on the floor" with one-line status. KPI strip ruled under a 2px ink line (revenue with 14-day bars, open orders, draft quotes, printer hours with capacity bar). Failure strip when a print failed, with the reprint action. Printer rack (one slot column per printer, T-shaped cards hanging from slot rails) beside a Quotes list with status tabs.

FORM: T-Card Planning Board, my ordered list position 5; signature move: status as T-card stock colour (tab head over inset body) in the rack, in every status chip, and in table rows; a status change re-slots the card (180ms step). seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
