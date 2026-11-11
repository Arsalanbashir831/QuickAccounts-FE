import type { Metadata } from "next";
import { PosTerminal } from "@/features/pos/pos-terminal";
import { DemoAccessGate } from "@/features/auth/demo-access-gate";
import type { SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "POS" };

export default async function PosPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const returnSaleId = typeof query.return === "string" ? query.return : undefined;
  return <DemoAccessGate companyId={companyId}><PosTerminal key={returnSaleId ?? "sell"} companyId={companyId} returnSaleId={returnSaleId} /></DemoAccessGate>;
}
