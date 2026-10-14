export const stockViews = [
  { value: "stock", label: "Stock Balances" },
  { value: "products", label: "Product Catalog" },
  { value: "transfers", label: "Transfers" },
  { value: "activity", label: "Stock Activity" },
] as const;

export type StockView = (typeof stockViews)[number]["value"];
