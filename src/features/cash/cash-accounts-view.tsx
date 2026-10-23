"use client";

import { Banknote, Building2, ChevronRight, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accountBalance, cashAccounts, useCashTransactions } from "./cash-account-store";

const money = (amount: number) => `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function CashAccountsView({ companyId }: { companyId: string }) {
  const transactions = useCashTransactions(companyId);
  const bankAccounts = cashAccounts.filter((account) => account.kind === "Bank");
  const cashDrawers = cashAccounts.filter((account) => account.kind === "Cash");
  const bankTotal = bankAccounts.reduce((sum, account) => sum + accountBalance(account.id, transactions), 0);
  const cashTotal = cashDrawers.reduce((sum, account) => sum + accountBalance(account.id, transactions), 0);

  const renderAccount = (accountId: string) => {
    const account = cashAccounts.find((item) => item.id === accountId)!;
    const balance = accountBalance(account.id, transactions);
    const count = transactions.filter((transaction) => transaction.accountId === account.id).length;
    const Icon = account.kind === "Bank" ? Building2 : Store;

    return (
      <Link key={account.id} href={`/c/${companyId}/cash-accounts/${account.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Card className="h-full transition-colors hover:border-primary/40 hover:bg-primary/5">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardDescription className="flex items-center gap-1.5"><Icon className="size-3.5 text-muted-foreground" />{account.kind === "Bank" ? account.bankName : account.locationName}</CardDescription>
                <CardTitle className="mt-1 text-base">{account.name}</CardTitle>
              </div>
              <Badge tone="neutral">{account.accountCode}</Badge>
            </div>
            <p className={`mt-4 font-mono text-2xl font-bold ${balance < 0 ? "text-destructive" : "text-heading"}`}>{money(balance)}</p>
            <p className="flex items-center justify-between text-xs text-muted-foreground">{count} {count === 1 ? "transaction" : "transactions"}<ChevronRight className="size-4" /></p>
          </CardHeader>
        </Card>
      </Link>
    );
  };

  return (
    <div className="workspace-enter space-y-5 pb-8">
      <WorkspaceHeader eyebrow="Accounts · Cash" title="Cash Accounts" description="Balances in each bank account and outlet cash drawer. Open an account to review every transaction, add or withdraw money, or transfer between accounts." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><Building2 className="size-3.5 text-info" />Total bank balance</CardDescription><CardTitle className="numeric font-mono text-2xl">{money(bankTotal)}</CardTitle><p className="text-xs text-muted-foreground">Across {bankAccounts.length} bank {bankAccounts.length === 1 ? "account" : "accounts"}</p></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><Store className="size-3.5 text-warning" />Cash at outlets</CardDescription><CardTitle className="numeric font-mono text-2xl">{money(cashTotal)}</CardTitle><p className="text-xs text-muted-foreground">Across {cashDrawers.length} cash {cashDrawers.length === 1 ? "drawer" : "drawers"}</p></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><Wallet className="size-3.5 text-success" />Total funds</CardDescription><CardTitle className="numeric font-mono text-2xl">{money(bankTotal + cashTotal)}</CardTitle><p className="text-xs text-muted-foreground">Bank plus cash on hand</p></CardHeader></Card>
      </div>

      <section className="space-y-3" aria-labelledby="bank-accounts-heading">
        <div><h2 id="bank-accounts-heading" className="text-sm font-semibold text-heading">Bank accounts</h2><p className="text-xs text-muted-foreground">Operating and settlement accounts at your banks.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{bankAccounts.map((account) => renderAccount(account.id))}</div>
      </section>

      <section className="space-y-3" aria-labelledby="cash-drawers-heading">
        <div><h2 id="cash-drawers-heading" className="text-sm font-semibold text-heading">Outlet cash drawers</h2><p className="text-xs text-muted-foreground">Cash held at each store outlet.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cashDrawers.map((account) => renderAccount(account.id))}</div>
      </section>

      <Card>
        <CardHeader className="p-4"><CardTitle className="flex items-center gap-2 text-sm"><Banknote className="size-4 text-primary" />How balances work</CardTitle><CardDescription>Each balance is the opening balance plus every deposit and transfer in, minus withdrawals and transfer out. Internal transfers appear in both accounts under one reference.</CardDescription></CardHeader>
        <CardContent className="p-4 pt-0"><p className="text-xs text-muted-foreground">Open any account to see its full transaction history and record money movements.</p></CardContent>
      </Card>
    </div>
  );
}
