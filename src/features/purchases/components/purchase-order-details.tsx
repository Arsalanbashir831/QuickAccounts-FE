"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SerialEntryTable } from "@/features/sales/components/serial-entry-table";
import { addSerialCodes, pasteSerialCodes } from "@/features/sales/components/serial-code-utils";
import { usePurchaseOrders, writePurchaseOrders, type PurchaseOrder } from "../purchase-store";
import { PurchasePrintTemplate } from "./purchase-print-template";

const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;
const subscribeToNothing = () => () => {};

export function PurchaseOrderDetails({ companyId, orderId }: { companyId: string; orderId: string }) {
  const orders = usePurchaseOrders(companyId);
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const order = orders.find((entry) => entry.id === orderId);
  const returnHref = `/c/${companyId}/stock/purchases`;

  const updateSerials = (currentOrder: PurchaseOrder, itemId: string, nextSerials: string[]) => {
    const nextOrders = orders.map((entry) => entry.id === currentOrder.id ? {
      ...entry,
      items: entry.items.map((item) => item.id === itemId ? { ...item, serials: nextSerials } : item),
    } : entry);
    try { writePurchaseOrders(companyId, nextOrders); setNotice("Serial register saved."); }
    catch { setNotice("Could not save serials in this browser."); }
  };

  if (!isHydrated) {
    return <div className="workspace-enter space-y-5"><p className="text-sm text-muted-foreground" role="status">Loading purchase order…</p></div>;
  }

  if (!order) {
    return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to purchase orders</Link></Button><Card><CardHeader><CardTitle>Purchase order not found</CardTitle><CardDescription>This order is unavailable in this browser. It may have been created in another browser or company.</CardDescription></CardHeader></Card></div>;
  }

  const serialLines = order.items.map((item) => ({ ...item, stock: item.qty }));
  const allSerials = order.items.flatMap((item) => item.serials.map((value) => value.trim()).filter(Boolean));
  const duplicates = new Set(allSerials.filter((value, index) => allSerials.indexOf(value) !== index));
  const paymentLabel = order.paymentMethod === "bank" ? "Card / Bank" : order.paymentMethod === "credit" ? "Supplier Credit" : "Cash";

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to purchase orders</Link></Button>
      <WorkspaceHeader
        eyebrow="Purchases · Order details"
        title={order.poNumber}
        description={`${order.supplier} · supplier invoice ${order.supplierInvoice || "not provided"}${order.supplierInvoiceDate ? ` · ${order.supplierInvoiceDate}` : ""}`}
        action={<Button onClick={() => setShowPrintPreview(true)}><Printer className="size-4" />Print receipt</Button>}
      />

      <Card>
        <CardHeader className="border-b"><CardTitle>Order overview</CardTitle><CardDescription>Supplier, stock destination, and payment details</CardDescription></CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Stock destination</p><p className="font-semibold text-heading">{order.destination}</p></div>
            <div><p className="text-muted-foreground">Expected delivery</p><p className="font-semibold text-heading">{order.expectedDate}</p></div>
            <div><p className="text-muted-foreground">Payment</p><p className="font-semibold text-heading">{paymentLabel}</p>{order.bankAccount ? <p className="text-xs text-muted-foreground">{order.bankAccount}</p> : null}</div>
            <div><p className="text-muted-foreground">Total</p><p className="font-semibold tabular-nums text-primary">{money(order.totalCost)}</p></div>
          </div>
          <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
            <div><p className="text-muted-foreground">Order date</p><p className="font-semibold text-heading">{order.date}</p></div>
            <div><p className="text-muted-foreground">Supplier invoice</p><p className="font-semibold text-heading">{order.supplierInvoice || "Not provided"}</p>{order.supplierInvoiceDate ? <p className="text-xs text-muted-foreground">{order.supplierInvoiceDate}</p> : null}</div>
          </div>
          {order.notes ? <p className="rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="font-semibold">Notes: </span>{order.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Products and serials</CardTitle><CardDescription>{order.items.length} product {order.items.length === 1 ? "line" : "lines"} · one unique serial or barcode is required per unit before receiving.</CardDescription></CardHeader>
        <CardContent className="space-y-4 pt-5">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-heading">{item.name}</h3><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} × {money(item.unitCost)}</p></div><strong className="tabular-nums">{money(item.qty * item.unitCost)}</strong></div>
              <SerialEntryTable
                itemId={`${order.id}-${item.id}`}
                productName={item.name}
                qty={item.qty}
                stock={item.qty}
                stockLabel={order.receivingStatus === "Received" ? "Received serial register" : "Required before marking received"}
                capacityLabel="ordered quantity"
                serials={item.serials}
                duplicateSerials={duplicates}
                onChange={(index, value) => updateSerials(order, item.id, item.serials.map((serial, position) => position === index ? value : serial))}
                onAddCodes={(codes) => { const result = addSerialCodes(serialLines, item.id, codes); updateSerials(order, item.id, result.items.find((line) => line.id === item.id)?.serials ?? item.serials); return result; }}
                onPasteCodes={(index, codes) => { const result = pasteSerialCodes(serialLines, item.id, index, codes); updateSerials(order, item.id, result.items.find((line) => line.id === item.id)?.serials ?? item.serials); return result; }}
              />
            </div>
          ))}
          {notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}
        </CardContent>
      </Card>

      {showPrintPreview ? <PurchasePrintTemplate order={order} onClose={() => setShowPrintPreview(false)} /> : null}
    </div>
  );
}
