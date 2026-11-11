import type { Metadata } from "next";
import { reportViews } from "@/config/views";
import { ReportsWorkspace } from "@/features/reports/reports-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <ReportsWorkspace companyId={companyId} view={parseAllowedValue(query.view, reportViews.map((view) => view.value), "pl")} />;
}
