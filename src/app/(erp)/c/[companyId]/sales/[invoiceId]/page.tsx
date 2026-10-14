import type { Metadata } from "next";
import { InvoiceDetails } from "@/features/sales/components/invoice-details";

export const metadata: Metadata = { title: "Invoice Details" };

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ companyId: string; invoiceId: string }> }) {
  const { companyId, invoiceId } = await params;
  return <InvoiceDetails companyId={companyId} invoiceId={invoiceId} />;
}
