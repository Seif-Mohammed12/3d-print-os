# Contributing to 3D Print OS

Welcome. This repository is a multi-tenant manufacturing SaaS platform.  
Read and follow **[Engineering Standards](docs/ENGINEERING_STANDARDS.md)** before opening a PR.

## Quick start for contributors

1. Branch from `main`: `feat/<ticket>-short-name`
2. Keep changes inside the correct module/layer
3. Add tests for domain, authz, and tenancy-sensitive paths
4. Use Conventional Commits
5. Open a PR with summary, risk, and test plan
6. Address review using the checklist in the standards doc

## Priority order

Security → Reliability → Maintainability → Scalability → Performance → Speed

## Do not

- Bypass tenant isolation “just for now”
- Import another module’s infrastructure or tables
- Silently reprice issued quotes
- Merge to `main` with red CI
- Add dependencies without justification in the PR

## Questions

If a change alters architecture (tenancy, auth, messaging, payments, service extraction), write or update an ADR under `docs/adr/` and get explicit approval before implementing.
