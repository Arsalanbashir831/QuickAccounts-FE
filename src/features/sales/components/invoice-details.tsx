"use client";

import { ArrowDownLeft, ArrowLeft, Building2, CreditCard, Printer, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCompanySettings } from "@/features/settings/settings-store";
import { shipmentStatusFor, useInvoices, writeInvoices, type InvoiceRecord } from "../invoice-store";
import { InvoicePrintTemplate } from "./invoice-print-template";

const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;
const subscribeToNothing = () => () => {};
const bankAccounts = ["HBL – Main Account (****4821)", "Meezan Bank – Business (****3305)", "UBL – Current Account (****7102)", "Faysal Bank – Business (****2278)", "MCB – Current Account (****6437)"];
const paymentLabel = { cash: "Cash", bank: "Card / Bank", credit: "Store Credit" } as const;
const statusTone = (status: InvoiceRecord["status"]) => status === "Paid" ? "success" : status === "Partial" ? "warning" : status === "Overdue" ? "danger" : "neutral";

export function InvoiceDetails({ companyId, invoiceId }: { companyId: string; invoiceId: string }) {
  const invoices = useInvoices(companyId);
  const companySettings = useCompanySettings(companyId);
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectMethod, setCollectMethod] = useState<"cash" | "bank" | "credit">("cash");
  const [collectBank, setCollectBank] = useState(bankAccounts[0]);
  const [notice, setNotice] = useState("");
  const invoice = invoices.find((entry) => entry.id === invoiceId);
  const returnHref = `/c/${companyId}/sales?view=invoices`;

  const handleCollect = () => {
    if (!invoice || !Number.isFinite(collectAmount) || collectAmount <= 0 || collectAmount > invoice.balance) return;
    const nextPaid = invoice.paid + collectAmount;
    const nextBalance = Math.max(0, invoice.total - nextPaid);
    try {
      writeInvoices(companyId, invoices.map((entry) => entry.id === invoice.id ? {
        ...entry, paid: nextPaid, balance: nextBalance, status: nextBalance === 0 ? "Paid" : "Partial",
      } : entry));
      setShowCollection(false);
      setNotice(`${money(collectAmount)} collected via ${collectMethod === "bank" ? collectBank : paymentLabel[collectMethod]}.`);
    } catch { setNotice("Could not save this collection in this browser."); }
  };

  if (!isHydrated) return <p className="workspace-enter text-sm text-muted-foreground" role="status">Loading invoice…</p>;
  if (!invoice) return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to invoices</Link></Button><Card><CardHeader><CardTitle>Invoice not found</CardTitle><CardDescription>This invoice is unavailable in this browser. It may have been created in another browser or company.</CardDescription></CardHeader></Card></div>;

  const serialsFor = (item: InvoiceRecord["items"][number]) => item.serials ?? (item.serial ? [item.serial] : []);

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to invoices</Link></Button>
      <WorkspaceHeader eyebrow="Sales · Invoice details" title={invoice.reference} description={`${invoice.customer} · issued ${invoice.date}`} action={<Button onClick={() => setShowPrintPreview(true)}><Printer className="size-4" />Print invoice</Button>} />

      <Card>
        <CardHeader className="border-b"><CardTitle>Invoice overview</CardTitle><CardDescription>Customer, outlet, and settlement details</CardDescription></CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Customer</p><p className="font-semibold text-heading">{invoice.customer}</p></div>
            <div><p className="text-muted-foreground">Selling outlet</p><p className="font-semibold text-heading">{invoice.outlet}</p></div>
            <div><p className="text-muted-foreground">Payment</p><p className="font-semibold text-heading">{paymentLabel[invoice.paymentMethod]}</p>{invoice.bankAccount ? <p className="text-xs text-muted-foreground">{invoice.bankAccount}</p> : null}</div>
            <div><p className="text-muted-foreground">Total</p><p className="font-semibold tabular-nums text-primary">{money(invoice.total)}</p></div>
          </div>
          <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Issue date</p><p className="font-semibold text-heading">{invoice.date}</p></div>
            <div><p className="text-muted-foreground">Payment status</p><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge></div>
            <div><p className="text-muted-foreground">Amount paid</p><p className="font-semibold tabular-nums text-heading">{money(invoice.paid)}</p></div>
            <div><p className="text-muted-foreground">Balance due</p><p className="font-semibold tabular-nums text-heading">{money(invoice.balance)}</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm"><span className="text-muted-foreground">Shipment status</span><Badge tone={shipmentStatusFor(invoice) === "Shipped" ? "success" : "warning"}>{shipmentStatusFor(invoice)}</Badge>{invoice.shippedAt ? <span className="text-muted-foreground">Shipped {invoice.shippedAt}</span> : null}</div>
          {invoice.notes ? <p className="rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="font-semibold">Notes: </span>{invoice.notes}</p> : null}
          {invoice.balance > 0 ? <Button onClick={() => { setCollectAmount(invoice.balance); setShowCollection(true); }}><ArrowDownLeft className="size-4" />Collect payment</Button> : null}
          {notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Products and serials</CardTitle><CardDescription>{invoice.items.length} product {invoice.items.length === 1 ? "line" : "lines"} on this invoice</CardDescription></CardHeader>
        <CardContent className="space-y-4 pt-5">
          {invoice.items.map((item, index) => {
            const serials = serialsFor(item);
            return <div key={`${item.name}-${index}`} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-heading">{item.name}</h3><p className="text-xs text-muted-foreground">{item.qty} × {money(item.price)}</p></div><strong className="tabular-nums">{money(item.qty * item.price)}</strong></div>{item.warranty ? <p className="mt-3 text-sm text-muted-foreground">Warranty: {item.warranty.length} {item.warranty.unit}</p> : null}{serials.length ? <details className="mt-4 rounded-lg border bg-muted/20"><summary className="cursor-pointer px-3 py-2 text-sm font-medium text-heading">Serial / barcode register · {serials.length} {serials.length === 1 ? "unit" : "units"}</summary><div className="grid max-h-80 gap-2 overflow-auto border-t p-3 sm:grid-cols-2 lg:grid-cols-3">{serials.map((serial, serialIndex) => <div key={`${serial}-${serialIndex}`} className="break-all rounded border bg-background px-2 py-1 font-mono text-xs"><span className="mr-2 text-muted-foreground">{serialIndex + 1}.</span>{serial}</div>)}</div></details> : null}</div>;
          })}
        </CardContent>
      </Card>

      {showCollection ? <div role="dialog" aria-modal="true" aria-label={`Collect payment for ${invoice.reference}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md shadow-2xl"><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle>Collect Payment</CardTitle><CardDescription>{invoice.reference} · balance {money(invoice.balance)}</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close payment collection" onClick={() => setShowCollection(false)}><X className="size-4" /></Button></CardHeader><CardContent className="space-y-4 pt-4"><label className="block space-y-1.5 text-sm font-medium text-heading">Collection amount (USD)<Input type="number" min="0.01" max={invoice.balance} step="0.01" value={collectAmount} onChange={(event) => setCollectAmount(Number(event.target.value) || 0)} /></label><div><p className="mb-2 text-sm font-medium text-heading">Payment method</p><div className="grid grid-cols-3 gap-2">{([{ value: "cash", label: "Cash", icon: Wallet }, { value: "bank", label: "Card / Bank", icon: CreditCard }, { value: "credit", label: "Store Credit", icon: Building2 }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} aria-pressed={collectMethod === value} onClick={() => setCollectMethod(value)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-xs font-medium ${collectMethod === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Icon className="size-5" />{label}</button>)}</div></div>{collectMethod === "bank" ? <label className="block space-y-1.5 text-sm font-medium text-heading">Receiving bank account<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={collectBank} onChange={(event) => setCollectBank(event.target.value)}>{bankAccounts.map((bank) => <option key={bank}>{bank}</option>)}</select></label> : null}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCollection(false)}>Cancel</Button><Button disabled={collectAmount <= 0 || collectAmount > invoice.balance} onClick={handleCollect}>Confirm collection</Button></div></CardContent></Card></div> : null}
      {showPrintPreview ? <InvoicePrintTemplate invoice={invoice} business={companySettings.business} onClose={() => setShowPrintPreview(false)} /> : null}
    </div>
  );
}
