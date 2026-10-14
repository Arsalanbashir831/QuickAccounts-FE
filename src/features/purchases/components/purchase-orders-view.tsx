"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchaseOrders, type PurchaseOrder } from "../purchase-store";

const money = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;

export function PurchaseOrdersView({ companyId }: { companyId: string }) {
  const router = useRouter();
  const orders = usePurchaseOrders(companyId);
  const [search, setSearch] = useState("");
  const filtered = orders.filter((order) => `${order.poNumber} ${order.supplier} ${order.supplierInvoice} ${order.destination}`.toLowerCase().includes(search.toLowerCase()));
  const outstanding = orders.filter((order) => order.receivingStatus !== "Received");
  const orderHref = (order: PurchaseOrder) => `/c/${encodeURIComponent(companyId)}/purchases/${encodeURIComponent(order.id)}`;
  const openOrder = (order: PurchaseOrder) => router.push(orderHref(order));
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, order: PurchaseOrder) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    openOrder(order);
  };
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, order: PurchaseOrder) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOrder(order);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Total orders</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{orders.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Value in transit or pending</CardDescription><CardTitle className="numeric text-2xl font-bold text-primary">{money(outstanding.reduce((sum, order) => sum + order.totalCost, 0))}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Received orders</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{orders.length - outstanding.length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Purchase Orders</CardTitle><CardDescription>Supplier commitments and stock destinations</CardDescription></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search PO, supplier or invoice" aria-label="Search purchase orders" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Button size="sm" asChild><Link href={`/c/${companyId}/purchases/new`}><Plus className="size-4" />New Purchase Order</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>PO reference</TableHead><TableHead>Supplier</TableHead><TableHead>Supplier invoice</TableHead><TableHead>Destination</TableHead><TableHead>Order date</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Total cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length ? filtered.map((order) => (
                <TableRow
                  key={order.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${order.poNumber} purchase order details`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5"
                  onClick={(event) => handleRowClick(event, order)}
                  onKeyDown={(event) => handleRowKeyDown(event, order)}
                >
                  <TableCell className="font-mono font-bold text-primary">{order.poNumber}</TableCell>
                  <TableCell className="font-semibold text-heading">{order.supplier}</TableCell>
                  <TableCell className="text-sm">{order.supplierInvoice || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.destination}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                  <TableCell className="text-sm">{order.expectedDate}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(order.totalCost)}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No purchase orders match your search.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
