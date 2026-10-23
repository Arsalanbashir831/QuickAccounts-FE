"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LedgerKind = "customer" | "vendor";
interface PartyRecord { name: string; code: string; city: string; balanceLabel: string; balance: number; total: string; status: string }

const customerRecords: Record<string, PartyRecord> = {
  "cust-1": { name: "Apex Mobiles (Kashif)", code: "CUS-0001", city: "Lahore", balanceLabel: "Balance Due", balance: 184500, total: "$3,840,000", status: "Active" },
  "cust-2": { name: "Hamza Electronics", code: "CUS-0002", city: "Rawalpindi", balanceLabel: "Balance Due", balance: 46750, total: "$1,920,000", status: "Active" },
  "cust-3": { name: "City Devices", code: "CUS-0003", city: "Islamabad", balanceLabel: "Balance Due", balance: 28900, total: "$780,000", status: "Credit Hold" },
  "cust-4": { name: "Tariq Telecom", code: "CUS-0004", city: "Lahore", balanceLabel: "Balance Due", balance: 0, total: "$5,610,000", status: "Active" },
};

const vendorRecords: Record<string, PartyRecord> = {
  "sup-1": { name: "Mumtaz Distributors", code: "VEN-0001", city: "Karachi", balanceLabel: "Balance Owed", balance: 1420000, total: "$8,960,000", status: "Open" },
  "sup-2": { name: "Apex Importers", code: "VEN-0002", city: "Lahore", balanceLabel: "Balance Owed", balance: 290000, total: "$4,280,000", status: "Open" },
  "sup-3": { name: "TechWorld Distribution", code: "VEN-0003", city: "Dubai / Karachi", balanceLabel: "Balance Owed", balance: 0, total: "$2,140,000", status: "Settled" },
};

const ledgerRows = {
  customer: [["02 Oct 2026", "INV-10482", "Invoice", "$89,999", "Debit", "Open"], ["25 Sep 2026", "PAY-0088", "Payment received", "$150,000", "Credit", "Posted"], ["14 Sep 2026", "INV-10412", "Invoice", "$74,999", "Debit", "Open"]],
  vendor: [["06 Oct 2026", "PINV-2088", "Purchase invoice", "$425,000", "Credit", "Open"], ["28 Sep 2026", "PAY-0042", "Payment made", "$300,000", "Debit", "Posted"], ["18 Sep 2026", "PINV-2044", "Purchase invoice", "$180,000", "Credit", "Open"]],
} as const;

export const PartyLedgerDetail = ({ companyId, kind, partyId }: { companyId: string; kind: LedgerKind; partyId: string }) => {
  const records = kind === "customer" ? customerRecords : vendorRecords;
  const record = records[partyId] ?? records[kind === "customer" ? "cust-1" : "sup-1"];
  const sourceRows = ledgerRows[kind];
  const formatLedgerAmount = (value: number) => value === 0 ? "—" : `$${Math.abs(value).toLocaleString()}`;
  const formatLedgerBalance = (value: number) => value === 0 ? "$0" : `${(value > 0) === (kind === "customer") ? "+" : "-"} $${Math.abs(value).toLocaleString()}`;
  const balanceClass = (value: number) => value === 0 ? "text-muted-foreground" : (value > 0) === (kind === "customer") ? "text-success-foreground" : "text-destructive";
  const allRows = Array.from({ length: 36 }, (_, index) => index).reduce((acc, index) => {
    const source = sourceRows[index % sourceRows.length];
    const journal = source[2].toLowerCase().includes("invoice") ? "INV" : kind === "customer" ? "PAY" : "BILL";
    const amount = Number(source[3].replace(/[^0-9.-]/g, "")) || 0;
    const debitValue = source[4] === "Debit" ? amount : 0;
    const creditValue = source[4] === "Credit" ? amount : 0;
    const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(2026, 0, 10 + index * 7));
    const initialBalance = acc.balance;
    const balance = initialBalance + (kind === "customer" ? debitValue - creditValue : creditValue - debitValue);
    acc.rows.push({ date, journal, description: source[2], reference: `${source[1].slice(0, -2)}${String(82 - index).padStart(2, "0")}`, initialBalance: formatLedgerBalance(initialBalance), debit: formatLedgerAmount(debitValue), credit: formatLedgerAmount(creditValue), balance: formatLedgerBalance(balance) });
    return { rows: acc.rows, balance };
  }, { rows: [] as Array<{ date: string; journal: string; description: string; reference: string; initialBalance: string; debit: string; credit: string; balance: string }>, balance: 0 }).rows;
  const [search, setSearch] = useState("");
  const filteredRows = allRows.filter((row) => !search.trim() || [row.journal, row.description, row.reference].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const [page, setPage] = useState(totalPages);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const parseAmount = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0;
  const totalDebit = allRows.reduce((sum, row) => sum + parseAmount(row.debit), 0);
  const totalCredit = allRows.reduce((sum, row) => sum + parseAmount(row.credit), 0);
  const totalRemainingBalance = kind === "customer" ? totalDebit - totalCredit : totalCredit - totalDebit;
  const formatAmount = (value: number) => `${value === 0 ? "" : (value > 0) === (kind === "customer") ? "+ " : "- "}$${Math.abs(value).toLocaleString()}`;
  const title = kind === "customer" ? "Customer Ledger" : "Vendor Ledger";

  return <div className="workspace-enter space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{title} · Account Detail</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-heading">{record.name}</h1><p className="mt-2 text-sm text-muted-foreground">{record.code} · Full transaction ledger</p></div><Button asChild variant="outline"><Link href={`/c/${encodeURIComponent(companyId)}/contacts?view=${kind === "customer" ? "customers" : "suppliers"}`}><ArrowLeft className="size-4" />Back to {title}</Link></Button></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardHeader className="p-4"><CardDescription>Account Status</CardDescription><CardTitle><Badge tone={record.status === "Active" || record.status === "Open" ? "success" : "warning"}>{record.status}</Badge></CardTitle></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>{record.balanceLabel}</CardDescription><CardTitle className={`font-mono text-xl ${balanceClass(record.balance)}`}>{formatLedgerBalance(record.balance)}</CardTitle></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>{kind === "customer" ? "Lifetime Sales" : "Lifetime Purchases"}</CardDescription><CardTitle className="font-mono text-xl">{record.total}</CardTitle></CardHeader></Card><Card><CardHeader className="p-4"><CardDescription>Primary Location</CardDescription><CardTitle className="text-xl">{record.city}</CardTitle></CardHeader></Card></div>
    <Card><CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Transaction Ledger</CardTitle><CardDescription>Accounting journal with debit, credit, and running balance · {filteredRows.length} of {allRows.length} records</CardDescription></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search ledger transactions" placeholder="Search journal, description, or ref..." className="pl-9 text-xs" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div></CardHeader><CardContent className="p-0"><div className="max-h-[660px] overflow-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="sticky top-0 z-10 border-y bg-muted text-left text-xs uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-4 py-3">Date of Transaction</th><th className="px-4 py-3">JRNL</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Ref</th><th className="px-4 py-3 text-right">Initial Balance</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={`${row.reference}-${index}`} className="border-b last:border-0"><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{row.date}</td><td className="px-4 py-4 font-mono text-xs font-bold text-primary">{row.journal}</td><td className="px-4 py-4 font-medium text-heading">{row.description}</td><td className="px-4 py-4 font-mono text-xs font-semibold text-primary">{row.reference}</td><td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs">{row.initialBalance}</td><td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs">{row.debit}</td><td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs">{row.credit}</td><td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs font-bold text-heading">{row.balance}</td></tr>)}</tbody><tfoot className="border-t-2 bg-muted/60 font-semibold"><tr><td className="px-4 py-4" colSpan={4}>Total</td><td className="px-4 py-4 text-right font-mono text-xs">—</td><td className="px-4 py-4 text-right font-mono text-xs">{formatAmount(totalDebit)}</td><td className="px-4 py-4 text-right font-mono text-xs">{formatAmount(totalCredit)}</td><td className="px-4 py-4 text-right font-mono text-xs text-heading">{formatAmount(totalRemainingBalance)}</td></tr></tfoot></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><p className="text-xs text-muted-foreground">Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} records</p><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="min-w-20 text-center text-xs font-semibold text-muted-foreground">Page {page} of {totalPages}</span><Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div></CardContent></Card>
  </div>;
};
