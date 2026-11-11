"use client";

import { reportViews, type ReportView } from "@/config/views";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Field, Select } from "@/components/shared/fields";
import { PageTabs, Segmented } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  accountBalances, addDays, addMonths, monthEnd, monthStart, monthlyResults, pairsSold, profitAndLoss,
  sizeSellThrough, stockLevels, stylePerformance, todayIso,
} from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { categories, type Category } from "@/domain/types";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { MonthlyChart } from "./components/monthly-chart";


type Period = "this-month" | "last-month" | "3-months" | "year" | "custom";

function periodRange(period: Period, fyStart: string, custom: { from: string; to: string }) {
  const today = todayIso();
  if (period === "this-month") return { from: monthStart(today), to: today };
  if (period === "last-month") { const start = addMonths(today, -1); return { from: start, to: monthEnd(start) }; }
  if (period === "3-months") return { from: addMonths(today, -2), to: today };
  if (period === "year") {
    const [month, day] = fyStart.split("-");
    let start = `${today.slice(0, 4)}-${month}-${day}`;
    if (start > today) start = `${Number(today.slice(0, 4)) - 1}-${month}-${day}`;
    return { from: start, to: today };
  }
  return custom;
}

function PeriodPicker({ period, setPeriod, custom, setCustom }: { period: Period; setPeriod: (period: Period) => void; custom: { from: string; to: string }; setCustom: (range: { from: string; to: string }) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: "this-month", label: "This month" }, { value: "last-month", label: "Last month" }, { value: "3-months", label: "3 months" }, { value: "year", label: "Financial year" }, { value: "custom", label: "Custom" }]} />
      {period === "custom" ? (
        <div className="flex gap-2">
          <Input aria-label="From" type="date" className="h-9 w-40" value={custom.from} max={custom.to} onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
          <Input aria-label="To" type="date" className="h-9 w-40" value={custom.to} min={custom.from} max={todayIso()} onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
        </div>
      ) : null}
    </div>
  );
}

export function ReportsWorkspace({ companyId, view }: { companyId: string; view: ReportView }) {
  const base = `/c/${encodeURIComponent(companyId)}`;
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Reports" title="Reports" description="Plain-language numbers worked out from your sales, purchases, stock and expenses." />
      <PageTabs tabs={reportViews} active={view} hrefFor={(value) => `${base}/reports?view=${value}`} />
      {view === "pl" ? <ProfitLoss companyId={companyId} /> : null}
      {view === "day" ? <DayClose companyId={companyId} /> : null}
      {view === "styles" ? <StylesReport companyId={companyId} /> : null}
      {view === "sizes" ? <SizesReport companyId={companyId} /> : null}
    </div>
  );
}

function Line({ label, value, note, strong, negative, indent }: { label: string; value: number; note?: string; strong?: boolean; negative?: boolean; indent?: boolean }) {
  const money = useMoney();
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2", strong && "border-t font-semibold text-heading", indent && "pl-4")}>
      <span className={cn("text-sm", !strong && "text-muted-foreground")}>{label}{note ? <span className="ml-2 text-xs text-muted-foreground">{note}</span> : null}</span>
      <span className={cn("numeric tabular-nums", strong ? "text-base" : "text-sm", negative && value ? "text-destructive" : "")}>{negative && value ? `(${money(value)})` : money(value)}</span>
    </div>
  );
}

function ProfitLoss({ companyId }: { companyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const [period, setPeriod] = useState<Period>("this-month");
  const [custom, setCustom] = useState({ from: addDays(todayIso(), -29), to: todayIso() });
  const range = periodRange(period, settings.rules.financialYearStart, custom);
  const pl = useMemo(() => profitAndLoss(books, range.from, range.to), [books, range.from, range.to]);
  const chart = useMemo(() => monthlyResults(books, 6), [books]);

  return (
    <div className="space-y-5">
      <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-start">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><CardTitle>Profit & loss statement</CardTitle><CardDescription>{formatDate(range.from)} – {formatDate(range.to)} · {pl.bills} bills · {pl.pairsSold} items sold</CardDescription></div>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </CardHeader>
          <CardContent>
            <Line label="Sales at full price" value={pl.grossSales} />
            <Line label="Discounts given" value={pl.discounts} negative indent />
            <Line label="Returns & refunds" value={pl.returns} negative indent />
            {pl.taxIncluded ? <Line label="Sales tax included in prices" value={pl.taxIncluded} negative indent /> : null}
            <Line label="Net sales" value={pl.netSales} strong />
            <Line label="Cost of shoes sold" value={pl.costOfGoodsSold} negative indent note="what you paid for the pairs you sold" />
            <Line label="Gross profit" value={pl.grossProfit} strong note={`${Math.round(pl.grossMargin * 100)}% margin`} />
            {pl.stockLoss > 0 ? <Line label="Damaged, lost & sample stock" value={pl.stockLoss} negative indent /> : null}
            {pl.stockLoss < 0 ? <Line label="Stock found in counts" value={-pl.stockLoss} indent /> : null}
            {pl.expenses.map((expense) => <Line key={expense.category} label={expense.category} value={expense.amount} negative indent />)}
            <Line label="Total running costs" value={pl.totalExpenses + pl.stockLoss} strong />
            <div className={cn("mt-2 flex items-baseline justify-between rounded-lg px-4 py-3", pl.netProfit >= 0 ? "bg-success/12" : "bg-destructive/10")}>
              <span className="font-semibold text-heading">{pl.netProfit >= 0 ? "Net profit" : "Net loss"}</span>
              <span className={cn("numeric text-2xl font-bold", pl.netProfit >= 0 ? "text-success-foreground" : "text-destructive")}>{money(pl.netProfit)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Stock you bought but haven’t sold isn’t an expense — it sits in stock until sold. Money the owner takes out is not counted as an expense.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Last 6 months</CardTitle><CardDescription>Hover a month for details.</CardDescription></CardHeader>
          <CardContent><MonthlyChart data={chart} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function DayClose({ companyId }: { companyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const [date, setDate] = useState(todayIso());
  const sales = books.sales.filter((sale) => sale.date === date);
  const byMethod = (method: string) => sales.filter((sale) => sale.method === method && sale.amountPaid > 0).reduce((sum, sale) => sum + sale.amountPaid, 0);
  const refunds = sales.filter((sale) => sale.amountPaid < 0).reduce((sum, sale) => sum - sale.amountPaid, 0);
  const onCredit = sales.reduce((sum, sale) => sum + Math.max(0, sale.total - sale.amountPaid), 0);
  const cashAccount = books.accounts.find((account) => account.kind === "cash");
  const opening = cashAccount ? accountBalances(books, addDays(date, -1)).get(cashAccount.id) ?? 0 : 0;
  const closing = cashAccount ? accountBalances(books, date).get(cashAccount.id) ?? 0 : 0;
  const cashExpenses = books.expenses.filter((expense) => expense.date === date && expense.accountId === cashAccount?.id).reduce((sum, expense) => sum + expense.amount, 0);
  const cashMovedOut = books.moneyEntries.filter((entry) => entry.date === date && entry.fromAccountId === cashAccount?.id).reduce((sum, entry) => sum + entry.amount, 0);
  const cashMovedIn = books.moneyEntries.filter((entry) => entry.date === date && entry.toAccountId === cashAccount?.id).reduce((sum, entry) => sum + entry.amount, 0);
  const cashPurchases = books.purchases.filter((purchase) => purchase.date === date && purchase.accountId === cashAccount?.id).reduce((sum, purchase) => sum + purchase.amountPaid, 0);
  const cashRefunds = sales.filter((sale) => sale.amountPaid < 0 && sale.accountId === cashAccount?.id).reduce((sum, sale) => sum - sale.amountPaid, 0);
  const cashSales = sales.filter((sale) => sale.amountPaid > 0 && sale.accountId === cashAccount?.id).reduce((sum, sale) => sum + sale.amountPaid, 0);
  const row = (label: string, value: number, sign: "+" | "−" | "" = "") => (
    <div className="flex justify-between py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{sign}{money(value)}</span></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Day"><Input type="date" className="w-44" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value || todayIso())} /></Field>
        <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sales on {formatDate(date)}</CardTitle><CardDescription>{sales.filter((sale) => sale.total > 0).length} receipts · {sales.reduce((sum, sale) => sum + pairsSold(sale), 0)} items sold</CardDescription></CardHeader>
          <CardContent>
            {row("Cash", byMethod("cash"))}
            {row("Card", byMethod("card"))}
            {row("Bank / wallet transfer", byMethod("transfer"))}
            {row("Cash with khata sales", byMethod("credit"))}
            {row("Given on khata", onCredit)}
            {row("Refunds", refunds, "−")}
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold text-heading"><span>Net sales total</span><span className="tabular-nums">{money(sales.reduce((sum, sale) => sum + sale.total, 0))}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cash drawer</CardTitle><CardDescription>Count the drawer and compare with the expected amount.</CardDescription></CardHeader>
          <CardContent>
            {row("Opening cash", opening)}
            {row("Cash sales", cashSales, "+")}
            {row("Cash refunds", cashRefunds, "−")}
            {row("Cash expenses", cashExpenses, "−")}
            {row("Cash purchases", cashPurchases, "−")}
            {row("Moved in / received", cashMovedIn, "+")}
            {row("Moved out / deposited", cashMovedOut, "−")}
            <div className="mt-2 flex justify-between rounded-lg bg-heading px-4 py-3 font-semibold text-white"><span>Expected in drawer</span><span className="tabular-nums">{money(closing)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StylesReport({ companyId }: { companyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [period, setPeriod] = useState<Period>("3-months");
  const [custom, setCustom] = useState({ from: addDays(todayIso(), -29), to: todayIso() });
  const [category, setCategory] = useState<"" | Category>("");
  const range = periodRange(period, settings.rules.financialYearStart, custom);
  const stock = useMemo(() => stockLevels(books), [books]);
  const slowCutoff = addDays(todayIso(), -30);
  const rows = useMemo(() => stylePerformance(books, range.from, range.to, stock).filter((row) => !category || row.category === category).sort((a, b) => b.pairs - a.pairs), [books, category, range.from, range.to, stock]);
  const costOf = (id: string) => books.styles.find((style) => style.id === id)?.cost ?? 0;
  const slow = rows.filter((row) => row.onHand > 0 && (!row.lastSold || row.lastSold < slowCutoff));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
        <Select aria-label="Category" className="w-48" value={category} onChange={(event) => setCategory(event.target.value as Category | "")}><option value="">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select>
      </div>
      {slow.length ? (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm">
          <p className="font-semibold text-heading">{slow.length} slow mover{slow.length === 1 ? "" : "s"}: no sale in 30+ days</p>
          <p className="mt-1 text-muted-foreground">{slow.map((row) => `${row.name} (${row.onHand} pairs, ${money(row.onHand * costOf(row.styleId))} tied up)`).join(" · ")}. Consider a discount or moving them to the front.</p>
        </Card>
      ) : null}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Style</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead>Last sold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.styleId}>
                <TableCell><Link href={`${base}/products/${row.styleId}`} className="font-semibold text-heading hover:text-primary">{row.name}</Link><p className="text-xs text-muted-foreground">{row.category}</p></TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{row.pairs}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.profit)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.revenue ? Math.round((row.profit / row.revenue) * 100) : 0}%</TableCell>
                <TableCell className="text-right tabular-nums">{row.onHand}</TableCell>
                <TableCell className="text-xs">{row.lastSold ? formatDate(row.lastSold) : "Never"}{row.onHand > 0 && (!row.lastSold || row.lastSold < slowCutoff) ? <Badge tone="warning" className="ml-2">Slow</Badge> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SizesReport({ companyId }: { companyId: string }) {
  const books = useBooks(companyId);
  const sized = books.styles.filter((style) => style.sizeSystem !== "One size");
  const [styleId, setStyleId] = useState(sized[0]?.id ?? "");
  const style = sized.find((entry) => entry.id === styleId);
  const today = todayIso();
  const from = addDays(today, -89);
  const stock = useMemo(() => stockLevels(books), [books]);
  const rows = style ? sizeSellThrough(books, style, from, today, stock) : [];
  const totalSold = rows.reduce((sum, row) => sum + row.sold, 0);
  const max = Math.max(1, ...rows.map((row) => Math.max(row.sold, row.onHand)));

  return (
    <div className="space-y-5">
      <Field label="Style" className="max-w-sm"><Select value={styleId} onChange={(event) => setStyleId(event.target.value)}>{sized.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field>
      {style ? (
        <Card>
          <CardHeader><CardTitle>{style.name}: sizes in the last 90 days</CardTitle><CardDescription>Use this to decide the size run for your next order. “Share of sales” is the % of pairs to buy in each size.</CardDescription></CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#2a78d6]" />Sold</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#eb6834]" />In stock now</span>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Size</TableHead><TableHead className="w-1/2">Sold vs in stock</TableHead><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">In stock</TableHead><TableHead className="text-right">Share of sales</TableHead><TableHead className="text-right">Sell-through</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.size}>
                    <TableCell className="font-semibold">{style.sizeSystem} {row.size}</TableCell>
                    <TableCell>
                      <span className="block h-2.5 rounded-r bg-[#2a78d6]" style={{ width: `${(row.sold / max) * 100}%` }} title={`${row.sold} sold`} />
                      <span className="mt-0.5 block h-2.5 rounded-r bg-[#eb6834]" style={{ width: `${(row.onHand / max) * 100}%` }} title={`${row.onHand} in stock`} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.sold}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.onHand}</TableCell>
                    <TableCell className="text-right tabular-nums">{totalSold ? Math.round((row.sold / totalSold) * 100) : 0}%</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(row.sellThrough * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : <p className="text-sm text-muted-foreground">No sized styles yet.</p>}
    </div>
  );
}
