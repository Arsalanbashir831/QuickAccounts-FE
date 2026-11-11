import type { Metadata } from "next";
import { NewInvoice } from "@/features/sales/new-invoice";

export const metadata: Metadata = { title: "Wholesale invoice" };

export default async function NewInvoicePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <NewInvoice companyId={companyId} />;
}
