import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PurchasePrintTemplate } from "@/features/purchases/components/purchase-print-template";
import type { PurchaseOrder } from "@/features/purchases/purchase-store";

afterEach(cleanup);

describe("PurchasePrintTemplate", () => {
  it("prints supplier, destination, payment, and an imported serial batch on A4", () => {
    const order: PurchaseOrder = {
      id: "po-test", poNumber: "PO-0420", supplier: "Apex Importers", supplierInvoice: "AX-108", supplierInvoiceDate: "09 Oct 2026",
      date: "09 Oct 2026", expectedDate: "12 Oct 2026", destination: "North Outlet", paymentMethod: "bank",
      bankAccount: "HBL – Main Account", notes: "Check all units", totalCost: 10500, receivingStatus: "Shipped",
      items: [{ id: "charger", name: "Bulk charger", sku: "BC-1", qty: 105, unitCost: 100, serials: Array.from({ length: 105 }, (_, index) => `SN-${String(index + 1).padStart(3, "0")}`) }],
    };
    render(<PurchasePrintTemplate order={order} onClose={() => {}} />);
    const html = screen.getByTitle("PO-0420 purchase receipt").getAttribute("srcdoc") ?? "";
    expect(html).toContain("Apex Importers");
    expect(html).toContain("AX-108");
    expect(html).toContain("North Outlet");
    expect(html).toContain("Card / Bank");
    expect(html).toContain("SN-105");
    expect(html).toContain("@page{size:A4 portrait");
  });
});
