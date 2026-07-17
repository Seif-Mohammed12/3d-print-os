---
status: Accepted
date: 2026-07-17
---

# ADR 0002 — Technology stack

## Context

Need a maintainable stack for API, workers, and two web clients with one small team.

## Decision

- **TypeScript** everywhere for commercial logic
- **NestJS** API + worker hosts
- **React + Vite** admin and portal
- **PostgreSQL + Redis** (wired in later milestones)
- **pnpm** workspaces monorepo
- **Python workers** only for geometry/ML/slicing later
- **Clerk** AuthN and in-house AuthZ (M1+)
- **Stripe** (SaaS) + **Paymob** (Egypt shop payments) later

## Consequences

- Strong hiring/ecosystem fit
- Dual runtime (Node + Python) only where specialized compute requires it
- CommonJS Nest apps consuming workspace packages; web apps remain ESM via Vite
