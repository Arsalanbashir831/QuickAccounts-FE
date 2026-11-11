"use client";

import { ArrowLeft, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { partyBalances, todayIso } from "@/domain/ledger";
import { savePurchase, useBooks } from "@/domain/store";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";

export function PurchaseDetails({ companyId, purchaseId }: { companyId: string; purchaseId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const purchase = books.purchases.find((entry) => entry.id === purchaseId);
  const supplier = books.parties.find((party) => party.id === purchase?.supplierId);
  const supplierBalance = useMemo(() => (supplier ? partyBalances(books).get(supplier.id) ?? 0 : 0), [books, supplier]);

  if (!purchase) {
    return <Card className="mx-auto max-w-md p-8 text-center"><p className="font-semibold text-heading">Purchase not found</p><Button asChild className="mt-4" variant="outline"><Link href={`${base}/purchases`}>Back to purchases</Link></Button></Card>;
  }

  // Group lines by style + colour so a size run reads as one row.
  const groups = new Map<string, typeof purchase.lines>();
  for (const line of purchase.lines) {
    const key = `${line.styleId}|${line.color}|${line.unitCost}`;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  const pairs = purchase.lines.reduce((sum, line) => sum + line.qty, 0);

  const markReceived = () => {
    savePurchase(companyId, { ...purchase, status: "Received", receivedDate: todayIso() });
    toast.success(`${pairs} pairs added to stock`);
  };

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/purchases`}><ArrowLeft className="size-4" />Purchases</Link></Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="font-mono text-3xl font-semibold text-heading">{purchase.number}</h1><Badge tone={purchase.status === "Received" ? "success" : "info"}>{purchase.status === "Received" ? "Received" : "On order"}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(purchase.date)} · {supplier?.name}{purchase.supplierRef ? ` · bill ${purchase.supplierRef}` : ""}{purchase.receivedDate ? ` · received ${formatDate(purchase.receivedDate)}` : ""}</p>
        </div>
        {purchase.status === "Ordered" ? <Button onClick={markReceived}><PackageCheck className="size-4" />Mark received · add {pairs} pairs</Button> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Size runs</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Style</TableHead><TableHead>Colour</TableHead><TableHead>Sizes (pairs)</TableHead><TableHead className="text-right">Pairs</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...groups.values()].map((group) => (
                <TableRow key={`${group[0].styleId}-${group[0].color}-${group[0].unitCost}`}>
                  <TableCell><Link href={`${base}/products/${group[0].styleId}`} className="font-semibold text-heading hover:text-primary">{group[0].name}</Link><p className="text-xs text-muted-foreground">{money(group[0].unitCost)} / pair</p></TableCell>
                  <TableCell>{group[0].color}</TableCell>
                  <TableCell className="text-xs">{group.map((line) => (line.size === "OS" ? `${line.qty}` : `${line.size}×${line.qty}`)).join("  ")}</TableCell>
                  <TableCell className="text-right tabular-nums">{group.reduce((sum, line) => sum + line.qty, 0)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(group.reduce((sum, line) => sum + line.qty * line.unitCost, 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-bold tabular-nums text-heading">{money(purchase.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Paid with order</dt><dd className="tabular-nums">{money(purchase.amountPaid)}{purchase.accountId ? ` · ${books.accounts.find((account) => account.id === purchase.accountId)?.name}` : ""}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">On credit</dt><dd className="tabular-nums">{money(purchase.total - purchase.amountPaid)}</dd></div>
              <div className="flex justify-between border-t pt-2"><dt className="text-muted-foreground">You owe {supplier?.name} in total</dt><dd className="font-semibold tabular-nums">{money(supplierBalance)}</dd></div>
            </dl>
            {supplier ? <Button asChild className="mt-4 w-full" variant="outline"><Link href={`${base}/parties/${supplier.id}`}>Supplier khata & pay</Link></Button> : null}
            {purchase.notes ? <p className="mt-4 rounded-md bg-muted/40 p-3 text-sm">{purchase.notes}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
