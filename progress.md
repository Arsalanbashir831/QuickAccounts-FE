# Implementation progress

Updated: 11 November 2026

## Footwear edition (branch `footwear-store`)

The app was converted from a multi-outlet electronics distributor (IMEI serials,
warranty, transfers) to a single-store footwear shop for startups.

- `src/domain/` — framework-free core: types, size × colour variant catalog,
  bill pricing, sale builder, and `ledger.ts`, which derives stock, cash/bank
  balances, customer/supplier khata and profit & loss from documents.
  `store.ts` persists documents in localStorage (swap for API calls later).
- Demo shop "Kadam Footwear": 15 fictional styles, ~4 months of generated,
  internally consistent history (`seed.ts`).
- Screens: Home, POS (size picker, scan, returns/exchanges, cash change, khata),
  Sales & returns, Wholesale invoice, Products (style editor, variants, size
  sell-through), Stock (size grid, low stock, count/adjust, history),
  Purchases (size-run entry, receive), Customers & suppliers (khata, WhatsApp
  reminder), Money (cashbook, expenses, transfers, owner in/out), Reports
  (P&L, day close, styles, sizes), Settings (shop, team, rules, backup/reset).
- Roles: Owner (everything) and Cashier (POS, sales, products without cost, stock).

## Next

- Backend: replace `src/domain/store.ts` with Django API adapters; keep `ledger.ts`
  as the reference for server-side calculations.
- Barcode label printing; per-cashier shift open/close.
