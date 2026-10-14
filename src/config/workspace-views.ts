export const workspaceViews = {
  sales: ["invoices", "shipments"],
  purchases: ["orders", "receiving"],
  stock: ["stock", "products", "transfers", "activity"],
  returns: ["customers", "suppliers", "repairs"],
  "bill-payments": ["send", "receive"],
  "staff-salaries": ["payroll"],
  daybook: ["entries"],
  accounts: ["chart"],
  contacts: ["customers", "suppliers"],
  reports: ["catalog", "selected-report"],
  settings: ["business", "locations", "team", "rules", "data"],
} as const;
