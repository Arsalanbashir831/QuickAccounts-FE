import type { Metadata } from "next";
import { SaleDetails } from "@/features/sales/sale-details";

export const metadata: Metadata = { title: "Receipt" };

export default async function SalePage({ params }: { params: Promise<{ companyId: string; saleId: string }> }) {
  const { companyId, saleId } = await params;
  return <SaleDetails companyId={companyId} saleId={decodeURIComponent(saleId)} />;
}
