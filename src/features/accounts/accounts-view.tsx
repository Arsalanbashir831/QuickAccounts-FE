"use client";

import { Plus, Search } from "lucide-react";
import { Fragment, useCallback, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocations } from "@/features/settings/location-store";

const groups = ["All accounts", "Assets", "Liabilities", "Equity", "Income", "Cost of Sales", "Expenses"] as const;
type AccountGroup = Exclude<(typeof groups)[number], "All accounts">;
const accountGroups = groups.slice(1) as AccountGroup[];
export type Account = { code: string; name: string; group: AccountGroup; purpose: string; balance: string; applies: string; parentCode?: string };

// Generic starter structure; codes and tax accounts should be adjusted to local reporting needs.
export const accounts: Account[] = [
  { code: "1000", name: "Cash on Hand", group: "Assets", purpose: "Parent account for outlet cash drawers", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1010", name: "Main Bank Account", group: "Assets", purpose: "Operating bank account", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1020", name: "Card and Online Settlements", group: "Assets", purpose: "Amounts due from payment processors", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1100", name: "Trade Receivables", group: "Assets", purpose: "Customer credit balances due", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1110", name: "Allowance for Doubtful Debts", group: "Assets", purpose: "Expected uncollectible customer balances", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "1200", name: "Merchandise Inventory", group: "Assets", purpose: "Goods held for resale", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1210", name: "Inventory in Transit", group: "Assets", purpose: "Purchased goods not yet received", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1220", name: "Supplier Advances", group: "Assets", purpose: "Prepayments to suppliers", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1300", name: "Input Tax Receivable", group: "Assets", purpose: "Recoverable purchase tax, if applicable", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1500", name: "Shop Equipment and Fixtures", group: "Assets", purpose: "Long-term store equipment", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "1510", name: "Accumulated Depreciation", group: "Assets", purpose: "Depreciation recorded to date", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2000", name: "Trade Payables", group: "Liabilities", purpose: "Supplier balances due", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2010", name: "Supplier Bills Pending", group: "Liabilities", purpose: "Received invoices awaiting payment", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2100", name: "Customer Deposits and Advances", group: "Liabilities", purpose: "Customer money received before fulfilment", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2200", name: "Output Tax Payable", group: "Liabilities", purpose: "Sales tax payable, if applicable", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2300", name: "Salaries Payable", group: "Liabilities", purpose: "Earned salaries not yet paid", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "2400", name: "Short-term Borrowings", group: "Liabilities", purpose: "Loans and credit facilities due", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "3000", name: "Owner Capital", group: "Equity", purpose: "Owner investment in the business", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "3100", name: "Retained Earnings", group: "Equity", purpose: "Accumulated prior-period profit", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "3200", name: "Owner Drawings", group: "Equity", purpose: "Personal withdrawals by the owner", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "4000", name: "Retail Sales", group: "Income", purpose: "Counter and point-of-sale revenue", balance: "Credit", applies: "Retail" },
  { code: "4010", name: "Wholesale Sales", group: "Income", purpose: "Bulk and trade customer revenue", balance: "Credit", applies: "Wholesale" },
  { code: "4020", name: "Delivery and Service Income", group: "Income", purpose: "Delivery, installation, or service fees", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "4090", name: "Sales Returns and Discounts", group: "Income", purpose: "Returns, allowances, and discounts", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "5000", name: "Cost of Goods Sold · Retail", group: "Cost of Sales", purpose: "Cost of goods sold at retail", balance: "Debit", applies: "Retail" },
  { code: "5010", name: "Cost of Goods Sold · Wholesale", group: "Cost of Sales", purpose: "Cost of goods sold wholesale", balance: "Debit", applies: "Wholesale" },
  { code: "5020", name: "Freight and Import Costs", group: "Cost of Sales", purpose: "Inbound freight and landed costs", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "5090", name: "Purchase Returns and Discounts", group: "Cost of Sales", purpose: "Supplier returns and purchase discounts", balance: "Credit", applies: "Retail · Wholesale" },
  { code: "6000", name: "Staff Salaries and Wages", group: "Expenses", purpose: "Payroll and employee benefits", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6010", name: "Rent and Occupancy", group: "Expenses", purpose: "Premises rent and service charges", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6020", name: "Utilities and Communications", group: "Expenses", purpose: "Electricity, internet, and phone", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6030", name: "Delivery and Distribution", group: "Expenses", purpose: "Customer delivery and fulfilment", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6040", name: "Marketing and Advertising", group: "Expenses", purpose: "Promotions and advertising", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6050", name: "Bank and Payment Fees", group: "Expenses", purpose: "Bank, card, and processor charges", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6060", name: "Repairs and Maintenance", group: "Expenses", purpose: "Shop, warehouse, and equipment upkeep", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6070", name: "Depreciation Expense", group: "Expenses", purpose: "Period depreciation of equipment", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6080", name: "Bad Debt Expense", group: "Expenses", purpose: "Uncollectible customer balances", balance: "Debit", applies: "Retail · Wholesale" },
  { code: "6090", name: "Office and General Expenses", group: "Expenses", purpose: "Other day-to-day operating costs", balance: "Debit", applies: "Retail · Wholesale" },
];

export const AccountsView = ({ companyId }: { companyId: string }) => {
  const locations = useLocations(companyId);
  const storageKey = `quickaccounts:chart-of-accounts:v1:${companyId}`;
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener("quickaccounts:chart-accounts-changed", onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener("quickaccounts:chart-accounts-changed", onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(() => window.localStorage.getItem(storageKey), [storageKey]);
  const savedCustomAccounts = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const customAccounts = useMemo(() => {
    if (!savedCustomAccounts) return [];
    try {
      const parsed = JSON.parse(savedCustomAccounts) as Account[];
      return Array.isArray(parsed) ? parsed.filter((account) => account && typeof account.code === "string" && typeof account.name === "string" && groups.slice(1).includes(account.group)) : [];
    } catch {
      return [];
    }
  }, [savedCustomAccounts]);
  const outletCashAccounts = useMemo(() => {
    const outlets = locations.filter((location) => location.type === "Outlet");
    const usedSequences = customAccounts.filter((account) => account.parentCode === "1000").map((account) => Number(account.code.slice(4))).filter(Number.isFinite);
    const availableSequences = Array.from({ length: outlets.length + usedSequences.length + 1 }, (_, index) => index + 1).filter((sequence) => !usedSequences.includes(sequence));
    return outlets.map((location, index): Account => ({
      code: `1000${String(availableSequences[index]).padStart(2, "0")}`,
      name: `${location.name} Cash`,
      group: "Assets",
      purpose: `Cash drawer for ${location.name}`,
      balance: "Debit",
      applies: "Retail · Wholesale",
      parentCode: "1000",
    }));
  }, [customAccounts, locations]);
  const accountList = useMemo(() => [...accounts, ...outletCashAccounts, ...customAccounts], [customAccounts, outletCashAccounts]);
  const [group, setGroup] = useState<(typeof groups)[number]>("All accounts");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroup, setNewGroup] = useState<AccountGroup>("Assets");
  const [newParentCode, setNewParentCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newBalance, setNewBalance] = useState("Debit");
  const [formError, setFormError] = useState("");
  const filtered = useMemo(() => {
    const matches = accountList.filter((account) => {
      const matchesGroup = group === "All accounts" || account.group === group;
      const matchesSearch = `${account.code} ${account.name} ${account.purpose} ${account.applies}`.toLowerCase().includes(search.toLowerCase());
      return matchesGroup && matchesSearch;
    });
    const visible = new Map<string, Account>();
    const includeWithParents = (account: Account) => {
      visible.set(account.code, account);
      if (account.parentCode) {
        const parent = accountList.find((candidate) => candidate.code === account.parentCode);
        if (parent) includeWithParents(parent);
      }
    };
    matches.forEach(includeWithParents);
    return [...visible.values()];
  }, [accountList, group, search]);
  const counts = groups.slice(1).map((name) => ({ name, count: accountList.filter((account) => account.group === name).length }));
  const nextCodeFor = (accountGroup: AccountGroup, parentCode = "") => {
    if (parentCode) {
      const childSequences = accountList.filter((account) => account.parentCode === parentCode).map((account) => Number(account.code.slice(parentCode.length))).filter(Number.isFinite);
      const nextSequence = Math.max(0, ...childSequences) + 1;
      return `${parentCode}${String(nextSequence).padStart(2, "0")}`;
    }
    const rootCodes = accountList.filter((account) => account.group === accountGroup && !account.parentCode).map((account) => Number(account.code)).filter(Number.isFinite);
    return String(Math.max(...rootCodes) + 10);
  };
  const openAddForm = (accountGroup: AccountGroup, parentCode = "") => {
    setNewGroup(accountGroup);
    setNewParentCode(parentCode);
    setShowAddForm(true);
    setFormError("");
  };
  const addAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !newPurpose.trim()) {
      setFormError("Enter an account name and purpose.");
      return;
    }
    if (accountList.some((account) => account.group === newGroup && account.name.toLowerCase() === name.toLowerCase())) {
      setFormError("An account with this name already exists in the selected group.");
      return;
    }
    const code = nextCodeFor(newGroup, newParentCode);
    const newAccount: Account = { code, name, group: newGroup, purpose: newPurpose.trim(), balance: newBalance, applies: "Retail · Wholesale", ...(newParentCode ? { parentCode: newParentCode } : {}) };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...customAccounts, newAccount]));
      window.dispatchEvent(new Event("quickaccounts:chart-accounts-changed"));
    } catch {
      setFormError("Could not save the account in this browser. Check available storage and try again.");
      return;
    }
    setGroup(newGroup);
    setSearch("");
    setNewName("");
    setNewPurpose("");
    setNewBalance("Debit");
    setNewParentCode("");
    setFormError("");
    setShowAddForm(false);
  };
  const renderAccountRows = (accountGroup: AccountGroup, parentCode?: string, depth = 0) => filtered
    .filter((account) => account.group === accountGroup && account.parentCode === parentCode)
    .map((account) => <Fragment key={account.code}>
      <TableRow>
        <TableCell className="font-mono text-muted-foreground">{account.code}</TableCell>
        <TableCell className="font-semibold text-heading"><span style={{ paddingLeft: `${depth * 1.25}rem` }}>{depth > 0 ? "└ " : ""}{account.name}</span></TableCell>
        <TableCell className="text-muted-foreground">{account.purpose}</TableCell>
        <TableCell>{account.balance}</TableCell>
        <TableCell className="text-xs">{account.applies}</TableCell>
        <TableCell><Badge tone="success">Active</Badge></TableCell>
        <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Add subaccount under ${account.name}`} title={`Add subaccount under ${account.name}`} onClick={() => openAddForm(accountGroup, account.code)}><Plus className="size-4" /></Button></TableCell>
      </TableRow>
      {renderAccountRows(accountGroup, account.code, depth + 1)}
    </Fragment>);

  return <div className="workspace-enter space-y-5">
    <WorkspaceHeader eyebrow="Accounting · Account structure" title="Chart of Accounts" description="A practical starter chart for a retail and wholesale business. Use separate sales and cost accounts to compare each channel." />
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{counts.map(({ name, count }) => <Card key={name}><CardHeader className="p-4"><CardDescription>{name}</CardDescription><CardTitle className="text-2xl">{count}</CardTitle></CardHeader></Card>)}</div>
    <Card>
      <CardHeader className="gap-4 border-b"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Standard accounts</CardTitle><CardDescription>{filtered.length} accounts shown · select a group to view its accounts</CardDescription></div><Button onClick={() => openAddForm(group === "All accounts" ? "Assets" : group)}><Plus className="size-4" />Add account</Button></div><div className="flex flex-col gap-3 sm:flex-row"><div className="relative sm:w-72"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search accounts" className="pl-9" placeholder="Search name, code, or use" value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="sr-only" htmlFor="account-group">Account group</label><select id="account-group" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={group} onChange={(event) => setGroup(event.target.value as (typeof groups)[number])}>{groups.map((item) => <option key={item}>{item}</option>)}</select></div></CardHeader>
      {showAddForm ? <CardContent className="border-b bg-muted/20"><form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={addAccount}>
        {newParentCode ? <div className="space-y-1.5 text-sm font-medium"><span className="block">Parent account</span><div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">{accountList.find((account) => account.code === newParentCode)?.name ?? "Selected account"}</div></div> : <label className="space-y-1.5 text-sm font-medium">Group<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newGroup} onChange={(event) => setNewGroup(event.target.value as AccountGroup)}>{groups.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>}
        <label className="space-y-1.5 text-sm font-medium">Account name<Input autoFocus required maxLength={100} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Store Supplies" /></label>
        <label className="space-y-1.5 text-sm font-medium">Purpose<Input required maxLength={160} value={newPurpose} onChange={(event) => setNewPurpose(event.target.value)} placeholder="What is this account used for?" /></label>
        <label className="space-y-1.5 text-sm font-medium">Normal balance<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newBalance} onChange={(event) => setNewBalance(event.target.value)}><option>Debit</option><option>Credit</option></select></label>
        <div className="flex flex-col justify-end gap-1.5"><span className="text-xs text-muted-foreground">Generated account code</span><div className="flex h-10 items-center rounded-md border bg-background px-3 font-mono text-sm">{nextCodeFor(newGroup, newParentCode)}</div><Button type="submit" className="w-full">Save account</Button></div>
        {formError ? <p role="alert" className="text-sm text-destructive sm:col-span-2 xl:col-span-5">{formError}</p> : null}
      </form></CardContent> : null}
      <CardContent className="space-y-3 p-4 sm:p-5">{accountGroups.filter((accountGroup) => filtered.some((account) => account.group === accountGroup)).map((accountGroup) => <section key={accountGroup} className="overflow-hidden rounded-lg border border-border/80"><div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3"><div className="flex items-center gap-3"><h2 className="font-semibold text-heading">{accountGroup}</h2><Badge tone="neutral">{filtered.filter((account) => account.group === accountGroup).length}</Badge></div><Button type="button" variant="outline" size="sm" onClick={() => openAddForm(accountGroup)}><Plus className="size-4" />Add to {accountGroup}</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Purpose</TableHead><TableHead>Normal balance</TableHead><TableHead>Business use</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Add subaccount</TableHead></TableRow></TableHeader><TableBody>{renderAccountRows(accountGroup)}</TableBody></Table></div></section>)}{filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No accounts match this search.</p> : null}</CardContent>
    </Card>
    <p className="text-xs leading-5 text-muted-foreground">This is a general starting point, not a jurisdiction-specific accounting or tax template. Confirm tax, reporting, and opening balance accounts with your accountant before posting live transactions.</p>
  </div>;
};
