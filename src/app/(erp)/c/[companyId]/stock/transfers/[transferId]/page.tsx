import type { Metadata } from "next";
import { TransferDetails } from "@/features/inventory/components/transfer-details";

export const metadata: Metadata = { title: "Transfer Details" };

export default async function TransferDetailsPage({ params }: { params: Promise<{ companyId: string; transferId: string }> }) {
  const { companyId, transferId } = await params;
  return <TransferDetails companyId={companyId} transferId={transferId} />;
}
