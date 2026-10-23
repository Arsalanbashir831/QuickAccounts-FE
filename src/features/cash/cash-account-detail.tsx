"use client";

import { ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowUpRight, Building2, Check, FileText, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CashEntryDialog, type CashEntryMode } from "./cash-entry-dialog";
import { accountBalance, cashAccounts, useCashTransactions, type CashTransaction } from "./cash-account-store";

const money = (amount: number) => `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const isMoneyIn = (transaction: CashTransaction) => transaction.type === "Deposit" || transaction.type === "Transfer in";
const typeTone = (transaction: CashTransaction) => isMoneyIn(transaction) ? "success" : transaction.type === "Withdrawal" ? "warning" : "info";

export function CashAccountDetail({ companyId, accountId }: { companyId: string; accountId: string }) {
  const transactions = useCashTransactions(companyId);
  const [mode, setMode] = useState<CashEntryMode | null>(null);
  const [notice, setNotice] = useState("");
  const account = cashAccounts.find((item) => item.id === accountId);

  if (!account) {
    return (
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Account not found</CardTitle><CardDescription>This cash account no longer exists.</CardDescription></CardHeader>
          <CardContent><Button asChild variant="outline"><Link href={`/c/${companyId}/cash-accounts`}><ArrowLeft className="size-4" />Back to cash accounts</Link></Button></CardContent>
        </Card>
      </div>
    );
  }

  const accountTransactions = transactions
    .filter((transaction) => transaction.accountId === accountId)
    .sort((left, right) => right.date.localeCompare(left.date) || right.reference.localeCompare(left.reference));
  const grouped = accountTransactions.reduce<{ date: string; entries: CashTransaction[] }[]>((groups, transaction) => {
    const last = groups.at(-1);
    if (last?.date === transaction.date) last.entries.push(transaction);
    else groups.push({ date: transaction.date, entries: [transaction] });
    return groups;
  }, []);
  const balance = accountBalance(accountId, transactions);
  const totalIn = accountTransactions.filter(isMoneyIn).reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalOut = accountTransactions.filter((transaction) => !isMoneyIn(transaction)).reduce((sum, transaction) => sum + transaction.amount, 0);
  const Icon = account.kind === "Bank" ? Building2 : Store;

  return (
    <div className="workspace-enter space-y-5 pb-8">
      <Link href={`/c/${companyId}/cash-accounts`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Cash accounts</Link>

      <WorkspaceHeader
        eyebrow={`Cash account · ${account.accountCode}`}
        title={account.name}
        description={account.kind === "Bank" ? `${account.bankName} operating balance and every transaction recorded against it.` : `Cash drawer at ${account.locationName}. Review every deposit, withdrawal, and transfer.`}
        action={<div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMode("withdraw")}><ArrowUpRight className="size-4" />Withdraw</Button>
          <Button variant="outline" onClick={() => setMode("transfer")}><ArrowLeftRight className="size-4" />Transfer</Button>
        </div>}
      />

      {notice ? <p role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success-foreground"><Check className="size-4" />{notice}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><Icon className="size-3.5 text-primary" />Available balance</CardDescription><CardTitle className={`numeric font-mono text-2xl ${balance < 0 ? "text-destructive" : ""}`}>{money(balance)}</CardTitle><p className="text-xs text-muted-foreground">{account.kind === "Bank" ? account.bankName : account.locationName}</p></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><ArrowDownLeft className="size-3.5 text-success" />Money in</CardDescription><CardTitle className="numeric font-mono text-2xl text-success-foreground">{money(totalIn)}</CardTitle><p className="text-xs text-muted-foreground">Deposits and transfers in</p></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-1.5"><ArrowUpRight className="size-3.5 text-destructive" />Money out</CardDescription><CardTitle className="numeric font-mono text-2xl text-destructive">{money(totalOut)}</CardTitle><p className="text-xs text-muted-foreground">Withdrawals and transfers out</p></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Transactions</CardTitle><CardDescription>Every movement in and out of this account, grouped by date with the latest first.</CardDescription></CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-5">
          {grouped.map((group) => {
            const dayIn = group.entries.filter(isMoneyIn).reduce((sum, transaction) => sum + transaction.amount, 0);
            const dayOut = group.entries.filter((transaction) => !isMoneyIn(transaction)).reduce((sum, transaction) => sum + transaction.amount, 0);
            return <section key={group.date} aria-label={`Transactions on ${formatDate(group.date)}`} className="overflow-hidden rounded-lg border">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                <div><h2 className="font-semibold text-heading">{formatDate(group.date)}</h2><p className="text-xs text-muted-foreground">{group.entries.length} {group.entries.length === 1 ? "transaction" : "transactions"}</p></div>
                <div className="flex gap-4 text-right text-xs"><span className="text-success-foreground">In <strong className="font-mono">{money(dayIn)}</strong></span><span className="text-destructive">Out <strong className="font-mono">{money(dayOut)}</strong></span></div>
              </header>
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Counterparty</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>{group.entries.map((transaction) => {
                  const counterpart = cashAccounts.find((item) => item.id === transaction.counterpartAccountId);
                  return <TableRow key={transaction.id}>
                    <TableCell><p className="font-semibold text-heading">{transaction.description}</p>{transaction.notes ? <p className="mt-1 text-xs text-muted-foreground">{transaction.notes}</p> : null}</TableCell>
                    <TableCell><Badge tone={typeTone(transaction)}>{transaction.type}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{transaction.reference}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{counterpart?.name ?? "—"}</TableCell>
                    <TableCell className={`whitespace-nowrap text-right font-mono font-semibold ${isMoneyIn(transaction) ? "text-success-foreground" : "text-destructive"}`}>{isMoneyIn(transaction) ? "+ " : "− "}{money(transaction.amount)}</TableCell>
                  </TableRow>;
                })}</TableBody>
              </Table></div>
            </section>;
          })}
          {grouped.length === 0 ? <div className="rounded-lg border border-dashed px-6 py-12 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold text-heading">No transactions yet</p><p className="mt-1 text-sm text-muted-foreground">Withdraw or transfer to start recording activity.</p></div> : null}
        </CardContent>
      </Card>

      {mode ? <CashEntryDialog companyId={companyId} accountId={accountId} mode={mode} transactions={transactions} onClose={() => setMode(null)} onDone={(message) => { setMode(null); setNotice(message); }} /> : null}
    </div>
  );
}
