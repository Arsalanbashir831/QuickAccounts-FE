# Dotcode Web

The Next.js frontend foundation for Dotcode, a retail and wholesale ERP backed by the existing Django/DRF application.

## Current milestone

Implemented:

- Access plus nine company-scoped business workspaces
- Responsive App Router shell and validated workspace views
- Neutral semantic design tokens and local shadcn-compatible primitives
- Company-scoped TanStack Query runtime
- Typed transport, permission, query-key and command-state boundaries
- Chart of Accounts preview with local form validation
- Loading, error, empty and demo-integration states
- Unit and browser-test foundations

The visible records are explicitly marked as demo fixtures. Sign-in and financial commands are disabled until the real Django OpenAPI and session/CSRF contracts are reviewed. Production code must never fall back to fixtures after a failed request.

## Requirements

- Node.js 22 or newer
- pnpm 11.20.0

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open `http://localhost:3000/access`, then use **Open demo workspace**.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

Playwright also requires its Chromium binary:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Architecture

- `src/app` owns routing, layouts and lifecycle boundaries.
- `src/features` owns business behavior and feature-local adapters, queries and schemas.
- `src/components/ui` contains generic primitives only.
- `src/components/shared` contains reusable ERP compositions without feature business rules.
- `src/lib/api` owns transport concerns, never domain mapping.
- Django remains authoritative for totals, taxes, stock effects, accounting and authorization.

The detailed route, ownership and acceptance contract is in [QuickAccounts_Nextjs_Implementation_Guide.md](./QuickAccounts_Nextjs_Implementation_Guide.md).

## Backend connection checklist

1. Export and review the current Django OpenAPI document.
2. Complete `docs/backend-contract-map.md` with actual methods, paths and error semantics.
3. Generate `src/lib/api/generated/schema.d.ts` from the reviewed schema.
4. Implement server session/company bootstrap and CSRF behavior.
5. Connect one harmless read and draft command before enabling confirmed financial actions.

## Deployment assumptions

Deploy as a server-rendered Next.js application. Prefer the same public origin for the browser and Django API, routing the agreed API prefix at the reverse proxy. Keep private origins and secrets in server-only environment variables. Authenticated responses must not be stored in a shared public cache.
