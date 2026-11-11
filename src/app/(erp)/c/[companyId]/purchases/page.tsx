import type { Metadata } from "next";
import { PurchasesWorkspace } from "@/features/purchases/purchases-workspace";

export const metadata: Metadata = { title: "Purchases" };

export default async function PurchasesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <PurchasesWorkspace companyId={companyId} />;
}
