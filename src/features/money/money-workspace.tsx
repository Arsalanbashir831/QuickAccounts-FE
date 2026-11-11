"use client";

import { moneyViews, type MoneyView } from "@/config/views";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Building2, Plus, Receipt, Smartphone, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Select } from "@/components/shared/fields";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageTabs } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accountBalances, addMonths, cashbook, monthEnd, monthStart, todayIso } from "@/domain/ledger";
import { newId, saveAccount, useBooks } from "@/domain/store";
import type { MoneyAccount, MoneyAccountKind, MoneyEntryKind } from "@/domain/types";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { ExpenseDialog, MoneyEntryDialog } from "./money-dialogs";


const accountIcon = (kind: MoneyAccountKind) => (kind === "cash" ? Banknote : kind === "bank" ? Building2 : Smartphone);

export function MoneyWorkspace({ companyId, view }: { companyId: string; view: MoneyView }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const balances = useMemo(() => accountBalances(books), [books]);
  const [dialog, setDialog] = useState<MoneyEntryKind | "expense" | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const total = [...balances.values()].reduce((sum, value) => sum + value, 0);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Accounts"
        title="Money"
        description="Where your money is right now. Sales, purchases, expenses and payments update these balances automatically."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog("expense")}><Receipt className="size-4" />Add expense</Button>
            <Button variant="outline" onClick={() => setDialog("transfer")}><ArrowLeftRight className="size-4" />Move money</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-heading p-5 text-white">
          <p className="text-sm text-white/60">Total cash & bank</p>
          <p className="numeric mt-2 text-3xl font-semibold">{money(total)}</p>
        </Card>
        {books.accounts.map((account) => {
          const Icon = accountIcon(account.kind);
          const active = accountFilter === account.id;
          return (
            <button key={account.id} type="button" onClick={() => setAccountFilter(active ? "" : account.id)} aria-pressed={active}
              className={cn("rounded-xl border bg-card p-5 text-left shadow-card transition-colors hover:border-primary/40", active && "border-primary ring-2 ring-primary/20")}>
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{account.name}</span>
              <span className="numeric mt-2 block text-2xl font-semibold text-heading">{money(balances.get(account.id) ?? 0)}</span>
              <span className="text-xs text-muted-foreground">{account.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setDialog("customer-receipt")}><ArrowDownLeft className="size-4" />Receive from customer</Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("supplier-payment")}><ArrowUpRight className="size-4" />Pay supplier</Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("owner-in")}><UserRound className="size-4" />Owner put money in</Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("owner-out")}><UserRound className="size-4" />Owner took money out</Button>
      </div>

      <PageTabs tabs={moneyViews} active={view} hrefFor={(value) => `${base}/money?view=${value}`} />
      {view === "cashbook" ? <CashbookView companyId={companyId} accountId={accountFilter} onClear={() => setAccountFilter("")} /> : null}
      {view === "expenses" ? <ExpensesView companyId={companyId} /> : null}
      {view === "accounts" ? <AccountsView companyId={companyId} balances={balances} /> : null}

      {dialog === "expense" ? <ExpenseDialog companyId={companyId} onClose={() => setDialog(null)} /> : null}
      {dialog && dialog !== "expense" ? <MoneyEntryDialog companyId={companyId} kind={dialog} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function CashbookView({ companyId, accountId, onClear }: { companyId: string; accountId: string; onClear: () => void }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const rows = useMemo(() => cashbook(books, accountId || undefined), [books, accountId]);
  const account = books.accounts.find((entry) => entry.id === accountId);
  const today = todayIso();
  const todayIn = rows.filter((row) => row.date === today).reduce((sum, row) => sum + row.amountIn, 0);
  const todayOut = rows.filter((row) => row.date === today).reduce((sum, row) => sum + row.amountOut, 0);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{account ? account.name : "All accounts"}</CardTitle>
          <CardDescription>Today: <span className="text-success">+{money(todayIn)}</span> in · <span className="text-destructive">−{money(todayOut)}</span> out</CardDescription>
        </div>
        {account ? <Button size="sm" variant="ghost" onClick={onClear}>Show all accounts</Button> : null}
      </CardHeader>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Money in</TableHead><TableHead className="text-right">Money out</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.slice(0, 250).map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
              <TableCell><Badge tone={row.amountIn ? "success" : row.type === "Expense" ? "warning" : "neutral"}>{row.type}</Badge></TableCell>
              <TableCell className="text-sm">{row.href ? <Link href={`${base}/${row.href}`} className="hover:text-primary">{row.description}</Link> : row.description}</TableCell>
              <TableCell className="text-right tabular-nums text-success">{row.amountIn ? money(row.amountIn) : ""}</TableCell>
              <TableCell className="text-right tabular-nums text-destructive">{row.amountOut ? money(row.amountOut) : ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 250 ? <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing the latest 250 of {rows.length}.</p> : null}
    </Card>
  );
}

function ExpensesView({ companyId }: { companyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const [month, setMonth] = useState(monthStart(todayIso()));
  const months = Array.from({ length: 6 }, (_, index) => addMonths(todayIso(), -index));
  const rows = books.expenses.filter((expense) => expense.date >= month && expense.date <= monthEnd(month));
  const byCategory = new Map<string, number>();
  for (const expense of rows) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
  const total = rows.reduce((sum, expense) => sum + expense.amount, 0);
  const accountName = (id: string) => books.accounts.find((account) => account.id === id)?.name ?? "";
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] xl:items-start">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>By type</CardTitle>
          <Select aria-label="Month" className="w-40" value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((entry) => <option key={entry} value={entry}>{new Date(`${entry}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>)}
          </Select>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
              <li key={category} className="text-sm">
                <div className="flex justify-between"><span>{category}</span><span className="font-semibold tabular-nums">{money(amount)}</span></div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[#2a78d6]" style={{ width: `${(amount / Math.max(1, total)) * 100}%` }} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t pt-3 font-semibold text-heading"><span>Total</span><span className="tabular-nums">{money(total)}</span></p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Paid to</TableHead><TableHead>From</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(expense.date)}</TableCell>
                <TableCell className="text-sm font-medium">{expense.category}</TableCell>
                <TableCell className="text-sm">{expense.payee ?? expense.note ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{accountName(expense.accountId)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(expense.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No expenses this month.</p> : null}
      </Card>
    </div>
  );
}

function AccountsView({ companyId, balances }: { companyId: string; balances: Map<string, number> }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const [editing, setEditing] = useState<MoneyAccount | "new" | null>(null);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div><CardTitle>Cash, bank & wallet accounts</CardTitle><CardDescription>Card payments settle into your first bank account.</CardDescription></div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Add account</Button>
      </CardHeader>
      <Table>
        <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Balance now</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {books.accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-semibold text-heading">{account.name}</TableCell>
              <TableCell className="text-sm capitalize">{account.kind}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{account.detail ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{money(account.openingBalance)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(balances.get(account.id) ?? 0)}</TableCell>
              <TableCell className="w-16"><Button size="sm" variant="ghost" onClick={() => setEditing(account)}>Edit</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? <AccountDialog companyId={companyId} account={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

function AccountDialog({ companyId, account, onClose }: { companyId: string; account?: MoneyAccount; onClose: () => void }) {
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<MoneyAccountKind>(account?.kind ?? "bank");
  const [detail, setDetail] = useState(account?.detail ?? "");
  const [opening, setOpening] = useState(account ? String(account.openingBalance) : "");
  const [error, setError] = useState("");
  const save = () => {
    if (!name.trim()) return setError("Enter a name.");
    saveAccount(companyId, { id: account?.id ?? newId("acc"), name: name.trim(), kind, detail: detail.trim() || undefined, openingBalance: Math.round(Number(opening) || 0) });
    toast.success("Account saved");
    onClose();
  };
  return (
    <FormDialog title={account ? `Edit ${account.name}` : "Add account"} icon={Building2} onClose={onClose} onSubmit={save}
      footer={<><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={error}><Input data-dialog-autofocus value={name} placeholder="e.g. HBL, Easypaisa" onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Type"><Select value={kind} disabled={account?.kind === "cash"} onChange={(event) => setKind(event.target.value as MoneyAccountKind)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="wallet">Mobile wallet</option></Select></Field>
        <Field label="Details" hint="Last 4 digits or wallet number"><Input value={detail} onChange={(event) => setDetail(event.target.value)} /></Field>
        <Field label="Opening balance" hint="Balance when you started using the app"><Input type="number" value={opening} placeholder="0" onChange={(event) => setOpening(event.target.value)} /></Field>
      </div>
    </FormDialog>
  );
}
