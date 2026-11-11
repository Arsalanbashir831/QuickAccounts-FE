"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Select } from "@/components/shared/fields";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountBalances, partyBalances, todayIso } from "@/domain/ledger";
import { newId, recordExpense, recordMoneyEntry, useBooks } from "@/domain/store";
import { expenseCategories, type ExpenseCategory, type MoneyEntryKind } from "@/domain/types";
import { useMoney } from "@/lib/format/money";

const copy: Record<MoneyEntryKind, { title: string; description: string; icon: typeof Receipt; submit: string }> = {
  "customer-receipt": { title: "Receive from customer", description: "Money a customer pays towards their khata.", icon: ArrowDownLeft, submit: "Save payment" },
  "supplier-payment": { title: "Pay supplier", description: "Money you pay a supplier towards what you owe.", icon: ArrowUpRight, submit: "Save payment" },
  transfer: { title: "Move money", description: "E.g. deposit counter cash in the bank, or move JazzCash to the bank.", icon: ArrowLeftRight, submit: "Save transfer" },
  "owner-in": { title: "Owner puts money in", description: "Your own money added to the business (capital).", icon: ArrowDownLeft, submit: "Save" },
  "owner-out": { title: "Owner takes money out", description: "Money you take for personal use (drawings). It is not an expense.", icon: ArrowUpRight, submit: "Save" },
};

export function MoneyEntryDialog({ companyId, kind, partyId, onClose }: { companyId: string; kind: MoneyEntryKind; partyId?: string; onClose: () => void }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const balances = useMemo(() => accountBalances(books), [books]);
  const owed = useMemo(() => partyBalances(books), [books]);
  const needsParty = kind === "customer-receipt" || kind === "supplier-payment";
  const parties = books.parties.filter((party) => party.kind === (kind === "customer-receipt" ? "customer" : "supplier"));
  const cash = books.accounts.find((account) => account.kind === "cash")?.id ?? books.accounts[0]?.id ?? "";
  const bank = books.accounts.find((account) => account.kind === "bank")?.id ?? cash;
  const [selectedParty, setSelectedParty] = useState(partyId ?? (needsParty ? parties.find((party) => (owed.get(party.id) ?? 0) > 0)?.id ?? parties[0]?.id ?? "" : ""));
  const [from, setFrom] = useState(kind === "transfer" ? cash : kind === "supplier-payment" ? bank : cash);
  const [to, setTo] = useState(kind === "transfer" ? bank : kind === "customer-receipt" ? cash : cash);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const usesFrom = kind === "supplier-payment" || kind === "transfer" || kind === "owner-out";
  const usesTo = kind === "customer-receipt" || kind === "transfer" || kind === "owner-in";
  const partyOwed = selectedParty ? owed.get(selectedParty) ?? 0 : 0;
  const info = copy[kind];

  const save = () => {
    const value = Math.round(Number(amount));
    if (!(value > 0)) return setError("Enter an amount above zero.");
    if (needsParty && !selectedParty) return setError("Choose who this payment is with.");
    if (kind === "transfer" && from === to) return setError("Choose two different accounts.");
    if (usesFrom && value > (balances.get(from) ?? 0)) return setError(`Only ${money(balances.get(from) ?? 0)} in this account.`);
    recordMoneyEntry(companyId, {
      id: newId("me"), date, kind, amount: value, partyId: needsParty ? selectedParty : undefined,
      fromAccountId: usesFrom ? from : undefined, toAccountId: usesTo ? to : undefined, note: note.trim() || undefined,
    });
    toast.success(`${info.title}: ${money(value)}`);
    onClose();
  };

  const accountOptions = books.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(balances.get(account.id) ?? 0)}</option>);

  return (
    <FormDialog title={info.title} description={info.description} icon={info.icon} onClose={onClose} onSubmit={save}
      footer={<><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">{info.submit}</Button></>}>
      <div className="space-y-4">
        {needsParty ? (
          <Field label={kind === "customer-receipt" ? "Customer" : "Supplier"} hint={selectedParty ? (partyOwed > 0 ? `${kind === "customer-receipt" ? "Owes you" : "You owe"} ${money(partyOwed)}` : partyOwed < 0 ? `Advance of ${money(-partyOwed)}` : "Nothing outstanding") : undefined}>
            <Select value={selectedParty} disabled={Boolean(partyId)} onChange={(event) => setSelectedParty(event.target.value)}>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </Select>
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" error={error}>
            <Input data-dialog-autofocus type="number" min={0} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Date"><Input type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} /></Field>
        </div>
        {needsParty && partyOwed > 0 ? <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setAmount(String(partyOwed))}>Full amount {money(partyOwed)}</button> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {usesFrom ? <Field label="From"><Select value={from} onChange={(event) => setFrom(event.target.value)}>{accountOptions}</Select></Field> : null}
          {usesTo ? <Field label="Into"><Select value={to} onChange={(event) => setTo(event.target.value)}>{accountOptions}</Select></Field> : null}
        </div>
        <Field label="Note" hint="Optional, e.g. cheque no. or transfer ID"><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      </div>
    </FormDialog>
  );
}

export function ExpenseDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const balances = useMemo(() => accountBalances(books), [books]);
  const [category, setCategory] = useState<ExpenseCategory>("Rent");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(books.accounts.find((account) => account.kind === "cash")?.id ?? books.accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    const value = Math.round(Number(amount));
    if (!(value > 0)) return setError("Enter an amount above zero.");
    if (value > (balances.get(accountId) ?? 0)) return setError(`Only ${money(balances.get(accountId) ?? 0)} in this account.`);
    recordExpense(companyId, { id: newId("exp"), date, category, amount: value, accountId, payee: payee.trim() || undefined, note: note.trim() || undefined });
    toast.success(`${category} expense saved`);
    onClose();
  };

  return (
    <FormDialog title="Add expense" description="Running costs of the shop: rent, salaries, bills, bags and so on. Stock purchases go under Purchases." icon={Receipt} onClose={onClose} onSubmit={save}
      footer={<><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save expense</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><Select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{expenseCategories.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
          <Field label="Amount" error={error}><Input data-dialog-autofocus type="number" min={0} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Paid from"><Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{books.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(balances.get(account.id) ?? 0)}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} /></Field>
        </div>
        <Field label="Paid to" hint="Optional, e.g. landlord, staff name, LESCO"><Input value={payee} onChange={(event) => setPayee(event.target.value)} /></Field>
        <Field label="Note"><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      </div>
    </FormDialog>
  );
}
