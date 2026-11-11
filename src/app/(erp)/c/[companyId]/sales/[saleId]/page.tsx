import type { Metadata } from "next";
import { SaleDetails } from "@/features/sales/sale-details";
import type { SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Receipt" };

export default async function SalePage({ params, searchParams }: { params: Promise<{ companyId: string; saleId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId, saleId }, query] = await Promise.all([params, searchParams]);
  return <SaleDetails companyId={companyId} saleId={decodeURIComponent(saleId)} autoPrint={query.print === "invoice" ? "invoice" : undefined} />;
}
