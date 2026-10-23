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
import { buildStockBalances, stockTotals } from "../stock-data";
import { useTransfers } from "../transfer-store";


export function StockDetails({ companyId, sku }: { companyId: string; sku: string }) {
  const router = useRouter();
  const invoices = useInvoices(companyId);
  const transfers = useTransfers(companyId);
  const locations = buildStockBalances(invoices, transfers).filter((row) => row.sku === sku);
  const returnHref = `/c/${encodeURIComponent(companyId)}/stock/products`;
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

  if (!locations.length) return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to stock sheet</Link></Button><Card><CardHeader><CardTitle>Product stock not found</CardTitle><CardDescription>This SKU is not in the current stock sheet.</CardDescription></CardHeader></Card></div>;

  const product = locations[0];
  const totals = stockTotals(locations);
  const reservations = locations.flatMap((location) => location.reservations);

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to stock sheet</Link></Button>
      <WorkspaceHeader eyebrow="Stock · Product details" title={product.name} description={`${product.sku} · ${product.category} · ${locations.length} ${locations.length === 1 ? "location" : "locations"}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Available to Sell</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{totals.available} units</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Reserved for Shipment</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{totals.reserved} units</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Total Faulty Stock</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{totals.faulty + totals.dead} units</CardTitle><p className="text-xs text-muted-foreground">{totals.faulty} faulty · {totals.dead} dead</p></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Stock by Location</CardTitle><CardDescription>Physical company stock, shipment commitments, and unsellable units. Select a location for details.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Location</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Reserved for Shipment</TableHead><TableHead className="text-right">Faulty</TableHead><TableHead className="text-right">Dead</TableHead><TableHead className="text-right">Available to Sell</TableHead></TableRow></TableHeader>
            <TableBody>{locations.map((row) => {
              const href = `${productHref}/locations/${encodeURIComponent(row.id)}`;
              return <TableRow key={row.id} role="link" tabIndex={0} aria-label={`View ${row.location} stock details`} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5" onClick={(event) => handleRowClick(event, href)} onKeyDown={(event) => handleRowKeyDown(event, href)}><TableCell className="font-semibold text-primary">{row.location}</TableCell><TableCell className="text-right tabular-nums">{row.onHand}</TableCell><TableCell className="text-right tabular-nums">{row.reserved}</TableCell><TableCell className="text-right tabular-nums">{row.faulty}</TableCell><TableCell className="text-right tabular-nums">{row.dead}</TableCell><TableCell className="text-right font-semibold tabular-nums">{row.available}</TableCell></TableRow>;
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Reserved for Shipment</CardTitle><CardDescription>Transfers and unshipped invoices. Select a row for details.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Reservation type</TableHead><TableHead>Reference</TableHead><TableHead>Customer / destination</TableHead><TableHead>Stock location</TableHead><TableHead className="text-right">Units</TableHead><TableHead>Serials / barcodes</TableHead></TableRow></TableHeader>
            <TableBody>{reservations.length ? reservations.map((reservation) => {
              const href = `${productHref}/reservations/${encodeURIComponent(reservation.id)}`;
              return <TableRow key={reservation.id} role="link" tabIndex={0} aria-label={`View ${reservation.type} reservation ${reservation.reference}`} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5" onClick={(event) => handleRowClick(event, href)} onKeyDown={(event) => handleRowKeyDown(event, href)}><TableCell><Badge tone={"info"}>{reservation.type}</Badge></TableCell><TableCell className="font-mono font-bold text-primary">{reservation.reference}</TableCell><TableCell>{reservation.destination ?? reservation.customer}</TableCell><TableCell className="text-muted-foreground">{reservation.location}</TableCell><TableCell className="text-right tabular-nums">{reservation.quantity}</TableCell><TableCell className="text-sm text-muted-foreground">{reservation.serials.length ? `${reservation.serials.length} recorded` : "Not recorded"}</TableCell></TableRow>;
            }) : <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No units are reserved for shipment.</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
