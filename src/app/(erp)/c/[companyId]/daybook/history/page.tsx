import type { Metadata } from "next";
import { DaybookWorkspace } from "@/features/payments/daybook-workspace";

export const metadata: Metadata = { title: "Daybook History" };

export default async function DaybookHistoryPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <DaybookWorkspace companyId={companyId} mode="history" />;
}
