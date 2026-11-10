# 100ToolCrate: Three-Phase Production Readiness Plan

The project will retain its static site generator at the repository root and gain a dedicated `backend/` application. A single VPS is appropriate at the current scale: Nginx terminates HTTPS, Node serves the generated site and API, and SQLite stores operational data on the same machine with automated backups. Managed PostgreSQL and object storage can be introduced later without changing the public frontend.

## Phase 1 — Production architecture and secure deployable baseline

**Status: COMPLETE**

- [x] Document the final root directory layout and single-VPS architecture.
- [x] Replace the monolithic server entry with a small compatibility launcher for `backend/`.
- [x] Add validated environment configuration, centralized errors, request IDs, structured logs, timeouts, and graceful shutdown.
- [x] Add SQLite with versioned migrations, WAL mode, prepared statements, and migration of existing anonymous tool counters.
- [x] Preserve real public routes while removing mock OAuth success responses and other misleading behavior.
- [x] Harden HTTP security, rate limits, static-file allowlists, canonical clean URLs, caching, and health/readiness endpoints.
- [x] Add Nginx and hardened systemd templates, deployment instructions, and a database backup command.
- [x] Add backend integration tests and run the complete build, SEO audit, and tests.

**Phase 1 acceptance: PASSED.** The project builds successfully; the SEO audit reports 156 pages and zero errors/warnings; nine backend integration/security tests pass; all 154 canonical production routes return 200; `/healthz` and `/readyz` pass; all 122 legacy counters migrate; backup integrity and foreign-key checks pass; SIGTERM exits cleanly; and `npm audit --omit=dev` reports zero vulnerabilities. Full instructions are in `deploy/README.md`.

## Phase 2 — Storefront, products, orders, and payments

**Status: NOT STARTED — wait for owner approval after Phase 1**

- Add a database-backed product catalog for sponsorship placements and other clearly defined offers.
- Build the public storefront, availability rules, accessible product pages, order creation, order lookup, and honest pending/paid/expired states.
- Integrate Stripe Checkout and signed webhooks when credentials exist; use clearly labeled test mode or manual invoicing when they do not.
- Add idempotent checkout/webhook processing, inventory/date-conflict protection, receipts, refund/cancellation records, and transactional email with a real provider or a disclosed disabled state.
- Keep the current free tools available and never represent an unpaid inquiry as a purchase.
- Add storefront/payment integration tests using provider test events, not fabricated successful payments.

## Phase 3 — Owner dashboard, operations, and final hardening

**Status: NOT STARTED — wait for owner approval after Phase 2**

- Add secure owner authentication, sessions, CSRF protection, login throttling, and optional WebAuthn/TOTP enrollment.
- Build product, availability, order, sponsor, refund, and fulfillment management end to end.
- Add content/workflow controls with validation and audit history rather than arbitrary unauthenticated file editing.
- Add operational dashboards backed by real database/analytics records, exportable CSV data, and no invented revenue or traffic metrics.
- Add immutable audit logs, backup/restore verification, retention tools, accessibility checks, dependency review, and final production runbooks.
- Run full build, unit/integration/security tests, and a clean-VPS deployment rehearsal before marking the system ready.

## Deployment decision

**Yes: initially run frontend, backend, and SQLite on the same VPS.** This reduces cost, latency, and operational complexity. The backend remains isolated in `backend/` so it can later move to a separate service. Do not expose SQLite or Node publicly: only Nginx listens on ports 80/443; Node binds to `127.0.0.1`; database and uploaded operational data stay outside the public static allowlist.

A two-core VPS with 2–4 GB RAM is a reasonable starting point for this client-side tools site. Actual capacity must be established with load testing and real traffic rather than assumed.
