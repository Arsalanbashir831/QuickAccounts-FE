import { describe, expect, it } from "vitest";
import { addSerialCodes, parseCsvRows, pasteSerialCodes, serialsFromRows } from "@/features/sales/components/serial-code-utils";

describe("serial code imports", () => {
  it("reads a named CSV column and keeps leading zeros as text", () => {
    const rows = parseCsvRows('\uFEFFItem,Serial / Barcode,Note\r\n1,"001234",Ready\r\n2,"ABC,789",Ready\r\n');
    expect(serialsFromRows(rows)).toEqual(["001234", "ABC,789"]);
  });

  it("fills empty slots then grows a line past 100 units without replacing codes", () => {
    const items = [{ id: "charger", qty: 2, stock: 150, serials: ["ANK-000", ""] }];
    const codes = Array.from({ length: 105 }, (_, index) => `ANK-${String(index + 1).padStart(3, "0")}`);
    const result = addSerialCodes(items, "charger", [...codes, "ANK-001", "ANK-000"]);

    expect(result.accepted).toBe(105);
    expect(result.duplicates).toBe(2);
    expect(result.items[0].qty).toBe(106);
    expect(result.items[0].serials[0]).toBe("ANK-000");
    expect(result.items[0].serials[105]).toBe("ANK-105");
  });

  it("stops at available stock and pastes a column from the selected row", () => {
    const items = [{ id: "phone", qty: 2, stock: 3, serials: ["SN-1", ""] }];
    const added = addSerialCodes(items, "phone", ["SN-2", "SN-3", "SN-4"]);
    expect(added.accepted).toBe(2);
    expect(added.overCapacity).toBe(1);

    const pasted = pasteSerialCodes(added.items, "phone", 1, ["SN-20", "SN-30"]);
    expect(pasted.items[0].serials).toEqual(["SN-1", "SN-20", "SN-30"]);
  });
});
