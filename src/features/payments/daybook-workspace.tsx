"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, FileText, Plus, Search, X } from "lucide-react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts as standardAccounts, type Account } from "@/features/accounts/accounts-view";
import { useInvoices } from "@/features/sales/invoice-store";
import { usePurchaseOrders } from "@/features/purchases/purchase-store";
import { useLocations } from "@/features/settings/location-store";

type EntryKind = "Sale" | "Payment" | "Expense" | "Purchase" | "Income" | "Manual";
type Direction = "in" | "out";
type DaybookEntry = {
  id: string;
  date: string;
  reference: string;
  kind: EntryKind;
  direction: Direction;
  description: string;
  party: string;
  accountCode: string;
  accountName: string;
  contraCode: string;
  contraName: string;
  method: string;
  amount: number;
  location: string;
  notes: string;
};

const demoManualEntries: DaybookEntry[] = [
  { id: "db-demo-1", date: "2026-10-12", reference: "DB-0018", kind: "Income", direction: "in", description: "Delivery charge collected", party: "Walk-in customer", accountCode: "4020", accountName: "Delivery and Service Income", contraCode: "100001", contraName: "Main Outlet Cash", method: "Cash", amount: 2500, location: "Main Outlet", notes: "" },
  { id: "db-demo-2", date: "2026-10-12", reference: "DB-0017", kind: "Expense", direction: "out", description: "Shop internet bill", party: "PTCL", accountCode: "6020", accountName: "Utilities and Communications", contraCode: "1010", contraName: "Main Bank Account", method: "Bank", amount: 8500, location: "Main Outlet", notes: "" },
  { id: "db-demo-3", date: "2026-10-11", reference: "DB-0016", kind: "Expense", direction: "out", description: "Packaging supplies", party: "", accountCode: "6090", accountName: "Office and General Expenses", contraCode: "100001", contraName: "Main Outlet Cash", method: "Cash", amount: 3200, location: "Main Outlet", notes: "" },
];

const storageKey = (companyId: string) => `quickaccounts:daybook:v1:${companyId}`;
const eventName = "daybook-entries-updated";
const entryCache = new Map<string, { raw: string | null; entries: DaybookEntry[] }>();

function readManualEntries(companyId: string): DaybookEntry[] {
  if (typeof window === "undefined") return demoManualEntries;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = entryCache.get(companyId);
  if (cached?.raw === raw) return cached.entries;
  let entries = demoManualEntries;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed as DaybookEntry[];
    } catch { /* Fall back to the preview entries if saved browser data is malformed. */ }
  }
  entryCache.set(companyId, { raw, entries });
  return entries;
}

function writeManualEntries(companyId: string, entries: DaybookEntry[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(entries));
  entryCache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

function localISODate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toISODate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return localISODate();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(match[2].toLowerCase());
  if (month < 0) return localISODate();
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const money = (amount: number) => `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const kindTone = (kind: EntryKind) => kind === "Sale" || kind === "Payment" || kind === "Income" ? "success" : kind === "Expense" ? "warning" : "info";

export const DaybookWorkspace = ({ companyId }: { companyId: string }) => {
  const locations = useLocations(companyId);
  const invoices = useInvoices(companyId);
  const purchaseOrders = usePurchaseOrders(companyId);
  const subscribe = useCallback((onChange: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
    window.addEventListener(eventName, onChange);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
  }, [companyId]);
  const manualEntries = useSyncExternalStore(subscribe, () => readManualEntries(companyId), () => demoManualEntries);

  const chartStorageKey = `quickaccounts:chart-of-accounts:v1:${companyId}`;
  const chartSubscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener("quickaccounts:chart-accounts-changed", onChange);
    return () => { window.removeEventListener("storage", onChange); window.removeEventListener("quickaccounts:chart-accounts-changed", onChange); };
  }, []);
  const savedAccounts = useSyncExternalStore(chartSubscribe, () => window.localStorage.getItem(chartStorageKey), () => null);
  const customAccounts = useMemo(() => {
    if (!savedAccounts) return [];
    try {
      const parsed = JSON.parse(savedAccounts) as Account[];
      return Array.isArray(parsed) ? parsed.filter((account) => account && typeof account.code === "string" && typeof account.name === "string") : [];
    } catch { return []; }
  }, [savedAccounts]);
  const outletAccounts = useMemo(() => {
    const used = new Set(customAccounts.filter((account) => account.parentCode === "1000").map((account) => account.code));
    const outlets = locations.filter((location) => location.type === "Outlet");
    const sequences = Array.from({ length: outlets.length + used.size + 1 }, (_, index) => index + 1).filter((sequence) => !used.has(`1000${String(sequence).padStart(2, "0")}`));
    return outlets.map((location, index): Account => ({ code: `1000${String(sequences[index]).padStart(2, "0")}`, name: `${location.name} Cash`, group: "Assets", purpose: `Cash drawer for ${location.name}`, balance: "Debit", applies: "Retail · Wholesale", parentCode: "1000" }));
  }, [customAccounts, locations]);
  const chartAccounts = useMemo(() => [...standardAccounts, ...outletAccounts, ...customAccounts], [customAccounts, outletAccounts]);
  const postingAccounts = useMemo(() => chartAccounts.filter((account) => !chartAccounts.some((child) => child.parentCode === account.code)), [chartAccounts]);

  const sourceEntries = useMemo<DaybookEntry[]>(() => {
    const account = (code: string, fallback: string) => chartAccounts.find((item) => item.code === code)?.name ?? fallback;
    const sales: DaybookEntry[] = invoices.flatMap((invoice) => {
      const date = toISODate(invoice.date);
      const sale: DaybookEntry = { id: `sale:${invoice.id}`, date, reference: invoice.reference, kind: "Sale", direction: "in", description: `Sales invoice · ${invoice.reference}`, party: invoice.customer, accountCode: "4000", accountName: account("4000", "Retail Sales"), contraCode: invoice.balance > 0 ? "1100" : invoice.paymentMethod === "bank" ? "1010" : "100001", contraName: invoice.balance > 0 ? account("1100", "Trade Receivables") : invoice.paymentMethod === "bank" ? account("1010", invoice.bankAccount ?? "Bank account") : account("100001", "Main Outlet Cash"), method: invoice.balance > 0 ? "Credit sale" : invoice.paymentMethod === "bank" ? "Bank" : "Cash", amount: invoice.total, location: invoice.outlet, notes: invoice.notes ?? "" };
      const payment = invoice.paid > 0 ? [{ id: `payment:${invoice.id}`, date, reference: `RCPT-${invoice.reference}`, kind: "Payment" as const, direction: "in" as const, description: `Payment received · ${invoice.reference}`, party: invoice.customer, accountCode: invoice.paymentMethod === "bank" ? "1010" : "100001", accountName: invoice.paymentMethod === "bank" ? account("1010", invoice.bankAccount ?? "Bank account") : account("100001", "Main Outlet Cash"), contraCode: "1100", contraName: account("1100", "Trade Receivables"), method: invoice.paymentMethod === "bank" ? "Bank" : "Cash", amount: invoice.paid, location: invoice.outlet, notes: "Payment recorded with sales invoice." }] : [];
      return [sale, ...payment];
    });
    const purchases: DaybookEntry[] = purchaseOrders.map((order) => ({ id: `purchase:${order.id}`, date: toISODate(order.date), reference: order.supplierInvoice || order.poNumber, kind: "Purchase", direction: "out", description: `Purchase · ${order.poNumber}`, party: order.supplier, accountCode: "1200", accountName: account("1200", "Merchandise Inventory"), contraCode: order.paymentMethod === "credit" ? "2000" : order.paymentMethod === "bank" ? "1010" : "100001", contraName: order.paymentMethod === "credit" ? account("2000", "Trade Payables") : order.paymentMethod === "bank" ? account("1010", order.bankAccount ?? "Bank account") : account("100001", "Main Outlet Cash"), method: order.paymentMethod === "credit" ? "On account" : order.paymentMethod === "bank" ? "Bank" : "Cash", amount: order.totalCost, location: order.destination, notes: order.notes }));
    return [...sales, ...purchases, ...manualEntries];
  }, [chartAccounts, invoices, manualEntries, purchaseOrders]);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<"Income" | "Expense" | "Payment received" | "Payment sent">("Expense");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [party, setParty] = useState("");
  const [reference, setReference] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [method, setMethod] = useState<"Cash" | "Bank" | "On account">("Cash");
  const [contraCode, setContraCode] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!showAddForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showAddForm]);

  const cashAccounts = postingAccounts.filter((account) => account.group === "Assets" && /cash/i.test(account.name));
  const bankAccounts = postingAccounts.filter((account) => account.group === "Assets" && /bank|settlement/i.test(account.name));
  const isMoneyIn = type === "Income" || type === "Payment received";
  const contraAccounts = method === "Cash" ? cashAccounts : method === "Bank" ? bankAccounts : postingAccounts.filter((account) => account.group === (isMoneyIn ? "Assets" : "Liabilities") && (isMoneyIn ? account.code === "1100" : account.code === "2000"));
  const postingChoices = postingAccounts.filter((account) => account.code !== "1000");
  const filteredEntries = sourceEntries
    .filter((entry) => (!fromDate || entry.date >= fromDate) && (!toDate || entry.date <= toDate))
    .filter((entry) => !search.trim() || [entry.reference, entry.description, entry.party, entry.accountName, entry.kind].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())))
    .sort((left, right) => right.date.localeCompare(left.date) || right.reference.localeCompare(left.reference));
  const groupedEntries = useMemo(() => {
    const grouped = new Map<string, DaybookEntry[]>();
    for (const entry of filteredEntries) grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
    return [...grouped.entries()];
  }, [filteredEntries]);
  const selectedEntry = sourceEntries.find((entry) => entry.id === selectedId) ?? null;
  const totals = filteredEntries.reduce((result, entry) => {
    if (entry.direction === "in") result.moneyIn += entry.amount;
    else result.moneyOut += entry.amount;
    return result;
  }, { moneyIn: 0, moneyOut: 0 });

  const openAddForm = () => {
    setDate(localISODate()); setType("Expense"); setDescription(""); setParty(""); setReference(""); setAccountCode(""); setMethod("Cash"); setContraCode(""); setAmount(""); setLocation(locations.find((item) => item.type === "Outlet")?.name ?? ""); setNotes(""); setFormError(""); setShowAddForm(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedAccount = postingChoices.find((account) => account.code === accountCode);
    const selectedContra = contraAccounts.find((account) => account.code === contraCode);
    const value = Number(amount);
    if (!date || !selectedAccount || !selectedContra || !description.trim() || !Number.isFinite(value) || value <= 0) {
      setFormError("Complete the date, description, chart account, payment account, and a positive amount.");
      return;
    }
    const isReceipt = type === "Income" || type === "Payment received";
    const entry: DaybookEntry = { id: `manual:${crypto.randomUUID()}`, date, reference: reference.trim() || `DB-${String(Date.now()).slice(-6)}`, kind: type === "Payment received" || type === "Payment sent" ? "Payment" : type, direction: isReceipt ? "in" : "out", description: description.trim(), party: party.trim(), accountCode: selectedAccount.code, accountName: selectedAccount.name, contraCode: selectedContra.code, contraName: selectedContra.name, method, amount: value, location: location.trim() || "—", notes: notes.trim() };
    try {
      writeManualEntries(companyId, [entry, ...manualEntries]);
      setShowAddForm(false); setSelectedId(entry.id); setNotice("Entry added to the daybook.");
    } catch {
      setFormError("Could not save this entry in the browser. Check available storage and try again.");
    }
  };

  return <div className="workspace-enter space-y-5 pb-8">
    <WorkspaceHeader eyebrow="Accounts · Daily record" title="Daybook" description="A day grouped register of sales, payments, purchases, expenses, and other chart of accounts entries." action={<Button onClick={openAddForm}><Plus className="size-4" />Add entry</Button>} />

    {notice ? <p role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success-foreground"><Check className="size-4" />{notice}</p> : null}

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardHeader className="p-4"><CardDescription>Entries in view</CardDescription><CardTitle className="font-mono text-2xl">{filteredEntries.length}</CardTitle><p className="text-xs text-muted-foreground">Across {groupedEntries.length} {groupedEntries.length === 1 ? "day" : "days"}</p></CardHeader></Card>
      <Card><CardHeader className="p-4"><CardDescription>Money in</CardDescription><CardTitle className="font-mono text-2xl text-success-foreground">{money(totals.moneyIn)}</CardTitle><p className="text-xs text-muted-foreground">Sales, receipts, and income</p></CardHeader></Card>
      <Card><CardHeader className="p-4"><CardDescription>Money out</CardDescription><CardTitle className="font-mono text-2xl text-destructive">{money(totals.moneyOut)}</CardTitle><p className="text-xs text-muted-foreground">Purchases, expenses, and payments</p></CardHeader></Card>
    </div>

    <div className={`grid items-start gap-5 ${selectedEntry ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Daybook entries</CardTitle><CardDescription>Sales, payments, purchases, and manual entries are grouped by transaction date.</CardDescription></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative"><span className="sr-only">Filter from date</span><CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Filter from date" type="date" className="w-[150px] pl-8" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <span className="text-xs text-muted-foreground">to</span>
            <Input aria-label="Filter to date" type="date" className="w-[150px]" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            <div className="relative w-full sm:w-48"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search daybook" placeholder="Search entries" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-5">
          {groupedEntries.map(([day, entries]) => {
            const dayIn = entries.filter((entry) => entry.direction === "in").reduce((sum, entry) => sum + entry.amount, 0);
            const dayOut = entries.filter((entry) => entry.direction === "out").reduce((sum, entry) => sum + entry.amount, 0);
            return <section key={day} aria-label={`Entries for ${formatDate(day)}`} className="overflow-hidden rounded-lg border">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                <div><h2 className="font-semibold text-heading">{formatDate(day, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h2><p className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p></div>
                <div className="flex gap-4 text-right text-xs"><span className="text-success-foreground">In <strong className="font-mono">{money(dayIn)}</strong></span><span className="text-destructive">Out <strong className="font-mono">{money(dayOut)}</strong></span></div>
              </header>
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Entry</TableHead><TableHead>Reference</TableHead><TableHead>Account</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-8" /></TableRow></TableHeader><TableBody>
                {entries.map((entry) => <TableRow key={entry.id} tabIndex={0} aria-selected={selectedId === entry.id} onClick={() => setSelectedId(entry.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(entry.id); } }} className={`cursor-pointer ${selectedId === entry.id ? "bg-primary/5" : ""}`}>
                  <TableCell><p className="font-semibold text-heading">{entry.description}</p><p className="mt-1 text-xs text-muted-foreground">{entry.party || entry.location} · {entry.method}</p></TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{entry.reference}</TableCell>
                  <TableCell className="min-w-40"><p className="font-medium">{entry.accountName}</p><p className="font-mono text-xs text-muted-foreground">{entry.accountCode}</p></TableCell>
                  <TableCell><Badge tone={kindTone(entry.kind)}>{entry.kind}</Badge></TableCell>
                  <TableCell className={`whitespace-nowrap text-right font-mono font-semibold ${entry.direction === "in" ? "text-success-foreground" : "text-destructive"}`}>{entry.direction === "in" ? "+ " : "− "}{money(entry.amount)}</TableCell>
                  <TableCell><ChevronRight className="size-4 text-muted-foreground" /></TableCell>
                </TableRow>)}
              </TableBody></Table></div>
            </section>;
          })}
          {groupedEntries.length === 0 ? <div className="rounded-lg border border-dashed px-6 py-12 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold text-heading">No entries for these filters</p><p className="mt-1 text-sm text-muted-foreground">Adjust the date range or search, or add a manual entry.</p><Button className="mt-4" variant="outline" onClick={openAddForm}><Plus className="size-4" />Add entry</Button></div> : null}
        </CardContent>
      </Card>

      {selectedEntry ? <Card className="xl:sticky xl:top-4">
        <CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Entry details</p><CardTitle className="mt-1">{selectedEntry.description}</CardTitle><CardDescription>{selectedEntry.reference} · {formatDate(selectedEntry.date)}</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close entry details" onClick={() => setSelectedId(null)}><X className="size-4" /></Button></div></CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className={`rounded-lg border p-4 ${selectedEntry.direction === "in" ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}`}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedEntry.direction === "in" ? "Money received" : "Money paid / recorded"}</p><p className={`mt-1 font-mono text-2xl font-bold ${selectedEntry.direction === "in" ? "text-success-foreground" : "text-destructive"}`}>{selectedEntry.direction === "in" ? "+ " : "− "}{money(selectedEntry.amount)}</p></div>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Entry source</dt><dd><Badge tone={kindTone(selectedEntry.kind)}>{selectedEntry.kind}</Badge></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date</dt><dd className="text-right font-medium">{formatDate(selectedEntry.date, { day: "2-digit", month: "short", year: "numeric" })}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reference</dt><dd className="font-mono font-semibold">{selectedEntry.reference}</dd></div>
            {selectedEntry.party ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Contact</dt><dd className="text-right font-medium">{selectedEntry.party}</dd></div> : null}
            <div className="border-t pt-4"><dt className="text-xs text-muted-foreground">Chart of accounts</dt><dd className="mt-1 font-semibold">{selectedEntry.accountName}<span className="ml-2 font-mono text-xs text-muted-foreground">{selectedEntry.accountCode}</span></dd></div>
            <div><dt className="text-xs text-muted-foreground">Counter account</dt><dd className="mt-1 font-semibold">{selectedEntry.contraName}<span className="ml-2 font-mono text-xs text-muted-foreground">{selectedEntry.contraCode}</span></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment method</dt><dd className="font-medium">{selectedEntry.method}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Location</dt><dd className="text-right font-medium">{selectedEntry.location || "—"}</dd></div>
            {selectedEntry.notes ? <div className="border-t pt-4"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="mt-1 whitespace-pre-wrap">{selectedEntry.notes}</dd></div> : null}
          </dl>
        </CardContent>
      </Card> : null}
    </div>

    {showAddForm ? <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddForm(false); }}>
      <Card role="dialog" aria-modal="true" aria-labelledby="add-daybook-title" className="flex h-full max-h-screen w-full max-w-xl flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl">
        <CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle id="add-daybook-title">Add daybook entry</CardTitle><CardDescription>Record a one-off income, expense, or payment using chart accounts.</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close add entry form" onClick={() => setShowAddForm(false)}><X className="size-4" /></Button></CardHeader>
        <CardContent className="overflow-y-auto p-5"><form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Entry type<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => { setType(event.target.value as "Income" | "Expense" | "Payment received" | "Payment sent"); setContraCode(""); }}><option>Expense</option><option>Income</option><option>Payment received</option><option>Payment sent</option></select></label>
            <label className="block space-y-1.5 text-sm font-medium">Date<Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">Description<Input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this entry for?" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Chart of accounts<select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={accountCode} onChange={(event) => setAccountCode(event.target.value)}><option value="">Select an account</option>{(["Assets", "Liabilities", "Equity", "Income", "Cost of Sales", "Expenses"] as const).map((group) => { const groupAccounts = postingChoices.filter((account) => account.group === group); return groupAccounts.length ? <optgroup key={group} label={group}>{groupAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</optgroup> : null; })}</select></label>
            <label className="block space-y-1.5 text-sm font-medium">Amount (PKR)<Input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Payment method<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(event) => { setMethod(event.target.value as "Cash" | "Bank" | "On account"); setContraCode(""); }}><option value="Cash">Cash</option><option value="Bank" disabled={!bankAccounts.length}>Bank</option><option value="On account">On account</option></select></label>
            <label className="block space-y-1.5 text-sm font-medium">{method === "On account" ? isMoneyIn ? "Receivable account" : "Payable account" : method === "Bank" ? "Bank account" : "Cash account"}<select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={contraCode} onChange={(event) => setContraCode(event.target.value)}><option value="">Select an account</option>{contraAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Contact / payee<Input value={party} onChange={(event) => setParty(event.target.value)} placeholder="Optional" /></label>
            <label className="block space-y-1.5 text-sm font-medium">Reference<Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Auto-generated if blank" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">Location<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={location} onChange={(event) => setLocation(event.target.value)}><option value="">No location</option>{locations.filter((item) => item.type === "Outlet").map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium">Notes<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional detail" /></label>
          </div>
          {formError ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button><Button type="submit"><Plus className="size-4" />Add entry</Button></div>
        </form></CardContent>
      </Card>
    </div> : null}
  </div>;
};
