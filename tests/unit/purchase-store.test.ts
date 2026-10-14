import { describe, expect, it } from "vitest";
import { allSerialsCaptured, nextPurchaseNumber, type PurchaseOrder } from "@/features/purchases/purchase-store";

const order: PurchaseOrder = {
  id: "one", poNumber: "PO-0383", supplier: "Supplier", supplierInvoice: "INV-1", date: "09 Oct 2026", expectedDate: "10 Oct 2026", destination: "Main Warehouse", paymentMethod: "cash", notes: "", totalCost: 200,
  receivingStatus: "Shipped", items: [{ id: "product", name: "Product", sku: "P-1", qty: 2, unitCost: 100, serials: ["SN-1", "SN-2"] }],
};

describe("purchase order helpers", () => {
  it("increments the highest existing PO number", () => {
    expect(nextPurchaseNumber([{ ...order, poNumber: "PO-0412" }, order])).toBe("PO-0413");
  });

  it("requires one unique code per purchased unit before receipt", () => {
    expect(allSerialsCaptured(order)).toBe(true);
    expect(allSerialsCaptured({ ...order, items: [{ ...order.items[0], serials: ["SN-1", ""] }] })).toBe(false);
    expect(allSerialsCaptured({ ...order, items: [{ ...order.items[0], serials: ["SN-1", "SN-1"] }] })).toBe(false);
    expect(allSerialsCaptured({ ...order, items: [{ ...order.items[0], serials: ["SN-1"] }] })).toBe(false);
  });
});
