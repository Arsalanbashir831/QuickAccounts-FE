export const salesViews = [
  { value: "invoices", label: "Invoices" },
  { value: "shipments", label: "Shipment Status" },
] as const;

export type SalesView = (typeof salesViews)[number]["value"];
