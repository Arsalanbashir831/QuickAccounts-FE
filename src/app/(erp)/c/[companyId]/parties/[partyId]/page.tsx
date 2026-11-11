import type { Metadata } from "next";
import { PartyDetails } from "@/features/parties/party-details";

export const metadata: Metadata = { title: "Khata" };

export default async function PartyPage({ params }: { params: Promise<{ companyId: string; partyId: string }> }) {
  const { companyId, partyId } = await params;
  return <PartyDetails companyId={companyId} partyId={decodeURIComponent(partyId)} />;
}
