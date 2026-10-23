"use client";

import { useSyncExternalStore } from "react";

export type CashAccountKind = "Bank" | "Cash";
export type CashTransactionType = "Deposit" | "Withdrawal" | "Transfer in" | "Transfer out";

export interface CashAccount {
  id: string;
  name: string;
  kind: CashAccountKind;
  accountCode: string;
  bankName?: string;
  locationName?: string;
  openingBalance: number;
}

export interface CashTransaction {
  id: string;
  accountId: string;
  date: string;
  type: CashTransactionType;
  amount: number;
  reference: string;
  description: string;
  counterpartAccountId?: string;
  notes?: string;
}

export const cashAccounts: CashAccount[] = [
  { id: "acct-main-bank", name: "Main Bank Account", kind: "Bank", accountCode: "1010", bankName: "Meezan Bank · Current", openingBalance: 48500 },
  { id: "acct-settlement", name: "Card & Settlement Account", kind: "Bank", accountCode: "1020", bankName: "HBL · Collections", openingBalance: 12400 },
  { id: "acct-main-outlet", name: "Main Outlet Cash", kind: "Cash", accountCode: "100001", locationName: "Main Outlet", openingBalance: 6250 },
  { id: "acct-north-outlet", name: "North Outlet Cash", kind: "Cash", accountCode: "100002", locationName: "North Outlet", openingBalance: 3150 },
];

const demoTransactions: CashTransaction[] = [
  { id: "ct-demo-1", accountId: "acct-main-outlet", date: "2026-10-22", type: "Deposit", amount: 1840, reference: "CT-1041", description: "Counter sales collection", notes: "End-of-day cash count." },
  { id: "ct-demo-2", accountId: "acct-main-bank", date: "2026-10-22", type: "Deposit", amount: 4820.5, reference: "CT-1040", description: "Card settlements for the week" },
  { id: "ct-demo-3", accountId: "acct-north-outlet", date: "2026-10-20", type: "Withdrawal", amount: 600, reference: "CT-1039", description: "Shop cleaning and supplies" },
  { id: "ct-demo-4", accountId: "acct-main-bank", date: "2026-10-18", type: "Withdrawal", amount: 12000, reference: "CT-1038", description: "Supplier payment · Mumtaz Distributors" },
  { id: "ct-demo-5", accountId: "acct-main-bank", date: "2026-10-18", type: "Transfer out", amount: 2500, reference: "CT-1037", description: "Cash top-up for Main Outlet", counterpartAccountId: "acct-main-outlet" },
  { id: "ct-demo-6", accountId: "acct-main-outlet", date: "2026-10-18", type: "Transfer in", amount: 2500, reference: "CT-1037", description: "Cash top-up from Main Bank Account", counterpartAccountId: "acct-main-bank" },
  { id: "ct-demo-7", accountId: "acct-settlement", date: "2026-10-15", type: "Withdrawal", amount: 900, reference: "CT-1036", description: "Payment gateway settlement fees" },
  { id: "ct-demo-8", accountId: "acct-main-bank", date: "2026-10-12", type: "Withdrawal", amount: 3500, reference: "CT-1035", description: "Shop rent · October" },
  { id: "ct-demo-9", accountId: "acct-north-outlet", date: "2026-10-09", type: "Deposit", amount: 1120, reference: "CT-1034", description: "Counter sales collection" },
  { id: "ct-demo-10", accountId: "acct-main-bank", date: "2026-10-05", type: "Deposit", amount: 9200, reference: "CT-1033", description: "Owner capital injection" },
  { id: "ct-demo-11", accountId: "acct-main-outlet", date: "2026-10-01", type: "Withdrawal", amount: 450, reference: "CT-1032", description: "Delivery fuel and transport" },
  { id: "ct-demo-12", accountId: "acct-settlement", date: "2026-09-28", type: "Deposit", amount: 6400, reference: "CT-1031", description: "Online store settlements" },
];

const key = (companyId: string) => `quickaccounts:cash-transactions:v1:${companyId}`;
const eventName = "cash-transactions-updated";
const cache = new Map<string, { raw: string | null; transactions: CashTransaction[] }>();

export function readCashTransactions(companyId: string): CashTransaction[] {
  if (typeof window === "undefined") return demoTransactions;
  const raw = window.localStorage.getItem(key(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.transactions;
  let transactions = demoTransactions;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) transactions = parsed as CashTransaction[];
    } catch { /* Keep the demo ledger when saved browser data is malformed. */ }
  }
  cache.set(companyId, { raw, transactions });
  return transactions;
}

function writeCashTransactions(companyId: string, transactions: CashTransaction[]) {
  window.localStorage.setItem(key(companyId), JSON.stringify(transactions));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function nextCashReference(transactions: CashTransaction[]): string {
  const highest = transactions.reduce((max, transaction) => {
    const match = transaction.reference.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1041);
  return `CT-${highest + 1}`;
}

export function accountBalance(accountId: string, transactions: CashTransaction[]): number {
  const account = cashAccounts.find((item) => item.id === accountId);
  if (!account) return 0;
  return transactions
    .filter((transaction) => transaction.accountId === accountId)
    .reduce((total, transaction) => transaction.type === "Deposit" || transaction.type === "Transfer in" ? total + transaction.amount : total - transaction.amount, account.openingBalance);
}

export function addCashTransaction(
  companyId: string,
  input: { accountId: string; date: string; type: "Deposit" | "Withdrawal"; amount: number; description: string; notes?: string },
): CashTransaction {
  const current = readCashTransactions(companyId);
  const transaction: CashTransaction = {
    id: `ct-${crypto.randomUUID()}`,
    reference: nextCashReference(current),
    accountId: input.accountId,
    date: input.date,
    type: input.type,
    amount: input.amount,
    description: input.description.trim(),
    notes: input.notes?.trim() || undefined,
  };
  writeCashTransactions(companyId, [transaction, ...current]);
  return transaction;
}

export function addCashTransfer(
  companyId: string,
  input: { fromAccountId: string; toAccountId: string; date: string; amount: number; description: string; notes?: string },
): { reference: string } {
  const current = readCashTransactions(companyId);
  const reference = nextCashReference(current);
  const from = cashAccounts.find((account) => account.id === input.fromAccountId);
  const to = cashAccounts.find((account) => account.id === input.toAccountId);
  const out: CashTransaction = {
    id: `ct-${crypto.randomUUID()}`,
    reference,
    accountId: input.fromAccountId,
    date: input.date,
    type: "Transfer out",
    amount: input.amount,
    description: input.description.trim() || `Transfer to ${to?.name ?? "another account"}`,
    counterpartAccountId: input.toAccountId,
    notes: input.notes?.trim() || undefined,
  };
  const incoming: CashTransaction = {
    id: `ct-${crypto.randomUUID()}`,
    reference,
    accountId: input.toAccountId,
    date: input.date,
    type: "Transfer in",
    amount: input.amount,
    description: input.description.trim() || `Transfer from ${from?.name ?? "another account"}`,
    counterpartAccountId: input.fromAccountId,
    notes: input.notes?.trim() || undefined,
  };
  writeCashTransactions(companyId, [out, incoming, ...current]);
  return { reference };
}

export function useCashTransactions(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === key(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readCashTransactions(companyId),
    () => demoTransactions,
  );
}
