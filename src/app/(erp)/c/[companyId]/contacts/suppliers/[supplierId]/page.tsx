import type { Metadata } from "next";
import { PartyLedgerDetail } from "@/features/parties/components/party-ledger-detail";

export const metadata: Metadata = { title: "Vendor Ledger" };

export default async function VendorLedgerPage({ params }: { params: Promise<{ companyId: string; supplierId: string }> }) {
  const { companyId, supplierId } = await params;
  return <PartyLedgerDetail companyId={companyId} kind="vendor" partyId={supplierId} />;
}
