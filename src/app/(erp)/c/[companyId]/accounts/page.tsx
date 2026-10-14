import type { Metadata } from "next";
import { AccountsView } from "@/features/accounts/public";

export const metadata: Metadata = { title: "Chart of Accounts" };

export default async function AccountsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <AccountsView companyId={companyId} />;
}
