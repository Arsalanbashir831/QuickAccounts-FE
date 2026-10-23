import type { Metadata } from "next";
import { BillPaymentsWorkspace } from "@/features/payments/bill-payments-workspace";

export const metadata: Metadata = { title: "Send Payments" };

export default async function SendPaymentsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <BillPaymentsWorkspace companyId={companyId} direction="send" />;
}
