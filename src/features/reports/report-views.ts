export const reportViews = [
  { value: "profit-loss", label: "Profit & Loss Statement" },
] as const;

export type ReportView = (typeof reportViews)[number]["value"];
