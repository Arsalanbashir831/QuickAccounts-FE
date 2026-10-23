"use client";

import { ArrowLeft, CheckCircle2, Clock, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  transferStatusTone,
  updateTransferStatus,
  useTransfers,
  type TransferStatus,
} from "../transfer-store";

const stages = [
  { id: "Preparing", label: "Preparing", icon: Clock, desc: "Stock staged at origin" },
  { id: "Shipped", label: "Shipped", icon: Truck, desc: "In transit to destination" },
  { id: "Received", label: "Received", icon: PackageCheck, desc: "Delivered & verified" },
] as const;

export function TransferDetails({ companyId, transferId }: { companyId: string; transferId: string }) {
  const transfers = useTransfers(companyId);
  const [notice, setNotice] = useState("");
  const transfer = transfers.find((entry) => entry.id === transferId);
  const returnHref = `/c/${encodeURIComponent(companyId)}/stock/transfers`;

  if (!transfer) return <div className="workspace-enter space-y-5"><Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to transfers</Link></Button><Card><CardHeader><CardTitle>Transfer not found</CardTitle><CardDescription>This transfer is unavailable in this browser.</CardDescription></CardHeader></Card></div>;

  const isPreparing = transfer.status === "Preparing" || transfer.status === "Requested";
  const isShipped = transfer.status === "Shipped" || transfer.status === "In Transit" || transfer.status === "Dispatched";
  const isReceived = transfer.status === "Received";

  const currentStageIndex = isPreparing ? 0 : isShipped ? 1 : 2;

  const changeStatus = (nextStatus: TransferStatus) => {
    try {
      updateTransferStatus(companyId, transfer.id, nextStatus);
      setNotice(`Transfer status updated to ${nextStatus}.`);
    } catch {
      setNotice("Could not update transfer status in this browser.");
    }
  };

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild size="sm" variant="ghost"><Link href={returnHref}><ArrowLeft className="size-4" />Back to transfers</Link></Button>
      <WorkspaceHeader eyebrow="Stock · Transfer details" title={transfer.transferRef} description={`${transfer.productName} · ${transfer.productSku}`} />

      {notice ? (
        <div role="status" className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-heading">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      ) : null}

      {/* Status Workflow & Actions */}
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Transfer Status Workflow</CardTitle>
            <CardDescription>Track and update the movement lifecycle from Preparing to Shipped to Received.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <select
              aria-label="Change status"
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold text-heading shadow-xs"
              value={isPreparing ? "Preparing" : isShipped ? "Shipped" : "Received"}
              onChange={(e) => changeStatus(e.target.value as TransferStatus)}
            >
              <option value="Preparing">Preparing</option>
              <option value="Shipped">Shipped</option>
              <option value="Received">Received</option>
            </select>
            {isPreparing && (
              <Button size="sm" onClick={() => changeStatus("Shipped")}>
                <Truck className="size-4" />Mark as Shipped
              </Button>
            )}
            {isShipped && (
              <Button size="sm" onClick={() => changeStatus("Received")}>
                <PackageCheck className="size-4" />Mark as Received
              </Button>
            )}
            {isReceived && (
              <Button size="sm" variant="outline" onClick={() => changeStatus("Shipped")}>
                Revert to Shipped
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isCurrent = idx === currentStageIndex;
              const isDone = idx < currentStageIndex;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => changeStatus(stage.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    isCurrent
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : isDone
                      ? "border-border bg-card/60 hover:bg-muted/30"
                      : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100",
                  )}
                >
                  <div className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    isCurrent
                      ? "border-primary/40 bg-primary text-primary-foreground"
                      : isDone
                      ? "border-success/30 bg-success/15 text-success-foreground"
                      : "border-muted bg-muted text-muted-foreground",
                  )}>
                    {isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold", isCurrent ? "text-primary" : "text-heading")}>{stage.label}</p>
                      {isCurrent && <Badge tone={transferStatusTone(stage.id)} className="text-[0.65rem]">Current</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stage.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Quantity</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{transfer.itemsCount} units</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Serials / barcodes</CardDescription><CardTitle className="numeric text-2xl font-bold tabular-nums text-heading">{transfer.serials.length} recorded</CardTitle></CardHeader></Card>
        <Card><CardHeader className="p-4"><CardDescription>Status</CardDescription><CardTitle className="pt-1"><Badge tone={transferStatusTone(transfer.status)}>{transfer.status}</Badge></CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Transfer route and item</CardTitle><CardDescription>Origin, destination, and the product committed to this movement</CardDescription></CardHeader>
        <CardContent className="grid gap-4 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-muted-foreground">From location</p><p className="font-semibold text-heading">{transfer.fromSite}</p></div>
          <div><p className="text-muted-foreground">To location</p><p className="font-semibold text-heading">{transfer.toSite}</p></div>
          <div><p className="text-muted-foreground">Product</p><p className="font-semibold text-heading">{transfer.productName}</p><p className="font-mono text-xs text-muted-foreground">{transfer.productSku}</p></div>
          <div><p className="text-muted-foreground">Dispatch date</p><p className="font-semibold text-heading">{transfer.date}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b"><CardTitle>Serial / barcode register</CardTitle><CardDescription>Unique codes for the {transfer.itemsCount} units in this transfer</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th scope="col" className="w-16 px-4 py-3">#</th><th scope="col" className="px-4 py-3">Serial / barcode</th></tr></thead><tbody>{transfer.serials.map((serial, index) => <tr key={`${serial}-${index}`} className="border-t"><td className="px-4 py-2 tabular-nums text-muted-foreground">{index + 1}</td><td className="break-all px-4 py-2 font-mono text-heading">{serial}</td></tr>)}</tbody></table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
