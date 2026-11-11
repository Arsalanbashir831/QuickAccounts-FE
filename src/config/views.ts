/**
 * Tab definitions shared by server pages (to validate `?view=`) and client
 * workspaces (to render tabs). Kept out of "use client" modules on purpose:
 * values exported from client modules are not usable on the server.
 */
export const walkInViews = [
  { value: "all", label: "All receipts" },
  { value: "sales", label: "Sales" },
  { value: "returns", label: "Returns & exchanges" },
] as const;
export type WalkInView = (typeof walkInViews)[number]["value"];

export const wholesaleViews = [
  { value: "invoices", label: "Invoices" },
  { value: "returns", label: "Returns (credit notes)" },
  { value: "unpaid", label: "Unpaid" },
] as const;
export type WholesaleView = (typeof wholesaleViews)[number]["value"];

export const stockViews = [
  { value: "grid", label: "Size grid" },
  { value: "low", label: "Low & sold out" },
  { value: "adjust", label: "Adjust / count" },
  { value: "history", label: "History" },
] as const;
export type StockView = (typeof stockViews)[number]["value"];

export const partyViews = [
  { value: "customers", label: "Customers" },
  { value: "suppliers", label: "Suppliers" },
] as const;
export type PartyView = (typeof partyViews)[number]["value"];

export const moneyViews = [
  { value: "cashbook", label: "Cashbook" },
  { value: "expenses", label: "Expenses" },
  { value: "accounts", label: "Accounts" },
] as const;
export type MoneyView = (typeof moneyViews)[number]["value"];

export const reportViews = [
  { value: "pl", label: "Profit & loss" },
  { value: "day", label: "Day close" },
  { value: "styles", label: "Styles" },
  { value: "sizes", label: "Sizes" },
] as const;
export type ReportView = (typeof reportViews)[number]["value"];
