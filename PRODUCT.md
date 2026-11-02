# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Shop staff** (roles `owner`, `admin`, `employee`) of a 3D printing business. They work at a desk or laptop for quoting, pricing, orders, customers and reports, and on a phone or tablet on the shop floor next to the printers for the production queue and printer status.
2. **Shop customers** using the customer portal, mostly on phones: upload an STL, pick printer/material/options, see a live quote, and track their quotes and orders.

## Product Purpose

3D Print OS is a multi-tenant operations platform for 3D printing businesses: quotes, model geometry, slicer-accurate pricing, orders, production queue, printers, materials, customers and analytics. First tenant is 3D Print It (Egypt); later it is sold as SaaS to other print shops. Success means a shop can go from an uploaded model to a priced quote to a finished print without spreadsheets, and trust the numbers.

## Positioning

Prices come from a real slice (PrusaSlicer CLI with the shop's own printer and material profiles, auto-orientation choosing the cheapest stable pose), not from volume ratios. The platform is built by people who run a print shop. It is not a marketing website.

## Operating Context

- Staff app lives under `/app`; customer portal under `/portal`. Same React app, role-gated.
- Core loop: upload model → geometry analysis + slice → priced quote (time, grams, layers, per-feature filament, price breakdown) → approve → order → production queue → printer → quality check → done.
- Money is stored in integer minor units in the tenant's currency and tax rate.
- Light and dark themes both exist and must keep working.

## Capabilities and Constraints

- Stack: React 19 + Vite + TypeScript, Tailwind 3, TanStack Query, Zustand, three.js for model previews, lucide icons.
- API, routes, data hooks and business logic are fixed. Design work is frontend presentation only.
- Multi-tenant: shop name comes from the tenant. The platform chrome must not be branded as 3D Print It.
- Must work at 375px (portal, queue, printers) as well as desktop.

## Brand Commitments

- Product name: **3D Print OS**.
- Shares DNA with the 3D Print It website (honest, specific, ruled rows, tabular numbers; no glass, gradients or neon), but has its own identity, since other shops will use it.
- Voice: plain and specific. No "Unlock", "Elevate", "Seamless", "Next-gen" filler.

## Evidence on Hand

- No customer logos, testimonials or usage numbers. Do not invent any.
- Real data shown comes from the API; demonstration data must be labelled as such.

## Product Principles

1. **The slice is the truth.** Show where a number came from (time, grams, layers, rule) next to the number.
2. **Fast on the floor.** Queue and printer status must be readable at a glance on a phone held next to a machine.
3. **Numbers first.** Prices, durations and weights are the content; set them so they compare cleanly.
4. **Any shop's tool.** Neutral enough for any tenant, specific enough to feel made for printing.
