import type { Metadata } from "next";
import { WarrantyClaimTracePage } from "@/features/service/components/customer-claim-page";

export const metadata: Metadata = { title: "New Supplier Warranty Claim" };

export default async function NewSupplierClaimPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <WarrantyClaimTracePage companyId={companyId} kind="supplier" />;
}
