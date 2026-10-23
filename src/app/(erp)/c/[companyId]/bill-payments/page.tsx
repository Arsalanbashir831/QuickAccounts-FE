import { redirect } from "next/navigation";

export default async function BillPaymentsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  redirect(`/c/${companyId}/bill-payments/send`);
}
