import type { Metadata } from "next";
import { salesViews } from "@/config/views";
import { SalesWorkspace } from "@/features/sales/sales-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Sales & returns" };

export default async function SalesPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <SalesWorkspace companyId={companyId} view={parseAllowedValue(query.view, salesViews.map((view) => view.value), "all")} />;
}
