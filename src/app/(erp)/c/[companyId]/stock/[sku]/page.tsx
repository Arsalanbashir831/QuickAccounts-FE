import type { Metadata } from "next";
import { StockDetails } from "@/features/inventory/components/stock-details";

export const metadata: Metadata = { title: "Stock Details" };

export default async function StockDetailsPage({ params }: { params: Promise<{ companyId: string; sku: string }> }) {
  const { companyId, sku } = await params;
  return <StockDetails companyId={companyId} sku={sku} />;
}
