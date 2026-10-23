import { redirect } from "next/navigation";

export default async function DaybookPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  redirect(`/c/${companyId}/daybook/today`);
}
