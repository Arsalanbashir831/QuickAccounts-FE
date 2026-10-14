"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type MouseEvent } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices } from "@/features/sales/invoice-store";
import { buildStockBalances, type ReservationType } from "../stock-data";
import { useTransfers } from "../transfer-store";

const reservationTone = (type: ReservationType) => type === "Transfer shipment" || type === "Unshipped invoice" ? "info" : type === "Warranty replacement" ? "warning" : "danger";

export function StockLocationDetails({ companyId, sku, locationId }: { companyId: string; sku: string; locationId: string }) {
  const router = useRouter();
  const invoices = useInvoices(companyId);
  const transfers = useTransfers(companyId);
  const row = buildStockBalances(invoices, transfers).find((entry) => entry.sku === sku && entry.id === locationId);
  const productHref = `/c/${encodeURIComponent(companyId)}/stock/${encodeURIComponent(sku)}`;

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    router.push(href);
  };
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, href: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(href);
  };

  if (!row) return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={productHref}><ArrowLeft className="size-4" />Back to product stock</Link></Button><Card><CardHeader><CardTitle>Location stock not found</CardTitle><CardDescription>This SKU is not recorded at the selected location.</CardDescription></CardHeader></Card></div>;

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={productHref}><ArrowLeft className="size-4" />Back to product stock</Link></Button>
      <WorkspaceHeader eyebrow="Stock · Location details" title={row.location} description={`${row.name} · ${row.sku}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Available to Sell</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{row.available} units</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Reserved for Shipment</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{row.reserved} units</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Faulty / Dead</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{row.faulty + row.dead} units</CardTitle></CardHeader></Card>
      </div>
      <Card>
        <CardHeader className="border-b"><CardTitle>Location balance</CardTitle><CardDescription>Company stock on hand and its condition at {row.location}</CardDescription></CardHeader>
        <CardContent className="grid gap-4 pt-5 text-sm sm:grid-cols-4">
          <div><p className="text-muted-foreground">On hand</p><p className="font-semibold tabular-nums text-heading">{row.onHand} units</p></div>
          <div><p className="text-muted-foreground">Faulty</p><p className="font-semibold tabular-nums text-heading">{row.faulty} units</p></div>
          <div><p className="text-muted-foreground">Dead</p><p className="font-semibold tabular-nums text-heading">{row.dead} units</p></div>
          <div><p className="text-muted-foreground">Available to Sell</p><p className="font-semibold tabular-nums text-heading">{row.available} units</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b"><CardTitle>Reservations at this location</CardTitle><CardDescription>Select a row to view its transfer, invoice, or RMA commitment.</CardDescription></CardHeader>
        <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Customer / destination</TableHead><TableHead className="text-right">Units</TableHead><TableHead>Stock ownership</TableHead></TableRow></TableHeader><TableBody>{row.reservations.length ? row.reservations.map((reservation) => {
          const href = `${productHref}/reservations/${encodeURIComponent(reservation.id)}`;
          return <TableRow key={reservation.id} role="link" tabIndex={0} aria-label={`View ${reservation.type} reservation ${reservation.reference}`} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5" onClick={(event) => handleRowClick(event, href)} onKeyDown={(event) => handleRowKeyDown(event, href)}><TableCell><Badge tone={reservationTone(reservation.type)}>{reservation.type}</Badge></TableCell><TableCell className="font-mono font-bold text-primary">{reservation.reference}</TableCell><TableCell>{reservation.destination ?? reservation.customer}</TableCell><TableCell className="text-right tabular-nums">{reservation.quantity}</TableCell><TableCell className="text-muted-foreground">{reservation.consumesSellableStock ? "Company stock" : "Customer-held"}</TableCell></TableRow>;
        }) : <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No units are reserved at this location.</TableCell></TableRow>}</TableBody></Table></CardContent>
      </Card>
      {row.reservations.some((reservation) => !reservation.consumesSellableStock) ? <p className="text-xs text-muted-foreground">Customer-held rejected warranty returns are awaiting shipment but are not part of sellable company stock.</p> : null}
    </div>
  );
}
