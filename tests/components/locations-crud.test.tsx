import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationsWorkspace } from "@/features/locations/locations-workspace";
import { SellPos } from "@/features/sales/components/sell-pos";
import { readLocations, saveLocations } from "@/features/settings/location-store";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Stores & Warehouses management and Selling From dropdown", () => {
  it("renders registered locations and allows adding, editing, and deleting a location", async () => {
    saveLocations("demo-test", [
      { id: "loc-1", name: "Main Outlet", type: "Outlet", code: "OUT-01" },
      { id: "loc-2", name: "Main Warehouse", type: "Warehouse", code: "WH-01" },
    ]);

    render(<LocationsWorkspace companyId="demo-test" />);

    // Check that existing locations are listed
    expect(screen.getByText("Main Outlet")).toBeInTheDocument();
    expect(screen.getByText("Main Warehouse")).toBeInTheDocument();

    // Open Add Location form
    fireEvent.click(screen.getByRole("button", { name: /Add Store \/ Warehouse/i }));
    expect(screen.getByPlaceholderText(/e.g. DHA Phase 5 Store/i)).toBeInTheDocument();

    // Add a new warehouse
    fireEvent.change(screen.getByPlaceholderText(/e.g. DHA Phase 5 Store/i), {
      target: { value: "Gulberg Branch" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Location/i }));

    // Should now be in store & displayed
    expect(screen.getByText("Gulberg Branch")).toBeInTheDocument();
    const stored = readLocations("demo-test");
    expect(stored.some((l) => l.name === "Gulberg Branch")).toBe(true);

    // Edit a location
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    const nameInput = screen.getByDisplayValue("Main Outlet");
    fireEvent.change(nameInput, { target: { value: "Main Outlet Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(screen.getByText("Main Outlet Renamed")).toBeInTheDocument();

    // Delete a location
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText("Confirm remove?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(screen.queryByText("Main Outlet Renamed")).not.toBeInTheDocument();
  });

  it("provides a Selling From dropdown on new invoice and records selected location", () => {
    saveLocations("demo-test", [
      { id: "loc-1", name: "Main Outlet", type: "Outlet" },
      { id: "loc-2", name: "North Warehouse", type: "Warehouse" },
    ]);

    const handleCreate = vi.fn();
    render(<SellPos companyId="demo-test" onCreate={handleCreate} />);

    // Verify Selling From dropdown exists with the locations
    const select = screen.getByRole("combobox", { name: /Selling from outlet or warehouse/i }) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Main Outlet" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "North Warehouse" })).toBeInTheDocument();

    // Select North Warehouse
    fireEvent.change(select, { target: { value: "North Warehouse" } });
    expect(select.value).toBe("North Warehouse");
  });
});
