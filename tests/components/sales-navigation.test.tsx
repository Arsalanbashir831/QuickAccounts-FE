import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvoicesView } from "@/features/sales/components/invoices-view";
import { InvoiceDetails } from "@/features/sales/components/invoice-details";
import { NewInvoice } from "@/features/sales/components/new-invoice";
import { ShipmentStatusView } from "@/features/sales/components/shipment-status-view";
import { readInvoices, writeInvoices } from "@/features/sales/invoice-store";
import { salesViews } from "@/features/sales/sales-views";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => { cleanup(); window.localStorage.clear(); push.mockClear(); });

describe("sales invoice flow", () => {
  it("includes a shipment status tab", () => {
    expect(salesViews).toEqual([
      { value: "invoices", label: "Invoices" },
      { value: "shipments", label: "Shipment Status" },
    ]);
  });

  it("tracks Preparing to Shipped without changing payment status", () => {
    render(<ShipmentStatusView companyId="demo" />);
    expect(screen.getByRole("link", { name: "DOT-1046" })).toHaveAttribute("href", "/c/demo/sales/inv-3");
    expect(screen.getAllByText("Preparing").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Mark shipped" })[0]);
    const shipped = readInvoices("demo").find((invoice) => invoice.id === "inv-3");
    expect(shipped?.shipmentStatus).toBe("Shipped");
    expect(shipped?.shippedAt).toBeTruthy();
    expect(shipped?.status).toBe("Partial");
    expect(screen.getByRole("status")).toHaveTextContent("DOT-1046 marked as shipped.");
  });

  it("treats older invoices without shipment status as Preparing", () => {
    const legacy = readInvoices("demo").map((invoice) => invoice.id === "inv-3"
      ? { ...invoice, shipmentStatus: undefined }
      : invoice);
    writeInvoices("demo", legacy);
    render(<ShipmentStatusView companyId="demo" />);
    expect(screen.getByRole("link", { name: "DOT-1046" }).closest("tr")).toHaveTextContent("Preparing");
  });

  it("opens a separate details page from an invoice row", () => {
    render(<InvoicesView companyId="demo" />);
    const row = screen.getByRole("link", { name: "Open DOT-1048 invoice details" });
    expect(screen.getByRole("link", { name: "New Invoice" })).toHaveAttribute("href", "/c/demo/sales/new");
    expect(screen.queryByText("Document Inspector")).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(push).toHaveBeenLastCalledWith("/c/demo/sales/inv-1");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("prints an invoice from its details page", () => {
    render(<InvoiceDetails companyId="demo" invoiceId="inv-1" />);
    expect(screen.getByRole("heading", { name: "DOT-1048" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
    expect(screen.getByRole("dialog", { name: "Invoice DOT-1048 print preview" })).toBeInTheDocument();
  });

  it("persists a payment collected from the details page", () => {
    render(<InvoiceDetails companyId="demo" invoiceId="inv-4" />);
    fireEvent.click(screen.getByRole("button", { name: "Collect payment" }));
    expect(screen.getByRole("dialog", { name: "Collect payment for DOT-1045" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm collection" }));
    expect(readInvoices("demo").find((invoice) => invoice.id === "inv-4")?.status).toBe("Paid");
    expect(screen.getByText("PKR 28,900 collected via Cash.")).toBeInTheDocument();
  });

  it("creates a new invoice on its own page and stores it before opening details", () => {
    render(<NewInvoice companyId="demo" />);
    expect(screen.getByRole("heading", { name: "New Invoice" })).toBeInTheDocument();
    expect(screen.getByText("Cart is empty")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Scan barcode or search products..."), { target: { value: "Apple 20W" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Apple 20W USB-C Power Adapter unit 1 serial or barcode/ }), { target: { value: "APL-TEST-001" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Invoice/ }));
    const saved = readInvoices("demo")[0];
    expect(saved.items[0].serials).toEqual(["APL-TEST-001"]);
    expect(saved.shipmentStatus).toBe("Preparing");
    expect(push).toHaveBeenLastCalledWith(`/c/demo/sales/${saved.id}`);
  });
});
