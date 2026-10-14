"use client";

import { PackageCheck, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shipmentStatusFor, useInvoices, writeInvoices } from "../invoice-store";

const today = () => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());

export function ShipmentStatusView({ companyId }: { companyId: string }) {
  const invoices = useInvoices(companyId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const preparing = invoices.filter((invoice) => shipmentStatusFor(invoice) === "Preparing");
  const shipped = invoices.length - preparing.length;
  const awaitingUnits = preparing.reduce((sum, invoice) => sum + invoice.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
  const filtered = invoices.filter((invoice) => {
    const matchesSearch = `${invoice.reference} ${invoice.customer} ${invoice.outlet}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (statusFilter === "all" || shipmentStatusFor(invoice).toLowerCase() === statusFilter);
  });

  const markShipped = (invoiceId: string) => {
    try {
      const invoice = invoices.find((entry) => entry.id === invoiceId);
      if (!invoice || shipmentStatusFor(invoice) === "Shipped") return;
      writeInvoices(companyId, invoices.map((entry) => entry.id === invoiceId
        ? { ...entry, shipmentStatus: "Shipped", shippedAt: today() }
        : entry));
      setNotice(`${invoice.reference} marked as shipped.`);
    } catch {
      setNotice("Could not update shipment status in this browser.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Preparing</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{preparing.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Shipped</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{shipped}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Units awaiting shipment</CardDescription><CardTitle className="numeric text-2xl font-bold text-primary">{awaitingUnits}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Shipment Status</CardTitle><CardDescription>Track invoices from Preparing to Shipped</CardDescription></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search invoice or customer" aria-label="Search shipments" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <select aria-label="Filter shipment status" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-heading" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All shipments</option><option value="preparing">Preparing</option><option value="shipped">Shipped</option></select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {notice ? <p role="status" className="border-b px-4 py-2 text-sm text-muted-foreground">{notice}</p> : null}
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Outlet</TableHead><TableHead>Invoice date</TableHead><TableHead className="text-right">Units</TableHead><TableHead>Shipment status</TableHead><TableHead>Shipped date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length ? filtered.map((invoice) => {
                const status = shipmentStatusFor(invoice);
                const units = invoice.items.reduce((sum, item) => sum + item.qty, 0);
                return <TableRow key={invoice.id}>
                  <TableCell><Link href={`/c/${encodeURIComponent(companyId)}/sales/${encodeURIComponent(invoice.id)}`} className="font-mono font-bold text-primary hover:underline">{invoice.reference}</Link></TableCell>
                  <TableCell className="font-semibold text-heading">{invoice.customer}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.outlet}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-right tabular-nums">{units}</TableCell>
                  <TableCell><Badge tone={status === "Shipped" ? "success" : "warning"}>{status === "Shipped" ? <PackageCheck className="mr-1 size-3" /> : <Truck className="mr-1 size-3" />}{status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.shippedAt ?? "—"}</TableCell>
                  <TableCell className="text-right">{status === "Preparing" ? <Button size="sm" variant="outline" onClick={() => markShipped(invoice.id)}>Mark shipped</Button> : <span className="text-sm text-muted-foreground">Complete</span>}</TableCell>
                </TableRow>;
              }) : <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No shipments match your search.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
