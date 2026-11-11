import type { Metadata } from "next";
import { walkInViews } from "@/config/views";
import { WalkInSales } from "@/features/sales/sales-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Walk-in customers" };

export default async function WalkInPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <WalkInSales companyId={companyId} view={parseAllowedValue(query.view, walkInViews.map((view) => view.value), "all")} />;
}
