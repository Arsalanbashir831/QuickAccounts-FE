"use client";

import { ArrowLeftRight, BookUser, FilePlus2, ReceiptText, ScanBarcode, Search, Undo2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTabs, Segmented } from "@/components/shared/page-tabs";
import { StatCard } from "@/components/shared/stat-card";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { walkInViews, wholesaleViews, type WalkInView, type WholesaleView } from "@/config/views";
import { addDays, monthStart, pairsSold, partyBalances, saleKind, todayIso, unpaidBySale, type SaleStatus } from "@/domain/ledger";
import { settlementLabel } from "@/domain/returns";
import { useBooks } from "@/domain/store";
import type { Sale } from "@/domain/types";
import { paymentLabel } from "@/features/pos/components/pos-receipt-dialog";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

type Range = "today" | "7d" | "30d" | "all";

export const statusTone = (status: SaleStatus) =>
  status === "Paid" ? "success" : status === "On credit" ? "danger" : status === "Partly paid" ? "warning" : "info";

const rangeStart = (range: Range) => {
  const today = todayIso();
  return range === "today" ? today : range === "7d" ? addDays(today, -6) : range === "30d" ? addDays(today, -29) : "";
};

const itemsText = (sale: Sale) =>
  sale.lines.map((line) => `${line.qty < 0 ? "↩ " : ""}${line.name} ${line.size === "OS" ? line.color : `${line.color} ${line.size}`}${Math.abs(line.qty) > 1 ? ` ×${Math.abs(line.qty)}` : ""}`).join(", ");

const matches = (sale: Sale, needle: string) =>
  !needle || sale.number.toLowerCase().includes(needle) || sale.customerName.toLowerCase().includes(needle) ||
  sale.lines.some((line) => line.name.toLowerCase().includes(needle) || line.sku.toLowerCase() === needle);

function Filters({ query, setQuery, range, setRange, placeholder }: { query: string; setQuery: (value: string) => void; range: Range; setRange: (value: Range) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search" className="pl-9" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <Segmented label="Date range" value={range} onChange={setRange} options={[{ value: "today", label: "Today" }, { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "all", label: "All" }]} />
    </div>
  );
}

const Kind = ({ sale }: { sale: Sale }) => {
  const kind = saleKind(sale);
  if (kind === "Sale") return null;
  return <Badge tone={kind === "Return" ? "danger" : "info"} className="ml-2 px-1.5 py-0 text-[0.6rem]">{sale.channel === "invoice" ? (kind === "Return" ? "Credit note" : "Exchange note") : kind}</Badge>;
};

/** Counter (POS) receipts: sales, returns and size exchanges. */
export function WalkInSales({ companyId, view }: { companyId: string; view: WalkInView }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("today");

  const rows = useMemo(() => {
    const from = rangeStart(range);
    const needle = query.trim().toLowerCase();
    return books.sales.filter((sale) => {
      if (sale.channel !== "pos") return false;
      const kind = saleKind(sale);
      if (view === "sales" && kind !== "Sale") return false;
      if (view === "returns" && kind === "Sale") return false;
      return (!from || sale.date >= from) && matches(sale, needle);
    });
  }, [books.sales, query, range, view]);
  const shown = rows.slice(0, 200);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Sales & returns"
        title="Walk-in customers"
        description="Counter sales from the POS. Customers pay on the spot; returns and size exchanges are done from the POS too."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`${base}/pos?return=`}><ArrowLeftRight className="size-4" />Return / exchange</Link></Button>
            <Button asChild><Link href={`${base}/pos`}><ScanBarcode className="size-4" />Open POS</Link></Button>
          </div>
        }
      />
      <PageTabs tabs={walkInViews} active={view} hrefFor={(value) => `${base}/sales/walk-in?view=${value}`} />
      <Filters query={query} setQuery={setQuery} range={range} setRange={setRange} placeholder="Receipt no., customer, style or SKU" />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-muted/30 px-4 py-3 text-sm">
          <span><strong className="text-heading">{rows.length}</strong> <span className="text-muted-foreground">receipts</span></span>
          <span><strong className="text-heading">{rows.reduce((sum, sale) => sum + pairsSold(sale), 0)}</strong> <span className="text-muted-foreground">items sold</span></span>
          <span><strong className="tabular-nums text-heading">{money(rows.reduce((sum, sale) => sum + sale.total, 0))}</strong> <span className="text-muted-foreground">net</span></span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Paid by</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="whitespace-nowrap"><Link href={`${base}/sales/${sale.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{sale.number}</Link><Kind sale={sale} /></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(sale.date)} · {sale.time}</TableCell>
                <TableCell className="text-sm font-medium text-heading">{sale.customerName}</TableCell>
                <TableCell className="max-w-72 text-xs text-muted-foreground"><span className="line-clamp-2">{itemsText(sale)}</span></TableCell>
                <TableCell className="text-xs">{saleKind(sale) === "Sale" ? paymentLabel(sale) : settlementLabel(sale, money).replace(/^(Exchange|Return) · /, "")}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-heading">{money(sale.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No receipts for these filters.</p> : null}
        {rows.length > shown.length ? <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing the latest {shown.length} of {rows.length}.</p> : null}
      </Card>
    </div>
  );
}

/** Invoices to other shops, credit notes for their returns, and what they owe. */
export function WholesaleSales({ companyId, view }: { companyId: string; view: WholesaleView }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const balances = useMemo(() => partyBalances(books), [books]);
  const unpaidMap = useMemo(() => unpaidBySale(books), [books]);
  const unpaidOf = (sale: Sale) => unpaidMap.get(sale.id) ?? 0;
  const today = todayIso();

  const invoices = useMemo(() => books.sales.filter((sale) => sale.channel === "invoice"), [books.sales]);
  const rows = useMemo(() => {
    const from = rangeStart(range);
    const needle = query.trim().toLowerCase();
    return invoices.filter((sale) => {
      const kind = saleKind(sale);
      if (view === "invoices" && kind !== "Sale") return false;
      if (view === "returns" && kind === "Sale") return false;
      if (view === "unpaid" && (kind !== "Sale" || (unpaidMap.get(sale.id) ?? 0) <= 0)) return false;
      return (!from || sale.date >= from) && matches(sale, needle);
    });
  }, [invoices, query, range, view, unpaidMap]);

  const buyers = books.parties.filter((party) => party.kind === "customer" && (party.wholesale || invoices.some((sale) => sale.customerId === party.id)));
  const owed = buyers.reduce((sum, party) => sum + Math.max(0, balances.get(party.id) ?? 0), 0);
  const monthInvoices = invoices.filter((sale) => sale.date >= monthStart(today));
  const monthSales = monthInvoices.filter((sale) => saleKind(sale) === "Sale").reduce((sum, sale) => sum + sale.total, 0);
  const monthReturns = monthInvoices.filter((sale) => saleKind(sale) !== "Sale").reduce((sum, sale) => sum - Math.min(0, sale.total), 0);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Sales & returns"
        title="Wholesale customers"
        description="Size runs sold to other shops on invoice. Unpaid amounts go on their khata; returns become a credit note."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`${base}/sales/wholesale/return`}><Undo2 className="size-4" />Wholesale return</Link></Button>
            <Button asChild><Link href={`${base}/sales/wholesale/new`}><FilePlus2 className="size-4" />New invoice</Link></Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Shops owe you" value={money(owed)} note={`${buyers.filter((party) => (balances.get(party.id) ?? 0) > 0).length} of ${buyers.length} wholesale customers`} icon={BookUser} tone="danger" />
        <StatCard label="Invoiced this month" value={money(monthSales)} note={`${monthInvoices.filter((sale) => saleKind(sale) === "Sale").length} invoices`} icon={ReceiptText} tone="primary" />
        <StatCard label="Credited back this month" value={money(monthReturns)} note={`${monthInvoices.filter((sale) => saleKind(sale) !== "Sale").length} credit / exchange notes`} icon={Undo2} />
      </div>

      {buyers.length ? (
        <div className="flex flex-wrap gap-2">
          {buyers.map((party) => {
            const balance = balances.get(party.id) ?? 0;
            return (
              <Link key={party.id} href={`${base}/parties/${party.id}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/40">
                <span className="font-semibold text-heading">{party.name}</span>
                <span className={cn("tabular-nums text-xs font-semibold", balance > 0 ? "text-destructive" : balance < 0 ? "text-success" : "text-muted-foreground")}>{balance > 0 ? `owes ${money(balance)}` : balance < 0 ? `advance ${money(-balance)}` : "settled"}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      <PageTabs tabs={wholesaleViews} active={view} hrefFor={(value) => `${base}/sales/wholesale?view=${value}`} />
      <Filters query={query} setQuery={setQuery} range={range} setRange={setRange} placeholder="Invoice no., shop, style or SKU" />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead className="text-right">Pairs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Unpaid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((sale) => {
              const kind = saleKind(sale);
              const unpaid = unpaidOf(sale);
              const status: SaleStatus = unpaid <= 0 ? "Paid" : unpaid < sale.total ? "Partly paid" : "On credit";
              const overdue = kind === "Sale" && unpaid > 0 && sale.dueDate && sale.dueDate < today;
              return (
                <TableRow key={sale.id}>
                  <TableCell className="whitespace-nowrap"><Link href={`${base}/sales/${sale.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{sale.number}</Link><Kind sale={sale} /></TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(sale.date)}{sale.dueDate && kind === "Sale" ? <span className={cn("block", overdue && "font-semibold text-destructive")}>due {formatDate(sale.dueDate)}</span> : null}</TableCell>
                  <TableCell className="text-sm font-medium text-heading">{sale.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">{sale.lines.reduce((sum, line) => sum + Math.abs(line.qty), 0)}</TableCell>
                  <TableCell>{kind === "Sale" ? <Badge tone={overdue ? "danger" : statusTone(status)}>{overdue ? "Overdue" : status}</Badge> : <span className="text-xs">{settlementLabel(sale, money).replace(/^(Exchange|Return) · /, "")}</span>}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-heading">{money(sale.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{unpaid ? money(unpaid) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</p> : null}
      </Card>
    </div>
  );
}
