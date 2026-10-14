"use client";

import { useSyncExternalStore } from "react";
import type { InvoiceRecord } from "@/features/sales/invoice-store";
import type { PurchaseOrder } from "@/features/purchases/purchase-store";
import type { StockTransfer } from "./transfer-store";

export type ActivityType = "Sale" | "Purchase" | "Transfer" | "Exchange" | "Return" | "Adjustment";
export type MovementDirection = "IN" | "OUT" | "TRANSFER";

export interface StockActivity {
  id: string;
  type: ActivityType;
  direction: MovementDirection;
  reference: string;
  referenceHref?: string;
  date: string;
  timestamp: number;
  productName: string;
  productSku: string;
  quantity: number;
  location: string;
  fromLocation?: string;
  toLocation?: string;
  party: string;
  partyRole: "Customer" | "Supplier" | "Internal" | "Auditor";
  serials: string[];
  status: string;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentRef: string;
  date: string;
  productSku: string;
  productName: string;
  quantity: number; // positive = added/found, negative = write-off/damaged
  reason: "Physical Count Discrepancy" | "Damaged / Faulty Write-off" | "Initial Stock Intake" | "Internal Store Use" | "Found Inventory";
  location: string;
  serials: string[];
  notes?: string;
  performedBy: string;
}

const fixtureAdjustments: StockAdjustment[] = [
  {
    id: "adj-1",
    adjustmentRef: "ADJ-0042",
    date: "01 Oct 2026",
    productSku: "ANK-65W-WHT",
    productName: "Anker 65W GaN Fast Charger",
    quantity: -2,
    reason: "Damaged / Faulty Write-off",
    location: "Main Warehouse",
    serials: [],
    notes: "Audit session CNT-107 write-off: packaging crushed during offload.",
    performedBy: "Staff Operator (Warehouse Auditor)",
  },
  {
    id: "adj-2",
    adjustmentRef: "ADJ-0041",
    date: "28 Sep 2026",
    productSku: "SAM-A55-BLK",
    productName: "Samsung Galaxy A55 5G (8/256GB)",
    quantity: 5,
    reason: "Initial Stock Intake",
    location: "Main Outlet",
    serials: ["SAM-INIT-001", "SAM-INIT-002", "SAM-INIT-003", "SAM-INIT-004", "SAM-INIT-005"],
    notes: "Opening balance reconciliation for POS launch.",
    performedBy: "Demo Owner",
  },
];

const storageKey = (companyId: string) => `quickaccounts:stock-adjustments:v1:${companyId}`;
const eventName = "stock-adjustments-updated";
const cache = new Map<string, { raw: string | null; adjustments: StockAdjustment[] }>();

export function readAdjustments(companyId: string): StockAdjustment[] {
  if (typeof window === "undefined") return fixtureAdjustments;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.adjustments;
  let adjustments = fixtureAdjustments;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) adjustments = parsed as StockAdjustment[];
    } catch { /* Preserve defaults */ }
  }
  cache.set(companyId, { raw, adjustments });
  return adjustments;
}

export function writeAdjustments(companyId: string, adjustments: StockAdjustment[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(adjustments));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function useAdjustments(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readAdjustments(companyId),
    () => fixtureAdjustments,
  );
}

export function nextAdjustmentReference(adjustments: readonly StockAdjustment[]) {
  const highest = adjustments.reduce((max, adj) => Math.max(max, Number(adj.adjustmentRef.replace(/\D/g, "")) || 0), 42);
  return `ADJ-${String(highest + 1).padStart(4, "0")}`;
}

const legacySkuMap: Record<string, string> = {
  "Samsung Galaxy A55 5G": "SAM-A55-BLK",
  "Redmi Note 13 Pro": "XIA-RN13-BLU",
  "Anker 65W GaN Fast Charger": "ANK-65W-WHT",
  "Apple 20W Power Adapter": "APL-20W-ORIG",
  "Apple 20W Adapter": "APL-20W-ORIG",
  "Apple 20W USB-C Power Adapter": "APL-20W-ORIG",
  "Baseus Bowie H1 Headphones": "BAS-H1-GRY",
  "Baseus Bowie H1 ANC Wireless Headphones": "BAS-H1-GRY",
};

function parseDateScore(dateStr: string): number {
  try {
    const parsed = new Date(dateStr).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  } catch { /* ignore */ }
  const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(match[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      return new Date(Number(match[3]), month, Number(match[1])).getTime();
    }
  }
  return 0;
}

export function buildStockActivities(
  companyId: string,
  invoices: InvoiceRecord[],
  purchaseOrders: PurchaseOrder[],
  transfers: StockTransfer[],
  adjustments: StockAdjustment[],
): StockActivity[] {
  const activities: StockActivity[] = [];

  // 1. Sales (Invoices)
  for (const invoice of invoices) {
    for (const [idx, item] of invoice.items.entries()) {
      const sku = item.sku ?? legacySkuMap[item.name] ?? "SKU-GEN";
      const serials = item.serials ?? (item.serial ? [item.serial] : []);
      activities.push({
        id: `sale-${invoice.id}-${idx}`,
        type: "Sale",
        direction: "OUT",
        reference: invoice.reference,
        referenceHref: `/c/${encodeURIComponent(companyId)}/sales/${encodeURIComponent(invoice.id)}`,
        date: invoice.date,
        timestamp: parseDateScore(invoice.date) + 3600000,
        productName: item.name,
        productSku: sku,
        quantity: item.qty,
        location: invoice.outlet,
        party: invoice.customer,
        partyRole: "Customer",
        serials,
        status: invoice.shipmentStatus ?? "Shipped",
        notes: `Customer sale: billed via invoice ${invoice.reference} (${invoice.status}).`,
      });
    }
  }

  // 2. Purchases (Purchase Orders)
  for (const order of purchaseOrders) {
    for (const [idx, item] of order.items.entries()) {
      const serials = item.serials.filter((s) => Boolean(s.trim()));
      activities.push({
        id: `po-${order.id}-${idx}`,
        type: "Purchase",
        direction: "IN",
        reference: order.poNumber,
        referenceHref: `/c/${encodeURIComponent(companyId)}/purchases/${encodeURIComponent(order.id)}`,
        date: order.date,
        timestamp: parseDateScore(order.date) + 1800000,
        productName: item.name,
        productSku: item.sku,
        quantity: item.qty,
        location: order.destination,
        party: order.supplier,
        partyRole: "Supplier",
        serials,
        status: order.receivingStatus,
        notes: `Procured from ${order.supplier}${order.supplierInvoice ? ` · Vendor inv: ${order.supplierInvoice}` : ""}.`,
      });
    }
  }

  // 3. Inter-Site Stock Transfers
  for (const transfer of transfers) {
    activities.push({
      id: `transfer-${transfer.id}`,
      type: "Transfer",
      direction: "TRANSFER",
      reference: transfer.transferRef,
      referenceHref: `/c/${encodeURIComponent(companyId)}/stock/transfers/${encodeURIComponent(transfer.id)}`,
      date: transfer.date,
      timestamp: parseDateScore(transfer.date) + 2400000,
      productName: transfer.productName,
      productSku: transfer.productSku,
      quantity: transfer.itemsCount,
      location: `${transfer.fromSite} → ${transfer.toSite}`,
      fromLocation: transfer.fromSite,
      toLocation: transfer.toSite,
      party: `Internal (${transfer.fromSite} to ${transfer.toSite})`,
      partyRole: "Internal",
      serials: transfer.serials,
      status: transfer.status,
      notes: `Inter-site movement: ${transfer.itemsCount} units routed from ${transfer.fromSite} to ${transfer.toSite}.`,
    });
  }

  // 4. Exchanges & Warranty Returns (RMA)
  activities.push(
    {
      id: "rma-case-1-replacement",
      type: "Exchange",
      direction: "OUT",
      reference: "RMA-0082",
      referenceHref: `/c/${encodeURIComponent(companyId)}/returns?view=customers`,
      date: "08 Oct 2026",
      timestamp: parseDateScore("08 Oct 2026") + 2800000,
      productName: "Samsung Galaxy A55 5G (8/256GB)",
      productSku: "SAM-A55-BLK",
      quantity: 1,
      location: "Main Outlet",
      party: "Apex Mobiles",
      partyRole: "Customer",
      serials: ["358291048291049"],
      status: "Replacement Issued",
      notes: "Warranty exchange: brand new unit dispatched to customer after approved display claim.",
    },
    {
      id: "rma-case-1-intake",
      type: "Return",
      direction: "IN",
      reference: "RMA-0082",
      referenceHref: `/c/${encodeURIComponent(companyId)}/returns?view=customers`,
      date: "08 Oct 2026",
      timestamp: parseDateScore("08 Oct 2026") + 2700000,
      productName: "Samsung Galaxy A55 5G (8/256GB)",
      productSku: "SAM-A55-BLK",
      quantity: 1,
      location: "Main Outlet",
      party: "Apex Mobiles",
      partyRole: "Customer",
      serials: ["358291048291048"],
      status: "Defective Received",
      notes: "Customer defective intake: display touch failure, returned from invoice DOT-1048.",
    },
    {
      id: "rma-case-2-intake",
      type: "Return",
      direction: "IN",
      reference: "RMA-0081",
      referenceHref: `/c/${encodeURIComponent(companyId)}/returns?view=customers`,
      date: "07 Oct 2026",
      timestamp: parseDateScore("07 Oct 2026") + 2500000,
      productName: "Baseus Bowie H1 ANC Headphones",
      productSku: "BAS-H1-GRY",
      quantity: 1,
      location: "Main Outlet",
      party: "Walk-in Customer",
      partyRole: "Customer",
      serials: ["BS-H1-9921"],
      status: "Under Diagnosis",
      notes: "Warranty return intake: battery discharging rapidly, under bench diagnosis.",
    },
    {
      id: "rma-case-3-intake",
      type: "Return",
      direction: "IN",
      reference: "RMA-0080",
      referenceHref: `/c/${encodeURIComponent(companyId)}/returns?view=customers`,
      date: "03 Oct 2026",
      timestamp: parseDateScore("03 Oct 2026") + 1500000,
      productName: "Redmi Note 13 Pro (12/512GB)",
      productSku: "XIA-RN13-BLU",
      quantity: 1,
      location: "Main Outlet",
      party: "Hamza Electronics",
      partyRole: "Customer",
      serials: ["861928374659202"],
      status: "Void / Custody Hold",
      notes: "Defective unit intake: water ingress detected; held in custody for customer collection.",
    },
  );

  // 5. Adjustments & Stock Takes
  for (const adj of adjustments) {
    activities.push({
      id: `adj-${adj.id}`,
      type: "Adjustment",
      direction: adj.quantity >= 0 ? "IN" : "OUT",
      reference: adj.adjustmentRef,
      date: adj.date,
      timestamp: parseDateScore(adj.date) + 1200000,
      productName: adj.productName,
      productSku: adj.productSku,
      quantity: Math.abs(adj.quantity),
      location: adj.location,
      party: adj.performedBy,
      partyRole: "Auditor",
      serials: adj.serials,
      status: adj.reason,
      notes: adj.notes ?? adj.reason,
    });
  }

  // Sort descending: latest activities first
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}
