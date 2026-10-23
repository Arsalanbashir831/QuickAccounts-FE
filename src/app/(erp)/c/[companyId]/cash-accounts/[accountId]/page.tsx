import type { Metadata } from "next";
import { CashAccountDetail } from "@/features/cash/cash-account-detail";

export const metadata: Metadata = { title: "Cash Account" };

export default async function CashAccountPage({ params }: { params: Promise<{ companyId: string; accountId: string }> }) {
  const { companyId, accountId } = await params;
  return <CashAccountDetail companyId={companyId} accountId={accountId} />;
}
