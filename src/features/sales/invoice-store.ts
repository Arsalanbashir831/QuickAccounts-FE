"use client";

import { useSyncExternalStore } from "react";
import type { PrintableInvoice } from "./components/invoice-print-template";

export type ShipmentStatus = "Preparing" | "Shipped";

export interface InvoiceRecord extends PrintableInvoice {
  id: string;
  shipmentStatus?: ShipmentStatus;
  shippedAt?: string;
}

export const shipmentStatusFor = (invoice: InvoiceRecord): ShipmentStatus => invoice.shipmentStatus ?? "Preparing";

const fixtureInvoices: InvoiceRecord[] = [
  {
    id: "inv-1", reference: "DOT-1048", date: "08 Oct 2026", customer: "Apex Mobiles", outlet: "Main Outlet",
    total: 184500, paid: 184500, balance: 0, status: "Paid", shipmentStatus: "Shipped", shippedAt: "08 Oct 2026", paymentMethod: "bank", bankAccount: "HBL – Main Account (****4821)",
    items: [{ name: "Samsung Galaxy A55 5G", qty: 1, price: 114500, serial: "358291048291048" }, { name: "Redmi Note 13 Pro", qty: 1, price: 70000, serial: "861928374659201" }],
  },
  {
    id: "inv-2", reference: "DOT-1047", date: "08 Oct 2026", customer: "Walk-in Customer", outlet: "Main Outlet",
    total: 42000, paid: 42000, balance: 0, status: "Paid", shipmentStatus: "Shipped", shippedAt: "08 Oct 2026", paymentMethod: "cash",
    items: [{ name: "Anker 65W GaN Fast Charger", qty: 2, price: 6800 }, { name: "Baseus Bowie H1 Headphones", qty: 2, price: 14200, serial: "BS-H1-9921" }],
  },
  {
    id: "inv-3", reference: "DOT-1046", date: "07 Oct 2026", customer: "Hamza Electronics", outlet: "North Outlet",
    total: 96750, paid: 50000, balance: 46750, status: "Partial", shipmentStatus: "Preparing", paymentMethod: "bank", bankAccount: "Meezan Bank – Business (****3305)",
    items: [{ name: "Redmi Note 13 Pro", qty: 1, price: 78900, serial: "861928374659202" }, { name: "Apple 20W Power Adapter", qty: 3, price: 5950 }],
  },
  {
    id: "inv-4", reference: "DOT-1045", date: "05 Oct 2026", customer: "City Devices", outlet: "Main Outlet",
    total: 28900, paid: 0, balance: 28900, status: "Overdue", shipmentStatus: "Preparing", paymentMethod: "credit",
    items: [{ name: "Anker 65W GaN Fast Charger", qty: 3, price: 6800 }, { name: "Apple 20W Adapter", qty: 1, price: 8500 }],
  },
];

const storageKey = (companyId: string) => `quickaccounts:invoices:v1:${companyId}`;
const eventName = "sales-invoices-updated";
const cache = new Map<string, { raw: string | null; invoices: InvoiceRecord[] }>();

export function readInvoices(companyId: string): InvoiceRecord[] {
  if (typeof window === "undefined") return fixtureInvoices;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.invoices;
  let invoices = fixtureInvoices;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) invoices = parsed as InvoiceRecord[];
    } catch { /* Keep demo records if browser data is malformed. */ }
  }
  cache.set(companyId, { raw, invoices });
  return invoices;
}

export function writeInvoices(companyId: string, invoices: InvoiceRecord[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(invoices));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function useInvoices(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readInvoices(companyId),
    () => fixtureInvoices,
  );
}
