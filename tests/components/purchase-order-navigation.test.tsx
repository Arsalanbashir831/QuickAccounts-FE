import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrderDetails } from "@/features/purchases/components/purchase-order-details";
import { PurchaseOrdersView } from "@/features/purchases/components/purchase-orders-view";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => { cleanup(); push.mockClear(); });

describe("purchase order navigation", () => {
  it("opens the dedicated details page when a table row is clicked or activated by keyboard", () => {
    render(<PurchaseOrdersView companyId="demo" />);

    const row = screen.getByRole("link", { name: "Open PO-0381 purchase order details" });
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Print receipt/ })).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(push).toHaveBeenLastCalledWith("/c/demo/stock/purchases/po-381");

    fireEvent.keyDown(row, { key: "Enter" });
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("keeps serial entry and the print action on the separate page", () => {
    render(<PurchaseOrderDetails companyId="demo" orderId="po-381" />);

    expect(screen.getByRole("heading", { name: "PO-0381" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Redmi Note 13 Pro.*serial and barcode table/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print receipt" }));
    expect(screen.getByRole("dialog", { name: "PO-0381 print preview" })).toBeInTheDocument();
  });
});
