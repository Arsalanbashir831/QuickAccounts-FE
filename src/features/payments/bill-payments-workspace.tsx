"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Check, Search, X } from "lucide-react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCustomers } from "@/features/parties/components/customers-view";
import { mockSuppliers } from "@/features/parties/components/suppliers-view";
import { demoPayments, recordPayment, useRecordedPayments, type PaymentDirection, type PaymentMethod } from "@/features/payments/payment-store";

type PartyRow = { id: string; name: string; contact: string; terms: string; balance: number; ledgerHref: string };

const copy = {
  send: {
    title: "Send Payments",
    description: "Suppliers and vendors you owe money to. Choose one and click Pay to record the payment.",
    listTitle: "Suppliers to pay",
    listDescription: "Outstanding amounts payable",
    totalLabel: "Total you owe",
    countLabel: "Suppliers with a balance",
    historyTitle: "Payments sent",
    action: "Pay",
    formTitle: "Pay supplier",
    done: "Payment sent",
    submit: "Confirm payment",
  },
  receive: {
    title: "Receive Payments",
    description: "Customers who owe you money. Choose one and click Receive to record money collected.",
    listTitle: "Customers to collect from",
    listDescription: "Outstanding amounts receivable",
    totalLabel: "Total owed to you",
    countLabel: "Customers with a balance",
    historyTitle: "Payments received",
    action: "Receive",
    formTitle: "Receive payment",
    done: "Payment received",
    submit: "Confirm receipt",
  },
} as const;

const money = (amount: number) => `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const displayDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const BillPaymentsWorkspace = ({ companyId, direction }: { companyId: string; direction: PaymentDirection }) => {
  const text = copy[direction];
  const recorded = useRecordedPayments(companyId);
  const [search, setSearch] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const parties = useMemo<PartyRow[]>(() => {
    const paidTo = (partyId: string) => recorded.filter((payment) => payment.direction === direction && payment.partyId === partyId).reduce((sum, payment) => sum + payment.amount, 0);
    const base = encodeURIComponent(companyId);
    return direction === "send"
      ? mockSuppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, contact: `${supplier.contactPerson} · ${supplier.phone}`, terms: supplier.paymentTerms, balance: Math.max(0, supplier.balanceOwed - paidTo(supplier.id)), ledgerHref: `/c/${base}/contacts/suppliers/${encodeURIComponent(supplier.id)}` }))
      : mockCustomers.map((customer) => ({ id: customer.id, name: customer.name, contact: customer.phone, terms: customer.creditTerm, balance: Math.max(0, customer.balanceDue - paidTo(customer.id)), ledgerHref: `/c/${base}/contacts/customers/${encodeURIComponent(customer.id)}` }));
  }, [companyId, direction, recorded]);

  const history = useMemo(() => [...recorded, ...demoPayments].filter((payment) => payment.direction === direction).sort((left, right) => right.date.localeCompare(left.date) || right.reference.localeCompare(left.reference)), [direction, recorded]);
  const query = search.trim().toLowerCase();
  const visibleParties = parties.filter((party) => !query || `${party.name} ${party.contact}`.toLowerCase().includes(query)).sort((left, right) => right.balance - left.balance);
  const outstanding = parties.reduce((sum, party) => sum + party.balance, 0);
  const withBalance = parties.filter((party) => party.balance > 0).length;
  const paying = parties.find((party) => party.id === payingId) ?? null;

  useEffect(() => {
    if (!paying) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPayingId(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [paying]);

  const openPayment = (party: PartyRow) => {
    setPayingId(party.id); setAmount(String(party.balance)); setDate(today()); setMethod("Cash"); setReference(""); setNotes(""); setFormError("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paying) return;
    const value = Number(amount);
    if (!date || !Number.isFinite(value) || value <= 0) { setFormError("Enter a date and an amount greater than zero."); return; }
    if (value > paying.balance) { setFormError(`Amount cannot be more than the outstanding balance of ${money(paying.balance)}.`); return; }
    try {
      recordPayment(companyId, { id: crypto.randomUUID(), reference: reference.trim() || `PAY-${String(Date.now()).slice(-6)}`, direction, partyId: paying.id, partyName: paying.name, date, method, amount: value, notes: notes.trim() });
      setPayingId(null);
      setNotice(`${text.done}: ${money(value)} ${direction === "send" ? "to" : "from"} ${paying.name}.`);
    } catch {
      setFormError("Could not save this payment in the browser. Check available storage and try again.");
    }
  };

  const ActionIcon = direction === "send" ? ArrowUpRight : ArrowDownLeft;

  return <div className="workspace-enter space-y-5 pb-8">
    <WorkspaceHeader eyebrow="Bill Payments" title={text.title} description={text.description} />

    {notice ? <p role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success-foreground"><Check className="size-4" />{notice}</p> : null}

    <div className="grid gap-4 sm:grid-cols-2">
      <Card><CardHeader className="p-4"><CardDescription>{text.totalLabel}</CardDescription><CardTitle className={`font-mono text-2xl ${direction === "send" ? "text-destructive" : "text-success-foreground"}`}>{money(outstanding)}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="p-4"><CardDescription>{text.countLabel}</CardDescription><CardTitle className="font-mono text-2xl">{withBalance}</CardTitle></CardHeader></Card>
    </div>

    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>{text.listTitle}</CardTitle><CardDescription>{text.listDescription}</CardDescription></div>
        <div className="relative w-full sm:w-64"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={`Search ${direction === "send" ? "suppliers" : "customers"}`} placeholder={`Search ${direction === "send" ? "suppliers" : "customers"}`} className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Terms</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="relative w-32 text-right"><span className="sr-only">Action</span></TableHead></TableRow></TableHeader>
        <TableBody>
          {visibleParties.map((party) => <TableRow key={party.id}>
            <TableCell className="whitespace-nowrap font-semibold"><Link className="text-heading hover:text-primary hover:underline" href={party.ledgerHref}>{party.name}</Link></TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{party.contact}</TableCell>
            <TableCell className="whitespace-nowrap text-sm">{party.terms}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{party.balance > 0 ? money(party.balance) : <Badge tone="success">Settled</Badge>}</TableCell>
            <TableCell className="text-right">{party.balance > 0 ? <Button size="sm" aria-label={`${text.action} ${party.name}`} onClick={() => openPayment(party)}><ActionIcon className="size-4" />{text.action}</Button> : null}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table></div>{visibleParties.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No matches found.</p> : null}</CardContent>
    </Card>

    <Card>
      <CardHeader className="border-b"><CardTitle>{text.historyTitle}</CardTitle><CardDescription>Most recent first</CardDescription></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>{direction === "send" ? "Supplier" : "Customer"}</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
        <TableBody>{history.map((payment) => <TableRow key={payment.id}><TableCell className="font-mono font-semibold text-primary">{payment.reference}</TableCell><TableCell>{displayDate(payment.date)}</TableCell><TableCell className="font-medium">{payment.partyName}</TableCell><TableCell>{payment.method}</TableCell><TableCell className="text-right font-mono font-semibold">{money(payment.amount)}</TableCell></TableRow>)}</TableBody>
      </Table></div>{history.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No payments yet.</p> : null}</CardContent>
    </Card>

    {paying ? <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPayingId(null); }}>
      <Card role="dialog" aria-modal="true" aria-labelledby="payment-form-title" className="flex h-full max-h-screen w-full max-w-md flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl">
        <CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle id="payment-form-title">{text.formTitle}</CardTitle><CardDescription>{paying.name} · Outstanding {money(paying.balance)}</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close payment form" onClick={() => setPayingId(null)}><X className="size-4" /></Button></CardHeader>
        <CardContent className="overflow-y-auto p-5"><form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">Amount (USD)<Input required autoFocus min="0.01" step="0.01" max={paying.balance} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Date<Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm font-medium">Method<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}><option>Cash</option><option>Bank transfer</option><option>Cheque</option></select></label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">Reference <span className="font-normal text-muted-foreground">(optional)</span><Input maxLength={40} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Auto-generated if empty" /></label>
          <label className="block space-y-1.5 text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span><Input maxLength={200} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          {formError ? <p role="alert" className="text-sm font-medium text-destructive">{formError}</p> : null}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setPayingId(null)}>Cancel</Button><Button type="submit"><ActionIcon className="size-4" />{text.submit}</Button></div>
        </form></CardContent>
      </Card>
    </div> : null}
  </div>;
};
