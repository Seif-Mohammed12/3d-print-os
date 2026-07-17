---
status: Accepted
date: 2026-07-17
---

# ADR 0001 — Modular monolith

## Context

3D Print OS must support one production shop now and thousands of tenants later. Premature microservices increase ops cost and slow a small team.

## Decision

Build a **modular monolith** (NestJS) with strict bounded contexts under `modules/*`, Clean Architecture layers, and an extraction path via ports/events.

## Consequences

- Faster delivery and simpler deployments early
- Requires discipline (dependency rules + CI guards later)
- Geometry/ML/slicing may become separate workers/services when CPU isolation demands it
