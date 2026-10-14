"use client";

import { useSyncExternalStore } from "react";

export type TransferStatus = "Preparing" | "Shipped" | "Received" | "Requested" | "Dispatched" | "In Transit" | "Discrepancy";

export const TRANSFER_STATUSES: TransferStatus[] = ["Preparing", "Shipped", "Received"];

export function transferStatusTone(status: TransferStatus | string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "Preparing":
    case "Requested":
      return "info";
    case "Shipped":
    case "Dispatched":
    case "In Transit":
      return "warning";
    case "Received":
      return "success";
    case "Discrepancy":
      return "danger";
    default:
      return "neutral";
  }
}

export interface StockTransfer {
  id: string;
  transferRef: string;
  fromSite: string;
  toSite: string;
  date: string;
  productSku: string;
  productName: string;
  itemsCount: number;
  serials: string[];
  status: TransferStatus;
}

const fixtureTransfers: StockTransfer[] = [
  { id: "tr-1", transferRef: "TR-0199", fromSite: "Main Warehouse", toSite: "North Outlet", date: "09 Oct 2026", productSku: "SAM-A55-BLK", productName: "Samsung Galaxy A55 5G (8/256GB)", itemsCount: 2, serials: ["SAM-TR-0199-001", "SAM-TR-0199-002"], status: "Preparing" },
  { id: "tr-2", transferRef: "TR-0198", fromSite: "Main Warehouse", toSite: "North Outlet", date: "08 Oct 2026", productSku: "ANK-65W-WHT", productName: "Anker 65W GaN Fast Charger", itemsCount: 15, serials: Array.from({ length: 15 }, (_, index) => `ANK-TR-0198-${String(index + 1).padStart(3, "0")}`), status: "Shipped" },
  { id: "tr-3", transferRef: "TR-0197", fromSite: "Main Warehouse", toSite: "Main Outlet", date: "06 Oct 2026", productSku: "APL-20W-ORIG", productName: "Apple 20W USB-C Power Adapter", itemsCount: 20, serials: Array.from({ length: 20 }, (_, index) => `APL-TR-0197-${String(index + 1).padStart(3, "0")}`), status: "Received" },
  { id: "tr-4", transferRef: "TR-0196", fromSite: "Main Outlet", toSite: "Main Warehouse (Dead Stock)", date: "04 Oct 2026", productSku: "BAS-H1-GRY", productName: "Baseus Bowie H1 ANC Headphones", itemsCount: 2, serials: ["BS-H1-9920", "BS-H1-9921"], status: "Received" },
];

const storageKey = (companyId: string) => `quickaccounts:transfers:v1:${companyId}`;
const eventName = "stock-transfers-updated";
const cache = new Map<string, { raw: string | null; transfers: StockTransfer[] }>();

export function readTransfers(companyId: string): StockTransfer[] {
  if (typeof window === "undefined") return fixtureTransfers;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.transfers;
  let transfers = fixtureTransfers;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) transfers = parsed as StockTransfer[];
    } catch { /* Keep demo transfers if browser data is malformed. */ }
  }
  cache.set(companyId, { raw, transfers });
  return transfers;
}

export function writeTransfers(companyId: string, transfers: StockTransfer[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(transfers));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function updateTransferStatus(companyId: string, transferId: string, status: TransferStatus) {
  const current = readTransfers(companyId);
  const updated = current.map((item) => (item.id === transferId ? { ...item, status } : item));
  writeTransfers(companyId, updated);
}

export function useTransfers(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readTransfers(companyId),
    () => fixtureTransfers,
  );
}

export function nextTransferReference(transfers: readonly StockTransfer[]) {
  const highest = transfers.reduce((max, transfer) => Math.max(max, Number(transfer.transferRef.replace(/\D/g, "")) || 0), 199);
  return `TR-${String(highest + 1).padStart(4, "0")}`;
}
