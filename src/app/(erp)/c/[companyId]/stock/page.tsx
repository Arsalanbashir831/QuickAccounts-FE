import type { Metadata } from "next";
import { stockViews } from "@/config/views";
import { StockWorkspace } from "@/features/inventory/stock-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const view = parseAllowedValue(query.view, stockViews.map((entry) => entry.value), "grid");
  return <StockWorkspace key={view} companyId={companyId} view={view} styleParam={typeof query.style === "string" ? query.style : undefined} />;
}
