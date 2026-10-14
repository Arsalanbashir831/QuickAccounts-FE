import type { Metadata } from "next";
import { PurchasesWorkspace } from "@/features/purchases/purchases-workspace";
import { purchaseViews } from "@/features/purchases/purchase-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Purchases" };

export default async function PurchasesPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <PurchasesWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, purchaseViews.map((view) => view.value), "orders")} />;
}
