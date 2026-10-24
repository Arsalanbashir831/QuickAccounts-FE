import { shipmentStatusFor, type InvoiceRecord } from "@/features/sales/invoice-store";
import type { StockTransfer } from "./transfer-store";

export interface StockLocationBalance {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  onHand: number;
  faulty: number;
  dead: number;
}

export type ReservationType = "Transfer shipment" | "Unshipped invoice";

export interface StockReservation {
  id: string;
  sku: string;
  type: ReservationType;
  sourceKind: "invoice" | "transfer";
  sourceId: string;
  reference: string;
  customer?: string;
  destination?: string;
  location: string;
  quantity: number;
  serials: string[];
  note?: string;
  sourceStatus?: string;
}

export interface StockBalance extends StockLocationBalance {
  reserved: number;
  available: number;
  reservations: StockReservation[];
}

// Demo physical counts. A SKU can have a separate balance at each location.
export const stockLocations: StockLocationBalance[] = [
  { id: "sam-outlet", sku: "SAM-A55-BLK", name: "Samsung Galaxy A55 5G (8/256GB)", category: "Smartphones", location: "Main Outlet", onHand: 14, faulty: 1, dead: 0 },
  { id: "sam-warehouse", sku: "SAM-A55-BLK", name: "Samsung Galaxy A55 5G (8/256GB)", category: "Smartphones", location: "Main Warehouse", onHand: 8, faulty: 0, dead: 1 },
  { id: "xia-outlet", sku: "XIA-RN13-BLU", name: "Redmi Note 13 Pro (12/512GB)", category: "Smartphones", location: "Main Outlet", onHand: 4, faulty: 0, dead: 0 },
  { id: "xia-warehouse", sku: "XIA-RN13-BLU", name: "Redmi Note 13 Pro (12/512GB)", category: "Smartphones", location: "Main Warehouse", onHand: 9, faulty: 1, dead: 0 },
  { id: "ank-outlet", sku: "ANK-65W-WHT", name: "Anker 65W GaN Fast Charger", category: "Accessories", location: "Main Outlet", onHand: 6, faulty: 0, dead: 0 },
  { id: "ank-warehouse", sku: "ANK-65W-WHT", name: "Anker 65W GaN Fast Charger", category: "Accessories", location: "Main Warehouse", onHand: 48, faulty: 2, dead: 1 },
  { id: "apl-outlet", sku: "APL-20W-ORIG", name: "Apple 20W USB-C Power Adapter", category: "Accessories", location: "Main Outlet", onHand: 22, faulty: 0, dead: 1 },
  { id: "apl-warehouse", sku: "APL-20W-ORIG", name: "Apple 20W USB-C Power Adapter", category: "Accessories", location: "Main Warehouse", onHand: 12, faulty: 0, dead: 0 },
  { id: "bas-outlet", sku: "BAS-H1-GRY", name: "Baseus Bowie H1 ANC Headphones", category: "Audio", location: "Main Outlet", onHand: 2, faulty: 1, dead: 0 },
  { id: "bas-warehouse", sku: "BAS-H1-GRY", name: "Baseus Bowie H1 ANC Headphones", category: "Audio", location: "Main Warehouse", onHand: 4, faulty: 0, dead: 1 },
  { id: "sam-north", sku: "SAM-A55-BLK", name: "Samsung Galaxy A55 5G (8/256GB)", category: "Smartphones", location: "North Outlet", onHand: 6, faulty: 0, dead: 0 },
  { id: "ank-north", sku: "ANK-65W-WHT", name: "Anker 65W GaN Fast Charger", category: "Accessories", location: "North Outlet", onHand: 12, faulty: 0, dead: 0 },
];

const legacySkuByName: Record<string, string> = {
  "Samsung Galaxy A55 5G": "SAM-A55-BLK",
  "Redmi Note 13 Pro": "XIA-RN13-BLU",
  "Anker 65W GaN Fast Charger": "ANK-65W-WHT",
  "Apple 20W Power Adapter": "APL-20W-ORIG",
  "Apple 20W Adapter": "APL-20W-ORIG",
  "Apple 20W USB-C Power Adapter": "APL-20W-ORIG",
  "Baseus Bowie H1 Headphones": "BAS-H1-GRY",
};

export function buildStockBalances(invoices: InvoiceRecord[], transfers: StockTransfer[] = []): StockBalance[] {
  const reservations = new Map<string, StockReservation[]>();

  for (const invoice of invoices) {
    if (shipmentStatusFor(invoice) !== "Preparing") continue;
    for (const [itemIndex, item] of invoice.items.entries()) {
      const sku = item.sku ?? legacySkuByName[item.name];
      if (!sku || item.qty <= 0) continue;
      // An invoice has an outlet, but no separate fulfilment source yet. Use its
      // matching stock location when present; otherwise the first stock location.
      const stock = stockLocations.find((entry) => entry.sku === sku && entry.location === invoice.outlet)
        ?? stockLocations.find((entry) => entry.sku === sku);
      if (!stock) continue;
      const existing = reservations.get(stock.id) ?? [];
      existing.push({
        id: `invoice-${invoice.id}-${itemIndex}`, sku, type: "Unshipped invoice", sourceKind: "invoice", sourceId: invoice.id,
        reference: invoice.reference, customer: invoice.customer, location: stock.location, quantity: item.qty,
        serials: item.serials ?? (item.serial ? [item.serial] : []),
        note: "Ordered on an invoice and awaiting shipment.", sourceStatus: "Preparing",
      });
      reservations.set(stock.id, existing);
    }
  }

  for (const transfer of transfers) {
    if (transfer.status === "Received") continue;
    const stock = stockLocations.find((entry) => entry.sku === transfer.productSku && entry.location === transfer.fromSite);
    if (!stock) continue;
    const reservation: StockReservation = {
      id: `transfer-${transfer.id}`, sku: transfer.productSku, type: "Transfer shipment", sourceKind: "transfer",
      sourceId: transfer.id, reference: transfer.transferRef, destination: transfer.toSite,
      location: transfer.fromSite, quantity: transfer.itemsCount, serials: transfer.serials,
      note: `Stock committed for transfer to ${transfer.toSite}.`, sourceStatus: transfer.status,
    };
    reservations.set(stock.id, [...(reservations.get(stock.id) ?? []), reservation]);
  }

  return stockLocations.map((stock) => {
    const linked = reservations.get(stock.id) ?? [];
    const reserved = linked.reduce((sum, reservation) => sum + reservation.quantity, 0);
    return { ...stock, reserved, available: Math.max(0, stock.onHand - stock.faulty - stock.dead - reserved), reservations: linked };
  });
}

export function stockTotals(rows: StockBalance[]) {
  return rows.reduce((totals, row) => ({
    onHand: totals.onHand + row.onHand,
    available: totals.available + row.available,
    reserved: totals.reserved + row.reserved,
    faulty: totals.faulty + row.faulty,
    dead: totals.dead + row.dead,
  }), { onHand: 0, available: 0, reserved: 0, faulty: 0, dead: 0 });
}
