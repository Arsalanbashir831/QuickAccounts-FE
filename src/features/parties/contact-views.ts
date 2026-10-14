export const contactViews = [
  { value: "customers", label: "Customer Ledger" },
  { value: "suppliers", label: "Vendor Ledger" },
] as const;

export type ContactView = (typeof contactViews)[number]["value"];
