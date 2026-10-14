import type { Metadata } from "next";
import { StockLocationDetails } from "@/features/inventory/components/stock-location-details";

export const metadata: Metadata = { title: "Stock Location Details" };

export default async function StockLocationDetailsPage({ params }: { params: Promise<{ companyId: string; sku: string; locationId: string }> }) {
  const { companyId, sku, locationId } = await params;
  return <StockLocationDetails companyId={companyId} sku={sku} locationId={locationId} />;
}
