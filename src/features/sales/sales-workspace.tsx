"use client";

import { salesViews, type SalesView } from "@/config/views";
import { FilePlus2, ScanBarcode, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTabs, Segmented } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addDays, pairsSold, saleKind, saleStatus, todayIso, type SaleStatus } from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { paymentLabel } from "@/features/pos/components/pos-receipt-dialog";
import { settlementLabel } from "@/domain/returns";


type Range = "today" | "7d" | "30d" | "all";

export const statusTone = (status: SaleStatus) =>
  status === "Paid" ? "success" : status === "On credit" ? "danger" : status === "Partly paid" ? "warning" : "info";

export function SalesWorkspace({ companyId, view }: { companyId: string; view: SalesView }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const owner = isOwner(useDemoSession());
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("30d");

  const rows = useMemo(() => {
    const today = todayIso();
    const from = range === "today" ? today : range === "7d" ? addDays(today, -6) : range === "30d" ? addDays(today, -29) : "";
    const needle = query.trim().toLowerCase();
    return books.sales.filter((sale) => {
      const kind = saleKind(sale);
      if (view === "sales" && kind !== "Sale") return false;
      if (view === "returns" && kind === "Sale") return false;
      if (view === "credit" && sale.total - sale.amountPaid <= 0) return false;
      if (from && sale.date < from) return false;
      return !needle || sale.number.toLowerCase().includes(needle) || sale.customerName.toLowerCase().includes(needle) ||
        sale.lines.some((line) => line.name.toLowerCase().includes(needle) || line.sku.toLowerCase() === needle);
    });
  }, [books.sales, query, range, view]);

  const shown = rows.slice(0, 200);
  const total = rows.reduce((sum, sale) => sum + sale.total, 0);
  const pairs = rows.reduce((sum, sale) => sum + pairsSold(sale), 0);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Sales"
        title="Sales & returns"
        description="Every counter receipt, wholesale invoice, return and size exchange."
        action={
          <div className="flex flex-wrap gap-2">
            {owner ? <Button asChild variant="outline"><Link href={`${base}/sales/new`}><FilePlus2 className="size-4" />Wholesale invoice</Link></Button> : null}
            <Button asChild><Link href={`${base}/pos`}><ScanBarcode className="size-4" />Open POS</Link></Button>
          </div>
        }
      />
      <PageTabs tabs={salesViews} active={view} hrefFor={(value) => `${base}/sales?view=${value}`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search sales" className="pl-9" placeholder="Receipt no., customer, style or SKU" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Segmented label="Date range" value={range} onChange={setRange} options={[{ value: "today", label: "Today" }, { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "all", label: "All" }]} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-muted/30 px-4 py-3 text-sm">
          <span><strong className="text-heading">{rows.length}</strong> <span className="text-muted-foreground">documents</span></span>
          <span><strong className="text-heading">{pairs}</strong> <span className="text-muted-foreground">items sold</span></span>
          <span><strong className="tabular-nums text-heading">{money(total)}</strong> <span className="text-muted-foreground">net total</span></span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment / settlement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((sale) => {
              const kind = saleKind(sale);
              const status = saleStatus(sale);
              return (
                <TableRow key={sale.id}>
                  <TableCell>
                    <Link href={`${base}/sales/${sale.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{sale.number}</Link>
                    {kind !== "Sale" ? <Badge tone={kind === "Return" ? "danger" : "info"} className="ml-2 px-1.5 py-0 text-[0.6rem]">{kind}</Badge> : null}
                    {sale.channel === "invoice" ? <Badge className="ml-2 px-1.5 py-0 text-[0.6rem]">Wholesale</Badge> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(sale.date)} · {sale.time}</TableCell>
                  <TableCell className="text-sm font-medium text-heading">{sale.customerName}</TableCell>
                  <TableCell className="max-w-72 text-xs text-muted-foreground">
                    <span className="line-clamp-2">{sale.lines.map((line) => `${line.qty < 0 ? "↩ " : ""}${line.name} ${line.size === "OS" ? line.color : `${line.color} ${line.size}`}${Math.abs(line.qty) > 1 ? ` ×${Math.abs(line.qty)}` : ""}`).join(", ")}</span>
                  </TableCell>
                  <TableCell className="text-xs">{kind === "Sale" ? paymentLabel(sale) : <>{settlementLabel(sale, money).replace(/^(Exchange|Return) · /, "")}{sale.total !== 0 && sale.method !== "credit" ? <span className="block text-muted-foreground">{paymentLabel(sale)}</span> : null}</>}</TableCell>
                  <TableCell><Badge tone={statusTone(status)}>{status}</Badge></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-heading">{money(sale.total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No sales match these filters.</p> : null}
        {rows.length > shown.length ? <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing the latest {shown.length} of {rows.length}. Narrow the date range or search to find older receipts.</p> : null}
      </Card>
    </div>
  );
}
