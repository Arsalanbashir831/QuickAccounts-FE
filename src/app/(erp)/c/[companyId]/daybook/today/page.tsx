import type { Metadata } from "next";
import { DaybookWorkspace } from "@/features/payments/daybook-workspace";

export const metadata: Metadata = { title: "Today Entry" };

export default async function TodayEntryPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <DaybookWorkspace companyId={companyId} mode="today" />;
}
