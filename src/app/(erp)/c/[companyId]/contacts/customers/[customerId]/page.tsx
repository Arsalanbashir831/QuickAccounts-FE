import type { Metadata } from "next";
import { PartyLedgerDetail } from "@/features/parties/components/party-ledger-detail";

export const metadata: Metadata = { title: "Customer Ledger" };

export default async function CustomerLedgerPage({ params }: { params: Promise<{ companyId: string; customerId: string }> }) {
  const { companyId, customerId } = await params;
  return <PartyLedgerDetail companyId={companyId} kind="customer" partyId={customerId} />;
}
