import type { Metadata } from "next";
import { PurchaseOrderDetails } from "@/features/purchases/components/purchase-order-details";

export const metadata: Metadata = { title: "Purchase Order Details" };

export default async function PurchaseOrderDetailsPage({ params }: { params: Promise<{ companyId: string; orderId: string }> }) {
  const { companyId, orderId } = await params;
  return <PurchaseOrderDetails companyId={companyId} orderId={orderId} />;
}
