"use client";

import { useSyncExternalStore } from "react";

export type PaymentMethod = "cash" | "bank" | "credit";
export type ReceivingStatus = "Awaiting shipment" | "Shipped" | "Received";

export interface PurchaseItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unitCost: number;
  serials: string[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierInvoice: string;
  supplierInvoiceDate?: string;
  date: string;
  expectedDate: string;
  destination: string;
  paymentMethod: PaymentMethod;
  bankAccount?: string;
  notes: string;
  items: PurchaseItem[];
  totalCost: number;
  receivingStatus: ReceivingStatus;
}

export const purchaseCatalog = [
  { id: "p1", name: "Samsung Galaxy A55 5G (8/256GB)", sku: "SAM-A55-BLK", unitCost: 101000 },
  { id: "p2", name: "Redmi Note 13 Pro (12/512GB)", sku: "XIA-RN13-BLU", unitCost: 69000 },
  { id: "p3", name: "Anker 65W GaN Fast Charger", sku: "ANK-65W-WHT", unitCost: 5300 },
  { id: "p4", name: "Apple 20W USB-C Power Adapter", sku: "APL-20W-ORIG", unitCost: 3900 },
  { id: "p5", name: "Baseus Bowie H1 ANC Wireless Headphones", sku: "BAS-H1-GRY", unitCost: 11000 },
] as const;

export const suppliers = ["Mumtaz Distributors", "Apex Importers", "TechWorld Distribution", "Global Accessories Co."] as const;

const fixtureOrders: PurchaseOrder[] = [
  { id: "po-382", poNumber: "PO-0382", supplier: suppliers[0], supplierInvoice: "MD-INV-214", date: "08 Oct 2026", expectedDate: "09 Oct 2026", destination: "Main Warehouse", paymentMethod: "bank", bankAccount: "HBL – Main Account (****4821)", notes: "Check all cartons on arrival.", items: [{ id: "p1", name: purchaseCatalog[0].name, sku: purchaseCatalog[0].sku, qty: 14, unitCost: 101000, serials: Array(14).fill("") }], totalCost: 1414000, receivingStatus: "Shipped" },
  { id: "po-381", poNumber: "PO-0381", supplier: suppliers[1], supplierInvoice: "AP-7721", date: "06 Oct 2026", expectedDate: "07 Oct 2026", destination: "Main Outlet", paymentMethod: "credit", notes: "Direct-to-store delivery.", items: [{ id: "p2", name: purchaseCatalog[1].name, sku: purchaseCatalog[1].sku, qty: 8, unitCost: 69000, serials: Array(8).fill("") }], totalCost: 552000, receivingStatus: "Shipped" },
  { id: "po-380", poNumber: "PO-0380", supplier: suppliers[2], supplierInvoice: "TW-0918", date: "03 Oct 2026", expectedDate: "05 Oct 2026", destination: "Main Warehouse", paymentMethod: "cash", notes: "", items: [{ id: "p3", name: purchaseCatalog[2].name, sku: purchaseCatalog[2].sku, qty: 50, unitCost: 5300, serials: Array.from({ length: 50 }, (_, index) => `ANK-26-${String(index + 1).padStart(5, "0")}`) }], totalCost: 265000, receivingStatus: "Received" },
  { id: "po-379", poNumber: "PO-0379", supplier: suppliers[3], supplierInvoice: "", date: "01 Oct 2026", expectedDate: "04 Oct 2026", destination: "Main Outlet", paymentMethod: "credit", notes: "", items: [{ id: "p4", name: purchaseCatalog[3].name, sku: purchaseCatalog[3].sku, qty: 20, unitCost: 3900, serials: Array(20).fill("") }], totalCost: 78000, receivingStatus: "Awaiting shipment" },
];

const cache = new Map<string, { raw: string | null; orders: PurchaseOrder[] }>();
const eventName = "purchase-orders-updated";
const storageKey = (companyId: string) => `quickaccounts:purchases:v1:${companyId}`;

export function readPurchaseOrders(companyId: string): PurchaseOrder[] {
  if (typeof window === "undefined") return fixtureOrders;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.orders;
  let orders = fixtureOrders;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) orders = parsed as PurchaseOrder[];
    } catch { /* Keep demo records if local data is malformed. */ }
  }
  cache.set(companyId, { raw, orders });
  return orders;
}

export function writePurchaseOrders(companyId: string, orders: PurchaseOrder[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(orders));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function usePurchaseOrders(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readPurchaseOrders(companyId),
    () => fixtureOrders,
  );
}

export function nextPurchaseNumber(orders: readonly PurchaseOrder[]) {
  const highest = orders.reduce((max, order) => Math.max(max, Number(order.poNumber.replace(/\D/g, "")) || 0), 382);
  return `PO-${String(highest + 1).padStart(4, "0")}`;
}

export function allSerialsCaptured(order: PurchaseOrder) {
  const serials = order.items.flatMap((item) => item.serials.map((value) => value.trim()));
  return order.items.length > 0 && order.items.every((item) => item.serials.length === item.qty) &&
    serials.every(Boolean) && new Set(serials).size === serials.length;
}
