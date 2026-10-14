import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InvoicePrintTemplate, type PrintableInvoice } from "@/features/sales/components/invoice-print-template";

afterEach(cleanup);

describe("InvoicePrintTemplate", () => {
  it("places a large serial batch in a printable row register", () => {
    const invoice: PrintableInvoice = {
      reference: "DOT-TEST-100",
      date: "09 Oct 2026",
      customer: "Walk-in Customer",
      outlet: "Main Outlet",
      total: 10500,
      paid: 10500,
      balance: 0,
      status: "Paid",
      paymentMethod: "cash",
      items: [{
        name: "Bulk charger",
        qty: 105,
        price: 100,
        serials: Array.from({ length: 105 }, (_, index) => `SN-${String(index + 1).padStart(3, "0")}`),
      }],
    };
    render(<InvoicePrintTemplate invoice={invoice} onClose={() => {}} />);

    const html = screen.getByTitle("Invoice DOT-TEST-100").getAttribute("srcdoc") ?? "";
    expect(html).toContain("105 serial / barcode values listed below");
    expect(html).toContain("serial / barcode register");
    expect(html).toContain("SN-105");
    expect(html).toContain("@page { size: A4 portrait; margin: 15mm 16mm; }");
  });
});
