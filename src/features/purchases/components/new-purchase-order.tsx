"use client";

import { ArrowLeft, Building2, CreditCard, Plus, Search, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/features/settings/location-store";
import { useCompanySettings } from "@/features/settings/settings-store";
import { SerialEntryTable } from "@/features/sales/components/serial-entry-table";
import { addSerialCodes, pasteSerialCodes } from "@/features/sales/components/serial-code-utils";
import { nextPurchaseNumber, purchaseCatalog, suppliers, usePurchaseOrders, writePurchaseOrders, type PaymentMethod, type PurchaseItem } from "../purchase-store";

type DraftItem = PurchaseItem & { stock: number };
const MAX_UNITS = 1000;
const bankAccounts = [
  "HBL – Main Account (****4821)", "Meezan Bank – Business (****3305)", "UBL – Current Account (****7102)",
  "Allied Bank – Savings (****9964)", "Faysal Bank – Business (****2278)", "JS Bank – Current (****5590)", "MCB – Current Account (****6437)",
];
const money = (value: number) => `$${value.toLocaleString("en-PK")}`;

export function NewPurchaseOrder({ companyId }: { companyId: string }) {
  const router = useRouter();
  const orders = usePurchaseOrders(companyId);
  const locations = useLocations(companyId);
  const companySettings = useCompanySettings(companyId);
  const [supplier, setSupplier] = useState<string>(suppliers[0]);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");
  const [destination, setDestination] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [bankAccount, setBankAccount] = useState(bankAccounts[0]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState("");
  const selectedDestination = destination || locations.find((location) => location.id === companySettings.rules.defaultReceivingLocation)?.name || locations[0]?.name || "";
  const total = items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  const serials = items.flatMap((item) => item.serials.map((serial) => serial.trim()).filter(Boolean));
  const duplicates = new Set(serials.filter((serial, index) => serials.indexOf(serial) !== index));
  const filteredCatalog = purchaseCatalog.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  const updateItem = (id: string, patch: Partial<DraftItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const setQuantity = (item: DraftItem, raw: string) => {
    const qty = Number(raw);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_UNITS) return;
    updateItem(item.id, { qty, serials: Array.from({ length: qty }, (_, index) => item.serials[index] ?? "") });
  };
  const addProduct = (product: (typeof purchaseCatalog)[number]) => {
    if (items.some((item) => item.id === product.id)) return;
    setItems((current) => [...current, { ...product, qty: 1, serials: [""], stock: MAX_UNITS }]);
    setError("");
  };
  const createOrder = () => {
    if (!selectedDestination) { setError("Add a stock location in Settings before creating an order."); return; }
    if (!supplierInvoice.trim()) { setError("Enter the supplier invoice reference."); return; }
    if (!expectedDate) { setError("Choose an expected delivery date."); return; }
    if (items.length === 0) { setError("Add at least one product."); return; }
    if (items.some((item) => !Number.isFinite(item.unitCost) || item.unitCost <= 0 || item.qty < 1)) { setError("Each product needs a valid quantity and unit cost."); return; }
    if (duplicates.size) { setError("Remove duplicate serial or barcode values before saving."); return; }
    const order = {
      id: crypto.randomUUID(), poNumber: nextPurchaseNumber(orders), supplier, supplierInvoice: supplierInvoice.trim(),
      supplierInvoiceDate: supplierInvoiceDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${supplierInvoiceDate}T12:00:00`)) : undefined,
      date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      expectedDate: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${expectedDate}T12:00:00`)),
      destination: selectedDestination, paymentMethod, bankAccount: paymentMethod === "bank" ? bankAccount : undefined,
      notes: notes.trim(), items: items.map((item) => ({ id: item.id, name: item.name, sku: item.sku, qty: item.qty, unitCost: item.unitCost, serials: item.serials })), totalCost: total,
      receivingStatus: "Awaiting shipment" as const,
    };
    try {
      writePurchaseOrders(companyId, [order, ...orders]);
      router.push(`/c/${companyId}/purchases?view=orders`);
    } catch { setError("Could not save this order in this browser. Please check available storage and try again."); }
  };

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <div><Button asChild variant="ghost" size="sm"><Link href={`/c/${companyId}/purchases?view=orders`}><ArrowLeft className="size-4" />Back to purchase orders</Link></Button></div>
      <WorkspaceHeader eyebrow="Purchases · New order" title="New Purchase Order" description="Choose the supplier and receiving location, then build an itemised order with optional serials." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.8fr)] xl:items-start">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Order details</CardTitle><CardDescription>Supplier document and stock destination</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-heading">Supplier<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-base" value={supplier} onChange={(event) => setSupplier(event.target.value)}>{suppliers.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="space-y-1.5 text-sm font-medium text-heading">Supplier invoice number <span className="text-destructive">*</span><Input value={supplierInvoice} onChange={(event) => setSupplierInvoice(event.target.value)} placeholder="e.g. SUP-INV-1042" /></label>
            <label className="space-y-1.5 text-sm font-medium text-heading">Supplier invoice date<Input type="date" value={supplierInvoiceDate} onChange={(event) => setSupplierInvoiceDate(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm font-medium text-heading">Stock destination <span className="text-destructive">*</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-base" value={selectedDestination} onChange={(event) => setDestination(event.target.value)}>{locations.length === 0 ? <option value="">No locations added</option> : locations.map((location) => <option key={location.id} value={location.name}>{location.name} · {location.type}</option>)}</select><span className="block text-xs font-normal text-muted-foreground">From <Link className="text-primary hover:underline" href={`/c/${companyId}/settings?view=locations`}>Settings → Locations</Link></span></label>
            <label className="space-y-1.5 text-sm font-medium text-heading">Expected delivery <span className="text-destructive">*</span><Input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Products and serials</CardTitle><CardDescription>Add products, set quantity and purchase cost, then scan or upload serials when available.</CardDescription></CardHeader><CardContent className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product name or SKU" aria-label="Search products" /></div>
            {search ? <div className="divide-y rounded-lg border">{filteredCatalog.length ? filteredCatalog.map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"><div><p className="text-sm font-semibold text-heading">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku} · suggested cost {money(product.unitCost)}</p></div><Button size="sm" variant="outline" disabled={items.some((item) => item.id === product.id)} onClick={() => addProduct(product)}><Plus className="size-4" />{items.some((item) => item.id === product.id) ? "Added" : "Add"}</Button></div>) : <p className="px-3 py-4 text-sm text-muted-foreground">No matching products.</p>}</div> : null}
            {items.length === 0 ? <div className="rounded-lg border border-dashed px-4 py-9 text-center text-sm text-muted-foreground">Search the catalog to add the first product.</div> : items.map((item) => <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-heading">{item.name}</h3><p className="text-xs text-muted-foreground">SKU: {item.sku}</p></div><Button size="icon" variant="ghost" aria-label={`Remove ${item.name}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 className="size-4" /></Button></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_12rem_1fr] sm:items-end"><label className="space-y-1.5 text-sm font-medium text-heading">Quantity<Input type="number" min={1} max={MAX_UNITS} value={item.qty} onChange={(event) => setQuantity(item, event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium text-heading">Unit cost (USD)<Input type="number" min={0.01} step={0.01} value={item.unitCost} onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) })} /></label><div className="pb-2 text-right text-sm font-semibold tabular-nums text-heading">{money(item.qty * item.unitCost)}</div></div>
              <SerialEntryTable itemId={`purchase-${item.id}`} productName={item.name} qty={item.qty} stock={MAX_UNITS} stockLabel="Optional until receiving · max 1,000 units" capacityLabel="the 1,000-unit line limit" serials={item.serials} duplicateSerials={duplicates} onChange={(index, value) => updateItem(item.id, { serials: item.serials.map((serial, position) => position === index ? value : serial) })} onAddCodes={(codes) => { const result = addSerialCodes(items, item.id, codes); setItems(result.items); return result; }} onPasteCodes={(index, codes) => { const result = pasteSerialCodes(items, item.id, index, codes); setItems(result.items); return result; }} />
            </div>)}
          </CardContent></Card>
        </div>
        <div className="space-y-5 xl:sticky xl:top-5">
          <Card><CardHeader><CardTitle>Payment method</CardTitle><CardDescription>Use the same settlement choices as Sales.</CardDescription></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">{([{ value: "cash", label: "Cash", icon: Wallet }, { value: "bank", label: "Card / Bank", icon: CreditCard }, { value: "credit", label: "Supplier Credit", icon: Building2 }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} aria-pressed={paymentMethod === value} onClick={() => setPaymentMethod(value)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${paymentMethod === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Icon className="size-5" />{label}</button>)}</div>
            {paymentMethod === "bank" ? <label className="block space-y-1.5 text-sm font-medium text-heading">Paying from<select value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{bankAccounts.map((account) => <option key={account}>{account}</option>)}</select></label> : null}
            {paymentMethod === "credit" ? <p className="text-xs text-muted-foreground">The full amount remains payable to the supplier.</p> : null}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Order summary</CardTitle><CardDescription>{items.length} product {items.length === 1 ? "line" : "lines"}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">Total units</span><strong className="tabular-nums">{items.reduce((sum, item) => sum + item.qty, 0)}</strong></div><div className="flex items-center justify-between text-sm"><span className="font-semibold">Total purchase cost</span><strong className="text-xl tabular-nums text-primary">{money(total)}</strong></div><label className="block space-y-1.5 text-sm font-medium text-heading">Order notes<textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-base font-normal" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or supplier terms" /></label><p className="text-xs text-muted-foreground">Serials may be added now or from the order details. All units need unique serials before marking the order received.</p>{error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}<Button className="w-full" onClick={createOrder}>Create purchase order</Button></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
