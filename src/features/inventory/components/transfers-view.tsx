"use client";

import { ArrowRight, CheckCircle2, Clock, PackageCheck, Plus, Search, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SerialEntryTable } from "@/features/sales/components/serial-entry-table";
import { addSerialCodes, pasteSerialCodes } from "@/features/sales/components/serial-code-utils";
import { useInvoices } from "@/features/sales/invoice-store";
import { useLocations } from "@/features/settings/location-store";
import { buildStockBalances, stockLocations } from "../stock-data";
import {
  nextTransferReference,
  transferStatusTone,
  updateTransferStatus,
  useTransfers,
  writeTransfers,
  type StockTransfer,
  type TransferStatus,
} from "../transfer-store";
import { StockFormDialog } from "./stock-form-dialog";

const products = [...new Map(stockLocations.map((stock) => [stock.sku, { sku: stock.sku, name: stock.name }])).values()];
const selectClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-heading focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";

export function TransfersView({ companyId }: { companyId: string }) {
  const router = useRouter();
  const transfers = useTransfers(companyId);
  const invoices = useInvoices(companyId);
  const locations = useLocations(companyId);
  const balances = buildStockBalances(invoices, transfers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fromSite, setFromSite] = useState("Main Warehouse");
  const [toSite, setToSite] = useState("Main Outlet");
  const [productSku, setProductSku] = useState("ANK-65W-WHT");
  const [itemsCount, setItemsCount] = useState(1);
  const [serials, setSerials] = useState<string[]>([""]);
  const [newStatus, setNewStatus] = useState<TransferStatus>("Preparing");
  const [error, setError] = useState("");

  const preparingCount = transfers.filter((t) => t.status === "Preparing" || t.status === "Requested").length;
  const shippedCount = transfers.filter((t) => t.status === "Shipped" || t.status === "In Transit" || t.status === "Dispatched").length;
  const receivedCount = transfers.filter((t) => t.status === "Received").length;

  const product = products.find((entry) => entry.sku === productSku);
  const available = balances.find((row) => row.sku === productSku && row.location === fromSite)?.available ?? 0;
  const duplicateSerials = new Set(serials.map((serial) => serial.trim()).filter((serial, index, all) => serial && all.indexOf(serial) !== index));
  const filtered = transfers.filter((transfer) => {
    const matchesSearch = `${transfer.transferRef} ${transfer.productSku} ${transfer.productName} ${transfer.fromSite} ${transfer.toSite}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || (
      statusFilter === "preparing" ? (transfer.status === "Preparing" || transfer.status === "Requested") :
      statusFilter === "shipped" ? (transfer.status === "Shipped" || transfer.status === "In Transit" || transfer.status === "Dispatched") :
      statusFilter === "received" ? transfer.status === "Received" :
      transfer.status.toLowerCase() === statusFilter
    );
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (transferId: string, nextStatus: TransferStatus) => {
    try {
      const target = transfers.find((t) => t.id === transferId);
      updateTransferStatus(companyId, transferId, nextStatus);
      setNotice(`${target?.transferRef ?? "Transfer"} status changed to ${nextStatus}.`);
    } catch {
      setError("Could not update transfer status in this browser.");
    }
  };

  const changeQuantity = (value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.floor(value))) : 0;
    setItemsCount(next);
    setSerials((current) => Array.from({ length: next }, (_, index) => current[index] ?? ""));
    setError("");
  };
  const addCodes = (codes: string[]) => {
    const result = addSerialCodes([{ id: "transfer", qty: itemsCount, stock: itemsCount, serials }], "transfer", codes);
    setSerials(result.items[0].serials);
    setError("");
    return result;
  };
  const pasteCodes = (startIndex: number, codes: string[]) => {
    const result = pasteSerialCodes([{ id: "transfer", qty: itemsCount, stock: itemsCount, serials }], "transfer", startIndex, codes);
    setSerials(result.items[0].serials);
    setError("");
    return result;
  };
  const handleCreateTransfer = () => {
    if (!product || !locations.some((location) => location.name === fromSite) || !locations.some((location) => location.name === toSite)) {
      setError("Choose a valid product, origin, and destination.");
      return;
    }
    if (fromSite === toSite) { setError("Origin and destination must be different locations."); return; }
    if (itemsCount < 1 || itemsCount > available) { setError(`Enter 1 to ${available} available units at ${fromSite}.`); return; }
    const normalized = serials.map((serial) => serial.trim());
    if (normalized.length !== itemsCount || normalized.some((serial) => !serial)) { setError(`Enter one serial or barcode for each of the ${itemsCount} units.`); return; }
    if (new Set(normalized).size !== normalized.length) { setError("Each serial or barcode must be unique within this transfer."); return; }

    const transfer: StockTransfer = {
      id: `tr-${crypto.randomUUID()}`,
      transferRef: nextTransferReference(transfers),
      fromSite, toSite,
      date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      productSku, productName: product.name, itemsCount, serials: normalized, status: newStatus,
    };
    writeTransfers(companyId, [transfer, ...transfers]);
    setShowModal(false);
    setItemsCount(1);
    setSerials([""]);
    setNewStatus("Preparing");
    setNotice(`${transfer.transferRef} created with status ${newStatus}.`);
    setError("");
  };
  const openTransfer = (id: string) => router.push(`/c/${encodeURIComponent(companyId)}/stock/transfers/${encodeURIComponent(id)}`);
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    openTransfer(id);
  };
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTransfer(id);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5"><Clock className="size-3.5 text-info" />Preparing</CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-heading">{preparingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5"><Truck className="size-3.5 text-warning" />Shipped / In Transit</CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-heading">{shippedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" />Received</CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-heading">{receivedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Inter-Site Stock Transfers</CardTitle><CardDescription>Track the exact product and serialized units moving between outlets and warehouses. Change transfer status as stock progresses.</CardDescription></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search transfers" placeholder="Search transfer or product" className="pl-8 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <select aria-label="Filter transfer status" className="h-9 rounded-md border border-input bg-background px-3 text-xs text-heading" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="preparing">Preparing</option>
              <option value="shipped">Shipped</option>
              <option value="received">Received</option>
            </select>
            <Button size="sm" onClick={() => setShowModal(true)}><Plus className="size-4" />Initiate Transfer</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {notice ? (
            <div role="status" className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-sm text-heading">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
            </div>
          ) : null}
          <Table>
            <TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Product item</TableHead><TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Serials</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Next step / Change</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.length ? filtered.map((transfer) => {
              const isPreparing = transfer.status === "Preparing" || transfer.status === "Requested";
              const isShipped = transfer.status === "Shipped" || transfer.status === "In Transit" || transfer.status === "Dispatched";
              const isReceived = transfer.status === "Received";

              return (
                <TableRow key={transfer.id} role="link" tabIndex={0} aria-label={`View transfer ${transfer.transferRef} for ${transfer.productName}`} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5" onClick={(event) => handleRowClick(event, transfer.id)} onKeyDown={(event) => handleRowKeyDown(event, transfer.id)}>
                  <TableCell className="font-mono font-bold text-primary">{transfer.transferRef}</TableCell>
                  <TableCell><span className="font-semibold text-heading">{transfer.productName}</span><span className="block font-mono text-xs text-muted-foreground">{transfer.productSku}</span></TableCell>
                  <TableCell>{transfer.fromSite}</TableCell><TableCell>{transfer.toSite}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{transfer.itemsCount} units</TableCell>
                  <TableCell className="text-right tabular-nums">{transfer.serials.length} recorded</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{transfer.date}</TableCell>
                  <TableCell><Badge tone={transferStatusTone(transfer.status)}>{transfer.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      {isPreparing && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold text-primary" onClick={() => handleStatusChange(transfer.id, "Shipped")}>
                          <Truck className="size-3.5" />Mark shipped
                        </Button>
                      )}
                      {isShipped && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" onClick={() => handleStatusChange(transfer.id, "Received")}>
                          <PackageCheck className="size-3.5" />Mark received
                        </Button>
                      )}
                      {isReceived && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />Received
                        </span>
                      )}
                      <select
                        aria-label={`Change status for ${transfer.transferRef}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-heading"
                        value={isPreparing ? "Preparing" : isShipped ? "Shipped" : "Received"}
                        onChange={(event) => handleStatusChange(transfer.id, event.target.value as TransferStatus)}
                      >
                        <option value="Preparing">Preparing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Received">Received</option>
                      </select>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : <TableRow><TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">No transfers match your search.</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && <StockFormDialog
        eyebrow="Stock movement"
        title="Initiate transfer"
        description="Identify the product, units, and status. Preparing and Shipped stages reserve stock at origin until received."
        icon={Truck}
        wide
        onClose={() => { setShowModal(false); setError(""); }}
        footer={<><Button type="button" variant="outline" onClick={() => { setShowModal(false); setError(""); }}>Cancel</Button><Button type="button" onClick={handleCreateTransfer}><CheckCircle2 className="size-4" />{newStatus === "Preparing" ? "Create transfer (Preparing)" : newStatus === "Shipped" ? "Dispatch transfer (Shipped)" : "Record transfer (Received)"}</Button></>}
      >
        <div className="space-y-6">
          <section className="space-y-4" aria-labelledby="transfer-route-heading">
            <div><h3 id="transfer-route-heading" className="text-sm font-semibold text-heading">Transfer route</h3><p className="mt-1 text-sm text-muted-foreground">Choose where the stock is leaving and where it is going.</p></div>
            <div className="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <label className="block space-y-2 rounded-xl border bg-muted/25 p-4 text-sm font-medium text-heading">From location<select data-dialog-autofocus className={selectClass} value={fromSite} onChange={(event) => { setFromSite(event.target.value); setError(""); }}>{locations.map((location) => <option key={location.id} value={location.name}>{location.name}</option>)}</select></label>
              <div className="flex items-center justify-center text-muted-foreground"><span className="flex size-9 items-center justify-center rounded-full border bg-card"><ArrowRight className="size-4 rotate-90 sm:rotate-0" aria-hidden="true" /></span></div>
              <label className="block space-y-2 rounded-xl border bg-muted/25 p-4 text-sm font-medium text-heading">To location<select className={selectClass} value={toSite} onChange={(event) => { setToSite(event.target.value); setError(""); }}>{locations.map((location) => <option key={location.id} value={location.name}>{location.name}</option>)}</select></label>
            </div>
          </section>
          <section className="space-y-4 border-t pt-6" aria-labelledby="transfer-product-heading">
            <div><h3 id="transfer-product-heading" className="text-sm font-semibold text-heading">Product and quantity</h3><p className="mt-1 text-sm text-muted-foreground">Available stock is checked at the selected origin.</p></div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <label className="block space-y-2 text-sm font-medium text-heading">Product item<select className={selectClass} value={productSku} onChange={(event) => { setProductSku(event.target.value); setError(""); }}>{products.map((entry) => <option key={entry.sku} value={entry.sku}>{entry.name} · {entry.sku}</option>)}</select></label>
              <label className="block space-y-2 text-sm font-medium text-heading">Units to dispatch<Input type="number" min={1} max={1000} step={1} value={itemsCount} onChange={(event) => changeQuantity(Number(event.target.value))} className="h-11 text-base font-semibold tabular-nums" /></label>
            </div>
            <label className="block space-y-2 text-sm font-medium text-heading">
              Transfer status
              <select className={selectClass} value={newStatus} onChange={(event) => setNewStatus(event.target.value as TransferStatus)}>
                <option value="Preparing">Preparing (Awaiting dispatch)</option>
                <option value="Shipped">Shipped (In transit)</option>
                <option value="Received">Received (Arrived at destination)</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-heading">{available} units available</span> at {fromSite}. Each unit needs its own unique serial or barcode.</p>
          </section>
          {product && itemsCount > 0 ? <SerialEntryTable itemId="transfer" productName={product.name} qty={itemsCount} stock={itemsCount} stockLabel={`${itemsCount} units to dispatch`} capacityLabel="transfer quantity" serials={serials} duplicateSerials={duplicateSerials} onChange={(index, value) => { setSerials((current) => current.map((code, codeIndex) => codeIndex === index ? value : code)); setError(""); }} onAddCodes={addCodes} onPasteCodes={pasteCodes} /> : null}
          {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </StockFormDialog>}
    </div>
  );
}
