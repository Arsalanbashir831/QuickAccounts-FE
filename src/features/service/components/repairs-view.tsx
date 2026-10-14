"use client";

import { ClipboardCheck, Search, Send, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { writeRepairActivity } from "../repair-activity-store";

type Route = "warehouse" | "supplier" | null;
type RepairStatus = "Awaiting Routing" | "Sent to Warehouse" | "Supplier Slip Created";

interface RepairClaim {
  id: string;
  rmaSlip: string;
  customer: string;
  product: string;
  serialNumber: string;
  invoiceNumber: string;
  supplier: string;
  supplierBillNumber: string;
  reportedIssue: string;
  route: Route;
  status: RepairStatus;
}

const initialClaims: RepairClaim[] = [
  { id: "repair-rma-0082", rmaSlip: "RMA-0082", customer: "Apex Mobiles", product: "Samsung Galaxy A55 5G", serialNumber: "358291048291048", invoiceNumber: "INV-10482", supplier: "Tech Distributors Ltd.", supplierBillNumber: "PO-2088", reportedIssue: "Display touch failure", route: null, status: "Awaiting Routing" },
  { id: "repair-rma-0081", rmaSlip: "RMA-0081", customer: "Walk-in Customer", product: "Baseus Bowie H1 Headphones", serialNumber: "BS-H1-9921", invoiceNumber: "INV-10461", supplier: "Audio World Pakistan", supplierBillNumber: "PO-2044", reportedIssue: "Battery discharging rapidly", route: null, status: "Awaiting Routing" },
  { id: "repair-rma-0079", rmaSlip: "RMA-0079", customer: "Galaxy Zone", product: "Apple 20W USB-C Power Adapter", serialNumber: "APL-20-44921", invoiceNumber: "INV-10398", supplier: "Apex Importers", supplierBillNumber: "PO-2017", reportedIssue: "No power output", route: null, status: "Awaiting Routing" },
];

const statusTone = (status: RepairStatus) => status === "Awaiting Routing" ? "warning" as const : "success" as const;

export const RepairsView = ({ companyId }: { companyId: string }) => {
  const [claims, setClaims] = useState(initialClaims);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const filteredClaims = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return claims;
    return claims.filter((claim) => [claim.rmaSlip, claim.customer, claim.product, claim.serialNumber, claim.invoiceNumber, claim.supplier].some((value) => value.toLowerCase().includes(query)));
  }, [claims, search]);

  const updateClaim = (claimId: string, route: Route) => {
    setNotice("");
    setClaims((current) => current.map((claim) => claim.id === claimId ? { ...claim, route, status: route === "warehouse" ? "Sent to Warehouse" : "Awaiting Routing" } : claim));
  };

  const sendToWarehouse = (claim: RepairClaim) => {
    if (claim.status === "Sent to Warehouse") return;
    writeRepairActivity(companyId, {
      id: `repair-${claim.id}`,
      type: "Return",
      direction: "TRANSFER",
      reference: claim.rmaSlip,
      referenceHref: `/c/${encodeURIComponent(companyId)}/returns?view=repairs`,
      date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      timestamp: Date.now(),
      productName: claim.product,
      productSku: claim.serialNumber,
      quantity: 1,
      location: "Main Warehouse",
      fromLocation: "Customer Returns",
      toLocation: "Main Warehouse",
      party: claim.customer,
      partyRole: "Customer",
      serials: [claim.serialNumber],
      status: "Sent to Warehouse for Repair",
      notes: `Customer warranty claim ${claim.rmaSlip} routed to the warehouse repair queue. Original invoice: ${claim.invoiceNumber}.`,
    });
    updateClaim(claim.id, "warehouse");
    setNotice(`${claim.rmaSlip} was added to the Main Warehouse repair queue.`);
  };

  const createSupplierSlip = (claim: RepairClaim) => {
    setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, route: "supplier", status: "Supplier Slip Created" } : item));
    setNotice(`Supplier slip created for ${claim.rmaSlip} against ${claim.supplierBillNumber}.`);
  };

  return <div className="space-y-5">
    <Card className="border-primary/25 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Technical Repair Routing</CardTitle><CardDescription>Route customer warranty returns to the warehouse repair queue or back to the supplier that supplied the unit.</CardDescription></div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search repair claims" placeholder="Search RMA, serial, or product..." className="pl-9 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </CardHeader>
      <CardContent className="p-0">
        {notice ? <div className="border-b bg-success/8 px-5 py-3 text-sm font-medium text-success-foreground" role="status">{notice}</div> : null}
        <div className="overflow-x-auto"><Table className="min-w-[1760px]"><TableHeader><TableRow>
          <TableHead>RMA Slip</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Serial Number</TableHead><TableHead>Invoice Number</TableHead><TableHead>Supplier</TableHead><TableHead>Supplier Bill No.</TableHead><TableHead>Reported Issue</TableHead><TableHead>Route</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Action</TableHead>
        </TableRow></TableHeader><TableBody>{filteredClaims.length ? filteredClaims.map((claim) => <TableRow key={claim.id}>
          <TableCell className="font-mono font-bold text-primary">{claim.rmaSlip}</TableCell><TableCell className="font-semibold text-heading">{claim.customer}</TableCell><TableCell className="font-semibold text-heading">{claim.product}</TableCell><TableCell className="font-mono text-xs text-primary">{claim.serialNumber}</TableCell><TableCell className="font-mono text-xs">{claim.invoiceNumber}</TableCell><TableCell className="text-xs font-semibold text-heading">{claim.supplier}</TableCell><TableCell className="font-mono text-xs">{claim.supplierBillNumber}</TableCell><TableCell className="text-xs text-muted-foreground">{claim.reportedIssue}</TableCell>
          <TableCell><select aria-label={`Route ${claim.rmaSlip}`} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-heading" value={claim.route ?? ""} onChange={(event) => updateClaim(claim.id, (event.target.value || null) as Route)}><option value="">Select route</option><option value="warehouse">Warehouse Repair</option><option value="supplier">Supplier</option></select></TableCell>
          <TableCell className="text-center"><Badge tone={statusTone(claim.status)}>{claim.status}</Badge></TableCell>
          <TableCell className="text-right">{claim.route === "supplier" ? <Button size="sm" className="text-xs" onClick={() => createSupplierSlip(claim)} disabled={claim.status === "Supplier Slip Created"}><Send className="size-3.5" />{claim.status === "Supplier Slip Created" ? "Slip Created" : "Create Supplier Slip"}</Button> : <Button size="sm" variant="outline" className="text-xs" onClick={() => sendToWarehouse(claim)} disabled={claim.route !== "warehouse" || claim.status === "Sent to Warehouse"}><Wrench className="size-3.5" />{claim.status === "Sent to Warehouse" ? "Sent to Warehouse" : "Send to Warehouse"}</Button>}</TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">No customer repair claims match your search.</TableCell></TableRow>}</TableBody></Table></div>
        <div className="flex items-center gap-4 border-t px-5 py-3 text-xs text-muted-foreground"><span><ClipboardCheck className="mr-1 inline size-3.5" />{filteredClaims.length} customer claims awaiting repair routing</span><span>Warehouse routes are recorded in Stock Activity.</span></div>
      </CardContent>
    </Card>
  </div>;
};
