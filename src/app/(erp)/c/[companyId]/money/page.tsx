import type { Metadata } from "next";
import { moneyViews } from "@/config/views";
import { MoneyWorkspace } from "@/features/money/money-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <MoneyWorkspace companyId={companyId} view={parseAllowedValue(query.view, moneyViews.map((view) => view.value), "cashbook")} />;
}
