import type { Metadata } from "next";
import { WarrantyClaimTracePage } from "@/features/service/components/customer-claim-page";

export const metadata: Metadata = { title: "New Customer Warranty Claim" };

export default async function NewCustomerClaimPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <WarrantyClaimTracePage companyId={companyId} kind="customer" />;
}
