"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoices } from "@/features/sales/invoice-store";
import { buildStockBalances } from "../stock-data";
import { useTransfers } from "../transfer-store";


export function StockReservationDetails({ companyId, sku, reservationId }: { companyId: string; sku: string; reservationId: string }) {
  const invoices = useInvoices(companyId);
  const transfers = useTransfers(companyId);
  const locations = buildStockBalances(invoices, transfers).filter((row) => row.sku === sku);
  const reservation = locations.flatMap((row) => row.reservations).find((entry) => entry.id === reservationId);
  const productHref = `/c/${encodeURIComponent(companyId)}/stock/${encodeURIComponent(sku)}`;

  if (!reservation) return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={productHref}><ArrowLeft className="size-4" />Back to product stock</Link></Button><Card><CardHeader><CardTitle>Reservation not found</CardTitle><CardDescription>This reservation may already have shipped or is unavailable in this browser.</CardDescription></CardHeader></Card></div>;

  const product = locations[0];
  const sourceHref = reservation.sourceKind === "invoice"
    ? `/c/${encodeURIComponent(companyId)}/sales/${encodeURIComponent(reservation.sourceId)}`
    : `/c/${encodeURIComponent(companyId)}/stock/transfers/${encodeURIComponent(reservation.sourceId)}`;
  const sourceLabel = reservation.sourceKind === "invoice" ? "Open invoice" : "Open transfer";

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={productHref}><ArrowLeft className="size-4" />Back to product stock</Link></Button>
      <WorkspaceHeader eyebrow="Stock · Reservation details" title={reservation.reference} description={`${reservation.type} · ${product.name}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Reservation type</CardDescription><CardTitle className="pt-1"><Badge tone={"info"}>{reservation.type}</Badge></CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Reserved units</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{reservation.quantity}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Shipment</CardDescription><CardTitle className="text-base font-semibold text-heading">{reservation.sourceKind === "transfer" ? reservation.sourceStatus : "Awaiting shipment"}</CardTitle></CardHeader></Card>
      </div>
      <Card>
        <CardHeader className="border-b"><CardTitle>Reservation overview</CardTitle><CardDescription>Source, destination, and product</CardDescription></CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="text-muted-foreground">Source</p><p className="font-semibold text-heading">{reservation.sourceKind === "invoice" ? "Sales invoice" : "Stock transfer"} · {reservation.reference}</p></div>
            <div><p className="text-muted-foreground">{reservation.destination ? "Destination" : "Customer"}</p><p className="font-semibold text-heading">{reservation.destination ?? reservation.customer}</p></div>
            <div><p className="text-muted-foreground">Stock location</p><p className="font-semibold text-heading">{reservation.location}</p></div>
          </div>
          <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
            <div><p className="text-muted-foreground">Product</p><p className="font-semibold text-heading">{product.name}</p><p className="font-mono text-xs text-muted-foreground">{product.sku}</p></div>
            <div><p className="text-muted-foreground">Source status</p><p className="font-semibold text-heading">{reservation.sourceStatus ?? "Preparing"}</p></div>
          </div>
          {reservation.note ? <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">{reservation.note}</p> : null}
          <Button asChild size="sm" variant="outline"><Link href={sourceHref}>{sourceLabel}<ExternalLink className="size-4" /></Link></Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b"><CardTitle>Serials / barcodes</CardTitle><CardDescription>{reservation.serials.length} {reservation.serials.length === 1 ? "code" : "codes"} recorded for this reservation</CardDescription></CardHeader>
        <CardContent className="pt-5">{reservation.serials.length ? <ol className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">{reservation.serials.map((serial, index) => <li key={`${serial}-${index}`} className="break-all rounded-md border bg-muted/20 px-3 py-2 font-mono text-sm"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{serial}</li>)}</ol> : <p className="text-sm text-muted-foreground">No serials or barcodes were recorded.</p>}</CardContent>
      </Card>
    </div>
  );
}
