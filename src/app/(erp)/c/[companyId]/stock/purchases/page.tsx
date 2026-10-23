import type { Metadata } from "next";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { PurchaseOrdersView } from "@/features/purchases/components/purchase-orders-view";
import { ReceivingView } from "@/features/purchases/components/receiving-view";

export const metadata: Metadata = { title: "Purchase" };

export default async function StockPurchasesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Stock · Purchase" title="Purchase" description="Order stock from suppliers, then mark each order shipped and received when it arrives." />
      <PurchaseOrdersView companyId={companyId} />
      <ReceivingView companyId={companyId} />
    </div>
  );
}
