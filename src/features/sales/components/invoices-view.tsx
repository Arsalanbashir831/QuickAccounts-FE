"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices, type InvoiceRecord } from "../invoice-store";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { useLocations } from "@/features/settings/location-store";

const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;
const statusTone = (status: InvoiceRecord["status"]) => status === "Paid" ? "success" : status === "Partial" ? "warning" : status === "Overdue" ? "danger" : "neutral";

export function InvoicesView({ companyId }: { companyId: string }) {
  const router = useRouter();
  const allInvoices = useInvoices(companyId);
  const session = useDemoSession();
  const locations = useLocations(companyId);
  const assignedOutlet = locations.find((location) => location.id === session?.locationId)?.name;
  const owner = isOwner(session);
  const invoices = owner ? allInvoices : allInvoices.filter((invoice) => invoice.outlet === assignedOutlet);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = invoices.filter((invoice) => {
    const matchesSearch = `${invoice.reference} ${invoice.customer} ${invoice.outlet}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || invoice.status.toLowerCase() === statusFilter);
  });
  const openInvoice = (invoice: InvoiceRecord) => router.push(`/c/${encodeURIComponent(companyId)}/sales/${encodeURIComponent(invoice.id)}`);
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, invoice: InvoiceRecord) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    openInvoice(invoice);
  };
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, invoice: InvoiceRecord) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openInvoice(invoice);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="p-4"><CardDescription>Total invoices</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{invoices.length}</CardTitle></CardHeader></Card>
        {owner ? <Card><CardHeader className="p-4"><CardDescription>Outstanding balance</CardDescription><CardTitle className="numeric text-2xl font-bold text-primary">{money(invoices.reduce((sum, invoice) => sum + invoice.balance, 0))}</CardTitle></CardHeader></Card> : null}
        <Card><CardHeader className="p-4"><CardDescription>Paid invoices</CardDescription><CardTitle className="numeric text-2xl font-bold text-heading">{invoices.filter((invoice) => invoice.balance === 0).length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Sales Invoices</CardTitle><CardDescription>{owner ? "Posted sales and customer balances" : "Sales recorded for your outlet"}</CardDescription></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search invoice or customer" aria-label="Search invoices" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <select aria-label="Filter by status" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-heading" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option></select>
            <Button size="sm" asChild><Link href={`/c/${companyId}/sales/new`}><Plus className="size-4" />New Invoice</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Customer</TableHead><TableHead>Outlet</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead>{owner ? <TableHead className="text-right">Balance</TableHead> : null}<TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length ? filtered.map((invoice) => (
                <TableRow key={invoice.id} role="link" tabIndex={0} aria-label={`Open ${invoice.reference} invoice details`} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5" onClick={(event) => handleRowClick(event, invoice)} onKeyDown={(event) => handleRowKeyDown(event, invoice)}>
                  <TableCell className="font-mono font-bold text-primary">{invoice.reference}</TableCell>
                  <TableCell className="font-semibold text-heading">{invoice.customer}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.outlet}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-heading">{money(invoice.total)}</TableCell>
                  {owner ? <TableCell className="text-right font-semibold tabular-nums">{money(invoice.balance)}</TableCell> : null}
                  <TableCell className="text-center"><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={owner ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">No invoices match your search.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
