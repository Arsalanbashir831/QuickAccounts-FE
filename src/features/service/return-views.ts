export const returnViews = [
  { value: "customers", label: "Customer Returns & Warranty" },
  { value: "suppliers", label: "Supplier RMA Claims" },
] as const;

export type ReturnView = (typeof returnViews)[number]["value"];
