export const purchaseViews = [
  { value: "orders", label: "Purchase Order" },
  { value: "receiving", label: "Receiving Status" },
] as const;

export type PurchaseView = (typeof purchaseViews)[number]["value"];
