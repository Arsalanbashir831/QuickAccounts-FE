"use client";

import { PackageCheck, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allSerialsCaptured, usePurchaseOrders, writePurchaseOrders, type PurchaseOrder, type ReceivingStatus } from "../purchase-store";

export function ReceivingView({ companyId }: { companyId: string }) {
  const orders = usePurchaseOrders(companyId);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = orders.filter((order) => `${order.poNumber} ${order.supplier} ${order.destination}`.toLowerCase().includes(search.toLowerCase()));
  const changeStatus = (order: PurchaseOrder, status: ReceivingStatus) => {
    if (status === "Received" && !allSerialsCaptured(order)) {
      setNotice(`${order.poNumber} needs one unique serial or barcode per unit before it can be marked received. Open its Purchase Order details to add them.`);
      return;
    }
    try {
      writePurchaseOrders(companyId, orders.map((entry) => entry.id === order.id ? { ...entry, receivingStatus: status } : entry));
      setNotice(`${order.poNumber} marked ${status.toLowerCase()}.`);
    } catch { setNotice("Could not update the receiving status in this browser."); }
  };

  return <Card><CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Receiving Status</CardTitle><CardDescription>Track stock from order to shipment to receipt at its destination.</CardDescription></div><div className="relative w-full sm:w-64"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search PO, supplier or destination" aria-label="Search receiving status" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div></CardHeader>
    <CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>PO reference</TableHead><TableHead>Supplier</TableHead><TableHead>Receiving destination</TableHead><TableHead>Expected delivery</TableHead><TableHead className="text-center">Ordered units</TableHead><TableHead className="text-center">Serials captured</TableHead><TableHead>Receiving status</TableHead><TableHead className="text-right">Next step</TableHead></TableRow></TableHeader><TableBody>{filtered.length ? filtered.map((order) => {
      const units = order.items.reduce((sum, item) => sum + item.qty, 0);
      const captured = order.items.reduce((sum, item) => sum + item.serials.filter((serial) => serial.trim()).length, 0);
      return <TableRow key={order.id}><TableCell className="font-mono font-bold text-primary">{order.poNumber}</TableCell><TableCell className="font-semibold text-heading">{order.supplier}</TableCell><TableCell className="text-sm text-muted-foreground">{order.destination}</TableCell><TableCell className="text-sm">{order.expectedDate}</TableCell><TableCell className="text-center tabular-nums">{units}</TableCell><TableCell className="text-center tabular-nums">{captured}/{units}</TableCell><TableCell><Badge tone={order.receivingStatus === "Received" ? "success" : order.receivingStatus === "Shipped" ? "warning" : "neutral"}>{order.receivingStatus}</Badge></TableCell><TableCell><div className="flex justify-end gap-2">{order.receivingStatus === "Awaiting shipment" ? <Button size="sm" variant="outline" onClick={() => changeStatus(order, "Shipped")}><Truck className="size-4" />Mark shipped</Button> : order.receivingStatus === "Shipped" ? <Button size="sm" variant="outline" onClick={() => changeStatus(order, "Received")}><PackageCheck className="size-4" />Mark received</Button> : <span className="text-xs text-muted-foreground">Complete</span>}<Button asChild size="sm" variant="ghost"><Link href={`/c/${companyId}/stock/purchases/${encodeURIComponent(order.id)}`}>Order details</Link></Button></div></TableCell></TableRow>;
    }) : <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No orders match your search.</TableCell></TableRow>}</TableBody></Table>{notice ? <p role="status" className="border-t px-4 py-3 text-sm text-heading">{notice}</p> : null}</CardContent>
  </Card>;
}
