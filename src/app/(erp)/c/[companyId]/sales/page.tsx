import { redirect } from "next/navigation";

export default async function SalesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  redirect(`/c/${encodeURIComponent(companyId)}/sales/walk-in`);
}
