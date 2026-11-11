import type { Metadata } from "next";
import { NewPurchase } from "@/features/purchases/new-purchase";
import type { SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "New purchase" };

export default async function NewPurchasePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <NewPurchase companyId={companyId} initialStyleId={typeof query.style === "string" ? query.style : undefined} />;
}
