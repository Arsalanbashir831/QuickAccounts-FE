import type { Metadata } from "next";
import { WholesaleReturn } from "@/features/sales/wholesale-return";
import type { SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Wholesale return" };

export default async function WholesaleReturnPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const invoiceId = typeof query.invoice === "string" ? query.invoice : undefined;
  return <WholesaleReturn key={invoiceId ?? "new"} companyId={companyId} invoiceId={invoiceId} />;
}
