"use client";

import { ArrowLeft, ArrowLeftRight, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addDays, partyBalances, returnableQuantities, saleKind, saleStatus, todayIso } from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { PosReceiptDialog, paymentLabel } from "@/features/pos/components/pos-receipt-dialog";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { InvoicePrintDialog } from "./components/invoice-print-template";
import { statusTone } from "./sales-workspace";

export function SaleDetails({ companyId, saleId }: { companyId: string; saleId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const owner = isOwner(useDemoSession());
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [print, setPrint] = useState<"receipt" | "invoice" | null>(null);

  const sale = books.sales.find((entry) => entry.id === saleId);
  const returnable = useMemo(() => (sale ? returnableQuantities(books, sale.id) : new Map<string, number>()), [books, sale]);
  const linkedReturns = useMemo(() => books.sales.filter((entry) => entry.lines.some((line) => line.returnOfSaleId === saleId)), [books.sales, saleId]);
  const customer = books.parties.find((party) => party.id === sale?.customerId);
  const customerBalance = useMemo(() => (customer ? partyBalances(books).get(customer.id) : undefined), [books, customer]);

  if (!sale) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="font-semibold text-heading">Receipt not found</p>
        <Button asChild className="mt-4" variant="outline"><Link href={`${base}/sales`}>Back to sales</Link></Button>
      </Card>
    );
  }

  const kind = saleKind(sale);
  const status = saleStatus(sale);
  const canReturn = [...returnable.values()].some((qty) => qty > 0);
  const withinWindow = sale.date >= addDays(todayIso(), -settings.rules.returnDays);
  const originals = [...new Set(sale.lines.map((line) => line.returnOfSaleId).filter(Boolean))].map((id) => books.sales.find((entry) => entry.id === id)).filter(Boolean);
  const accountName = books.accounts.find((account) => account.id === sale.accountId)?.name;

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/sales`}><ArrowLeft className="size-4" />All sales</Link></Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-3xl font-semibold text-heading">{sale.number}</h1>
            <Badge tone={kind === "Sale" ? "neutral" : kind === "Return" ? "danger" : "info"}>{kind}</Badge>
            <Badge tone={statusTone(status)}>{status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(sale.date)} at {sale.time} · {sale.channel === "pos" ? "Counter" : "Wholesale invoice"} · served by {sale.cashier}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPrint("receipt")}><Printer className="size-4" />Receipt</Button>
          <Button variant="outline" onClick={() => setPrint("invoice")}><FileText className="size-4" />A4 invoice</Button>
          {canReturn && kind !== "Return" ? (
            withinWindow || owner ? (
              <Button asChild>
                <Link href={`${base}/pos?return=${encodeURIComponent(sale.id)}`}><ArrowLeftRight className="size-4" />Return / exchange</Link>
              </Button>
            ) : <Button disabled><ArrowLeftRight className="size-4" />Return window closed</Button>
          ) : null}
        </div>
      </div>
      {canReturn && !withinWindow ? <p className="rounded-lg bg-warning/14 px-4 py-2 text-sm text-warning-foreground">This sale is older than the {settings.rules.returnDays}-day return window.{owner ? " As the owner you can still accept a return." : " Only the owner can accept a return now."}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Style</TableHead>
                <TableHead>Colour · size</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.lines.map((line, index) => {
                const unit = line.qty < 0 ? line.unitNet : line.price;
                const left = returnable.get(line.variantId);
                return (
                  <TableRow key={`${line.variantId}-${index}`} className={line.qty < 0 ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <Link href={`${base}/products/${line.styleId}`} className="font-semibold text-heading hover:text-primary">{line.qty < 0 ? "↩ " : ""}{line.name}</Link>
                      <p className="font-mono text-[0.68rem] text-muted-foreground">{line.sku}</p>
                    </TableCell>
                    <TableCell className="text-sm">{line.size === "OS" ? line.color : `${line.color} · ${line.size}`}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.qty}
                      {line.qty > 0 && left !== undefined && left < line.qty ? <span className="block text-[0.68rem] text-destructive">{line.qty - left} returned</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(unit)}{line.qty > 0 && line.unitNet < line.price ? <span className="block text-[0.68rem] text-muted-foreground">net {money(line.unitNet)}</span> : null}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-heading">{money(line.qty * unit)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <dl className="ml-auto max-w-xs space-y-1.5 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(sale.subtotal)}</dd></div>
            {sale.discount ? <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{money(sale.discount)}</dd></div> : null}
            {sale.tax ? <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax</dt><dd className="tabular-nums">{money(sale.tax)}</dd></div> : null}
            <div className="flex justify-between border-t pt-2 text-base font-bold text-heading"><dt>{sale.total < 0 ? "Refund" : "Total"}</dt><dd className="tabular-nums">{money(Math.abs(sale.total))}</dd></div>
          </dl>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Method</dt><dd className="font-semibold text-heading">{paymentLabel(sale)}</dd></div>
                {accountName ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Account</dt><dd>{accountName}</dd></div> : null}
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{sale.amountPaid < 0 ? "Refunded" : "Paid now"}</dt><dd className="tabular-nums">{money(Math.abs(sale.amountPaid))}</dd></div>
                {sale.tendered !== undefined ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cash received / change</dt><dd className="tabular-nums">{money(sale.tendered)} / {money(sale.tendered - sale.amountPaid)}</dd></div> : null}
                {sale.total - sale.amountPaid > 0 ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Added to khata</dt><dd className="font-semibold tabular-nums text-destructive">{money(sale.total - sale.amountPaid)}</dd></div> : null}
                {sale.dueDate ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Due</dt><dd>{formatDate(sale.dueDate)}</dd></div> : null}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p className="font-semibold text-heading">{sale.customerName}</p>
              {customer ? (
                <>
                  {customer.phone ? <p className="text-muted-foreground">{customer.phone}</p> : null}
                  {owner ? <p className="mt-2">Account balance: <strong className="tabular-nums">{money(customerBalance ?? 0)}</strong> · <Link className="font-semibold text-primary hover:underline" href={`${base}/parties/${customer.id}`}>View khata</Link></p> : null}
                </>
              ) : <p className="text-muted-foreground">Walk-in, not saved</p>}
            </CardContent>
          </Card>
          {sale.notes || originals.length || linkedReturns.length ? (
            <Card>
              <CardHeader><CardTitle>Notes & linked receipts</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sale.notes ? <p>{sale.notes}</p> : null}
                {originals.map((original) => original ? <p key={original.id}>Returned from <Link className="font-mono font-semibold text-primary hover:underline" href={`${base}/sales/${original.id}`}>{original.number}</Link> ({formatDate(original.date)})</p> : null)}
                {linkedReturns.map((entry) => <p key={entry.id}>{saleKind(entry)} on <Link className="font-mono font-semibold text-primary hover:underline" href={`${base}/sales/${entry.id}`}>{entry.number}</Link> ({formatDate(entry.date)})</p>)}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {print === "receipt" ? <PosReceiptDialog sale={sale} settings={settings} accountName={accountName} onClose={() => setPrint(null)} /> : null}
      {print === "invoice" ? <InvoicePrintDialog sale={sale} settings={settings} customer={customer} customerBalance={customerBalance} onClose={() => setPrint(null)} /> : null}
    </div>
  );
}
