import type { Metadata } from "next";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { TransfersView } from "@/features/inventory/components/transfers-view";

export const metadata: Metadata = { title: "Transfer" };

export default async function StockTransfersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Stock · Transfer" title="Transfer" description="Move stock between your outlets and warehouses and track every unit until it arrives." />
      <TransfersView companyId={companyId} />
    </div>
  );
}
