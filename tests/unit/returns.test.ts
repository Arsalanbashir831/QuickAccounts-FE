import { describe, expect, it } from "vitest";
import { fixtureAccounts, fixtureParties, fixtureStyles } from "@/domain/fixtures";
import { accountBalances, partyBalances, profitAndLoss, stockLevels, type Books } from "@/domain/ledger";
import { settlementOf } from "@/domain/returns";
import { cartLine, createSale } from "@/domain/sale-builder";
import type { Sale, Style } from "@/domain/types";

const style = (id: string) => fixtureStyles.find((entry) => entry.id === id)!;
const variant = (s: Style, color: string, size: string) => s.variants.find((v) => v.color === color && v.size === size)!;
const runner = style("stride-runner"); // Rs 6,499
const trail = style("trail-blazer"); // Rs 8,999
const slide = style("breeze-slide"); // Rs 1,299

const runner42 = variant(runner, "Black", "42");
const runner43 = variant(runner, "Black", "43");
const trail43 = variant(trail, "Brown", "43");
const slide42 = variant(slide, "Black", "42");

function shop(): Books {
  return {
    styles: fixtureStyles, parties: fixtureParties, accounts: fixtureAccounts, purchases: [], expenses: [], moneyEntries: [], sales: [],
    adjustments: [runner42, runner43, trail43, slide42].map((v, index) => ({ id: `o${index}`, date: "2026-11-01", variantId: v.id, qty: 5, reason: "Opening stock" as const })),
  };
}

const doc = (books: Books, input: Partial<Parameters<typeof createSale>[0]> & Pick<Parameters<typeof createSale>[0], "lines">): Sale => {
  const sale = createSale({ books, prefix: "KF", channel: "pos", discount: 0, taxRate: 0, taxInclusive: true, method: "cash", cashier: "Test", ...input });
  books.sales = [sale, ...books.sales];
  return sale;
};

/** Customer bought one Stride Runner 42 for cash. */
function withOriginalSale() {
  const books = shop();
  const original = doc(books, { lines: [cartLine(runner, runner42, 1)] });
  const back = { ...original.lines[0], qty: -1, returnOfSaleId: original.id };
  return { books, original, back };
}

describe("return & exchange settlement", () => {
  it("refund: stock comes back, cash goes out, sales go down", () => {
    const { books, back } = withOriginalSale();
    const refund = doc(books, { lines: [back] });
    expect(settlementOf(refund)).toMatchObject({ kind: "refund", amount: 6499 });
    expect(stockLevels(books).get(runner42.id)).toBe(5);
    expect(accountBalances(books).get("cash")).toBe(25000); // +6499 sale −6499 refund
    expect(profitAndLoss(books, "2000-01-01", "2100-01-01").netSales).toBe(0);
  });

  it("same-value exchange (size swap): nothing paid, one size in, one out", () => {
    const { books, back } = withOriginalSale();
    const swap = doc(books, { lines: [back, cartLine(runner, runner43, 1)] });
    expect(settlementOf(swap)).toMatchObject({ kind: "even", amount: 0 });
    expect(swap.amountPaid).toBe(0);
    const stock = stockLevels(books);
    expect(stock.get(runner42.id)).toBe(5);
    expect(stock.get(runner43.id)).toBe(4);
  });

  it("dearer exchange: customer pays the difference", () => {
    const { books, back } = withOriginalSale();
    const upgrade = doc(books, { lines: [back, cartLine(trail, trail43, 1)], tendered: 3000 });
    expect(settlementOf(upgrade)).toMatchObject({ kind: "customer-pays", amount: 8999 - 6499, returnValue: 6499, newValue: 8999 });
    expect(accountBalances(books).get("cash")).toBe(25000 + 6499 + 2500);
    expect(profitAndLoss(books, "2000-01-01", "2100-01-01").netSales).toBe(8999);
  });

  it("cheaper exchange: shop gives back the difference", () => {
    const { books, back } = withOriginalSale();
    const downgrade = doc(books, { lines: [back, cartLine(slide, slide42, 1)] });
    expect(settlementOf(downgrade)).toMatchObject({ kind: "shop-pays", amount: 6499 - 1299 });
    expect(accountBalances(books).get("cash")).toBe(25000 + 1299);
  });

  it("difference can go to a customer's khata instead of cash", () => {
    const books = shop();
    const kamran = fixtureParties.find((party) => party.id === "cus-kamran")!;
    const original = doc(books, { customer: kamran, lines: [cartLine(runner, runner42, 1)] });
    doc(books, { customer: kamran, method: "credit", lines: [{ ...original.lines[0], qty: -1, returnOfSaleId: original.id }, cartLine(slide, slide42, 1)] });
    expect(partyBalances(books).get(kamran.id)).toBe(-(6499 - 1299)); // shop owes Kamran: advance for next time
    expect(accountBalances(books).get("cash")).toBe(25000 + 6499);
  });

  it("damaged return: comes back on the receipt, then written off — cost shows as a loss", () => {
    const { books, back } = withOriginalSale();
    const refund = doc(books, { lines: [back] });
    books.adjustments = [...books.adjustments, { id: "dmg", date: refund.date, variantId: runner42.id, qty: -1, reason: "Damaged" }];
    expect(stockLevels(books).get(runner42.id)).toBe(4);
    expect(profitAndLoss(books, "2000-01-01", "2100-01-01").stockLoss).toBe(runner.cost);
  });
});
