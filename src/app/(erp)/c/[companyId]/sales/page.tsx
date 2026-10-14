import type { Metadata } from "next";
import { SalesWorkspace } from "@/features/sales/sales-workspace";
import { salesViews } from "@/features/sales/sales-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <SalesWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, salesViews.map((view) => view.value), "invoices")} />;
}
