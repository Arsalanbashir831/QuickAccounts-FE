import type { Metadata } from "next";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { ProductsView } from "@/features/inventory/components/products-view";
import { StockBalancesView } from "@/features/inventory/components/stock-balances-view";

export const metadata: Metadata = { title: "Products" };

export default async function StockProductsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Stock · Products" title="Products" description="Review stock at your permitted locations and browse the product catalog." />
      <StockBalancesView companyId={companyId} />
      <ProductsView />
    </div>
  );
}
