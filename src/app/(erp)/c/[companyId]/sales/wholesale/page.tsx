import type { Metadata } from "next";
import { wholesaleViews } from "@/config/views";
import { WholesaleSales } from "@/features/sales/sales-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Wholesale customers" };

export default async function WholesalePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <WholesaleSales companyId={companyId} view={parseAllowedValue(query.view, wholesaleViews.map((view) => view.value), "invoices")} />;
}
