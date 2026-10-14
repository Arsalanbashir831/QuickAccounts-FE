import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SellPos } from "@/features/sales/components/sell-pos";

vi.mock("read-excel-file/browser", () => ({ readSheet: vi.fn(async () => [["Barcode"], ["XLSX-001"], ["XLSX-002"]]) }));

afterEach(cleanup);

describe("SellPos", () => {
  it("requires one unique code per unit even when warranty is off", async () => {
    const user = userEvent.setup();
    render(<SellPos />);

    const confirm = screen.getByRole("button", { name: /Confirm Sale/ });
    expect(confirm).toBeDisabled();

    await user.click(screen.getAllByRole("switch", { name: "Warranty for this item" }).at(-1)!);
    await user.click(screen.getByRole("button", { name: "Increase quantity of Anker 65W GaN Fast Charger" }));
    expect(screen.getAllByPlaceholderText("Scan, paste, or type")).toHaveLength(4);

    const codes = screen.getAllByPlaceholderText("Scan, paste, or type");
    fireEvent.change(codes[1], { target: { value: "358291048291048" } });
    fireEvent.change(codes[2], { target: { value: "ANK-002" } });
    fireEvent.change(codes[3], { target: { value: "ANK-003" } });
    expect(confirm).toBeDisabled();
    expect(screen.getAllByText("Duplicate")).toHaveLength(2);

    fireEvent.change(codes[1], { target: { value: "ANK-001" } });
    expect(confirm).toBeEnabled();
  });

  it("prints the edited price, warranty, codes, and invoice note from the sale", async () => {
    const user = userEvent.setup();
    render(<SellPos />);

    fireEvent.change(screen.getAllByLabelText("Invoice unit price (PKR)")[0], { target: { value: "110000" } });
    const codes = screen.getAllByPlaceholderText("Scan, paste, or type");
    fireEvent.change(codes[1], { target: { value: "ANK-001" } });
    fireEvent.change(codes[2], { target: { value: "ANK-002" } });
    await user.selectOptions(screen.getByLabelText("Additional invoice notes"), "thank-you");
    await user.click(screen.getByRole("button", { name: /Confirm Sale/ }));
    await user.click(screen.getByRole("button", { name: "Preview / Print Invoice" }));

    const document = screen.getByTitle(/Invoice DOT-INV-/).getAttribute("srcdoc") ?? "";
    expect(document).toContain("PKR 110,000");
    expect(document).toContain("358291048291048");
    expect(document).toContain("ANK-001, ANK-002");
    expect(document).toContain("1 year warranty");
    expect(document).toContain("Thank you for your purchase.");
    expect(document).toContain("@page { size: A4 portrait; margin: 15mm 16mm; }");
  });

  it("adds scanner codes as rows and imports more than 100 codes from CSV", async () => {
    render(<SellPos />);
    const product = "Anker 65W GaN Fast Charger";
    const scanner = screen.getByRole("textbox", { name: `Scan serial or barcode for ${product}` });
    fireEvent.change(scanner, { target: { value: "ANK-SCAN-1" } });
    fireEvent.keyDown(scanner, { key: "Enter" });
    expect(screen.getByText(/1 of 2 captured/)).toBeVisible();

    const csv = `Barcode\n${Array.from({ length: 104 }, (_, index) => `ANK-${String(index + 1).padStart(3, "0")}`).join("\n")}`;
    const file = new File([csv], "serials.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => csv });
    fireEvent.change(screen.getByLabelText(`Upload codes for ${product}`), { target: { files: [file] } });

    const table = screen.getByRole("region", { name: `${product} serial and barcode table` });
    expect(await within(table).findByText(/105 of 105 captured/)).toBeVisible();
    expect(within(table).getAllByRole("row")).toHaveLength(106);
    expect(screen.getByRole("spinbutton", { name: `Quantity for ${product}` })).toHaveValue(105);
  });

  it("accepts the Excel upload path", async () => {
    render(<SellPos />);
    const file = new File(["xlsx"], "serials.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.change(screen.getByLabelText("Upload codes for Anker 65W GaN Fast Charger"), { target: { files: [file] } });
    expect(await screen.findByText(/2 of 2 captured/)).toBeVisible();
    expect(screen.getByDisplayValue("XLSX-001")).toBeVisible();
    expect(screen.getByDisplayValue("XLSX-002")).toBeVisible();
  });
});
