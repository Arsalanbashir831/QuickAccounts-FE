import type { Metadata } from "next";
import { partyViews } from "@/config/views";
import { PartiesWorkspace } from "@/features/parties/parties-workspace";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Customers & suppliers" };

export default async function PartiesPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <PartiesWorkspace companyId={companyId} view={parseAllowedValue(query.view, partyViews.map((view) => view.value), "customers")} />;
}
