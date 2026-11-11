import type { Metadata } from "next";
import { PurchaseDetails } from "@/features/purchases/purchase-details";

export const metadata: Metadata = { title: "Purchase" };

export default async function PurchasePage({ params }: { params: Promise<{ companyId: string; purchaseId: string }> }) {
  const { companyId, purchaseId } = await params;
  return <PurchaseDetails companyId={companyId} purchaseId={decodeURIComponent(purchaseId)} />;
}
