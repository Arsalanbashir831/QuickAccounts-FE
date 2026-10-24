import type { Metadata } from "next";
import { PosTerminal } from "@/features/pos/pos-terminal";
import { DemoAccessGate } from "@/features/auth/demo-access-gate";

export const metadata: Metadata = { title: "POS Terminal" };

export default async function PosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <DemoAccessGate companyId={companyId}><PosTerminal companyId={companyId} /></DemoAccessGate>;
}
