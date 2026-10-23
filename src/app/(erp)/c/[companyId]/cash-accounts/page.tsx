import type { Metadata } from "next";
import { CashAccountsView } from "@/features/cash/cash-accounts-view";

export const metadata: Metadata = { title: "Cash Accounts" };

export default async function CashAccountsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <CashAccountsView companyId={companyId} />;
}
