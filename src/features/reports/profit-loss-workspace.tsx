"use client";

import { CalendarRange, Download, PackageCheck, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWarrantyCosts, useWarrantyRecoveries, writeWarrantyCosts, writeWarrantyRecoveries } from "./warranty-recovery-store";

type RangeKey = "1m" | "6m" | "1y" | "2y";
type Period = { label: string; sales: number; expenses: number };

const reportRanges: Record<RangeKey, { label: string; periods: Period[] }> = {
  "1m": { label: "1 month", periods: [{ label: "Week 1", sales: 184500, expenses: 92300 }, { label: "Week 2", sales: 231000, expenses: 108500 }, { label: "Week 3", sales: 198750, expenses: 99400 }, { label: "Week 4", sales: 286000, expenses: 121800 }] },
  "6m": { label: "6 months", periods: [{ label: "May", sales: 820000, expenses: 506000 }, { label: "Jun", sales: 910000, expenses: 528000 }, { label: "Jul", sales: 1080000, expenses: 604000 }, { label: "Aug", sales: 1160000, expenses: 672000 }, { label: "Sep", sales: 1290000, expenses: 710000 }, { label: "Oct", sales: 1430000, expenses: 758000 }] },
  "1y": { label: "1 year", periods: [{ label: "Nov", sales: 780000, expenses: 492000 }, { label: "Dec", sales: 860000, expenses: 510000 }, { label: "Jan", sales: 920000, expenses: 534000 }, { label: "Feb", sales: 980000, expenses: 561000 }, { label: "Mar", sales: 1040000, expenses: 580000 }, { label: "Apr", sales: 1120000, expenses: 612000 }, { label: "May", sales: 1180000, expenses: 642000 }, { label: "Jun", sales: 1240000, expenses: 674000 }, { label: "Jul", sales: 1320000, expenses: 702000 }, { label: "Aug", sales: 1380000, expenses: 735000 }, { label: "Sep", sales: 1460000, expenses: 766000 }, { label: "Oct", sales: 1540000, expenses: 804000 }] },
  "2y": { label: "2 years", periods: [{ label: "Q1 ’25", sales: 2140000, expenses: 1340000 }, { label: "Q2 ’25", sales: 2480000, expenses: 1490000 }, { label: "Q3 ’25", sales: 2860000, expenses: 1660000 }, { label: "Q4 ’25", sales: 3140000, expenses: 1810000 }, { label: "Q1 ’26", sales: 3360000, expenses: 1940000 }, { label: "Q2 ’26", sales: 3780000, expenses: 2180000 }, { label: "Q3 ’26", sales: 4060000, expenses: 2320000 }, { label: "Q4 ’26", sales: 4420000, expenses: 2510000 }] },
};

const salesDetails = [
  ["Retail Sales", "184 invoices", "$1,084,500"],
  ["Wholesale Sales", "42 invoices", "$698,750"],
];
const expenseDetails = [
  ["Cost of Goods Sold", "Purchases and stock cost", "$186,400"],
  ["Operating Expenses", "Rent, utilities, and salaries", "$78,900"],
];

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
const chartPoints = (values: number[], max: number) => values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - (value / max) * 84 - 8}`).join(" ");

const isoToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const displayDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export const ProfitLossWorkspace = ({ companyId }: { companyId: string }) => {
  const [range, setRange] = useState<RangeKey>("6m");
  const recoveries = useWarrantyRecoveries(companyId);
  const warrantyCosts = useWarrantyCosts(companyId);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [costError, setCostError] = useState("");
  const [recoveryDraft, setRecoveryDraft] = useState({ claimReference: "", supplier: "", product: "", dateReceived: isoToday(), quantity: "1", unitValue: "", note: "" });
  const [costDraft, setCostDraft] = useState({ claimReference: "", costType: "Repair" as "Repair" | "Replacement / exchange", product: "", dateRecorded: isoToday(), amount: "", note: "" });
  const selected = reportRanges[range];
  const dateRange = useMemo(() => {
    const now = new Date();
    const monthsToInclude = range === "1m" ? 1 : range === "6m" ? 6 : range === "1y" ? 12 : 24;
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - monthsToInclude + 1, 1);
    const start = `${firstMonth.getFullYear()}-${String(firstMonth.getMonth() + 1).padStart(2, "0")}`;
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { start, end };
  }, [range]);
  const periodRecoveries = useMemo(() => recoveries.filter((record) => record.dateReceived.slice(0, 7) >= dateRange.start && record.dateReceived.slice(0, 7) <= dateRange.end), [dateRange, recoveries]);
  const periodWarrantyCosts = useMemo(() => warrantyCosts.filter((record) => record.dateRecorded.slice(0, 7) >= dateRange.start && record.dateRecorded.slice(0, 7) <= dateRange.end), [dateRange, warrantyCosts]);
  const recoveredValue = periodRecoveries.reduce((sum, record) => sum + record.recoveryValue, 0);
  const allRecoveredValue = recoveries.filter((record) => record.dateReceived.slice(0, 7) <= dateRange.end).reduce((sum, record) => sum + record.recoveryValue, 0);
  const temporaryWarrantyCost = 126000 + periodWarrantyCosts.reduce((sum, record) => sum + record.amount, 0);
  const allWarrantyCost = 126000 + warrantyCosts.filter((record) => record.dateRecorded.slice(0, 7) <= dateRange.end).reduce((sum, record) => sum + record.amount, 0);
  const reportPeriods = useMemo(() => selected.periods.map((period, index) => index === selected.periods.length - 1 ? { ...period, expenses: period.expenses + temporaryWarrantyCost } : period), [selected, temporaryWarrantyCost]);
  const totals = useMemo(() => reportPeriods.reduce((result, period) => ({ sales: result.sales + period.sales, expenses: result.expenses + period.expenses }), { sales: 0, expenses: 0 }), [reportPeriods]);
  const pendingSupplierRecovery = Math.max(0, 42300 - recoveries.filter((record) => record.claimReference.toLowerCase() === "sc-0038" && record.dateReceived.slice(0, 7) <= dateRange.end).reduce((sum, record) => sum + record.recoveryValue, 0));
  const outstandingWarrantyCost = Math.max(0, allWarrantyCost - allRecoveredValue);
  const displayedExpenseDetails = [...expenseDetails, ["Warranty repairs and replacements", "Sample replacements and recorded repair / exchange costs", money(temporaryWarrantyCost)]];
  const profit = totals.sales - totals.expenses;
  const margin = totals.sales ? Math.round((profit / totals.sales) * 100) : 0;
  const maxValue = Math.max(...reportPeriods.flatMap((period) => [period.sales, period.expenses]));

  useEffect(() => {
    if (!showRecoveryForm && !showCostForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showCostForm, showRecoveryForm]);

  const openCostForm = () => {
    setCostDraft({ claimReference: "", costType: "Repair", product: "", dateRecorded: isoToday(), amount: "", note: "" });
    setCostError("");
    setShowCostForm(true);
  };

  const recordWarrantyCost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(costDraft.amount);
    if (!costDraft.claimReference.trim() || !costDraft.product.trim() || !costDraft.dateRecorded || !Number.isFinite(amount) || amount <= 0) {
      setCostError("Enter the claim reference, product, date, and a cost greater than zero.");
      return;
    }
    const record = {
      id: `wcost-${Date.now().toString(36)}`,
      claimReference: costDraft.claimReference.trim(),
      costType: costDraft.costType,
      product: costDraft.product.trim(),
      dateRecorded: costDraft.dateRecorded,
      amount,
      note: costDraft.note.trim(),
    };
    try {
      writeWarrantyCosts(companyId, [...warrantyCosts, record]);
      setShowCostForm(false);
      toast.success(`${money(record.amount)} warranty cost recorded.`);
    } catch {
      setCostError("Could not save this warranty cost in this browser.");
    }
  };

  const openRecoveryForm = () => {
    setRecoveryDraft({ claimReference: "", supplier: "", product: "", dateReceived: isoToday(), quantity: "1", unitValue: "", note: "" });
    setRecoveryError("");
    setShowRecoveryForm(true);
  };

  const recordRecovery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(recoveryDraft.quantity);
    const unitValue = Number(recoveryDraft.unitValue);
    if (!recoveryDraft.claimReference.trim() || !recoveryDraft.supplier.trim() || !recoveryDraft.product.trim() || !recoveryDraft.dateReceived || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitValue) || unitValue <= 0) {
      setRecoveryError("Enter the claim, supplier, product, receipt date, quantity, and new unit value.");
      return;
    }
    const record = {
      id: `wrec-${Date.now().toString(36)}`,
      claimReference: recoveryDraft.claimReference.trim(),
      supplier: recoveryDraft.supplier.trim(),
      product: recoveryDraft.product.trim(),
      dateReceived: recoveryDraft.dateReceived,
      quantity,
      unitValue,
      recoveryValue: quantity * unitValue,
      note: recoveryDraft.note.trim(),
    };
    try {
      writeWarrantyRecoveries(companyId, [...recoveries, record]);
      setShowRecoveryForm(false);
      toast.success(`${money(record.recoveryValue)} supplier restock recovery recorded.`);
    } catch {
      setRecoveryError("Could not save this recovery in this browser.");
    }
  };

  return <div className="workspace-enter space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Finance · Management Reporting</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-heading">Profit &amp; Loss Statement</h1><p className="mt-2 text-sm text-muted-foreground">Compare sales, expenses, and net profit across the selected reporting period.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 rounded-md border bg-card p-1"><CalendarRange className="ml-2 size-4 text-muted-foreground" />{(Object.keys(reportRanges) as RangeKey[]).map((key) => <Button key={key} size="sm" variant={range === key ? "secondary" : "ghost"} onClick={() => setRange(key)}>{reportRanges[key].label}</Button>)}</div><Button variant="outline"><Download className="size-4" />Export</Button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardHeader className="p-4"><CardDescription>Total Sales</CardDescription><CardTitle className="font-mono text-2xl">{money(totals.sales)}</CardTitle><p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success"><TrendingUp className="size-3.5" />Across {selected.label}</p></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>Total Expenses</CardDescription><CardTitle className="font-mono text-2xl">{money(totals.expenses)}</CardTitle><p className="mt-2 flex items-center gap-1 text-xs font-semibold text-warning-foreground"><TrendingDown className="size-3.5" />Includes temporary warranty cost</p></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>Net Profit</CardDescription><CardTitle className="font-mono text-2xl text-success-foreground">{money(profit)}</CardTitle><p className="mt-2 text-xs font-semibold text-muted-foreground">Sales less expenses</p></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>Profit Margin</CardDescription><CardTitle className="font-mono text-2xl">{margin}%</CardTitle><Badge tone={margin >= 35 ? "success" : "warning"}>Healthy range</Badge></CardHeader></Card></div>
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Warranty cost &amp; supplier recovery</CardTitle><CardDescription>Track temporary repair or replacement costs separately from supplier stock received.</CardDescription></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={openCostForm}><Plus className="size-4" />Record warranty cost</Button><Button onClick={openRecoveryForm}><Plus className="size-4" />Record restock received</Button></div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Temporary warranty cost</p><p className="mt-1 font-mono text-xl font-semibold text-destructive">− {money(temporaryWarrantyCost)}</p><p className="mt-1 text-xs text-muted-foreground">Includes 8 sample replacements and recorded claim costs</p></div>
          <div className="rounded-lg border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Supplier restock received</p><p className="mt-1 font-mono text-xl font-semibold text-success-foreground">+ {money(recoveredValue)}</p><p className="mt-1 text-xs text-muted-foreground">Actual received value for {selected.label}</p></div>
          <div className="rounded-lg border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Claim awaiting supplier</p><p className="mt-1 font-mono text-xl font-semibold">{money(pendingSupplierRecovery)}</p><p className="mt-1 text-xs text-muted-foreground">SC-0038 · pending, not counted as received recovery</p></div>
          <div className="rounded-lg border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Warranty cost not yet recovered</p><p className="mt-1 font-mono text-xl font-semibold">{money(outstandingWarrantyCost)}</p><p className="mt-1 text-xs text-muted-foreground">Cost less received recovery</p></div>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">Received replacement stock is shown as a separate recovery and does not increase net profit. The value is based on the new stock quantity and unit value entered at receipt. This demo register doesn’t post inventory movements.</div>
        <div className="overflow-x-auto rounded-lg border">
          <div className="border-b px-4 py-3"><h3 className="text-sm font-semibold text-heading">Warranty costs recorded</h3><p className="mt-0.5 text-xs text-muted-foreground">These repair and replacement costs are included in P&amp;L expenses.</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>Claim / reference</TableHead><TableHead>Cost type</TableHead><TableHead>Product</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-mono text-muted-foreground">Sample report</TableCell><TableCell>Replacement / exchange</TableCell><TableCell>8 sample replacement units</TableCell><TableCell>Current report fixture</TableCell><TableCell className="text-right font-mono font-semibold text-destructive">− {money(126000)}</TableCell></TableRow>
              {periodWarrantyCosts.map((record) => <TableRow key={record.id}><TableCell className="font-mono font-semibold text-primary">{record.claimReference}</TableCell><TableCell>{record.costType}</TableCell><TableCell><span className="font-medium text-heading">{record.product}</span>{record.note ? <p className="text-xs text-muted-foreground">{record.note}</p> : null}</TableCell><TableCell className="whitespace-nowrap">{displayDate(record.dateRecorded)}</TableCell><TableCell className="text-right font-mono font-semibold text-destructive">− {money(record.amount)}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Supplier / product</TableHead><TableHead>Date received</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">New unit value</TableHead><TableHead className="text-right">Recovery value</TableHead></TableRow></TableHeader>
            <TableBody>
              {periodRecoveries.map((record) => <TableRow key={record.id}><TableCell className="font-mono font-semibold text-primary">{record.claimReference}</TableCell><TableCell><p className="font-medium text-heading">{record.supplier}</p><p className="text-xs text-muted-foreground">{record.product}</p></TableCell><TableCell className="whitespace-nowrap">{displayDate(record.dateReceived)}</TableCell><TableCell className="text-right tabular-nums">{record.quantity}</TableCell><TableCell className="text-right font-mono">{money(record.unitValue)}</TableCell><TableCell className="text-right font-mono font-semibold text-success-foreground">+ {money(record.recoveryValue)}</TableCell></TableRow>)}
              {periodRecoveries.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No supplier restock has been recorded in this date range.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">Sample report values · warranty costs and recovery entries are demo data stored in this browser.</p>
      </CardContent>
    </Card>
    <div className="grid gap-5 lg:grid-cols-[1.5fr_0.8fr]"><Card><CardHeader><CardTitle>Sales vs Expenses</CardTitle><CardDescription>Period trend · {selected.label}</CardDescription></CardHeader><CardContent><div className="relative h-72"><div className="absolute inset-0 flex flex-col justify-between text-[0.65rem] text-muted-foreground"><span>{money(maxValue)}</span><span>{money(maxValue * 0.66)}</span><span>{money(maxValue * 0.33)}</span><span>$0</span></div><svg className="absolute inset-y-0 left-16 right-0 h-full w-[calc(100%-4rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Sales and expenses trend chart"><line x1="0" y1="8" x2="100" y2="8" stroke="currentColor" className="text-border" strokeWidth="0.3" /><line x1="0" y1="36" x2="100" y2="36" stroke="currentColor" className="text-border" strokeWidth="0.3" /><line x1="0" y1="64" x2="100" y2="64" stroke="currentColor" className="text-border" strokeWidth="0.3" /><line x1="0" y1="92" x2="100" y2="92" stroke="currentColor" className="text-border" strokeWidth="0.3" /><polyline fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.2" points={chartPoints(reportPeriods.map((period) => period.sales), maxValue)} /><polyline fill="none" stroke="currentColor" className="text-info" strokeWidth="1.2" points={chartPoints(reportPeriods.map((period) => period.expenses), maxValue)} />{reportPeriods.map((period, index) => <g key={period.label}><circle cx={(index / Math.max(reportPeriods.length - 1, 1)) * 100} cy={100 - (period.sales / maxValue) * 84 - 8} r="1.3" className="fill-primary" /><circle cx={(index / Math.max(reportPeriods.length - 1, 1)) * 100} cy={100 - (period.expenses / maxValue) * 84 - 8} r="1.3" className="fill-info" /></g>)}</svg><div className="absolute bottom-0 left-16 right-0 flex justify-between text-[0.65rem] text-muted-foreground">{reportPeriods.map((period) => <span key={period.label}>{period.label}</span>)}</div></div><div className="mt-4 flex gap-5 text-xs font-semibold"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary" />Sales</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-info" />Expenses</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Expense Breakdown</CardTitle><CardDescription>Current period categories</CardDescription></CardHeader><CardContent className="space-y-5">{displayedExpenseDetails.map(([label, detail, amount], index) => <div key={label}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-heading">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div><p className="font-mono text-sm font-semibold">{amount}</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={index === 0 ? "h-full w-[78%] rounded-full bg-primary" : index === 1 ? "h-full w-[42%] rounded-full bg-info" : "h-full w-[24%] rounded-full bg-warning"} /></div></div>)}<div className="border-t pt-4"><div className="flex items-center justify-between text-sm font-bold"><span>Total expenses</span><span className="font-mono">{money(totals.expenses)}</span></div></div></CardContent></Card></div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Sales Details</CardTitle><CardDescription>Revenue sources for {selected.label}</CardDescription></CardHeader><CardContent className="p-0"><table className="w-full text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-5 py-3">Category</th><th className="px-5 py-3">Activity</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody>{salesDetails.map(([label, detail, amount]) => <tr key={label} className="border-b last:border-0"><td className="px-5 py-4 font-semibold text-heading">{label}</td><td className="px-5 py-4 text-xs text-muted-foreground">{detail}</td><td className="px-5 py-4 text-right font-mono font-semibold text-success-foreground">{amount}</td></tr>)}</tbody></table></CardContent></Card><Card><CardHeader><CardTitle>Expense Details</CardTitle><CardDescription>Cost drivers for {selected.label}</CardDescription></CardHeader><CardContent className="p-0"><table className="w-full text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-5 py-3">Category</th><th className="px-5 py-3">Description</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody>{displayedExpenseDetails.map(([label, detail, amount]) => <tr key={label} className="border-b last:border-0"><td className="px-5 py-4 font-semibold text-heading">{label}</td><td className="px-5 py-4 text-xs text-muted-foreground">{detail}</td><td className="px-5 py-4 text-right font-mono font-semibold">{amount}</td></tr>)}</tbody></table></CardContent></Card></div>
    {showCostForm ? <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCostForm(false); }}><Card role="dialog" aria-modal="true" aria-labelledby="warranty-cost-title" className="flex h-full max-h-screen w-full max-w-xl flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl"><CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle id="warranty-cost-title">Record warranty cost</CardTitle><CardDescription>Record the repair cost or replacement item cost for a customer warranty case.</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close warranty cost form" onClick={() => setShowCostForm(false)}><X className="size-4" /></Button></CardHeader><CardContent className="overflow-y-auto p-5"><form onSubmit={recordWarrantyCost} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">Claim / RMA reference<Input required autoFocus maxLength={60} value={costDraft.claimReference} onChange={(event) => setCostDraft({ ...costDraft, claimReference: event.target.value })} placeholder="e.g. RMA-0082" /></label>
      <label className="block space-y-1.5 text-sm font-medium">Cost type<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={costDraft.costType} onChange={(event) => setCostDraft({ ...costDraft, costType: event.target.value as typeof costDraft.costType })}><option>Repair</option><option>Replacement / exchange</option></select></label>
      <label className="block space-y-1.5 text-sm font-medium">Product<Input required maxLength={120} value={costDraft.product} onChange={(event) => setCostDraft({ ...costDraft, product: event.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Date cost occurred<Input required type="date" value={costDraft.dateRecorded} onChange={(event) => setCostDraft({ ...costDraft, dateRecorded: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium">Cost (USD)<Input required type="number" min="0.01" step="0.01" value={costDraft.amount} onChange={(event) => setCostDraft({ ...costDraft, amount: event.target.value })} placeholder="0.00" /></label></div>
      <label className="block space-y-1.5 text-sm font-medium">Note <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={240} value={costDraft.note} onChange={(event) => setCostDraft({ ...costDraft, note: event.target.value })} placeholder="Optional repair, exchange, or supplier claim details" /></label>
      {costError ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{costError}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setShowCostForm(false)}>Cancel</Button><Button type="submit">Record warranty cost</Button></div>
    </form></CardContent></Card></div> : null}
    {showRecoveryForm ? <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRecoveryForm(false); }}><Card role="dialog" aria-modal="true" aria-labelledby="warranty-recovery-title" className="flex h-full max-h-screen w-full max-w-xl flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl"><CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle id="warranty-recovery-title">Record supplier restock</CardTitle><CardDescription>Enter the quantity and value of replacement stock received against a warranty claim.</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close supplier restock form" onClick={() => setShowRecoveryForm(false)}><X className="size-4" /></Button></CardHeader><CardContent className="overflow-y-auto p-5"><form onSubmit={recordRecovery} className="space-y-4">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground"><PackageCheck className="mr-2 inline size-4 text-primary" />This recovery is reported separately and does not change net profit.</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Claim / RMA reference<Input required autoFocus maxLength={60} value={recoveryDraft.claimReference} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, claimReference: event.target.value })} placeholder="e.g. SC-0038" /></label><label className="space-y-1.5 text-sm font-medium">Supplier<Input required maxLength={100} value={recoveryDraft.supplier} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, supplier: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium sm:col-span-2">Product received<Input required maxLength={120} value={recoveryDraft.product} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, product: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium">Date received<Input required type="date" value={recoveryDraft.dateReceived} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, dateReceived: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium">Quantity received<Input required type="number" min="1" step="1" value={recoveryDraft.quantity} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, quantity: event.target.value })} /></label><label className="space-y-1.5 text-sm font-medium sm:col-span-2">New unit value (USD)<Input required type="number" min="0.01" step="0.01" value={recoveryDraft.unitValue} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, unitValue: event.target.value })} placeholder="0.00" /><span className="block text-xs font-normal text-muted-foreground">Total recovery value: {money((Number(recoveryDraft.quantity) || 0) * (Number(recoveryDraft.unitValue) || 0))}</span></label><label className="space-y-1.5 text-sm font-medium sm:col-span-2">Note <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={240} value={recoveryDraft.note} onChange={(event) => setRecoveryDraft({ ...recoveryDraft, note: event.target.value })} placeholder="Optional receipt or supplier note" /></label></div>
      {recoveryError ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{recoveryError}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setShowRecoveryForm(false)}>Cancel</Button><Button type="submit"><PackageCheck className="size-4" />Record recovery</Button></div>
    </form></CardContent></Card></div> : null}
  </div>;
};
