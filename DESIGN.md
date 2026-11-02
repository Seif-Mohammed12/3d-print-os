---
name: 3D Print OS
description: Operations console for 3D print shops, drawn as a T-card planning board in a steel rack.
colors:
  ink: 'hsl(210 13% 13%)'
  enamel-rail: 'hsl(205 34% 25%)'
  enamel-rail-raised: 'hsl(203 31% 31%)'
  rail-text: 'hsl(203 26% 89%)'
  rail-muted: 'hsl(205 20% 66%)'
  board-ground: 'hsl(45 12% 90%)'
  paper: 'hsl(45 43% 98%)'
  board-tint: 'hsl(44 13% 85%)'
  ink-muted: 'hsl(210 8% 31%)'
  rack-bed: 'hsl(44 11% 82%)'
  slot-rail: 'hsl(41 8% 70%)'
  slot-highlight: 'hsl(45 20% 92%)'
  hairline: 'hsl(41 11% 76%)'
  control-edge: 'hsl(43 5% 53%)'
  stock-draft: 'hsl(45 43% 98%)'
  stock-quoted: 'hsl(48 85% 62%)'
  stock-approved: 'hsl(135 34% 67%)'
  stock-printing: 'hsl(211 56% 71%)'
  stock-qc: 'hsl(10 72% 74%)'
  stock-failed: 'hsl(4 64% 47%)'
  stock-void: 'hsl(42 9% 78%)'
  stock-done: 'hsl(205 13% 41%)'
  stock-edge: 'hsl(41 6% 64%)'
  failed-soft: 'hsl(9 60% 91%)'
  success: 'hsl(141 40% 30%)'
  warning: 'hsl(36 100% 26%)'
typography:
  display:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.01em'
  headline:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '24px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  figure:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '26px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.01em'
    fontFeature: 'tnum'
  title:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '15px'
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
    fontFeature: 'tnum'
  label:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: '16px'
  card-head:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '11px'
    fontWeight: 700
    lineHeight: '22px'
    letterSpacing: '0.02em'
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
rounded:
  sm: '2px'
  lamp: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  slot-pitch: '112px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '36px'
  button-primary-hover:
    backgroundColor: 'hsl(210 13% 13% / 0.85)'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '36px'
  button-secondary-hover:
    backgroundColor: 'hsl(210 13% 13% / 0.06)'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '36px'
  button-ghost-hover:
    backgroundColor: '{colors.board-tint}'
    textColor: '{colors.ink}'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.stock-failed}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '36px'
  button-danger-hover:
    backgroundColor: '{colors.stock-failed}'
    textColor: '{colors.paper}'
  button-small:
    padding: '0 12px'
    height: '32px'
  input:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '36px'
  stock-tag:
    backgroundColor: '{colors.stock-quoted}'
    textColor: '{colors.ink}'
    typography: '{typography.caption}'
    rounded: '{rounded.sm}'
    padding: '0 8px'
    height: '22px'
  stock-tag-failed:
    backgroundColor: '{colors.stock-failed}'
    textColor: '#ffffff'
  tcard-head:
    backgroundColor: '{colors.stock-printing}'
    textColor: '{colors.ink}'
    typography: '{typography.card-head}'
    padding: '0 8px'
    height: '22px'
  tcard-body:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    padding: '6px 8px 8px'
  nav-item:
    backgroundColor: 'transparent'
    textColor: '{colors.rail-text}'
    rounded: '{rounded.sm}'
    padding: '0 10px'
    height: '36px'
  nav-item-hover:
    backgroundColor: '{colors.enamel-rail-raised}'
  nav-item-active:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
  stat-cell:
    backgroundColor: '{colors.board-ground}'
    textColor: '{colors.ink}'
    typography: '{typography.figure}'
    padding: '12px 16px'
  table-header:
    textColor: '{colors.ink-muted}'
    typography: '{typography.caption}'
    padding: '8px 16px'
  card:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    padding: '16px'
---

# Design System: 3D Print OS

## Overview

**Creative North Star: "The T-Card Planning Board"**

Every job is a coloured T-card hanging in a steel rack. The card's stock colour is its status, and it is the same colour everywhere: in the printer rack, in every status tag, in the swatch that leads a list row, in the brand mark. A printer is a slot column; a card's place in the column is its place in that printer's queue. The console sits on a warm grey board ground with an enamel steel-blue rail down the left. Paper-white card bodies are the only raised material.

The world is flat, square-cut and ruled. Structure comes from hairline rules and 2px ink rules under headers, not from boxes and shadows. Every number is set in tabular figures in Archivo. Density is high: it is a working board for staff at a desk and on a phone beside the printers, and it shows what every printer is doing and what needs a hand in one glance. Dark mode is the same rack at night. The ground and rail turn deep enamel blue, card bodies turn slate, the stock colours deepen but keep their identity, and ink becomes warm off-white. Nothing glows and nothing is pure black.

Rejected (confirmed by the build and PRODUCT.md): white-card SaaS consoles with indigo pills and stat tiles, glass, gradients, neon, soft drop shadows on resting surfaces.

**Key Characteristics:**

- Status is a card-stock colour, one vocabulary across every screen.
- Square-cut corners (2px) everywhere; only status lamps are round.
- Flat surfaces; depth only for overlays that leave the board.
- Hairline rules and 2px ink rules build structure instead of boxes.
- Archivo with tabular figures on the whole body.
- Light and dark are both first-class; dark is the same rack at night.

## Colors

A warm grey board, a steel-blue enamel rail, ink near-black, and a set of flat card-stock fills where each hue means exactly one status. Values are HSL triplets in `apps/web-admin/src/styles/globals.css` (`:root` and `.dark`); the frontmatter records light-mode values and the sidecar records the dark pair for each.

### Primary

- **Workshop Ink** (ink): text, primary buttons, the 2px rules under table heads, card headers, dialogs and the KPI strip. In dark mode it flips to warm off-white and primary buttons become light-on-dark.
- **Enamel Steel Rail** (enamel-rail): the left navigation rail and the revenue mini-bars. In light mode it is also the focus ring colour. Raised Rail (enamel-rail-raised) is the tenant plate and the nav hover fill; Rail Text and Rail Muted (rail-text, rail-muted) are the rail's labels and its section titles and counts.

### Secondary: Card Stock

Each stock is a flat fill with ink text and a 1px Stock Edge (stock-edge) outline.

- **Draft Paper** (stock-draft): drafts, not-started production, pending orders. Same as the card paper.
- **Quoted Yellow** (stock-quoted): quoted, paused, payment pending. It is also the "current" marker: the active nav item's 3px head, today's revenue bar, the brand mark's head, text selection, and the dark-mode focus ring.
- **Approved Green** (stock-approved): approved quotes, accepted orders, queued jobs, paid.
- **Printing Blue** (stock-printing): printing / in progress. Also the "running" printer lamp.
- **QC Salmon** (stock-qc): quality check.
- **Failed Red** (stock-failed): failed print or payment. Carries white text, not ink. It is also the destructive colour, the failure strip's tab, and the alert count in the rail.
- **Void Grey** (stock-void): cancelled and refunded. The tag text is struck through.
- **Done Slate** (stock-done): completed and delivered. Carries paper text.

### Tertiary: Signal

- **Failed Soft** (failed-soft): the ground of error notices and the dashboard failure strip.
- **Ledger Green** (success) and **Amber Ink** (warning): text-only tones for KPI hints and outline badges. Each has a soft ground in the CSS (`--success-soft`, `--warning-soft`) that the build barely uses.

### Neutral

- **Board Ground** (board-ground): the page background, the top bar and the KPI strip cells.
- **Card Paper** (paper): card bodies, inputs, popovers, the active nav item.
- **Board Tint** (board-tint): muted fills: ghost-button hover, skeletons, row hover at 70%.
- **Muted Ink** (ink-muted): secondary text, table header labels, hints.
- **Rack Bed** (rack-bed), **Slot Rail** (slot-rail) and **Slot Highlight** (slot-highlight): the printer rack's bed, its 2px slot rails and their lit 1px top edge. Slot Rail is also the scrollbar thumb.
- **Hairline** (hairline): every 1px border and divider, plus the KPI strip's cell gaps.
- **Control Edge** (control-edge): input borders, dashed empty-slot outlines, link underlines.

### Named Rules

**The One Stock, One Meaning Rule.** A stock colour always means the same status, on every surface. Statuses use `StockTag`, `StockSwatch` or `TCard`. Outline `Badge` is for flags and attributes (Business, Active, Default) and never for status.

**The Yellow Head Rule.** Quoted Yellow is also the only "you are here / today" marker: the active nav item, today's bar, the brand mark. Don't introduce a second highlight hue.

**The Never Colour Alone Rule.** A lamp always has its word next to it, and a stock tag always carries its label. Colour backs up the text; it never replaces it.

## Typography

**Display / Body Font:** Archivo (with ui-sans-serif, system-ui), weights 400/500/600/700, loaded from Google Fonts.
**Mono Font:** JetBrains Mono (with ui-monospace), for order and tracking numbers only.

**Character:** A sturdy, slightly condensed grotesque that reads like stencilled board labels. The whole body is tabular-nums, so prices, counts and times line up in columns without extra classes.

### Hierarchy

- **Display** (700, 32px, 1.15): the auth-shell statement on the enamel panel. Not used inside the console.
- **Headline** (700, 24px, 1.25, -0.01em): one page title per screen ("Today on the floor"), via `PageHeader`.
- **Figure** (600, 26px from `sm`, 22px on phones, -0.01em, tabular): KPI strip values.
- **Title** (700, 15px): card headers, section headings (Printer rack, Recent quotes), empty-state titles, the wordmark. Dialog titles step up to 18px.
- **Body** (400, 14px/20px): table cells, descriptions, inputs, buttons (600 on buttons).
- **Label** (600, 13px): form labels, list-item names, rack-column printer names (700), small buttons, quote tabs.
- **Caption** (500 to 600, 12px): table head labels, hints, counts, stock tags (600).
- **Card Head** (700, 11px, 0.02em, uppercase): the status word in a T-card head and the `ERROR` / `FAILED` / `EMPTY SLOT` tabs. It is the card's own label, not a section kicker.

### Named Rules

**The Tabular Board Rule.** Figures are always tabular. Never switch a number back to proportional figures to make it look nicer.

**The Status Word Never Truncates Rule.** In a T-card head the status word keeps its full width, and the aside (order number, time) truncates instead.

## Layout

The staff console is a fixed 224px rail with a fluid work area. The work area has a 56px top bar (menu toggle below `lg`, New quote, theme toggle, user menu) over a scrolling main column capped at 1400px with 16px gutters, 24px from `sm`. Below `lg` (1024px) the rail becomes a 256px drawer over a scrim. The customer portal drops the rail for a top bar and horizontal tabs in a 1024px (`max-w-5xl`) column.

The dashboard runs top to bottom: headline with a one-line status sentence, then the KPI strip (2 columns, 4 from `xl` 1280px), the failure strip when a print failed, and the printer rack. The quotes list with status tabs sits under the rack and moves beside it in a 22rem column from `2xl` (1536px). The rack is one slot column per active printer (min 9.5rem, flexible), plus a "No printer yet" column that comes first when it holds cards. It scrolls sideways on desktop and stacks columns on phones. Slot rails repeat every 112px.

Spacing rhythm is 4px-based: 8px inside controls, 12px between rack columns and in KPI cells, 16px card padding and section gaps, 20px between major blocks. Touch targets grow to 44px on phones (rack card buttons, tabs, links) and shrink to 28 to 36px at `sm` and up.

## Elevation & Depth

The board is flat. Cards, the KPI strip, tables and the rack sit on the ground with no shadow. Depth comes from tone (paper on board, board on rack bed) and from rules. A T-card's body is inset 6px under its head and shares its edge colour, so the card reads as hung rather than lifted.

### Shadow Vocabulary

- **Overlay lift** (`box-shadow: 0 12px 28px -8px rgb(12 22 30 / 0.35), 0 2px 6px -2px rgb(12 22 30 / 0.2)`): dialogs, the mobile nav drawer, popovers. These are the only things that leave the board.
- **Scrim** (`hsl(205 34% 10% / 0.55)`): an enamel-tinted dim behind dialogs and the mobile drawer.
- **Card head marker** (`inset 0 3px 0` Quoted Yellow): draws the yellow head on the active nav item. This is a stock band, not depth.

### Named Rules

**The Only Overlays Lift Rule.** Resting surfaces have no shadow (`shadow-card` is `none`). A shadow means the element is floating above the board.

## Shapes

Square-cut card stock. Every radius token in Tailwind (`sm` to `xl` and the default) resolves to 2px, so a stray `rounded-lg` still comes out square. The only round shape is the 8px status lamp dot. Borders are 1px hairlines. A 2px ink rule marks the top of the KPI strip, the bottom of every table head, card header and rack column header, and the top edge of dialogs. Dashed 1px Control Edge outlines mean "empty slot / nothing here yet". The T-card is the recurring shape: a full-width 22px head with a narrower body hanging below it. The brand mark draws the same shape.

### Named Rules

**The 2px Ceiling Rule.** Nothing rounds past 2px except status lamps.

## Components

### Buttons

Plain and decisive, square-cut and labelled in semibold.

- **Shape:** 2px corners. Heights are 36px (md, 16px sides), 32px (sm, 12px sides), and 36px square for icon buttons.
- **Primary:** solid Workshop Ink with paper text. Hover goes to 85% and active to 75%. Use it once per context: New quote, Reprint on a failed card.
- **Secondary (default):** a 1px ink outline on transparent, with ink text and a 6% ink wash on hover. This is the rack-card action (Queue, Start print, Mark printed, Pass QC).
- **Ghost:** Muted Ink text, Board Tint on hover.
- **Danger:** a Failed Red outline and text that fills solid red on hover.
- **States:** 150ms colour transitions. Disabled is 45% opacity. Loading puts a spinner before the label. Focus is the global 2px ring (enamel in light, yellow in dark) with a 2px offset.

### Stock Tags and Swatches

- **StockTag:** a 22px tag in the stock fill with a 1px Stock Edge outline, 2px corners, 12px semibold. Void is struck through.
- **StockSwatch:** a 12px square of stock that leads a list row or table row.
- **Badge (flags only):** a 22px outline in a tone colour on transparent, 12px medium.

### Cards / Containers

- **Card:** Card Paper, 1px hairline, 2px corners, no shadow. The header has 16px/12px padding, a 15px bold title and a 2px ink rule below it. Content padding is 16px.
- **StatStrip / StatCard:** a grid of Board Ground cells split by 1px hairline gaps, under a 2px ink top rule. Cells have a 13px muted label, a figure, and a hint in a tone colour. An optional aside holds the 14-day mini-bars: 5px Enamel bars with today in yellow.
- **ErrorNotice / failure strip:** a Failed Soft ground with a 1px red outline, led by a solid red `ERROR` or `FAILED` card-head tab. It carries its action inline (Try again; Reprint and Open order).
- **EmptyState:** a dashed Control Edge outline, centred title and description, and an optional action. It says what belongs here.

### Inputs / Fields

- **Style:** 36px high, Card Paper fill, 1px Control Edge border, 2px corners, 12px sides, 14px text.
- **Hover / Focus:** the border darkens to 60% ink on hover. On focus the border turns full ink and the ring sits flush (no offset).
- **Error / Disabled:** a Failed Red border over a 40% Failed Soft wash, with the message in red below. Disabled is 60% opacity with a not-allowed cursor.
- **Field:** a 13px semibold label, the control, then a 12px hint or error, spaced 6px apart.

### Tables

One table size. 14px body. Head cells are 12px semibold Muted Ink over a 2px ink rule. Rows have 1px hairline dividers, 16px horizontal and 10px vertical padding, and a Board Tint hover at 70% when clickable. Order numbers are 12px mono.

### Navigation

- **Rail:** Enamel Steel ground. The wordmark sits on top of a Raised Rail tenant plate. Sections (Sales / Production / Business) have 12px semibold Rail Muted titles. Items are 36px with a 16px icon in Rail Muted.
- **Active item:** the card pulled from the rack. It has a paper fill, ink semibold text and a 3px Quoted Yellow head.
- **Counts:** tabular 12px Rail Muted. A failure count becomes a solid red tag with white bold text.
- **Tabs (quotes list):** 13px text over a 2px ink underline on the selected tab and Muted Ink on the others.

### Status Lamp

An 8px round dot in a stock fill with a 1px Stock Edge ring, followed by its 12px semibold word. The tones are running (Printing Blue), ready (Approved Green), waiting (Quoted Yellow), fault (Failed Red, word also red) and off (Void Grey).

### T-Card and Printer Rack (signature)

- **T-Card:** a 22px stock head (11px bold uppercase status word on the left, an underlined order-number link that truncates on the right) over a Card Paper body inset 6px each side. The body has 6px/8px/8px padding and shares the Stock Edge outline with no top border. A failed card gets a 2px Failed Red outline on its body. The body holds the customer (13px semibold), price and age (12px muted, tabular) and one next-action button.
- **Printer Rack:** a Rack Bed panel with a 1px Slot Rail border and 12px padding. Each column header has the printer name (13px bold), a lamp and a job count over a 2px ink rule. Below it, slot rails (2px Slot Rail with a 1px Slot Highlight edge) repeat every 112px, with cards hanging 16px apart. An empty column shows a dashed "EMPTY SLOT" T-card with instructions.
- **Motion:** when a card changes status it re-keys and plays `slot-in`: a 6px drop over 180ms in two hard steps (`steps(2, end)`), like a card pushed into a slot. Reduced motion collapses every animation and transition to 1ms.

## Do's and Don'ts

### Do:

- **Do** show every status as its card stock (`StockTag`, `StockSwatch`, `TCard`), using the same stock on every surface.
- **Do** keep corners at 2px; only status lamps are round.
- **Do** build structure with 1px hairlines and the 2px ink rule under headers, not with nested boxes.
- **Do** keep resting surfaces flat; only overlays get the lift shadow, over the enamel scrim.
- **Do** pair every lamp and tag with its word.
- **Do** design dark mode as the same rack at night: enamel-blue ground, slate bodies, deepened stock, warm off-white ink.
- **Do** put the card's next action on the card itself and grow touch targets to 44px on phones.

### Don't:

- **Don't** use outline `Badge` or ad-hoc coloured pills for statuses.
- **Don't** add drop shadows to cards, KPI cells, tables or the rack.
- **Don't** add glass, gradients, neon or glow. In dark mode, don't use pure black.
- **Don't** add a second highlight hue; Quoted Yellow is the only "current" marker.
- **Don't** use proportional figures for prices, counts or times.
- **Don't** truncate the status word in a T-card head.
