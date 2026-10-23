"use client";

import { ArrowLeftRight, ArrowUpRight, CheckCircle2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { accountBalance, addCashTransaction, addCashTransfer, cashAccounts, type CashTransaction } from "./cash-account-store";

export type CashEntryMode = "withdraw" | "transfer";

const localISODate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const config = {
  withdraw: { title: "Withdraw money", description: "Record money leaving this account.", icon: ArrowUpRight, submit: "Withdraw" },
  transfer: { title: "Internal transfer", description: "Move money to another bank account or outlet cash drawer.", icon: ArrowLeftRight, submit: "Transfer" },
} as const;

export function CashEntryDialog({
  companyId,
  accountId,
  mode,
  transactions,
  onClose,
  onDone,
}: {
  companyId: string;
  accountId: string;
  mode: CashEntryMode;
  transactions: CashTransaction[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const account = cashAccounts.find((item) => item.id === accountId);
  const balance = accountBalance(accountId, transactions);
  const destinations = cashAccounts.filter((item) => item.id !== accountId);
  const [date, setDate] = useState(localISODate());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const meta = config[mode];
  const Icon = meta.icon;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!date || !Number.isFinite(value) || value <= 0) { setError("Enter a date and a positive amount."); return; }
    if (value > balance) { setError(`Amount cannot exceed the available balance of $${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}.`); return; }
    if (mode === "transfer") {
      if (!destinationId || destinationId === accountId) { setError("Choose a different destination account."); return; }
      try {
        const { reference } = addCashTransfer(companyId, { fromAccountId: accountId, toAccountId: destinationId, date, amount: value, description, notes });
        onDone(`Transfer ${reference} recorded.`);
      } catch { setError("Could not save this transfer in the browser."); }
      return;
    }
    try {
      const transaction = addCashTransaction(companyId, { accountId, date, type: "Withdrawal", amount: value, description, notes });
      onDone(`Withdrawal ${transaction.reference} recorded.`);
    } catch { setError("Could not save this entry in the browser."); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Card role="dialog" aria-modal="true" aria-labelledby="cash-entry-title" className="flex h-full max-h-screen w-full max-w-md flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl">
        <CardHeader className="flex-row items-start justify-between border-b">
          <div>
            <CardTitle id="cash-entry-title" className="flex items-center gap-2"><Icon className="size-4 text-primary" />{meta.title}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close form" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="overflow-y-auto p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{account?.name}</p>
              <p className="mt-1 font-mono text-xl font-bold text-heading">${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Available balance</p>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-heading">Date<Input required type="date" value={date} onChange={(event) => { setDate(event.target.value); setError(""); }} /></label>
            <label className="block space-y-1.5 text-sm font-medium text-heading">Amount (USD)<Input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00" /></label>
            {mode === "transfer" ? <label className="block space-y-1.5 text-sm font-medium text-heading">To account<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-heading" value={destinationId} onChange={(event) => { setDestinationId(event.target.value); setError(""); }}>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
            <label className="block space-y-1.5 text-sm font-medium text-heading">Description<Input required value={description} onChange={(event) => { setDescription(event.target.value); setError(""); }} placeholder={mode === "withdraw" ? "What was this money used for?" : "Reason for the transfer"} /></label>
            <label className="block space-y-1.5 text-sm font-medium text-heading">Notes<Input value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} placeholder="Optional detail" /></label>
            {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit"><CheckCircle2 className="size-4" />{meta.submit}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
