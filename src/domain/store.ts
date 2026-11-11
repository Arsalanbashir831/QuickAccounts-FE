"use client";

/**
 * Browser-only persistence for the demo. Each collection is kept in
 * localStorage per company and falls back to generated demo data until the
 * first write. Swap these functions for API calls when the backend is ready;
 * screens only use `useBooks` and the `record*` / `save*` commands.
 */
import { useMemo, useSyncExternalStore } from "react";
import { fixtureAccounts, fixtureParties, fixtureStyles } from "./fixtures";
import type { Books } from "./ledger";
import { demoSeed } from "./seed";
import type { Expense, MoneyAccount, MoneyEntry, Party, Purchase, Sale, StockAdjustment, Style } from "./types";

const STORAGE_VERSION = "v2";
const CHANGE_EVENT = "quickaccounts:books-changed";

interface Collection<T> {
  key: string;
  read: (companyId: string) => T[];
  write: (companyId: string, items: T[]) => void;
  fixtures: () => T[];
}

const caches = new Map<string, { raw: string | null; items: unknown[] }>();

function collection<T>(name: string, fixtures: () => T[]): Collection<T> {
  const storageKey = (companyId: string) => `quickaccounts:${STORAGE_VERSION}:${name}:${companyId}`;
  return {
    key: name,
    fixtures,
    read(companyId) {
      if (typeof window === "undefined") return fixtures();
      const key = storageKey(companyId);
      let raw: string | null = null;
      try { raw = window.localStorage.getItem(key); } catch { /* storage blocked */ }
      const cached = caches.get(key);
      if (cached && cached.raw === raw) return cached.items as T[];
      let items = fixtures();
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) items = parsed as T[];
        } catch { /* keep demo data if storage is malformed */ }
      }
      caches.set(key, { raw, items });
      return items;
    },
    write(companyId, items) {
      const key = storageKey(companyId);
      window.localStorage.setItem(key, JSON.stringify(items));
      caches.delete(key);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
  };
}

export const stores = {
  styles: collection<Style>("styles", () => fixtureStyles),
  parties: collection<Party>("parties", () => fixtureParties),
  accounts: collection<MoneyAccount>("accounts", () => fixtureAccounts),
  sales: collection<Sale>("sales", () => demoSeed().sales),
  purchases: collection<Purchase>("purchases", () => demoSeed().purchases),
  adjustments: collection<StockAdjustment>("adjustments", () => demoSeed().adjustments),
  expenses: collection<Expense>("expenses", () => demoSeed().expenses),
  moneyEntries: collection<MoneyEntry>("money-entries", () => demoSeed().moneyEntries),
};

type StoreName = keyof typeof stores;

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key?.startsWith(`quickaccounts:${STORAGE_VERSION}:`)) onChange(); };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCollection<K extends StoreName>(companyId: string, name: K) {
  const store = stores[name] as unknown as Collection<unknown>;
  return useSyncExternalStore(subscribe, () => store.read(companyId), () => store.fixtures()) as ReturnType<(typeof stores)[K]["read"]>;
}

/** Every document the business has, for the ledger functions. */
export function useBooks(companyId: string): Books {
  const styles = useCollection(companyId, "styles");
  const parties = useCollection(companyId, "parties");
  const accounts = useCollection(companyId, "accounts");
  const sales = useCollection(companyId, "sales");
  const purchases = useCollection(companyId, "purchases");
  const adjustments = useCollection(companyId, "adjustments");
  const expenses = useCollection(companyId, "expenses");
  const moneyEntries = useCollection(companyId, "moneyEntries");
  return useMemo(
    () => ({ styles, parties, accounts, sales, purchases, adjustments, expenses, moneyEntries }),
    [styles, parties, accounts, sales, purchases, adjustments, expenses, moneyEntries],
  );
}

export function readBooks(companyId: string): Books {
  return {
    styles: stores.styles.read(companyId),
    parties: stores.parties.read(companyId),
    accounts: stores.accounts.read(companyId),
    sales: stores.sales.read(companyId),
    purchases: stores.purchases.read(companyId),
    adjustments: stores.adjustments.read(companyId),
    expenses: stores.expenses.read(companyId),
    moneyEntries: stores.moneyEntries.read(companyId),
  };
}

// ---------------------------------------------------------------- commands

const prepend = <T,>(name: StoreName, companyId: string, item: T) => {
  const store = stores[name] as unknown as Collection<T>;
  store.write(companyId, [item, ...store.read(companyId)]);
};

const upsert = <T extends { id: string }>(name: StoreName, companyId: string, item: T) => {
  const store = stores[name] as unknown as Collection<T>;
  const items = store.read(companyId);
  store.write(companyId, items.some((entry) => entry.id === item.id) ? items.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...items]);
};

export const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

export const recordSale = (companyId: string, sale: Sale) => prepend("sales", companyId, sale);
export const recordAdjustments = (companyId: string, items: StockAdjustment[]) =>
  stores.adjustments.write(companyId, [...items, ...stores.adjustments.read(companyId)]);
export const recordExpense = (companyId: string, expense: Expense) => prepend("expenses", companyId, expense);
export const recordMoneyEntry = (companyId: string, entry: MoneyEntry) => prepend("moneyEntries", companyId, entry);
export const savePurchase = (companyId: string, purchase: Purchase) => upsert("purchases", companyId, purchase);
export const saveStyle = (companyId: string, style: Style) => upsert("styles", companyId, style);
export const saveParty = (companyId: string, party: Party) => upsert("parties", companyId, party);
export const saveAccount = (companyId: string, account: MoneyAccount) => upsert("accounts", companyId, account);

/** Removes everything saved in this browser for the company and returns to demo data. */
export function resetDemoData(companyId: string) {
  for (const name of Object.keys(stores) as StoreName[]) {
    window.localStorage.removeItem(`quickaccounts:${STORAGE_VERSION}:${stores[name].key}:${companyId}`);
  }
  caches.clear();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Starts the company with an empty catalog and no history (keeps money accounts). */
export function startEmptyBooks(companyId: string) {
  stores.styles.write(companyId, []);
  stores.parties.write(companyId, []);
  stores.accounts.write(companyId, fixtureAccounts.map((account) => ({ ...account, openingBalance: 0 })));
  stores.sales.write(companyId, []);
  stores.purchases.write(companyId, []);
  stores.adjustments.write(companyId, []);
  stores.expenses.write(companyId, []);
  stores.moneyEntries.write(companyId, []);
}
