"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBooks } from "@/domain/store";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";

export function PurchasesWorkspace({ companyId }: { companyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [status, setStatus] = useState<"all" | "Ordered" | "Received">("all");
  const supplierName = (id: string) => books.parties.find((party) => party.id === id)?.name ?? "Supplier";
  const rows = useMemo(() => books.purchases.filter((purchase) => status === "all" || purchase.status === status), [books.purchases, status]);
  const onOrder = books.purchases.filter((purchase) => purchase.status === "Ordered");

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Buying"
        title="Purchases"
        description="Stock you buy from suppliers. Received pairs are added to stock; anything not paid is owed to the supplier."
        action={<Button asChild><Link href={`${base}/purchases/new`}><Plus className="size-4" />New purchase</Link></Button>}
      />
      {onOrder.length ? (
        <p className="rounded-lg border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info-foreground">
          {onOrder.length} order{onOrder.length === 1 ? " is" : "s are"} on the way ({onOrder.reduce((sum, purchase) => sum + purchase.lines.reduce((s, line) => s + line.qty, 0), 0)} pairs). Mark them received when the cartons arrive.
        </p>
      ) : null}
      <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, { value: "Ordered", label: "On order" }, { value: "Received", label: "Received" }]} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Pairs</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell><Link href={`${base}/purchases/${purchase.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{purchase.number}</Link>{purchase.supplierRef ? <p className="text-xs text-muted-foreground">Bill {purchase.supplierRef}</p> : null}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(purchase.date)}</TableCell>
                <TableCell className="text-sm font-medium text-heading">{supplierName(purchase.supplierId)}</TableCell>
                <TableCell className="text-right tabular-nums">{purchase.lines.reduce((sum, line) => sum + line.qty, 0)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(purchase.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(purchase.amountPaid)}{purchase.amountPaid < purchase.total ? <p className="text-xs text-destructive">{money(purchase.total - purchase.amountPaid)} on credit</p> : null}</TableCell>
                <TableCell><Badge tone={purchase.status === "Received" ? "success" : "info"}>{purchase.status === "Received" ? "Received" : "On order"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No purchases yet.</p> : null}
      </Card>
    </div>
  );
}
