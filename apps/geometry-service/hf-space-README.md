---
title: 3D Print OS Slicer
emoji: 🖨️
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

Geometry and slicing service for 3D Print OS (PrusaSlicer CLI behind FastAPI).

This Space is deployed automatically from the `apps/geometry-service` folder of the
3D Print OS repository. Every endpoint except `/` and `/api/v1/health` requires the
`X-Service-Key` header matching the Space secret `SERVICE_API_KEY`.
