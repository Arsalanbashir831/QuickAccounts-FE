"use client";

import { ArrowLeftRight, BookUser, CalendarDays, Footprints, PackageX, ReceiptText, ScanBarcode, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sizeLabel } from "@/domain/catalog";
import {
  accountBalances, lowStock, monthStart, monthlyResults, pairsSold, partyBalances, profitAndLoss, saleKind,
  stockLevels, stylePerformance, todayIso,
} from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { Swatch } from "@/features/catalog/components/size-color-grid";
import { MonthlyChart } from "@/features/reports/components/monthly-chart";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";

const greeting = () => {
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Karachi" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

export const HomeWorkspace = ({ companyId }: { companyId: string }) => {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const session = useDemoSession();
  const owner = isOwner(session);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const today = todayIso();

  const stock = useMemo(() => stockLevels(books), [books]);
  const todaySales = useMemo(() => books.sales.filter((sale) => sale.date === today), [books.sales, today]);
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayPairs = todaySales.reduce((sum, sale) => sum + pairsSold(sale), 0);
  const low = useMemo(() => lowStock(books, stock, settings.rules.lowStockThreshold), [books, stock, settings.rules.lowStockThreshold]);
  const month = useMemo(() => profitAndLoss(books, monthStart(today), today), [books, today]);
  const balances = useMemo(() => accountBalances(books), [books]);
  const parties = useMemo(() => partyBalances(books), [books]);
  const chart = useMemo(() => monthlyResults(books, 6, today), [books, today]);
  const topStyles = useMemo(() => stylePerformance(books, monthStart(today), today, stock).filter((row) => row.pairs > 0).sort((a, b) => b.pairs - a.pairs).slice(0, 5), [books, today, stock]);

  const cashTotal = [...balances.values()].reduce((sum, value) => sum + value, 0);
  const receivable = books.parties.filter((party) => party.kind === "customer").reduce((sum, party) => sum + Math.max(0, parties.get(party.id) ?? 0), 0);
  const payable = books.parties.filter((party) => party.kind === "supplier").reduce((sum, party) => sum + Math.max(0, parties.get(party.id) ?? 0), 0);
  const soldOut = low.filter((row) => row.qty <= 0).length;

  const lowStockCard = (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Sizes running out</CardTitle>
          <CardDescription>{soldOut} sold out · {low.length - soldOut} with {settings.rules.lowStockThreshold} pair{settings.rules.lowStockThreshold === 1 ? "" : "s"} or less</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link href={`${base}/stock?view=low`}>See all</Link></Button>
      </CardHeader>
      <CardContent className="p-0">
        {low.length ? (
          <ul className="divide-y border-t">
            {low.slice(0, 7).map((row) => (
              <li key={row.variantId}>
                <Link href={`${base}/products/${row.style.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-heading">{row.style.name}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Swatch hex={row.style.colors.find((color) => color.name === row.color)?.hex} className="size-2.5" />{row.color} · {sizeLabel(row.style, row.size)}</span>
                  </span>
                  <Badge tone={row.qty <= 0 ? "danger" : "warning"}>{row.qty <= 0 ? "Sold out" : `${row.qty} left`}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="px-5 pb-5 text-sm text-muted-foreground">Every size is well stocked.</p>}
      </CardContent>
    </Card>
  );

  const recentCard = (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div><CardTitle>Latest receipts</CardTitle><CardDescription>Sales, returns and exchanges</CardDescription></div>
        <Button asChild size="sm" variant="outline"><Link href={`${base}/sales/walk-in`}>All receipts</Link></Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y border-t">
          {books.sales.slice(0, 6).map((sale) => {
            const kind = saleKind(sale);
            return (
              <li key={sale.id}>
                <Link href={`${base}/sales/${sale.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-heading">{sale.number}</span>
                    {kind !== "Sale" ? <Badge tone={kind === "Return" ? "danger" : "info"} className="ml-2 px-1.5 py-0 text-[0.6rem]">{kind}</Badge> : null}
                    <span className="block truncate text-xs text-muted-foreground">{formatDate(sale.date)} {sale.time} · {sale.customerName}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-heading">{money(sale.total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );

  if (!owner) {
    const mine = todaySales.filter((sale) => sale.cashier === session?.name);
    return (
      <div className="workspace-enter space-y-5">
        <WorkspaceHeader eyebrow={formatDate(today)} title={`${greeting()}, ${session?.name ?? ""}`} description="Open the POS to sell, or take a return or size exchange." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`${base}/pos`} className="flex items-center gap-3 rounded-xl bg-primary p-5 text-white shadow-md hover:bg-primary/90">
            <ScanBarcode className="size-7" /><span><span className="block text-lg font-bold">Open POS</span><span className="text-sm text-white/80">Start a sale</span></span>
          </Link>
          <Link href={`${base}/pos?return=`} className="flex items-center gap-3 rounded-xl border bg-card p-5 hover:border-primary/40">
            <ArrowLeftRight className="size-7 text-primary" /><span><span className="block text-lg font-bold text-heading">Return / exchange</span><span className="text-sm text-muted-foreground">Within {settings.rules.returnDays} days</span></span>
          </Link>
          <StatCard label="My sales today" value={money(mine.reduce((sum, sale) => sum + sale.total, 0))} note={`${mine.length} receipts`} icon={ReceiptText} tone="primary" />
          <StatCard label="Shop today" value={`${todayPairs} pairs`} note={`${todaySales.length} receipts`} icon={Footprints} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">{lowStockCard}{recentCard}</div>
      </div>
    );
  }

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow={formatDate(today)}
        title={greeting()}
        description={`Here’s how ${settings.business.name} is doing today and this month.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`${base}/purchases/new`}><Truck className="size-4" />New purchase</Link></Button>
            <Button asChild><Link href={`${base}/pos`}><ScanBarcode className="size-4" />Open POS</Link></Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales today" value={money(todayTotal)} note={`${todaySales.length} receipts · ${todayPairs} items`} icon={ReceiptText} tone="primary" href={`${base}/reports?view=day`} />
        <StatCard label="Profit this month so far" value={money(month.netProfit)} note={`${money(month.netSales)} sales · ${Math.round(month.grossMargin * 100)}% gross margin`} icon={CalendarDays} tone={month.netProfit >= 0 ? "success" : "danger"} href={`${base}/reports`} />
        <StatCard label="Cash & bank" value={money(cashTotal)} note={books.accounts.map((account) => `${account.name.split(" ")[0]} ${money(balances.get(account.id) ?? 0)}`).join(" · ")} icon={Wallet} tone="info" href={`${base}/money`} />
        <StatCard label="Khata" value={money(receivable)} note={`Customers owe you · you owe suppliers ${money(payable)}`} icon={BookUser} href={`${base}/parties`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><CardTitle>Last 6 months</CardTitle><CardDescription>Net sales after discounts and returns, and what was left after stock cost and expenses.</CardDescription></div>
            <Button asChild size="sm" variant="outline"><Link href={`${base}/reports`}>Profit & loss</Link></Button>
          </CardHeader>
          <CardContent><MonthlyChart data={chart} /></CardContent>
        </Card>
        {lowStockCard}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><CardTitle>Best sellers this month</CardTitle><CardDescription>By pairs sold</CardDescription></div>
            <Button asChild size="sm" variant="outline"><Link href={`${base}/reports?view=styles`}>Style report</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {topStyles.length ? (
              <ul className="divide-y border-t">
                {topStyles.map((row, index) => (
                  <li key={row.styleId}>
                    <Link href={`${base}/products/${row.styleId}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-muted/50">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-heading">{row.name}</span><span className="text-xs text-muted-foreground">{row.pairs} sold · {row.onHand} left</span></span>
                      <span className="text-right"><span className="block font-semibold tabular-nums text-heading">{money(row.revenue)}</span><span className="text-xs tabular-nums text-muted-foreground">profit {money(row.profit)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 pb-5 text-sm text-muted-foreground">No sales yet this month.</p>}
          </CardContent>
        </Card>
        {recentCard}
      </div>

      {low.length === 0 && books.styles.length === 0 ? (
        <Card className="p-6 text-center">
          <PackageX className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-2 font-semibold text-heading">Add your first style to start selling</p>
          <Button asChild className="mt-4"><Link href={`${base}/products/new`}>Add a style</Link></Button>
        </Card>
      ) : null}
    </div>
  );
};
