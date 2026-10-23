"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ClaimKind = "customer" | "supplier";
type ClaimStatus = "Pending" | "Replaced" | "Bill Back";
type WarrantyVerification = "Accepted" | "Rejected";

interface RmaSlip {
  id: string;
  slipNumber: string;
  product: string;
  receivedSerialNumber: string;
  replacementSerialNumber?: string;
  invoiceNumber: string;
  price: string;
  receivingDate: string;
  partyName: string;
  warrantyVerification: WarrantyVerification;
  status: ClaimStatus;
}

const customerClaims: RmaSlip[] = [
  { id: "customer-rma-0082", slipNumber: "RMA-0082", product: "Samsung Galaxy A55 5G", receivedSerialNumber: "358291048291048", replacementSerialNumber: "358291048299814", invoiceNumber: "INV-10482", price: "$89,999", receivingDate: "08 Oct 2026", partyName: "Apex Mobiles", warrantyVerification: "Accepted", status: "Replaced" },
  { id: "customer-rma-0081", slipNumber: "RMA-0081", product: "Baseus Bowie H1 Headphones", receivedSerialNumber: "BS-H1-9921", invoiceNumber: "INV-10461", price: "$12,500", receivingDate: "07 Oct 2026", partyName: "Walk-in Customer", warrantyVerification: "Accepted", status: "Pending" },
  { id: "customer-rma-0080", slipNumber: "RMA-0080", product: "Redmi Note 13 Pro", receivedSerialNumber: "861928374659202", invoiceNumber: "INV-10412", price: "$74,999", receivingDate: "03 Oct 2026", partyName: "Hamza Electronics", warrantyVerification: "Rejected", status: "Bill Back" },
];

const supplierClaims: RmaSlip[] = [
  { id: "supplier-rma-0038", slipNumber: "RMA-0038", product: "Anker 65W GaN Charger", receivedSerialNumber: "ANK-65-44821", invoiceNumber: "PINV-2088", price: "$9,800", receivingDate: "06 Oct 2026", partyName: "Mumtaz Distributors", warrantyVerification: "Accepted", status: "Pending" },
  { id: "supplier-rma-0037", slipNumber: "RMA-0037", product: "Logitech MX Master 3S", receivedSerialNumber: "LGT-MX3-0192", invoiceNumber: "PINV-2071", price: "$24,500", receivingDate: "01 Oct 2026", partyName: "Apex Importers", warrantyVerification: "Accepted", status: "Bill Back" },
];

const statusTone = (status: ClaimStatus) => status === "Replaced" ? "success" as const : status === "Bill Back" ? "info" as const : "warning" as const;

export const RmaClaimsView = ({ kind, companyId }: { kind: ClaimKind; companyId?: string }) => {
  const isCustomerClaim = kind === "customer";
  const rows = isCustomerClaim ? customerClaims : supplierClaims;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const actionLabel = isCustomerClaim ? "Customer Claims" : "Supplier Claims";
  const partyLabel = isCustomerClaim ? "Customer Name" : "Supplier Name";
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.slipNumber, row.product, row.receivedSerialNumber, row.replacementSerialNumber, row.invoiceNumber, row.partyName, row.status].filter(Boolean).some((value) => value!.toLowerCase().includes(query)));
  }, [rows, search]);

  return <div className="space-y-5">
    <Card className="border-primary/25 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>{isCustomerClaim ? "Customer Warranty Claims" : "Supplier Warranty Claims"}</CardTitle><CardDescription>{isCustomerClaim ? "Register and track products returned by customers under warranty." : "Track defective products returned to suppliers for replacement or bill back."}</CardDescription></div>
        {companyId ? <Button asChild><Link href={`/c/${encodeURIComponent(companyId)}/returns/${isCustomerClaim ? "customer-claims" : "supplier-claims"}/new`}><Plus className="size-4" />{actionLabel}</Link></Button> : <Button onClick={() => setShowForm(true)}><Plus className="size-4" />{actionLabel}</Button>}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={`Search ${isCustomerClaim ? "customer" : "supplier"} RMA slips`} placeholder="Search RMA, serial, invoice, or product..." className="pl-9 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="overflow-x-auto rounded-lg border"><Table className="min-w-[1540px]"><TableHeader><TableRow>
          <TableHead>RMA Slip No</TableHead><TableHead>{partyLabel}</TableHead><TableHead>Product</TableHead><TableHead>Serial Number (Received)</TableHead><TableHead>Serial Number (Replacement)</TableHead><TableHead>Invoice Number</TableHead><TableHead>Price</TableHead><TableHead>Receiving Date</TableHead><TableHead className="text-center">Warranty Verification</TableHead><TableHead className="text-center">Status</TableHead>
        </TableRow></TableHeader><TableBody>{filteredRows.length ? filteredRows.map((row) => <TableRow key={row.id}>
          <TableCell className="font-mono font-bold text-primary">{row.slipNumber}</TableCell><TableCell className="font-semibold text-heading">{row.partyName}</TableCell><TableCell className="font-semibold text-heading">{row.product}</TableCell><TableCell className="font-mono text-xs text-primary">{row.receivedSerialNumber}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{row.replacementSerialNumber ?? "—"}</TableCell><TableCell className="font-mono text-xs text-heading">{row.invoiceNumber}</TableCell><TableCell className="font-mono text-xs font-semibold tabular-nums text-heading">{row.price}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.receivingDate}</TableCell><TableCell className="text-center"><Badge tone={row.warrantyVerification === "Accepted" ? "success" : "danger"}>{row.warrantyVerification}</Badge></TableCell><TableCell className="text-center"><Badge tone={statusTone(row.status)}>{row.status}</Badge></TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={10} className="h-24 text-center text-sm text-muted-foreground">No RMA slips match your search.</TableCell></TableRow>}</TableBody></Table></div>
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{filteredRows.length} RMA slips</span><span>Statuses: Pending · Replaced · Bill Back</span></div>
      </CardContent>
    </Card>
    {showForm ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><Card className="w-full max-w-md shadow-2xl"><CardHeader className="border-b"><CardTitle>{actionLabel}</CardTitle><CardDescription>Claim creation fields will be added in the next workflow pass.</CardDescription></CardHeader><CardContent className="flex justify-end pt-4"><Button variant="outline" onClick={() => setShowForm(false)}>Close</Button></CardContent></Card></div> : null}
  </div>;
};
