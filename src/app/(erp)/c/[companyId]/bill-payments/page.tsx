import type { Metadata } from "next";
import { BillPaymentsWorkspace } from "@/features/payments/bill-payments-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Bill Payments" };

export default async function BillPaymentsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <BillPaymentsWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, ["send", "receive"] as const, "receive")} />;
}
