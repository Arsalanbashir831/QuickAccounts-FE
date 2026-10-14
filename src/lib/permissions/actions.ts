export const actions = {
  viewCompany: "company.view",
  completeSale: "sales.complete",
  receiveStock: "purchases.receive",
  manageAccounts: "accounts.manage",
  viewReports: "reports.view",
} as const;

export type Action = (typeof actions)[keyof typeof actions];
