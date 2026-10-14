import type { Metadata } from "next";
import { NewPurchaseOrder } from "@/features/purchases/components/new-purchase-order";

export const metadata: Metadata = { title: "New Purchase Order" };

export default async function NewPurchaseOrderPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <NewPurchaseOrder companyId={companyId} />;
}
