import type { Metadata } from "next";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { StockActivityView } from "@/features/inventory/components/stock-activity-view";

export const metadata: Metadata = { title: "Stock Activity" };

export default async function StockActivityPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Stock · Activity" title="Activity" description="Every stock movement in one place: sales, purchases, transfers, and adjustments." />
      <StockActivityView companyId={companyId} />
    </div>
  );
}
