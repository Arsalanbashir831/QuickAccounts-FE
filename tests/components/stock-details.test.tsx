import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StockBalancesView } from "@/features/inventory/components/stock-balances-view";
import { StockDetails } from "@/features/inventory/components/stock-details";
import { StockLocationDetails } from "@/features/inventory/components/stock-location-details";
import { StockReservationDetails } from "@/features/inventory/components/stock-reservation-details";
import { buildStockBalances, stockTotals } from "@/features/inventory/stock-data";
import { stockViews } from "@/features/inventory/stock-views";
import { readTransfers } from "@/features/inventory/transfer-store";
import { readInvoices, writeInvoices } from "@/features/sales/invoice-store";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => { cleanup(); window.localStorage.clear(); push.mockClear(); });

describe("stock sheet and product details", () => {
  it("keeps the same SKU at multiple locations and calculates shipment reservations", () => {
    const rows = buildStockBalances(readInvoices("demo"), readTransfers("demo"));
    const redmi = rows.filter((row) => row.sku === "XIA-RN13-BLU");
    expect(redmi.map((row) => row.location)).toEqual(["Main Outlet", "Main Warehouse"]);
    expect(redmi[0].reservations[0]).toMatchObject({ reference: "DOT-1046", quantity: 1 });
    expect(redmi[0].reservations.map((reservation) => reservation.type)).toEqual(["Unshipped invoice", "Rejected warranty return"]);
    expect(redmi[0].reserved).toBe(2);
    expect(redmi[0].available).toBe(redmi[0].onHand - redmi[0].faulty - redmi[0].dead - 1);
    expect(redmi[0].reservations[1].consumesSellableStock).toBe(false);
    const samsung = rows.find((row) => row.id === "sam-outlet");
    expect(samsung?.reservations[0]).toMatchObject({ type: "Warranty replacement", reference: "RMA-0082", consumesSellableStock: true });
    const anker = rows.find((row) => row.id === "ank-warehouse");
    expect(anker?.reservations[0]).toMatchObject({ type: "Transfer shipment", reference: "TR-0198", destination: "North Outlet", quantity: 15 });
    expect(anker?.available).toBe(anker!.onHand - anker!.faulty - anker!.dead - 15);
    expect(stockTotals(rows).faulty + stockTotals(rows).dead).toBeGreaterThan(0);
  });

  it("releases a reservation after an invoice is shipped", () => {
    const invoices = readInvoices("demo");
    const before = buildStockBalances(invoices).find((row) => row.id === "xia-outlet");
    writeInvoices("demo", invoices.map((invoice) => invoice.id === "inv-3" ? { ...invoice, shipmentStatus: "Shipped" } : invoice));
    const after = buildStockBalances(readInvoices("demo")).find((row) => row.id === "xia-outlet");
    expect(before?.reserved).toBe(2);
    expect(after?.reserved).toBe(1);
    expect(after?.available).toBe((before?.available ?? 0) + 1);
  });

  it("shows the requested columns and opens the product detail page from a row", () => {
    render(<StockBalancesView companyId="demo" />);
    expect(screen.getByRole("button", { name: /Available to Sell/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reserved for Shipment/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Total Faulty Stock/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Faulty/Dead" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Condition" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Health" })).not.toBeInTheDocument();
    const row = screen.getByRole("link", { name: "View stock details for Samsung Galaxy A55 5G (8/256GB) at Main Outlet" });
    fireEvent.click(row);
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/SAM-A55-BLK");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("shows locations, faulty and dead units, and linked invoice reservations", () => {
    render(<StockDetails companyId="demo" sku="XIA-RN13-BLU" />);
    expect(screen.getByRole("heading", { name: "Redmi Note 13 Pro (12/512GB)" })).toBeInTheDocument();
    expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Faulty" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Dead" })).toBeInTheDocument();
    const order = screen.getByRole("link", { name: "View Unshipped invoice reservation DOT-1046" });
    fireEvent.click(order);
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/XIA-RN13-BLU/reservations/invoice-inv-3-0");
    const location = screen.getByRole("link", { name: "View Main Warehouse stock details" });
    fireEvent.keyDown(location, { key: "Enter" });
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/XIA-RN13-BLU/locations/xia-warehouse");
  });

  it("opens a location's reservation rows and shows RMA context on reservation details", () => {
    render(<StockLocationDetails companyId="demo" sku="SAM-A55-BLK" locationId="sam-outlet" />);
    const replacement = screen.getByRole("link", { name: "View Warranty replacement reservation RMA-0082" });
    fireEvent.click(replacement);
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/SAM-A55-BLK/reservations/rma-replacement-0082");
    cleanup();
    render(<StockReservationDetails companyId="demo" sku="SAM-A55-BLK" reservationId="rma-replacement-0082" />);
    expect(screen.getByRole("heading", { name: "RMA-0082" })).toBeInTheDocument();
    expect(screen.getByText("Approved · Replacement issued")).toBeInTheDocument();
    expect(screen.getByText("358291048291049")).toBeInTheDocument();
  });

  it("links an ordered reservation to its invoice and identifies customer-held rejected units", () => {
    render(<StockReservationDetails companyId="demo" sku="XIA-RN13-BLU" reservationId="invoice-inv-3-0" />);
    expect(screen.getByRole("link", { name: "Open invoice" })).toHaveAttribute("href", "/c/demo/sales/inv-3");
    cleanup();
    render(<StockReservationDetails companyId="demo" sku="XIA-RN13-BLU" reservationId="rma-rejected-0080" />);
    expect(screen.getByText("Customer-held return")).toBeInTheDocument();
    expect(screen.getByText(/not deducted from available-to-sell company stock/)).toBeInTheDocument();
  });

  it("opens a transfer reservation and links to its transfer detail page", () => {
    render(<StockDetails companyId="demo" sku="ANK-65W-WHT" />);
    const transfer = screen.getByRole("link", { name: "View Transfer shipment reservation TR-0198" });
    fireEvent.click(transfer);
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/ANK-65W-WHT/reservations/transfer-tr-1");
    cleanup();
    render(<StockReservationDetails companyId="demo" sku="ANK-65W-WHT" reservationId="transfer-tr-1" />);
    expect(screen.getByText("North Outlet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open transfer" })).toHaveAttribute("href", "/c/demo/stock/transfers/tr-1");
  });

  it("removes the audit and check tab", () => {
    expect(stockViews.map((view) => view.value)).toEqual(["stock", "products", "transfers"]);
  });
});
