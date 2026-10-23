import type { Metadata } from "next";
import { BillPaymentsWorkspace } from "@/features/payments/bill-payments-workspace";

export const metadata: Metadata = { title: "Receive Payments" };

export default async function ReceivePaymentsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <BillPaymentsWorkspace companyId={companyId} direction="receive" />;
}
