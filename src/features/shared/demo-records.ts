import type { RecordRow } from "@/components/shared/records/record-table";

export const demoRecords: readonly RecordRow[] = [
  { id: "1", reference: "DOT-1048", party: "Apex Mobiles", context: "Main Outlet · 08 Oct", amount: "PKR 184,500", status: "Confirmed" },
  { id: "2", reference: "DOT-1047", party: "Walk-in customer", context: "Main Outlet · 08 Oct", amount: "PKR 42,000", status: "Paid" },
  { id: "3", reference: "DOT-1046", party: "Hamza Electronics", context: "North Outlet · 07 Oct", amount: "PKR 96,750", status: "Partial" },
  { id: "4", reference: "DOT-1045", party: "City Devices", context: "Main Outlet · 07 Oct", amount: "PKR 28,900", status: "Review" },
];
