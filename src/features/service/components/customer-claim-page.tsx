"use client";

import { ArrowLeft, CheckCircle2, ChevronRight, FilePlus2, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ClaimKind = "customer" | "supplier";
type ClaimOutcome = "Pending" | "Replaced" | "Bill Back";
type WarrantyVerification = "Accepted" | "Rejected";

interface ReplacementEvent {
  rma: string;
  date: string;
  receivedSerialNumber: string;
  replacementSerialNumber?: string;
  outcome: string;
}

interface TraceRecord {
  product: string;
  sku: string;
  customerOrSupplier: string;
  lookupInvoice: string;
  purchaseOrder: string;
  supplier: string;
  supplierInvoice: string;
  receivedAt: string;
  soldAt?: string;
  sentToCustomerSerialNumber?: string;
  receivedSerialNumber: string;
  replacementHistory: ReplacementEvent[];
}

const customerTraceRecords: TraceRecord[] = [
  { product: "Samsung Galaxy A55 5G", sku: "SAM-A55-BLK", customerOrSupplier: "Apex Mobiles", lookupInvoice: "INV-10482", purchaseOrder: "PO-2088", supplier: "Tech Distributors Ltd.", supplierInvoice: "SUP-INV-7741", receivedAt: "28 Sep 2026 · Main Warehouse", soldAt: "02 Oct 2026 · Main Outlet", sentToCustomerSerialNumber: "358291048281100", receivedSerialNumber: "358291048291048", replacementHistory: [{ rma: "RMA-0071", date: "14 Aug 2026", receivedSerialNumber: "358291048281100", replacementSerialNumber: "358291048288002", outcome: "1st replacement issued" }, { rma: "RMA-0082", date: "08 Oct 2026", receivedSerialNumber: "358291048288002", replacementSerialNumber: "358291048291048", outcome: "2nd replacement claim received" }] },
  { product: "Baseus Bowie H1 Headphones", sku: "BAS-H1-GRY", customerOrSupplier: "Walk-in Customer", lookupInvoice: "INV-10461", purchaseOrder: "PO-2044", supplier: "Audio World Pakistan", supplierInvoice: "SUP-INV-7612", receivedAt: "19 Sep 2026 · Main Warehouse", soldAt: "07 Oct 2026 · Main Outlet", sentToCustomerSerialNumber: "BS-H1-9900", receivedSerialNumber: "BS-H1-9921", replacementHistory: [{ rma: "RMA-0081", date: "07 Oct 2026", receivedSerialNumber: "BS-H1-9921", outcome: "Initial warranty claim received" }] },
];

const supplierTraceRecords: TraceRecord[] = [
  { product: "Anker 65W GaN Charger", sku: "ANK-65W-WHT", customerOrSupplier: "Mumtaz Distributors", lookupInvoice: "PINV-2088", purchaseOrder: "PO-2088", supplier: "Mumtaz Distributors", supplierInvoice: "PINV-2088", receivedAt: "06 Oct 2026 · Main Warehouse", sentToCustomerSerialNumber: "ANK-65-44821", receivedSerialNumber: "ANK-65-44821", replacementHistory: [{ rma: "SC-0038", date: "06 Oct 2026", receivedSerialNumber: "ANK-65-44821", outcome: "Supplier claim opened" }] },
  { product: "Logitech MX Master 3S", sku: "LGT-MX3-BLK", customerOrSupplier: "Apex Importers", lookupInvoice: "PINV-2071", purchaseOrder: "PO-2071", supplier: "Apex Importers", supplierInvoice: "PINV-2071", receivedAt: "01 Oct 2026 · Main Warehouse", sentToCustomerSerialNumber: "LGT-MX3-0192", receivedSerialNumber: "LGT-MX3-0192", replacementHistory: [{ rma: "SC-0037", date: "01 Oct 2026", receivedSerialNumber: "LGT-MX3-0192", outcome: "Supplier claim opened" }] },
];

const statusTone = (value: ClaimOutcome | WarrantyVerification) => value === "Accepted" || value === "Replaced" ? "success" as const : value === "Rejected" || value === "Bill Back" ? "danger" as const : "warning" as const;

export const WarrantyClaimTracePage = ({ companyId, kind }: { companyId: string; kind: ClaimKind }) => {
  const isCustomer = kind === "customer";
  const records = isCustomer ? customerTraceRecords : supplierTraceRecords;
  const [lookup, setLookup] = useState("");
  const [trace, setTrace] = useState<TraceRecord | null>(null);
  const [verification, setVerification] = useState<WarrantyVerification>("Accepted");
  const [outcome, setOutcome] = useState<ClaimOutcome>("Pending");
  const [replacementSerialNumber, setReplacementSerialNumber] = useState("");
  const [createdRma, setCreatedRma] = useState<string | null>(null);

  const lookupHint = useMemo(() => isCustomer ? "Try INV-10482, 358291048291048, INV-10461, or BS-H1-9921." : "Try PINV-2088, ANK-65-44821, PINV-2071, or LGT-MX3-0192.", [isCustomer]);
  const findTrace = () => {
    const query = lookup.trim().toLowerCase();
    const match = records.find((record) => [record.lookupInvoice, record.receivedSerialNumber, record.sentToCustomerSerialNumber, ...record.replacementHistory.flatMap((item) => [item.receivedSerialNumber, item.replacementSerialNumber])].filter(Boolean).some((value) => value!.toLowerCase() === query));
    setTrace(match ?? null);
    setCreatedRma(null);
    if (!match) setVerification("Rejected");
  };
  const createRmaSlip = () => {
    if (!trace || (outcome === "Replaced" && !replacementSerialNumber.trim())) return;
    if (outcome === "Bill Back") {
      setCreatedRma("Warranty resolution completed");
      return;
    }
    setCreatedRma(`${isCustomer ? "RMA" : "SC"}-00${84 + trace.replacementHistory.length}`);
  };

  const lifecycle = trace ? [
    { label: "Purchased", value: trace.purchaseOrder, detail: trace.supplierInvoice },
    { label: "Supplier", value: trace.supplier, detail: "Original source" },
    { label: "Stock Received", value: trace.receivedAt, detail: trace.sku },
    ...(isCustomer && trace.soldAt ? [{ label: "Customer Invoice", value: trace.lookupInvoice, detail: `${trace.customerOrSupplier} · ${trace.soldAt}` }] : []),
    ...trace.replacementHistory.map((item) => ({ label: "Warranty RMA", value: item.rma, detail: `${item.receivedSerialNumber}${item.replacementSerialNumber ? ` → ${item.replacementSerialNumber}` : " · Claim received"}` })),
  ] : [];

  return <div className="workspace-enter space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{isCustomer ? "Customer Claims" : "Supplier Claims"} · New RMA</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-heading">Trace and register {isCustomer ? "customer" : "supplier"} warranty claim</h1><p className="mt-2 text-sm text-muted-foreground">Follow every serial change from purchase through the current warranty event.</p></div><Button asChild variant="outline"><Link href={`/c/${encodeURIComponent(companyId)}/returns?view=${isCustomer ? "customers" : "suppliers"}`}><ArrowLeft className="size-4" />Back to {isCustomer ? "Customer" : "Supplier"} Claims</Link></Button></div>
    <Card className="border-primary/25 shadow-sm"><CardHeader><CardTitle>Find product traceability</CardTitle><CardDescription>Search by the {isCustomer ? "customer invoice or received product serial number" : "supplier invoice or product serial number"}.</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Invoice number or product serial number" placeholder={isCustomer ? "e.g. INV-10482 or 358291048291048" : "e.g. PINV-2088 or ANK-65-44821"} className="pl-9" value={lookup} onChange={(event) => setLookup(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") findTrace(); }} /></div><Button onClick={findTrace}>Show Traceability</Button></div><p className="mt-3 text-xs text-muted-foreground">{lookupHint}</p></CardContent></Card>
    {trace ? <Card><CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{trace.product}</CardTitle><CardDescription>{trace.sku} · Received serial {trace.receivedSerialNumber}</CardDescription></div><Badge tone="info">{trace.customerOrSupplier}</Badge></CardHeader><CardContent className="space-y-6 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">{isCustomer ? "Customer invoice" : "Supplier invoice"}</p><p className="font-mono font-semibold text-heading">{trace.lookupInvoice}</p></div><div><p className="text-xs text-muted-foreground">Purchase order</p><p className="font-mono font-semibold text-heading">{trace.purchaseOrder}</p></div><div><p className="text-xs text-muted-foreground">Supplier invoice</p><p className="font-mono font-semibold text-heading">{trace.supplierInvoice}</p></div><div><p className="text-xs text-muted-foreground">Supplier</p><p className="font-semibold text-heading">{trace.supplier}</p></div></div>
      <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Product lifecycle history</p><div className="overflow-x-auto pb-2"><div className="flex min-w-[1120px] items-stretch gap-2">{lifecycle.map((step, index) => <div key={`${step.label}-${step.value}`} className="flex min-w-[195px] flex-1 items-stretch gap-2"><div className="min-w-0 flex-1 rounded-lg border bg-muted/20 p-3"><p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-primary">{step.label}</p><p className="mt-1 truncate text-sm font-semibold text-heading">{step.value}</p><p className="mt-1 text-xs text-muted-foreground">{step.detail}</p></div>{index < lifecycle.length - 1 ? <ChevronRight className="mt-7 size-4 shrink-0 text-muted-foreground" /> : null}</div>)}</div></div></div>
      {isCustomer && trace.sentToCustomerSerialNumber ? <div className="rounded-lg border bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Serial movement</p><div className="mt-2 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Serial sent to customer</p><p className="font-mono font-semibold text-heading">{trace.sentToCustomerSerialNumber}</p></div>{trace.replacementHistory.map((item) => <div key={`${item.rma}-serials`}><p className="text-xs text-muted-foreground">{item.rma} received → replaced</p><p className="font-mono text-xs font-semibold text-heading">{item.receivedSerialNumber} {item.replacementSerialNumber ? `→ ${item.replacementSerialNumber}` : ""}</p></div>)}</div></div> : null}
      <div className="border-t pt-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="text-sm font-bold text-heading">Record next lifecycle event</h2></div><div className="grid gap-4 lg:grid-cols-3"><label className="space-y-1.5 text-sm font-medium text-heading">Warranty Verification<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={verification} onChange={(event) => setVerification(event.target.value as WarrantyVerification)}><option>Accepted</option><option>Rejected</option></select></label><label className="space-y-1.5 text-sm font-medium text-heading">Resolution<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={outcome} onChange={(event) => setOutcome(event.target.value as ClaimOutcome)}><option>Pending</option><option>Replaced</option><option>Bill Back</option></select></label>{outcome === "Replaced" ? <label className="space-y-1.5 text-sm font-medium text-heading">Replaced Serial Number<Input placeholder="Enter new replacement serial number" value={replacementSerialNumber} onChange={(event) => setReplacementSerialNumber(event.target.value)} /></label> : <div className="flex items-end"><Badge tone={statusTone(verification)}>Verification: {verification}</Badge></div>}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">New RMA slips remain linked to this product lifecycle and serial chain.</p><Button onClick={createRmaSlip} disabled={outcome === "Replaced" && !replacementSerialNumber.trim()}><FilePlus2 className="size-4" />{outcome === "Bill Back" ? "Complete Warranty Resolution" : "Create RMA Slip"}</Button></div>{createdRma ? <p className="mt-3 flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm font-medium text-success-foreground"><CheckCircle2 className="size-4" />{outcome === "Bill Back" ? "Warranty resolution completed." : <>Created <span className="font-mono font-bold">{createdRma}</span> and linked it to the lifecycle.</>}</p> : null}</div>
    </CardContent></Card> : <Card className="border-dashed"><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><Search className="size-8 text-muted-foreground" /><p className="mt-3 font-semibold text-heading">Search to load the product trail</p><p className="mt-1 max-w-md text-sm text-muted-foreground">The trace will connect the purchase, stock receipt, invoice or supplier bill, and every replacement RMA.</p></CardContent></Card>}
  </div>;
};
