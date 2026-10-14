import type { Metadata } from "next";
import { ReturnsWorkspace } from "@/features/service/returns-workspace";
import { returnViews } from "@/features/service/return-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Returns and Warranty" };

export default async function ReturnsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <ReturnsWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, returnViews.map((view) => view.value), "customers")} />;
}
