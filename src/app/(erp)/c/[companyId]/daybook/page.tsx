import type { Metadata } from "next";
import { DaybookWorkspace } from "@/features/payments/daybook-workspace";

export const metadata: Metadata = { title: "Daybook Entry" };

export default async function DaybookPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <DaybookWorkspace companyId={companyId} />;
}
