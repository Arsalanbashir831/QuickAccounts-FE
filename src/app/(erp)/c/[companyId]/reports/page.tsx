import type { Metadata } from "next";
import { ReportsWorkspace } from "@/features/reports/reports-workspace";
import { reportViews } from "@/features/reports/report-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Profit & Loss Statement" };

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const report = "profit-loss" as const;
  return <ReportsWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, reportViews.map((view) => view.value), report)} />;
}
