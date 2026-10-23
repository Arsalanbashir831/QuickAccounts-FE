"use client";

import { ArrowDownLeft, ArrowUpRight, ArrowRight, CalendarDays, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const records = [
  { ref: "PAY-1083", party: "Hassan Electronics", date: "2026-10-13", direction: "Received", method: "Cash", amount: 84500, status: "Completed" },
  { ref: "PAY-1082", party: "Hassan Electronics", date: "2026-10-12", direction: "Received", method: "Cash", amount: 84500, status: "Completed" },
  { ref: "PAY-1081", party: "Apex Importers", date: "2026-10-12", direction: "Sent", method: "Bank transfer", amount: 120000, status: "Completed" },
  { ref: "PAY-1080", party: "Sara Khan", date: "2026-10-11", direction: "Received", method: "Bank transfer", amount: 35000, status: "Completed" },
  { ref: "PAY-1079", party: "Metro Supplies", date: "2026-10-10", direction: "Sent", method: "Cash", amount: 27500, status: "Pending" },
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const displayDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export const BillPaymentsWorkspace = ({ companyId, initialView }: { companyId: string; initialView: "send" | "receive" }) => {
  const [view, setView] = useState(initialView);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const date = today();
    setFromDate(date);
    setToDate(date);
  }, []);

  const filtered = records.filter((row) =>
    `${row.ref} ${row.party} ${row.direction}`.toLowerCase().includes(search.toLowerCase()) &&
    (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate),
  );

  return <div className="workspace-enter space-y-5">
    <WorkspaceHeader
      eyebrow="Payments · Customers & suppliers"
      title="Bill Payments"
      description="Record money received from customers and payments sent to suppliers or other parties."
      action={<div className="flex flex-wrap gap-2"><Button variant={view === "send" ? "default" : "outline"} onClick={() => setView("send")}><ArrowUpRight className="size-4" />Send Payments</Button><Button variant={view === "receive" ? "default" : "outline"} onClick={() => setView("receive")}><ArrowDownLeft className="size-4" />Receive Payments</Button></div>}
    />
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href={`/c/${encodeURIComponent(companyId)}/contacts?view=suppliers`} aria-label="View suppliers with amounts payable" className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/30"><CardHeader className="p-4"><CardDescription>Amount Payable</CardDescription><div className="flex items-center justify-between"><CardTitle className="font-mono text-2xl">$1,710,000</CardTitle><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="text-xs text-muted-foreground">View suppliers you owe</p></CardHeader></Card></Link>
      <Link href={`/c/${encodeURIComponent(companyId)}/contacts?view=customers`} aria-label="View customers with amounts receivable" className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/30"><CardHeader className="p-4"><CardDescription>Amount Receivable</CardDescription><div className="flex items-center justify-between"><CardTitle className="font-mono text-2xl">$260,150</CardTitle><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="text-xs text-muted-foreground">View customers who owe you</p></CardHeader></Card></Link>
    </div>
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Payment history</CardTitle><CardDescription>Received and sent payments for the selected dates</CardDescription></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative"><span className="sr-only">From date</span><CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="From date" type="date" className="w-[155px] pl-8" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <span className="text-sm text-muted-foreground">to</span>
          <label><span className="sr-only">To date</span><Input aria-label="To date" type="date" className="w-[155px]" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <div className="relative w-full sm:w-52"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search payments" placeholder="Search payments" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        </div>
      </CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>Party</TableHead><TableHead>Direction</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{filtered.map((row) => <TableRow key={row.ref}><TableCell className="font-mono font-semibold text-primary">{row.ref}</TableCell><TableCell>{displayDate(row.date)}</TableCell><TableCell className="font-medium">{row.party}</TableCell><TableCell><Badge tone={row.direction === "Received" ? "success" : "neutral"}>{row.direction}</Badge></TableCell><TableCell>{row.method}</TableCell><TableCell><Badge tone={row.status === "Completed" ? "success" : "warning"}>{row.status}</Badge></TableCell><TableCell className="text-right font-mono font-semibold">${row.amount.toLocaleString("en-PK")}</TableCell></TableRow>)}</TableBody></Table></div>{filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No payments found for this date range.</p> : null}</CardContent>
    </Card>
    <p className="text-xs text-muted-foreground">Sample register for layout review. <Link className="underline" href={`/c/${companyId}/contacts`}>Manage customers and suppliers</Link>.</p>
  </div>;
};
