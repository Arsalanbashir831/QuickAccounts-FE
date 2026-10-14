# QuickAccounts — Next.js Folder Structure and Implementation Guide

Version 1.0 · 08 October 2026  
Deliverable: step-by-step engineering specification, page map, component map and reference code.  
Product scope: retail and wholesale ERP with outlets, optional warehouses, serials, returns, warranty, repairs and accounting.  
Frontend: Next.js App Router, TypeScript, shadcn/ui and Tailwind CSS.  
Backend: the existing Django/DRF application, connected through verified API adapters.  
Theme: pending the owner's direction; use neutral semantic tokens during implementation.

## Contents

1. [Implementation contract](#1-implementation-contract)
2. [Pages, routes and view names](#2-pages-routes-and-view-names)
3. [Stack and initial setup](#3-stack-and-initial-setup)
4. [Folder structure](#4-folder-structure)
5. [shadcn structure and reusable components](#5-shadcn-structure-and-reusable-components)
6. [State, scope and backend integration](#6-state-scope-and-backend-integration)
7. [Reference implementation patterns](#7-reference-implementation-patterns)
8. [Chart of accounts implementation](#8-chart-of-accounts-implementation)
9. [Workspace implementation specifications](#9-workspace-implementation-specifications)
10. [Step-by-step build sequence](#10-step-by-step-build-sequence)
11. [Verification and acceptance](#11-verification-and-acceptance)
12. [Delivery and coding-agent instructions](#12-delivery-and-coding-agent-instructions)
13. [Sources and decisions](#13-sources-and-decisions)

## 1. Implementation contract

Build **9 business workspaces plus 1 Access screen**. First-time setup is a mode of Settings. Company selection is a shared control. New invoice, payment, account, product, location, serial entry, approval and print preview are views or contextual editors, not additional top-level screens.

This guide follows QuickAccounts_Complete_UX_Flows_and_Screen_Map.md version 2.0 and the subsequent chart-of-accounts discussion. It supersedes older frontend navigation proposals that gave every operation its own page.

This is an implementation guide, not a claim that the app or backend endpoints have been built. No application repository was inspected in this documentation task. The four legacy files named by the frontend skill—quickaccounts-frontend-guidelines.md, erp-backend-architecture-and-apis.md, erp-accounting-backend-schema.sql and erp-backend-test-cases.md—were not present under those names in the working directory. The current UX specification is available. Verify the running backend and its current OpenAPI document before connecting commands.

### Non-negotiable product decisions

- Sales normally occur at outlets; warehouse direct selling requires an explicit company policy.
- A company has its own accounts and records. Location filters do not replace company authorization.
- Daily work uses business terms. Debit/credit and journal controls are available only to authorized accounting users.
- Use one Sell editor with an inline payment section; do not force an everyday cashier through a long wizard.
- Use predefined account groups and server-managed default mappings.
- Bulk serial registration identifies existing received units; it must not receive the quantity again.
- Preserve original sale, replacement chain, physical custody and supplier recovery separately.
- Backend services calculate authoritative totals, taxes, journals, stock effects and entitlement.
- Access follows sign-in, business registration and administrator approval where configured.
- Manufacturing, BOMs, software-license activation, offline financial posting and automated bank feeds are outside this baseline.
- Theme, brand colors, typography and decorative animation remain open decisions.
- Keep the real business states even when consolidating the UI. Ten pages do not mean ten states or ten backend operations.

### Architectural decision

Use one Next.js application initially. No monorepo, microfrontends or custom component package is needed for this scope. Keep the Django application as the owner of business transactions.

Dependency direction:

1. App Router pages and layouts assemble workspaces.
2. Workspaces assemble feature components and shared business components.
3. Feature hooks call typed feature adapters.
4. Adapters use the shared transport and verified Django contracts.
5. shadcn primitives and generic layouts know nothing about invoices, accounts or stock.

## 2. Pages, routes and view names

`(public)` and `(erp)` are route groups, not URL segments. `[companyId]` is the route parameter. Every business page also receives the authenticated tenant context if the backend uses a separate tenant identifier.

| ID | Page name | URL | Workspace entry | Views |
|---|---|---|---|---|
| A01 | Access | /access | AccessWorkspace | sign-in, register, recover, reset, invitation, pending |
| W01 | Home | /c/[companyId]/home | HomeWorkspace | overview, tasks, approvals |
| W02 | Sales | /c/[companyId]/sales | SalesWorkspace | sell, invoices, orders |
| W03 | Purchases | /c/[companyId]/purchases | PurchasesWorkspace | orders, receiving, bills |
| W04 | Stock | /c/[companyId]/stock | StockWorkspace | stock, products, transfers, counts, activity |
| W05 | Returns & Warranty | /c/[companyId]/returns | ReturnsWorkspace | customers, suppliers, repairs |
| W06 | Money | /c/[companyId]/money | MoneyWorkspace | activity, cash-bank, accounts, staff-pay |
| W07 | Contacts | /c/[companyId]/contacts | ContactsWorkspace | customers, suppliers, staff |
| W08 | Reports | /c/[companyId]/reports | ReportsWorkspace | catalog or a selected report |
| W09 | Settings | /c/[companyId]/settings | SettingsWorkspace | business, locations, team, rules, data |

Root `/` can redirect to Access or the user's last permitted Home. It is a routing utility, not an eleventh business screen.

### URL conventions

| Intent | Example |
|---|---|
| List sales invoices | /c/company-id/sales?view=invoices&site=outlet-id |
| Open one invoice | /c/company-id/sales?view=invoices&record=invoice-id |
| Resume a sale draft | /c/company-id/sales?view=sell&draft=draft-id |
| Inspect an account | /c/company-id/money?view=accounts&group=group-id&record=account-id |
| Inspect a transfer | /c/company-id/stock?view=transfers&record=transfer-id |
| Register a receipt's serials | /c/company-id/purchases?view=receiving&record=receipt-id&action=serials |
| Company setup | /c/company-id/settings?mode=setup |
| Stock report | /c/company-id/reports?report=stock-on-hand&site=outlet-id |

These are frontend routes, not claims about Django endpoint paths. Use opaque identifiers. Do not put names, serial lists, payment values or session tokens into query strings.

- Validate view and action values against each workspace's allowlist.
- A URL can request an action, but permissions and document state decide whether it is available.
- Selecting a record normally uses browser history so Back closes it.
- Search/filter edits can replace history rather than creating a history entry for every keystroke.
- Preserve unrelated filters; reset pagination when search, site or status changes.
- Direct links must validate the company, site and record independently.
- Reset/password invitation secrets require the backend's specific flow and should not become routine analytics or application log fields.

## 3. Stack and initial setup

### Technology choices

| Concern | Choice | Reason |
|---|---|---|
| Application | Next.js App Router, TypeScript strict | Clear routing and server/client boundaries |
| UI primitives | shadcn/ui, one chosen base implementation | Local, editable components with consistent conventions |
| Styling | Tailwind CSS v4, semantic CSS variables | Theme changes remain centralized |
| Icons | lucide-react | Consistent icon language; labels still required |
| Server state | TanStack Query v5 | Query cancellation, scoped caching and invalidation |
| Forms | React Hook Form + Zod | Field errors and typed validation |
| Tables | TanStack Table v8 with shadcn Table | Reusable table behavior and server paging |
| Large row lists | TanStack Virtual when measured necessary | Bulk serial lists without thousands of mounted fields |
| Decimal previews | decimal.js | Avoid floating-point financial arithmetic |
| API contracts | OpenAPI-generated types plus feature adapters | Match the actual Django API |
| Tests | Vitest, Testing Library, Playwright | Domain UI tests and a small set of complete flows |

This guide uses current Next.js 16-era conventions, including asynchronous page params. Do not upgrade an existing app merely to follow this document; first check its dependency versions and migrations. For a fresh project, resolve compatible patched versions, record them, commit the lockfile, then use frozen installs. The Next.js installation documentation lists Node 20.9 as a minimum; use a currently supported Node LTS compatible with the selected Next.js release, not the minimum merely because it starts.

### Step A — create the application

Run this only for a new frontend directory. For an existing project, inspect package.json, preserve its history and apply changes incrementally.

~~~bash
pnpm create next-app@latest quickaccounts-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd quickaccounts-web
pnpm dlx shadcn@latest init
~~~

During shadcn initialization, select one component base and retain it consistently. The examples in this guide assume Radix-compatible generated components. Use the neutral preset as a temporary starting point; it is not the final QuickAccounts theme. If an existing project uses Base UI, preserve that choice and adapt composition APIs rather than mixing incompatible copies.

### Step B — add primitives

~~~bash
pnpm dlx shadcn@latest add button input label field textarea select checkbox switch card badge separator tabs table sheet dialog alert-dialog dropdown-menu popover command calendar tooltip skeleton scroll-area sidebar breadcrumb sonner progress accordion
~~~

Install additional primitives only when a screen needs them. A date picker, remote product search, ERP data table and account tree are compositions you build; a shadcn Table is not already a complete server-paginated ERP table.

### Step C — add domain and testing dependencies

~~~bash
pnpm add @tanstack/react-query@5 @tanstack/react-table@8 @tanstack/react-virtual@3 react-hook-form @hookform/resolvers zod@4 decimal.js lucide-react server-only
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test msw openapi-typescript
pnpm exec playwright install chromium
~~~

Use the generated package's compatible React and React DOM pair. Keep one package manager. Do not mix npm, pnpm and yarn lockfiles.

Suggested scripts to merge into package.json:

~~~json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "next typegen && tsc --noEmit",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
~~~

Lint is an explicit check; do not assume a successful Next.js build also ran ESLint. Configure Vitest aliases/jsdom and Playwright's development or test server before expecting these scripts to pass.

## 4. Folder structure

The following is a target structure, not an instruction to create hundreds of empty files. Create each feature's supporting folders when its implementation step starts.

### 4.1 Application and shared layers

~~~text
quickaccounts-web/
  package.json
  pnpm-lock.yaml
  components.json
  next.config.ts
  tsconfig.json
  eslint.config.mjs
  postcss.config.mjs
  vitest.config.ts
  playwright.config.ts
  .env.example
  .gitignore
  README.md

  public/
    brand/
    product-placeholder.svg

  docs/
    implementation-guide.md
    backend-contract-map.md
    backend-openapi.json
    permission-map.md
    acceptance-checklist.md

  src/
    app/
      layout.tsx
      globals.css
      page.tsx
      not-found.tsx
      global-error.tsx

      (public)/
        access/
          page.tsx

      (erp)/
        c/
          [companyId]/
            layout.tsx
            loading.tsx
            error.tsx
            home/
              page.tsx
            sales/
              page.tsx
            purchases/
              page.tsx
            stock/
              page.tsx
            returns/
              page.tsx
            money/
              page.tsx
            contacts/
              page.tsx
            reports/
              page.tsx
            settings/
              page.tsx

    components/
      ui/
        button.tsx
        input.tsx
        field.tsx
        table.tsx
        sheet.tsx
        dialog.tsx
        sidebar.tsx
        [other CLI-generated shadcn primitives]

      layouts/
        dashboard-layout.tsx
        record-workspace-layout.tsx
        transaction-editor-layout.tsx
        grouped-detail-layout.tsx
        report-layout.tsx

      shell/
        app-shell.tsx
        app-sidebar.tsx
        app-header.tsx
        company-location-context.tsx
        global-lookup.tsx
        workspace-header.tsx

      shared/
        records/
          record-table.tsx
          document-inspector.tsx
          activity-timeline.tsx
          status-badge.tsx
        editors/
          editor-frame.tsx
          task-panel.tsx
          review-and-approval.tsx
          draft-navigation-guard.tsx
        fields/
          decimal-input.tsx
          quantity-input.tsx
          date-range-field.tsx
          remote-combobox.tsx
        documents/
          attachments-and-notes.tsx
          print-document.tsx
        feedback/
          state-feedback.tsx
          empty-state.tsx
          inline-error.tsx

    providers/
      company-runtime-provider.tsx
      permission-provider.tsx
      draft-provider.tsx

    hooks/
      use-workspace-url.ts
      use-debounced-value.ts
      use-scanner-input.ts
      use-disclosure.ts

    lib/
      api/
        client.ts
        server.ts
        errors.ts
        contract-types.ts
        verified-contracts.ts
        generated/
          schema.d.ts
      auth/
        csrf.ts
        safe-redirect.ts
      query/
        keys.ts
        invalidation.ts
      permissions/
        actions.ts
        can.ts
      commands/
        command-types.ts
        command-state.ts
        command-registry.ts
      format/
        money.ts
        quantity.ts
        dates.ts
      routing/
        routes.ts
        view-state.ts
      env/
        server.ts
      utils.ts

    types/
      scope.ts
      pagination.ts
      money.ts
      documents.ts

    config/
      navigation.ts
      workspace-views.ts

    features/
      [feature folders listed below]

  tests/
    unit/
    components/
    contracts/
    e2e/
    fixtures/
    msw/
      handlers.ts
      server.ts
~~~

Root page.tsx redirects. The ten registered page templates are Access and the nine workspace pages. loading/error/not-found are lifecycle states, not extra sidebar destinations.

Keep error.tsx and global-error.tsx as client error boundaries; global-error.tsx supplies its own html/body fallback. A shared hook using useSearchParams must follow Next.js rendering rules; wrap relevant client sections in Suspense where static rendering requires it. Do not mix server-only API helpers into client imports to work around build errors.

A src/proxy.ts may be added only if a concrete redirect/rewrite requirement needs it. It is not the authorization boundary. Next.js 16 uses the Proxy convention; do not add both an old middleware.ts and proxy.ts to implement the same behavior.

No catch-all Next.js API proxy is required for the default deployment. Route the agreed Django API prefix to Django at the reverse proxy; leave application pages with Next.js.

### 4.2 Feature ownership and entry points

| Feature directory | Entry/components | Owns |
|---|---|---|
| features/auth | access-workspace.tsx; sign-in-form, registration-form, approval-status | Access and invitation/recovery states |
| features/company | company-selector, location-selector; server/require-company-access.ts | Authenticated context and allowed sites |
| features/home | home-workspace.tsx; task-queue, action-cards | Role dashboard, tasks and approvals |
| features/sales | sales-workspace.tsx; sell-editor, invoice-list, order-view | Quotes, orders, invoices and fulfillment |
| features/purchases | purchases-workspace.tsx; purchase-editor, receipt-editor, bill-editor | Orders, physical receiving and bills |
| features/inventory | stock-workspace.tsx; products-view, stock-table, transfer-editor, count-editor | Products, stock, serials and transfers |
| features/service | returns-workspace.tsx; case-workbench, repair-job-editor | Customer/supplier cases and repairs |
| features/payments | money-workspace.tsx; settlement-editor, allocation-picker, expense-editor | Money intents and allocation |
| features/banking | bank-accounts-view, reconciliation-view | Cash/bank history and matching |
| features/accounts | accounts-view, account-group-tree, account-form | COA, mappings, opening/closing tools |
| features/parties | contacts-workspace.tsx; party-picker, party-profile | Customer/supplier profiles and balances |
| features/staff | staff-profile, staff-pay-view, pay-run-editor | Staff data, advances and basic salary |
| features/reports | reports-workspace.tsx; report-viewer, report-filters | Typed report catalog and results |
| features/settings | settings-workspace.tsx; setup-view, location-form, team-view | Company rules, setup, access and data tools |

MoneyWorkspace composes payments, banking, accounts and staff. ReturnsWorkspace composes customer/supplier cases and repairs. Workspaces are navigation containers; feature boundaries follow business ownership.

### 4.3 Internal feature pattern

Use the same small convention where a feature needs it:

~~~text
features/accounts/
  accounts-view.tsx
  public.ts
  api/
    accounts.api.ts
  queries/
    account.keys.ts
  hooks/
    use-accounts.ts
    use-account-commands.ts
  schemas/
    account.schema.ts
  types/
    account.types.ts
  components/
    account-group-tree.tsx
    account-table.tsx
    account-form.tsx
    account-details.tsx
    account-activity.tsx
    mapping-editor.tsx
    opening-balances-panel.tsx
    period-controls-panel.tsx
  __tests__/
    account-form.test.tsx
    account-mapping.test.ts
~~~

- page.tsx resolves route input and renders the workspace; it should not contain a 500-line form.
- api files translate actual wire contracts to feature types.
- queries files define stable keys, not fetch functions hidden inside presentation.
- hooks compose queries/commands and invalidation.
- schemas validate user input; server validation remains authoritative.
- components render the feature.
- public.ts exports the small supported cross-feature API. It must not re-export server-only modules.
- Keep server code in explicit server/ modules with import "server-only".
- A shared folder must not become a dumping ground for unrelated business rules.
- Do not put each table, form and modal into a separate Next.js route.
- Extract a second implementation into a shared component when behavior is actually shared, not just because two files both contain an input.

### 4.4 Import rules

| Importer | Allowed dependencies |
|---|---|
| components/ui | UI utilities and primitive dependencies |
| components/layouts | UI primitives and layout-only utilities |
| components/shared | UI/layout primitives and generic typed props |
| feature components | Shared components, own hooks/types, other features' public exports |
| feature API adapters | Shared transport, generated contracts, own schemas/types |
| app pages/layouts | Workspace entries, server access helpers, providers |
| lib and types | No imports from app pages or feature UI |

Use ESLint restricted imports or a boundary plugin if one is already established. Avoid a universal barrel exporting every feature: it hides dependencies and can pull server modules into client bundles.


## 5. shadcn structure and reusable components

### 5.1 Keep primitives separate from ERP components

`src/components/ui` contains shadcn-generated code. Keep invoice logic, API hooks, permission queries and account mappings out of it. Wrap or compose these primitives in shared/feature components.

Configure the following fields in the generated components.json. This is a **merge fragment**, not a replacement for the CLI's complete file; preserve its chosen style/base and other generated settings.

~~~json
{
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
~~~

Tailwind v4 leaves the config path empty. Ensure tsconfig.json resolves `@/*` to `./src/*`. Use the generated CSS and token wiring instead of pasting Tailwind v3 directives or an unrelated theme over it.

### 5.2 Theme-independent styling

Use semantic classes such as bg-background, text-foreground, text-muted-foreground, border-border, bg-primary and text-primary-foreground.

- Centralize brand tokens in globals.css when the theme is approved.
- Use consistent spacing, focus treatment, type hierarchy and component variants now.
- A status needs a text label and, where helpful, an icon; it cannot depend only on red/green.
- Avoid embedding orange, purple, brand fonts or gradients in feature components.
- Use literal button text: Confirm Sale, Receive Stock, Add Expense Category, Record Refund.
- Use shadcn Sheet for short contextual work; long receipts and bulk serials use the editor layout.
- Sheet/Dialog must include accessible titles, descriptions where needed and focus restoration.
- Sonner notifications supplement durable inline results and field errors.
- A side panel on desktop can be full-screen on a phone without creating another route.
- Account-group navigation can be nested disclosure buttons. Use full ARIA tree roles only if the complete tree keyboard model is implemented.

### 5.3 Business component inventory

These are the 28 shared business components from the UX specification. Domain-specific reusable components stay in their owning feature; they need not all move to components/shared.

| ID | Component | Canonical ownership | shadcn building blocks | Reused by |
|---|---|---|---|---|
| C01 | AppShell | components/shell | Sidebar, Sheet, Separator | Nine workspaces |
| C02 | CompanyLocationContext | components/shell + features/company | Popover, Command, Select | All scoped work |
| C03 | GlobalLookup | components/shell | Command, Dialog, Input | Product, serial, party, document search |
| C04 | WorkspaceHeader | components/shell | Tabs, Button, Breadcrumb | All workspaces |
| C05 | RecordTable | components/shared/records | Table, Checkbox, DropdownMenu, Skeleton | Documents, parties and stock |
| C06 | DocumentInspector | components/shared/records | Sheet, Card, Badge, Tabs | Invoices, bills, credits, transfers |
| C07 | EditorFrame | components/shared/editors | Card, Button, Separator | All long transaction forms |
| C08 | TaskPanel | components/shared/editors | Sheet/Dialog, Field | Quick add, payment, approval |
| C09 | PartyPicker | features/parties | Popover, Command, Button | Sales, purchases, money, cases |
| C10 | ProductPicker | features/inventory | Command, Input, Badge | Sale, receipt, transfer, case |
| C11 | LineItemsEditor | features/inventory public UI | Table, Input, FieldError | Products/quantities in transactions |
| C12 | SerialCapture | features/inventory | Textarea, Input, Table, Progress | Receive, sell, move and return |
| C13 | StockContext | features/inventory | Select, Badge, Card | Source, destination, condition, availability |
| C14 | SettlementEditor | features/payments | Tabs/Select, Field, Input | Payments and financial resolutions |
| C15 | AllocationPicker | features/payments | Table, Checkbox, Input | Invoice/bill/credit allocation |
| C16 | CaseWorkbench | features/service | Tabs, Card, Badge | Customer, supplier and repair cases |
| C17 | UnitHistory | features/inventory | Sheet, Badge, Accordion | Serial provenance and replacement chain |
| C18 | QuantityProgress | features/inventory | Progress, Badge | Ordered/sent/arrived/accepted/pending |
| C19 | ReviewAndApproval | components/shared/editors | AlertDialog, Field, Button | Sensitive confirmed actions |
| C20 | AttachmentsAndNotes | components/shared/documents | Input, Textarea, Progress | Evidence and notes |
| C21 | ActivityTimeline | components/shared/records | Separator, Badge | Documents, parties and units |
| C22 | AccountGroupTree | features/accounts | Accordion/Collapsible, Button | Accounts and setup preview |
| C23 | AccountSelector | features/accounts | Popover, Command, Select | Real payment accounts/categories |
| C24 | ReportViewer | features/reports | Table, Card, Tabs | Report definitions and drilldown |
| C25 | ImportExportPanel | features/settings public UI | Sheet, Table, Progress | Parties, products, serials, opening data |
| C26 | PrintDocument | components/shared/documents | Button, Dialog | Invoice, receipt, slip and statement |
| C27 | TaskQueue | features/home | Card/Table, Badge, Button | Tasks, alerts and approvals |
| C28 | StateFeedback | components/shared/feedback | Skeleton, Card, Button | Loading, empty, failed, conflicted, result |

Shared domain widgets receive typed modes/props. LineItemsEditor owns row interaction; each sales/purchase/transfer controller owns its business validation and totals contract. Do not build an enormous switch statement that posts every transaction type.

### 5.4 Component behavior contracts

**RecordTable**
- Controlled server-side search, sorting and cursor pagination.
- Parent supplies rows, columns, stable IDs, loading/error state and permitted row actions.
- Selecting one row opens a record inspector; separate checkboxes handle bulk selection.
- Bulk actions must specify whether they target visible rows, selected IDs or a server-defined filtered set.
- No fetching hidden inside table.tsx. No client sorting of one fetched page while claiming all records are sorted.

**RemoteCombobox**
- Debounced server search, abort support, keyboard selection and stale-response guard.
- Product/cash-account results are scoped to permitted company/site context.
- No assumption that the initial 50 results contain every possible match.
- Quick add returns the created record to the calling form.

**EditorFrame**
- Owns the visual structure, dirty indicator, sticky totals/action area and result region.
- It does not calculate domain totals or authorize posting.
- Callers provide save draft, confirm, pending and error behavior.
- Prevent double submission. Preserve fields when a server rejects input.

**SerialCapture**
- Supports scanner, paste, CSV and manual corrections.
- Keeps serials as strings, including leading zeros.
- Shows required, supplied, unique-valid, rejected and remaining counts.
- Uses the backend's normalization rule; duplicate identity is company + product + normalized serial.
- Never invent missing serial values or silently strip meaningful characters.
- A bulk preview is not final authorization: commit must revalidate current state.
- Do not render 1,000 complete nested form controllers at once; use efficient rows, batches and virtualization where useful.
- Restrict scanner keyboard capture to explicit scan targets. Money fields must never receive scanner output.

**SettlementEditor**
- Explicit money direction, actual cash/bank source, amount and allocations.
- Approved credit, posted credit, paid, applied and remaining are different amounts.
- Separate cash tender/change from invoice payment allocation.
- Backend checks enforce balances and limits even if the user alters the request.

**TaskPanel**
- One active panel; opening a nested selector uses an internal Back action.
- Restore focus to the invoking control on close.
- Do not close automatically after a failed or uncertain command.
- Long mixed claims and serial batches use the full editor layout.

## 6. State, scope and backend integration

### 6.1 Decide where each state belongs

| State | Owner | Examples |
|---|---|---|
| Authenticated identity/context | Server bootstrap + scoped provider | User, tenant, permitted companies/sites |
| Server records | TanStack Query | Accounts, invoices, stock, outstanding bills |
| Shareable navigation | Validated URL | View, record ID, report ID, date/site filters |
| Unsaved form | React Hook Form / feature draft | Cart, receipt lines, expense details |
| Temporary UI | Local state | Open panel, expanded groups, focused scan row |
| Command identity | Command coordinator | Idempotency key, payload revision, pending result |
| Long-running work | Backend job record | Imports, exports, bulk serial validation |

Do not copy the same invoice into Query cache, a global store and component state. Edit a distinct draft and invalidate/refetch the server record after confirmed success.

No global Redux/Zustand store is required initially. Introduce a small store only for a demonstrated cross-component need; do not use it as a second server cache.

### 6.2 Company and location isolation

Maintain three separate values:

1. Authenticated tenant/company identity.
2. Viewing location filter, optionally All Locations.
3. Transaction location, fixed on the active draft.

Use user + tenant + company in the query root. Include location and filters wherever they change the returned data. Derive tenant membership from authenticated bootstrap, not from an arbitrary URL parameter.

On company change:
- Prompt to save/discard dirty work.
- Resolve submitted/unknown commands before abandoning their result.
- Stop old reads, unmount old forms, discard old company query data and load fresh permissions.
- A new provider instance must not display a previous company's rows while loading.

Canceling a browser request does not cancel a committed backend transaction. Late write results belong to the original company/draft and must not become a toast or row in the newly selected company.

All Locations is a filter only. A posted invoice's site does not change because the header filter changed. A shared bank account may be company-wide; do not pretend it has an independent bank balance at every outlet.

### 6.3 API contract map before wiring

Create docs/backend-contract-map.md with these columns:

| Feature operation | Actual method + path | Auth/CSRF | Scope | Input/output schema | Errors | Retry/revision policy | Status |
|---|---|---|---|---|---|---|---|

Inspect the real backend before completing each row. Required operations include:

- Session bootstrap, sign-in/out, registration, invitation and owner approval.
- Company membership, locations, allowed actions and fiscal-period state.
- Account groups/accounts, template preview/application, mappings, activity and opening batches.
- Parties, products, tracking/warranty rules and prices.
- Sale quote/preview, draft, completion, document lookup, payment and delivery.
- Purchase order, receipt, serial preview/registration, bill and payment.
- Stock balances, movements, transfer stages and count adjustments.
- Customer return/warranty, supplier recovery, replacement, credit/refund, repair and QA.
- Payment allocations, expenses, account transfers, reconciliation and basic staff pay.
- Report catalog/data/export, attachments, audit and data jobs.

An internal function name such as completeSale() is not proof that a matching endpoint exists. If needed orchestration is missing, record a backend task. Do not guess /capabilities or an account-template route from an old document.

Generate types from a trusted, reviewed schema:

~~~bash
pnpm exec openapi-typescript ./docs/backend-openapi.json -o ./src/lib/api/generated/schema.d.ts
~~~

The backend-openapi.json input must first be exported from the real backend and checked for secrets or environment-specific content. Generated files are not hand-edited. Adapter-level validation is still needed for important runtime responses.

### 6.4 Authentication and transport

Recommended deployment: browser and Django API share the same public origin through the reverse proxy.

- Django session cookie: HttpOnly, Secure in production and an appropriate SameSite policy.
- CSRF: obtain/read the token using the verified Django setup and send the configured CSRF header for unsafe methods, including login where required.
- Never store raw access/session tokens in localStorage.
- The browser cannot read HttpOnly cookies; the browser sends them with the request.
- If the current backend uses another auth scheme, isolate it in the adapter and choose a secure cookie/BFF arrangement deliberately.
- Server-side helpers use an allowlisted backend origin, forward only required auth/context headers and never forward cookies to a caller-supplied URL.
- Authenticated record requests are not publicly cached. Begin with request-scoped/no-store server reads.
- Layout checks improve navigation, but every sensitive server read and Django command must enforce authorization independently.
- UI can(action) hides unavailable actions; it is never the security boundary.
- Do not introduce a second Next.js session system that disagrees with Django's session.

Transport responsibilities: credentials, configured CSRF, timeout/abort, JSON versus empty response handling, error normalization, request IDs and explicit command headers. Keep domain parsing in the feature adapter.

### 6.5 Error handling

| Condition | UI behavior |
|---|---|
| 401 | Restore/sign in; do not expose old company data |
| 403 permission | Explain unavailable action and retain entered data |
| 403 CSRF | Recover token/session using the verified flow; no blind posting loop |
| 404 | Explain missing/inaccessible record without leaking another company |
| 409 | Preserve draft; show current state and allowed recovery |
| 412/428 | Revision changed/missing: refresh and reconcile before overwrite |
| 400/422 validation | Map field errors and business-rule errors separately |
| 429 | Respect server delay; safe reads may retry |
| 202 | Show accepted job/command reference and its actual progress |
| 5xx, timeout or lost response after write | Mark outcome unknown; reconcile before another submission |
| Network failure before a read | Inline retry, retaining filters |

Django endpoints may use 400 rather than 422. Match the real contract. Never turn every 403 into a license warning.

### 6.6 Safe command lifecycle

1. Validate the draft locally.
2. Obtain/refresh any server preview needed for authoritative totals.
3. User confirms a frozen payload revision.
4. Generate one command/idempotency key for that intent.
5. Submit through the feature adapter.
6. On confirmed completion, show the returned reference/effects and invalidate affected data.
7. On accepted/background response, follow the returned job.
8. On an unknown result, reconcile the same command/document before allowing another write.
9. Retry the same operation with the same key and payload only where the backend guarantees that behavior.
10. New edited intent gets a new key after the previous outcome is resolved.

Disable automatic TanStack mutation retries by default. Do not generate a fresh UUID inside each network attempt. A page reload needs a recovery path: preferably a server draft/command record; otherwise a reviewed minimal command-reference store without customer/payment payloads.

If the backend lacks idempotency or command lookup, do not promise exactly-once posting. Require contract work before enabling critical confirm buttons.

### 6.7 Invalidations after confirmed commands

| Command | Refresh |
|---|---|
| Complete sale | Invoice/order, customer balance, relevant stock/serial state, cash/payment activity, summary |
| Later collection | Invoice balance, customer statement, cash/bank activity; no new stock issue |
| Receive purchase | Receipt/order remaining, stock; account effects according to actual receipt policy |
| Register serials | Receipt identity progress, unit lookup/history; quantity remains unchanged |
| Transfer stage | Transfer, source/transit/destination stock |
| Credit/refund/replacement | Case, credit/payment, party balance, affected units/stock |
| Create/edit account | Account list/tree/details, mapping/selector eligibility |
| Reconcile | Statement rows and matching status; linked transactions if actually created |

Scope invalidations to company and affected records. Never refetch the whole ERP after every keystroke.

## 7. Reference implementation patterns

The examples define recommended frontend boundaries. Internal DTO names are illustrative and must be mapped to verified backend schemas. They are not complete runnable feature implementations.

### 7.1 Typed scope and query keys

File: src/types/scope.ts

~~~ts
export type CompanyScope = Readonly<{
  userId: string;
  tenantId: string;
  companyId: string;
}>;

export type LocationFilter =
  | { kind: "all" }
  | { kind: "site"; siteId: string };

export type TransactionSite = Readonly<{ siteId: string }>;
~~~

File: src/lib/query/keys.ts

~~~ts
import type { CompanyScope, LocationFilter } from "@/types/scope";

export const scopeKey = (scope: CompanyScope) =>
  ["erp", scope.userId, scope.tenantId, scope.companyId] as const;

export const siteKey = (location: LocationFilter) =>
  location.kind === "all" ? "all" : location.siteId;
~~~

File: src/features/accounts/queries/account.keys.ts

~~~ts
import { scopeKey, siteKey } from "@/lib/query/keys";
import type { CompanyScope, LocationFilter } from "@/types/scope";

export type AccountFilters = Readonly<{
  location: LocationFilter;
  groupId: string | null;
  search: string;
  archived: boolean;
  cursor: string | null;
}>;

export const accountKeys = {
  root: (scope: CompanyScope) => [...scopeKey(scope), "accounts"] as const,
  list: (scope: CompanyScope, filters: AccountFilters) =>
    [
      ...scopeKey(scope),
      "accounts",
      "list",
      siteKey(filters.location),
      filters.groupId,
      filters.search.trim(),
      filters.archived,
      filters.cursor,
    ] as const,
  activity: (
    scope: CompanyScope,
    accountId: string,
    site: LocationFilter,
    from: string,
    to: string,
    cursor: string | null,
  ) =>
    [
      ...scopeKey(scope), "accounts", accountId, "activity",
      siteKey(site), from, to, cursor,
    ] as const,
};
~~~

Add sorting/currency/as-of parameters to keys when the corresponding operation accepts them. A type-aware key factory prevents omission of important filters.

### 7.2 Thin Money page

File: src/app/(erp)/c/[companyId]/money/page.tsx

~~~tsx
import { requireCompanyAccess } from "@/features/company/server/require-company-access";
import { MoneyWorkspace } from "@/features/payments/money-workspace";

type Query = Record<string, string | string[] | undefined>;
const moneyViews = ["activity", "cash-bank", "accounts", "staff-pay"] as const;
type MoneyView = (typeof moneyViews)[number];

function parseView(value: Query[string]): MoneyView {
  return typeof value === "string" &&
    moneyViews.some((candidate) => candidate === value)
    ? (value as MoneyView)
    : "activity";
}

export default async function MoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const bootstrap = await requireCompanyAccess(companyId);

  return (
    <MoneyWorkspace
      scope={bootstrap.scope}
      initialView={parseView(query.view)}
    />
  );
}
~~~

requireCompanyAccess must be a server-only adapter using the real session/membership contract. It returns only safe serializable scope/permission data. The MoneyWorkspace must also validate whether the user may open the requested subview; staff pay is not granted merely by access to Money.

Next.js pages/layouts stay server components by default. Interactive workspaces/forms are client components. Do not add "use client" to the root layout merely to use a sidebar. Route changes and record-query inputs must come from current props/URL, not a once-initialized useState that ignores Back navigation.

### 7.3 Scope the client runtime

Company layout resolves authenticated bootstrap and mounts:

~~~tsx
<CompanyRuntimeProvider
  key={[
    bootstrap.scope.userId,
    bootstrap.scope.tenantId,
    bootstrap.scope.companyId,
  ].join(":")}
>
  {children}
</CompanyRuntimeProvider>
~~~

Reference file: src/providers/company-runtime-provider.tsx

~~~tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function CompanyRuntimeProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: false,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(() => {
    return () => {
      void client.cancelQueries();
      client.clear();
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
~~~

This starter uses normal useQuery rather than suspense-driven data hooks. If adding server prefetch/hydration or suspense queries, follow TanStack's SSR guidance and make provider creation stable across initial suspension. Never share a server QueryClient singleton among requests/users. Reset the runtime on logout and refresh permissions after revocation; the backend still checks every operation.

### 7.4 One account query adapter boundary

File: src/features/accounts/types/account.types.ts

~~~ts
export type Account = {
  id: string;
  groupId: string;
  name: string;
  code?: string;
  active: boolean;
  allowedActions: string[];
};

export type AccountPage = {
  items: Account[];
  nextCursor: string | null;
};
~~~

File: src/features/accounts/api/accounts.api.ts — interface first:

~~~ts
import type { CompanyScope } from "@/types/scope";
import type { AccountFilters } from "../queries/account.keys";
import type { AccountPage } from "../types/account.types";

export interface AccountsApi {
  list(
    scope: CompanyScope,
    filters: AccountFilters,
    signal?: AbortSignal,
  ): Promise<AccountPage>;
}
~~~

Provide an accountsApi implementation in that module only after mapping the verified endpoint and response schema. It translates wire fields/pagination to AccountPage. A test adapter can implement the same interface through MSW; production must never fall back to fixtures on network failure.

File: src/features/accounts/hooks/use-accounts.ts

~~~ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { CompanyScope } from "@/types/scope";
import type { AccountsApi } from "../api/accounts.api";
import { accountKeys, type AccountFilters } from "../queries/account.keys";

export function useAccounts(
  api: AccountsApi,
  scope: CompanyScope,
  filters: AccountFilters,
) {
  return useQuery({
    queryKey: accountKeys.list(scope, filters),
    queryFn: ({ signal }) => api.list(scope, filters, signal),
  });
}
~~~

Do not use keepPreviousData across company/site boundaries in the first implementation. It can be introduced for same-scope pagination only when the UI makes pending filter changes clear.

### 7.5 shadcn account form

File: src/features/accounts/schemas/account.schema.ts

~~~ts
import { z } from "zod";

export const accountFormSchema = z.object({
  name: z.string().trim().min(2, "Enter an account name.").max(120),
  groupId: z.string().min(1, "Choose a group."),
  purposeId: z.string().min(1, "Choose what this account is used for."),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
~~~

Name lengths are provisional UI policy; align them with the real backend schema. IDs stay strings because the backend may use integers, UUIDs or another opaque representation. Do not require UUIDs without checking.

File: src/features/accounts/components/account-form.tsx

~~~tsx
"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  accountFormSchema,
  type AccountFormValues,
} from "../schemas/account.schema";

type Props = {
  groupId: string;
  groupLabel: string;
  purposeId: string;
  submitLabel: string;
  locked?: boolean;
  onSave: (values: AccountFormValues) => Promise<void>;
};

export function AccountForm({
  groupId,
  groupLabel,
  purposeId,
  submitLabel,
  locked = false,
  onSave,
}: Props) {
  const inputId = useId();
  const errorId = inputId + "-error";
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", groupId, purposeId },
  });

  const nameError = form.formState.errors.name;

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          await onSave(values);
        } catch {
          form.setError("root", {
            message: "We could not confirm the save. Your entries are still here.",
          });
        }
      })}
    >
      <p className="text-sm text-muted-foreground">{groupLabel}</p>
      <input type="hidden" {...form.register("groupId")} />
      <input type="hidden" {...form.register("purposeId")} />
      <Field data-invalid={Boolean(nameError)}>
        <FieldLabel htmlFor={inputId}>Account name</FieldLabel>
        <Input
          id={inputId}
          autoComplete="off"
          disabled={locked}
          required
          minLength={2}
          maxLength={120}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? errorId : undefined}
          {...form.register("name")}
        />
        {nameError && (
          <div id={errorId}>
            <FieldError errors={[nameError]} />
          </div>
        )}
      </Field>
      {form.formState.errors.root && (
        <p role="alert">{form.formState.errors.root.message}</p>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting || locked}>
        {form.formState.isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
~~~

Mount the form with a key tied to the selected group/account so it does not retain another account's defaults. This focused example demonstrates a preselected group/purpose; add selectors, conditional bank fields and field-specific server errors in the owning controller. Never accept the hidden fields as authorization.

The command controller owns pending/unknown results and retry protection. Do not dismiss the panel or reset values until the result is known. For an unknown save outcome, keep the form locked through the coordinator; the generic onSave example alone is not a complete idempotency implementation.

### 7.6 Formatting, quantities and previews

- Keep decimal strings at API boundaries.
- Use decimal.js for any local preview; do not implement accounting postings in the browser.
- Server totals win if they differ. Show the changed values and request confirmation where required.
- Configure currency scale, quantity precision, tax rounding and price inclusivity from server policy.
- Serialized pieces require integer unit counts; other UOMs may allow decimals.
- Keep business dates as date-only values when the contract expects a date. Do not silently convert a due date into a UTC timestamp.
- Format event timestamps in the company's/user's chosen timezone, labeled consistently.


## 8. Chart of accounts implementation

Location: **Money → Business Accounts**. URL: `/c/[companyId]/money?view=accounts`. This is a full account-management view within W06.

### 8.1 View composition

| Area | Component | Behavior |
|---|---|---|
| Header | WorkspaceHeader | Business Accounts; subtitle Chart of Accounts |
| Context | CompanyLocationContext + date/as-of controls | Company, permitted outlet filter, explicit metric period |
| Left navigation | AccountGroupTree | Friendly default groups and allowed subgroups |
| Main list | AccountTable using RecordTable | Searchable accounts in selected group |
| Main action | AccountForm in TaskPanel | Contextual label such as Add Expense Category |
| Selected account | AccountDetails | Overview, activity, settings and audit |
| Administrative actions | MappingEditor, OpeningBalancesPanel, PeriodControlsPanel | Permission-controlled tools |
| Display option | Accounting detail toggle | Codes/types and ledger columns for authorized users |

Suggested default account-table columns: Name, Purpose, Availability, Status and Actions. Add a clearly labeled financial measure when the endpoint supports it. Do not display an unlabeled number called Balance for every account type.

- Bank/cash: Balance as of a date.
- Expenses: Spent during the selected period.
- Income: Recorded income during the selected period.
- Party control accounts: reconciled ledger amount, with links to authorized party subledger detail.
- Opening, period movement and closing values are different measures.
- Root group totals must not combine unrelated balance-sheet and income-statement figures.

### 8.2 Standard hierarchy

The backend seeds a validated company-specific template. The UI receives IDs, names, types, parents, allowed purposes and mapping state.

| Friendly group | Examples | Technical rule |
|---|---|---|
| Bank & Cash | Outlet drawers, actual configured bank accounts | Asset accounts; location/ownership explicit |
| Customers Owe Us | Customer receivables | Customer subledger, not one new GL account per person |
| Stock & Other Assets | Inventory, deposits, equipment | Asset classification follows purpose |
| Amounts We Owe | Supplier payables, customer advances/credits, salaries payable | Liability groups |
| Income | Product sales, service/repair income | Payment of an old invoice is not new income |
| Cost of Products Sold | Cost of goods sold | Automatic inventory-cost posting policy |
| Expenses | Rent, power, wages, delivery, repairs | Allowed expense categories |
| Owner Funds | Capital, drawings, retained earnings | Equity presentation follows account nature |
| Taxes | Tax-related navigation shortcuts | Preserve separate asset/liability tax classifications |

Do not copy inconsistent illustrative seed codes into the frontend. Customer advances must not be classified under asset receivables; recoverable input tax must not become a liability merely because it appears in a Taxes menu.

Seed application must be previewable, permission-controlled and idempotent. Applying defaults twice must not duplicate the COA. Preserve existing accounts and history; template updates are reviewed mappings/migrations, not destructive resets.

Template bank groups are not real bank accounts. No default cash balances or fabricated opening transactions are created.

### 8.3 Account and group data

Ask the backend for or derive through the adapter:

- Account: ID, company, code, display/technical name, group, type/purpose, active status, location restrictions, posting eligibility and allowed actions.
- Group: ID, parent, label, accounting nature, sort order, protected status and allowed children/purposes.
- Mapping: operation/role, configured account, readiness, blockers and allowed fix action.
- Activity: source document, business description, date, site, amount/currency, running measure where meaningful and paging.
- Metrics: period/as-of date, currency, included sites and shared/unallocated scope.

A group header is not a posting account. Use distinct types/flags and reject posting to groups in the backend.

### 8.4 Add account journey

1. Owner opens Money → Business Accounts.
2. Selects Expenses.
3. Clicks Add Expense Category.
4. Enters Shop Cleaning; group is already Expenses.
5. Chooses an allowed purpose/subtype if necessary.
6. Selects availability, defaulting to all permitted outlets.
7. Reviews the plain-language summary.
8. Saves; the account list and eligible selectors update.
9. The new account is selected so its empty activity state is understandable.

Required account fields: name, allowed group, purpose. Optional: description and location availability. Technical fields are derived or restricted. Bank/cash purposes add the real bank/drawer fields required by their contract.

Changing the selected group must update valid purpose choices; it cannot merely relabel an account while keeping a contradictory type. Editing a used account's nature is restricted.

### 8.5 Daily expense journey

Money → Pay Money → Expense → Shop Cleaning → amount → paid now/later → cash/bank if paid → confirm.

The user selects a friendly category. The server applies its mapping. Show the outcome: expense recorded, paid amount, payment source and any remaining payable. Show accounting detail from the posted result only to permitted users.

### 8.6 Multiple outlets

- Use one company chart of accounts.
- Tag expense/sales activity with location instead of duplicating every category per outlet.
- Separate actual cash drawers as needed.
- Keep a shared bank account as one real bank account.
- A location-filtered view shows its attribution rules and shared/unallocated amounts.
- Customer and supplier ledgers remain party subledgers.
- Owner/accountant company totals must reconcile to the complete authorized scope.
- An outlet's filtered figures are management information, not automatically a separately balanced legal-entity statement.

### 8.7 Default mappings and administration

Show Ready / Needs setup for sales, inventory, customer collections, supplier payments, refunds, expenses and other enabled operations.

A missing required mapping blocks only the affected operation. Cashiers see a short instruction to contact an authorized owner; the owner has a direct link to the relevant configuration.

Archive replaces destructive delete once records have history. Required mapped accounts cannot be archived without a valid replacement. Bank/control balances and other prerequisites must be resolved according to backend rules. Keep archived activity searchable.

Opening balances use a reviewed opening batch. Link opening stock value and GL opening once; never double-post inventory opening. Show any unexplained difference instead of inserting capital automatically.

### 8.8 COA acceptance

- Default groups and useful leaf accounts appear after approved template application.
- Add Expense Category needs no debit/credit knowledge.
- An actual bank account can be configured and selected for payment.
- Group headers cannot be used as posting accounts.
- Duplicate template application does not duplicate accounts.
- An outlet filter never changes an account's underlying classification.
- A posted expense drills through to its source and ledger details.
- History survives permitted rename/archive operations.
- Missing mappings have actionable, role-appropriate recovery.
- Account balances cannot be overwritten in a normal edit form.

## 9. Workspace implementation specifications

Each workspace must implement loading, empty, ready, validation-error, forbidden, conflict, pending/unknown and confirmed-result states as relevant. A row click opens the shared inspector. Short actions use TaskPanel; long forms use EditorFrame.

### A01 — AccessWorkspace

**Files:** features/auth/access-workspace.tsx, components/sign-in-form.tsx, registration-form.tsx, recovery-form.tsx, invitation-form.tsx, approval-status.tsx; server/session.ts.

**Sections:** identity/form, language/help, recover access, create business or join invited business, actual approval status.

**Journey:** returning user → authenticated bootstrap → last permitted company Home. New owner → registration/approval according to policy → Settings setup mode. Invitation → existing company, not a new company.

**Rules:** safe return URL allowlist, generic credential errors, no token logging, no license purchase/activation step. Role selection cannot grant privilege. Pending or rejected owners receive the backend's actual state.

### W01 — HomeWorkspace

**Files:** home-workspace.tsx, components/action-cards.tsx, summary-cards.tsx, task-queue.tsx, recent-activity.tsx.

**Sections:** current location, three to six frequent actions, a few useful summary cards, pending tasks, recent work.

**Role behavior:** cashier sells/collects; warehouse receives/moves; service staff resolve cases; owner reviews money and locations; accountant reviews exceptions and periods.

**Journey:** choose a task → open its source workspace with record/action preselected. Approvals stay in a queue; no separate approval page.

**Rules:** no unauthorized global totals; no summing customer-owned custody with owned inventory. Summary endpoints should be bounded aggregates rather than downloading all invoices.

### W02 — SalesWorkspace

**Files:** sales-workspace.tsx, components/sell-editor.tsx, invoice-list.tsx, invoice-details.tsx, order-view.tsx, delivery-panel.tsx; schemas/sale.schema.ts; api/sales.api.ts.

**Views:** Sell, Invoices, Quotes & Orders.

**Sell sections:** fixed outlet/source, customer or Walk-in, products, quantities/prices, serial progress, warranty terms, payment choice, totals and action footer.

**Journey:** scan product → capture required identity → choose paid now/pay later/part paid/split → review server totals → Confirm Sale → saved invoice with Print/New Sale.

**Exceptions:** insufficient stock, credit limit, missing serials, expired preview, unavailable account, closed period and uncertain response. Preserve the cart.

**Rules:** named customer for credit; source stock and invoice outlet explicit; cash change is not an invoice overpayment; quantities/serials revalidated at confirm. Later collection settles the existing invoice without another sale or stock issue. Orders can reserve and deliver partially; invoicing after delivery does not issue stock twice. Advanced discounts require their actual approval policy.

### W03 — PurchasesWorkspace

**Files:** purchases-workspace.tsx, components/purchase-order-editor.tsx, receipt-editor.tsx, receipt-list.tsx, bill-editor.tsx, purchase-summary.tsx.

**Views:** Orders, Receiving, Bills.

**Order sections:** supplier, destination, products/costs, expected date, terms and warranty policy.

**Receipt sections:** linked order/direct receipt, receiving site, delivery reference, physically arrived quantities, condition, serial capture and remaining order quantity.

**Bill sections:** supplier invoice reference/date, matched receipts, amounts/tax, due date, payment intention.

**Journey:** order → partial/full receipt → bill matching → optional payment. A delivered direct purchase may use one visual editor while creating distinct linked records.

**Rules:** a bill does not receive stock again; damaged arrivals remain physically traceable in holding; differences are explicit. If the backend lacks atomic completion, show actual checkpoints rather than claiming all stages succeeded.

**Bulk serial example:** 100 received, 40 identified, 60 remaining. Register 60 valid serials; on-hand remains 100. Large imports use a preview and row errors. Default all-or-nothing commit unless partial acceptance is an explicit supported choice. Later identification must preserve current custody if units have already moved/sold. Link an exact purchase receipt only where provenance is evidenced.

### W04 — StockWorkspace

**Files:** stock-workspace.tsx, components/stock-table.tsx, products-view.tsx, product-form.tsx, transfer-editor.tsx, transfer-progress.tsx, count-editor.tsx, movement-view.tsx, serial-capture.tsx, unit-history.tsx.

**Views:** Stock, Products, Transfers, Stock Checks, Activity.

**Stock sections:** search, site/condition/ownership filters, available/reserved/on-hand, selected product stock by site, history.

**Product form:** SKU/name, category, UOM, prices, product tracking policy, warranty policy and relevant defaults. Serial tracking is product policy, not an unrelated checkbox on every invoice.

**Transfer journey:** request → permitted approval → pick → dispatch → partial/full receive. One record, different next actions.

**Count journey:** open count session → record observed stock/serials → review differences against the count's movement policy → authorize adjustment.

**Rules:** sent 20/received 18 means 2 remain in transit/investigation. Expected supplier replacements are not physical on-hand. Customer-owned repair stock is not company-valued stock. No direct balance editing. Count sessions handle movements during counting rather than assuming a changing balance is a static baseline.

### W05 — ReturnsWorkspace

**Files:** returns-workspace.tsx, components/case-list.tsx, case-workbench.tsx, customer-case-editor.tsx, supplier-case-editor.tsx, resolution-panel.tsx, repair-job-editor.tsx, inspection-panel.tsx, customer-handover-panel.tsx.

**Views:** Customers, Suppliers, Repairs.

**Case sections:** party/unit/original document, verification, entitlement/history, custody/ownership, resolution, money/credit, linked recovery/job, evidence and timeline.

**Customer journey:** scan invoice/serial → verify → inspect → replace, repair, credit/refund or reject → handover/settlement.

**Supplier journey:** gather eligible units → dispatch from actual site → supplier acknowledgment/decision → expected replacements or credit → actual arrival → inspection → reconciliation.

**Repair journey:** intake → technician/diagnosis → parts/work/cost → QA → restock, further repair, scrap or return to customer.

**Rules:** per-unit mixed outcomes; customer resolution separate from supplier recovery; original selling outlet retained when intake is elsewhere; replacement A→B→C keeps the chain and correct entitlement. New selling price after restock does not rewrite historical cost/sale price. Customer-owned units stay in custody accounting until a valid ownership-changing event exists.

**Required examples:**
- Supplier approves 8 replacements, 5 arrive, 4 pass QA: 3 not arrived and 1 disputed remain visible.
- Customer credit 20,000 with actual payout 8,000: 12,000 remains available/unapplied or is separately allocated.
- A customer can be resolved while supplier recovery remains pending.
- Supplier credit alone does not prove faulty goods left or replacement units arrived.

### W06 — MoneyWorkspace

**Files:** payments/money-workspace.tsx, components/money-activity.tsx, settlement-editor.tsx, allocation-picker.tsx, expense-editor.tsx, money-transfer-editor.tsx; banking/bank-accounts-view.tsx, reconciliation-view.tsx; accounts/accounts-view.tsx; staff/staff-pay-view.tsx.

**Views:** Activity, Cash & Bank, Business Accounts, Staff Pay.

**Actions:** Receive Money, Pay Money, Move Money.

**Journey:** choose intent → relevant party/category/document → amount and real account → allocate if needed → review → confirm → source-linked result.

**Intents:** existing invoice collection, supplier bill payment, expense now/later, customer refund, supplier refund received, owner funds and account transfer.

**Rules:** transferred funds are not new sales; payment allocation cannot exceed permitted balances; unapplied credit is explicit; fees are separately recorded where applicable. Daybook, cashbook, bankbook and journal are view presets over underlying records, not duplicate entries.

**Reconciliation:** import/manual statement row → find existing transaction → match or create an authorized missing entry → resolve difference. Matching an existing payment must not create another payment.

**Basic staff pay:** salary period, allowances/deductions, advances, approval, payable and payout. Payout settles an accrued payable; it does not record salary expense twice. Statutory payroll automation is not implied.

### W07 — ContactsWorkspace

**Files:** contacts-workspace.tsx, components/party-list.tsx, party-form.tsx, party-profile.tsx, party-statement.tsx, party-picker.tsx; staff/staff-profile.tsx.

**Views:** Customers, Suppliers, Staff.

**Sections:** search, profile, balance with scope label, invoices/bills, payments, cases, statements and notes.

**Journey:** search/select → inspect → relevant action or quick edit. Quick-add invoked from a sale returns the selected customer to the cart.

**Rules:** company-wide party master; one party may have customer and supplier roles; no silent netting. A location-filtered statement is not the full company balance. Employee profile and login access are separate. Staff salary fields are permission-restricted.

### W08 — ReportsWorkspace

**Files:** reports-workspace.tsx, report-viewer.tsx, report-filters.tsx, report-registry.ts, report-result.tsx, report-export.tsx.

**Sections:** report selector/saved views, parameters, scope labels, result, source drilldown and export.

**Reports:** sales/purchases, stock/valuation/movements, low/dead stock, serial/warranty/supplier pending, customer/supplier ageing, account ledger/daybook/cashbook, trial balance, P&L, balance sheet, cash flow, audit.

**Journey:** choose a business question → date/site → view → drill into source → Back restores report context.

**Rules:** typed report definitions with dedicated columns/parameters; calculations belong to backend report contracts. Cash flow is not a simple sum of payment rows. Outlet profitability labels how shared expenses are treated. Export matches the current filters and permissions. Use jobs for large exports; authorized downloads expire appropriately.

### W09 — SettingsWorkspace

**Files:** settings-workspace.tsx, components/setup-view.tsx, business-form.tsx, locations-view.tsx, location-form.tsx, team-view.tsx, role-editor.tsx, rules-view.tsx, data-tools-view.tsx, import-export-panel.tsx.

**Views:** Business, Locations, Team, Rules, Data.

**Setup mode sections:** business/country/currency/year → primary outlet and optional warehouse → account/tax readiness → opening data/team/import checklist. Show saved progress on one page.

**Ongoing settings:** company identity, locations/internal areas, cash drawer assignment, invites/roles/site scope, warranty and serial policies, taxes/effective dates, document numbering, templates, approvals, imports/exports and audit/backup status.

**Rules:** defaults are returned from company configuration; no universal tax rates. Adding an outlet creates relevant location configuration and permitted account/drawer links, not another frontend page. Financial tools link to the same Accounts components. Restore/backup actions are authorized backend jobs, never browser-side database controls.


## 10. Step-by-step build sequence

Build in the following order. Complete each step's exit condition before calling that capability integrated. Steps can deliver UI against explicit fixtures while contracts are pending, but live financial/stock posting remains blocked until the backend contract is verified.

### Step 00 — establish the baseline

**Work**
- Inspect the actual frontend/backend repositories, AGENTS instructions, installed versions and OpenAPI output.
- Identify existing useful components before generating replacements.
- Create docs/backend-contract-map.md and docs/permission-map.md.
- Map older routes into the ten templates; list compatibility redirects where necessary.
- Mark every operation Verified, Missing, or Needs clarification.
- Preserve unrelated work and production data.

**Exit:** every first-release operation has an owner and a known integration status. No requirement from this guide is treated as already implemented merely because it appears in documentation.

### Step 01 — initialize Next.js and tooling

**Work:** follow section 3; enable strict TypeScript; configure lint, testing, aliases and lockfile; document Node/pnpm versions.

**Exit:** a clean checkout installs and runs the generated app. lint/typecheck/build scripts work independently. No private credentials are committed.

### Step 02 — establish shadcn and neutral tokens

**Work:** initialize one component base, add required primitives, verify components.json aliases, preserve generated Tailwind v4 configuration.

**Exit:** Button, Field, Table, Sheet, Dialog and Sidebar render with accessible labels/focus. Brand choices remain centralized and provisional.

### Step 03 — create the route skeleton

**Work:** create Access and nine workspace pages, company layout, route error/loading states and the root redirect.

**Exit:** all ten page templates resolve; first-time setup is a Settings mode. No separate /accounts, /new-invoice or /warehouse-name page family appears.

### Step 04 — build verified transport and types

**Work:** configure same-origin API routing; implement browser/server transports, normalized errors, CSRF behavior, trusted origin handling and generated types.

**Exit:** one authorized read and one harmless draft command work against a test backend; 400/401/403/409/202/empty-response handling is verified where supported.

### Step 05 — implement access and company context

**Work:** sign-in/out, registration/invitation/recovery states, approval state, safe redirect, authenticated company/site bootstrap and scoped providers.

**Exit:** unauthorized users cannot read another company; company switching clears old data; users cannot assign themselves privileged roles.

### Step 06 — build AppShell and workspace navigation

**Work:** role-scoped sidebar, visible company/location, global lookup, workspace header and task navigation.

**Exit:** a cashier sees permitted actions; an owner can change filters; a global filter never silently changes a draft's transaction site.

### Step 07 — build shared layouts and controls

**Work:** five layouts; RecordTable; TaskPanel; EditorFrame; remote picker; decimal/date inputs; status/result feedback; attachments/history; draft guard.

**Exit:** one list → detail → edit → save cycle preserves filters, keyboard focus and errors on desktop and mobile.

### Step 08 — implement COA as the first complete administrative feature

**Work:** account group fetch, default-template preview/application, AccountsView, AccountTable, account form, activity, mappings and archive constraints.

**Exit:** an owner can add Shop Cleaning under Expenses, inspect activity, configure a real bank account and resolve a missing mapping. No arbitrary journal entry is needed.

### Step 09 — implement setup, locations and opening prerequisites

**Work:** Settings setup mode, business/tax configuration, outlets/warehouse/internal locations, drawers, team permissions and reviewed opening batches.

**Exit:** the primary outlet is ready for business; no duplicated inventory opening value; another outlet can be added without adding routes.

### Step 10 — implement contacts and products

**Work:** customer/supplier profiles, statements, staff identity, product catalog/UOM/prices, tracking/warranty policies and quick-add pickers.

**Exit:** products and parties created from contextual panels return to their caller. Company/site permissions apply to search and export.

### Step 11 — implement purchases and serial intake

**Work:** purchase orders, receipt/editor, partial quantities, condition holding, bills/matching, SerialCapture with CSV preview and commit.

**Exit:** 100 received and then 100 serial identities registered still means 100 on-hand. A later supplier bill does not receive goods again.

### Step 12 — implement outlet sales and collections

**Work:** Sell editor, preview/confirmation coordinator, paid-now/credit/partial/split payment, invoice details/printing, quotes/orders/deliveries and later collection.

**Exit:** a sale creates the expected server records once. Later payment changes balances without another stock issue. Confirmed result survives a retry/reload recovery scenario.

### Step 13 — implement stock transfers and counts

**Work:** stock views by site/condition/ownership, staged transfer, transit differences, serial lookup and count sessions.

**Exit:** send 20, receive 18, resolve 2 later; every unit/quantity has a traceable state. Count adjustments are authorized and audited.

### Step 14 — implement returns, warranty and repair

**Work:** case workbench, original/replacement verification, mixed outcomes, cross-outlet intake, supplier claim stages, financial resolutions, repair/QA/handover.

**Exit:** customer resolution, stock custody and supplier recovery remain independent. Replacement chains and partial supplier outcomes are visible.

### Step 15 — complete Money, reconciliation and staff pay

**Work:** money intents, exact allocations, expenses, refunds, owner funds, transfers, bank matching, staff advances/pay runs/payout and period tools.

**Exit:** payment/reconciliation/credit allocation cannot duplicate income or payments. Salary payout does not repeat expense.

### Step 16 — complete reports and data jobs

**Work:** typed report registry, scoped filters, source drilldown, import/export jobs, audit views and print templates.

**Exit:** reports reconcile to known fixture/backend transactions and retain filters on drilldown. Import previews show errors before committing.

### Step 17 — refine performance and accessibility

**Work:** inspect measured slow queries/renders, lazy-load heavy tools, virtualize bulk rows if needed, test keyboard/scanner/mobile paths and translated labels.

**Exit:** 1,000 serials remain usable; scanning cannot corrupt money inputs; keyboard-only completion works. Test with representative non-accountant users.

### Step 18 — integrate the supplied theme

**Work:** apply approved tokens, typography, icons, spacing and approved motion; retain semantic variants and contrast.

**Exit:** business components have no scattered brand-specific literals. The design changes without rewriting posting flows.

### Step 19 — verify release readiness

**Work:** run targeted unit/component/contract/E2E checks, lint/typecheck/build and a staging walkthrough. Record remaining contract gaps honestly.

**Exit:** the accepted scope works against the verified backend; no fixture fallback or fake successful financial posting ships.

## 11. Verification and acceptance

### 11.1 Test responsibilities

| Layer | Useful tests | Avoid |
|---|---|---|
| Unit | Query scope keys, view parser, serial normalization contract, decimal preview rules | Tests that repeat constant arrays without testing behavior |
| Component | Account form errors, dialog focus, serial row failures, payment allocation UX | Snapshots of every generated shadcn primitive |
| Contract | Real request/response/error/pagination semantics | Treating MSW fixtures as proof of Django behavior |
| E2E | A few complete business journeys with actual posting results | A separate browser test for every icon |
| Usability | Sale, delayed payment, receipt, transfer, return and expense with representative users | Claiming ease solely because page count is low |

Use MSW only in explicit development/test environments. Fixtures must never become a fallback after a production 401, 403 or failed write. Show demo status clearly in demonstration builds.

### 11.2 Required scenarios

| ID | Scenario | Expected evidence |
|---|---|---|
| QA01 | Sign in / pending approval / forbidden company | Actual session/approval state and no unauthorized data |
| QA02 | Switch company during normal navigation | No old company rows, totals or callbacks in the new workspace |
| QA03 | Attempt to change site with a dirty sale | Explicit save/discard; fixed transaction identity |
| QA04 | Default COA applied twice | No duplicate groups/accounts |
| QA05 | Add expense category | Valid derived purpose/type; no debit/credit input |
| QA06 | Missing mapping or archived required account | Specific block; permitted owner fix; history preserved |
| QA07 | Paid-now outlet sale | Invoice, payment/allocation and stock effects occur once |
| QA08 | Credit sale then later payment | Receivable settles; revenue/stock are not posted again |
| QA09 | Cash tender greater than amount due | Correct change; no accidental invoice over-allocation |
| QA10 | Network drops after server commits | Same operation resolved; no duplicate financial document |
| QA11 | Partial receipt plus separate supplier bill | Received/remaining reconcile; no second receipt |
| QA12 | 100 received plus 100 serial registrations | On-hand stays 100; duplicate serial identity rejected |
| QA13 | Same serial text under different products | Lookup disambiguates; uniqueness follows company/product rule |
| QA14 | Register serial after stock moved | Correct current custody; no reset to original warehouse |
| QA15 | Send 20, receive 18 | Remaining 2 tracked in transit/investigation |
| QA16 | Cross-outlet customer return | Original sale site and new intake/refund/issue sites retained |
| QA17 | Repeat replacement A→B→C | Complete linked history and current entitlement |
| QA18 | Supplier approves 8, 5 arrive, 4 pass | Three pending arrival, one held/disputed, four sellable |
| QA19 | Credit 20,000, refund 8,000 | Twelve thousand unapplied/applied explicitly; no duplicate credit |
| QA20 | Customer-owned repair | No unintended owned inventory valuation/restock |
| QA21 | Salary accrual then payout | Payable settles; expense not doubled |
| QA22 | Match statement to existing payment | Existing payment reused; no duplicate entry |
| QA23 | Report and export site scope | Same authorized filters and reconciled numbers |
| QA24 | Opening stock plus financial opening | Inventory value appears once |
| QA25 | 1,000-row serial batch and keyboard flow | Responsive interaction, recoverable row errors, safe scanner focus |

The backend should own transaction/constraint tests. Frontend tests assert the correct command, visible result and recovery rather than independently reproducing the accounting engine.

### 11.3 Commands after implementation

~~~bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build
~~~

Run contract checks against a disposable or approved test environment, not by creating sample financial data in production. No deployment or database reset is part of this guide.

If the QuickAccounts frontend skill's ui_contract_check.py is available in the implementation environment, run it against the implemented project. Review its findings against this current retail/wholesale scope: older licensing/manufacturing navigation is not a requirement to reintroduce. The checker is not evidence of backend accounting correctness.

### 11.4 Deployment requirements

- Use the selected Next.js supported Node runtime; this authenticated app is not a static export.
- Reverse-proxy the agreed API prefix to Django; preserve required CSRF/origin/cookie behavior.
- Keep private backend origins/secrets in server environment variables; only intentionally public values use NEXT_PUBLIC_.
- Use HTTPS and appropriate cookie settings.
- Never cache personalized authenticated responses in a shared public cache.
- Keep staging and production databases, API configuration and cookies distinct.
- Do not log full serial batches, customer data, tokens or payment payloads to browser consoles.
- Capture safe request/document references for support.
- Provide useful loading/error states for slow or unavailable backend services.
- Verify a deployment using sign-in, company context, one approved draft/read flow and source-document access.

## 12. Delivery and coding-agent instructions

### Required implementation deliverables

- Ten primary page templates and role-scoped navigation.
- Shared layout and component foundations with ownership as listed.
- Working account-group/default-account management and contextual account selectors.
- Verified adapters and a completed backend contract map.
- Saved drafts, safe confirmation/recovery and source-linked results.
- Inventory, serial, multi-outlet, customer/supplier warranty and repair state handling.
- Unit/component tests for meaningful rules and E2E proof for critical journeys.
- README with local setup, environment configuration, verification commands and deployment assumptions.
- Explicit remaining gaps; no claims that UI-only fixtures are integrated business functionality.

### Suggested first implementation milestone

Deliver the foundation plus one complete business chain:

**Access → company setup → default accounts → product/supplier → purchase receipt → outlet sale → customer payment → source-linked account activity.**

This validates shared pieces and accounting integration early. Then extend the same components to transfers, warranty, repairs and reporting.

### Copyable coding-agent instruction

> Implement QuickAccounts according to this guide and the current backend contract. Start by inspecting the repository and existing work. Keep nine business workspaces plus Access. Use Next.js App Router, strict TypeScript, shadcn primitives under components/ui, feature-owned business code and the shared component inventory. Do not add manufacturing, license activation or a final brand theme. Keep chart of accounts under Money and setup under Settings. Verify endpoint schemas before wiring commands; record backend gaps rather than inventing routes. Implement in the numbered build order, validate each milestone, preserve entered data on failure, and use backend-confirmed results for money and stock changes. Keep company/site scope explicit, use exact decimal boundaries, and implement safe retry/recovery. Report changed files, behavior delivered, checks run and unresolved integration gaps.

## 13. Sources and decisions

### Product sources

- QuickAccounts_Complete_UX_Flows_and_Screen_Map.md, version 2.0: ten-template screen budget, components, multi-outlet behavior and module journeys.
- The subsequent chart-of-accounts discussion: grouped account directory, contextual account creation, advanced accounting detail and shared company COA.

### Framework references checked on 08 October 2026

These references support framework conventions. The ERP folder ownership, business workflows, permissions and component design above are QuickAccounts-specific design decisions.

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): scaffold/runtime and separate lint check.
- [Next.js project organization](https://nextjs.org/docs/app/getting-started/project-structure): app/src, route groups and special files.
- [Next.js server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components): interactive boundaries.
- [Next.js page conventions](https://nextjs.org/docs/app/api-reference/file-conventions/page): asynchronous params/searchParams.
- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication): checks close to data access.
- [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy): Next.js 16 naming.
- [shadcn Next.js installation](https://ui.shadcn.com/docs/installation/next): CLI setup and src aliases.
- [shadcn components.json](https://ui.shadcn.com/docs/components-json): generated configuration and aliases.
- [shadcn React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form): Field composition with form validation.
- [TanStack Query advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr): provider/hydration boundaries; use the documentation matching the installed major.

**Document boundary:** reference snippets illustrate selected files and conventions. They are not a full application, do not define verified Django endpoints, and have not been executed as a complete Next.js build. Implementation must complete their adapters/controllers and pass the acceptance checks above.
