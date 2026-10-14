import type { Metadata } from "next";
import { StockWorkspace } from "@/features/inventory/stock-workspace";
import { stockViews } from "@/features/inventory/stock-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <StockWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, stockViews.map((view) => view.value), "stock")} />;
}
