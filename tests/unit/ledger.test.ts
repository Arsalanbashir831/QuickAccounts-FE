import { describe, expect, it } from "vitest";
import { buildVariants, findByCode } from "@/domain/catalog";
import { fixtureAccounts, fixtureParties, fixtureStyles } from "@/domain/fixtures";
import {
  accountBalances, partyBalances, profitAndLoss, returnableQuantities, saleKind, saleStatus, sizeSellThrough, stockLevels,
  type Books,
} from "@/domain/ledger";
import { priceSale } from "@/domain/pricing";
import { cartLine, createSale } from "@/domain/sale-builder";
import { generateSeed } from "@/domain/seed";
import type { Sale } from "@/domain/types";

const runner = fixtureStyles.find((style) => style.id === "stride-runner")!;
const black42 = runner.variants.find((variant) => variant.color === "Black" && variant.size === "42")!;
const black43 = runner.variants.find((variant) => variant.color === "Black" && variant.size === "43")!;

const emptyBooks = (): Books => ({
  styles: fixtureStyles, parties: fixtureParties, accounts: fixtureAccounts,
  sales: [], purchases: [], adjustments: [
    { id: "a1", date: "2026-11-01", variantId: black42.id, qty: 3, reason: "Opening stock" },
    { id: "a2", date: "2026-11-01", variantId: black43.id, qty: 2, reason: "Opening stock" },
  ],
  expenses: [], moneyEntries: [],
});

const sell = (books: Books, input: Partial<Parameters<typeof createSale>[0]> & Pick<Parameters<typeof createSale>[0], "lines">): Sale =>
  createSale({ books, prefix: "KF", channel: "pos", discount: 0, taxRate: 0, taxInclusive: true, method: "cash", cashier: "Test", ...input });

describe("catalog", () => {
  it("builds one variant per colour × size with unique SKUs and barcodes", () => {
    expect(runner.variants).toHaveLength(3 * 7);
    expect(new Set(runner.variants.map((variant) => variant.sku)).size).toBe(21);
    expect(new Set(runner.variants.map((variant) => variant.barcode)).size).toBe(21);
    expect(black42.sku).toBe("STR-RUN-BLA-42");
    expect(findByCode(fixtureStyles, black42.barcode)?.variant.id).toBe(black42.id);
  });

  it("keeps existing variants (and their price overrides) when sizes are added", () => {
    const edited = buildVariants({ ...runner, sizes: [...runner.sizes, "46"], variants: runner.variants.map((variant) => (variant.id === black42.id ? { ...variant, priceOverride: 6999 } : variant)) });
    expect(edited).toHaveLength(24);
    expect(edited.find((variant) => variant.id === black42.id)?.priceOverride).toBe(6999);
  });
});

describe("pricing", () => {
  it("spreads the bill discount over sold lines", () => {
    const priced = priceSale([cartLine(runner, black42, 1), cartLine(runner, black43, 1)], 1000, 0, true);
    expect(priced.total).toBe(6499 * 2 - 1000);
    expect(priced.lines[0].unitNet).toBeCloseTo(5999, 2);
  });

  it("refunds returned lines at the price actually paid", () => {
    const priced = priceSale([{ ...cartLine(runner, black42, -1), unitNet: 5999 }], 500, 0, true);
    expect(priced.discount).toBe(0); // discount never applies to returns
    expect(priced.total).toBe(-5999);
  });

  it("adds tax on top when prices exclude it", () => {
    expect(priceSale([cartLine(runner, black42, 1)], 0, 10, false).total).toBe(Math.round(6499 * 1.1));
    const inclusive = priceSale([cartLine(runner, black42, 1)], 0, 10, true);
    expect(inclusive.total).toBe(6499);
    expect(inclusive.tax).toBe(Math.round(6499 - 6499 / 1.1));
  });
});

describe("sales, returns and exchanges", () => {
  it("reduces stock on sale and restores it on a size exchange", () => {
    const books = emptyBooks();
    const sale = sell(books, { lines: [cartLine(runner, black42, 1)] });
    books.sales = [sale];
    expect(stockLevels(books).get(black42.id)).toBe(2);
    expect(saleKind(sale)).toBe("Sale");

    const exchange = sell(books, { lines: [{ ...sale.lines[0], qty: -1, returnOfSaleId: sale.id }, cartLine(runner, black43, 1)] });
    expect(saleKind(exchange)).toBe("Exchange");
    expect(exchange.total).toBe(0);
    books.sales = [exchange, sale];
    const stock = stockLevels(books);
    expect(stock.get(black42.id)).toBe(3);
    expect(stock.get(black43.id)).toBe(1);
    expect(returnableQuantities(books, sale.id).get(black42.id)).toBe(0);
  });

  it("puts credit sales on the customer's khata and clears it with a receipt", () => {
    const books = emptyBooks();
    const customer = fixtureParties.find((party) => party.id === "cus-kamran")!;
    const sale = sell(books, { customer, method: "credit", amountPaid: 1000, lines: [cartLine(runner, black42, 1)] });
    expect(saleStatus(sale)).toBe("Partly paid");
    books.sales = [sale];
    expect(partyBalances(books).get(customer.id)).toBe(5499);
    expect(accountBalances(books).get("cash")).toBe(25000 + 1000);
    books.moneyEntries = [{ id: "m1", date: sale.date, kind: "customer-receipt", amount: 5499, toAccountId: "meezan", partyId: customer.id }];
    expect(partyBalances(books).get(customer.id)).toBe(0);
    expect(accountBalances(books).get("meezan")).toBe(350000 + 5499);
  });

  it("only owes the supplier for goods actually received", () => {
    const books = emptyBooks();
    const line = { variantId: black42.id, styleId: runner.id, name: runner.name, color: "Black", size: "42", sku: black42.sku, qty: 10, unitCost: 3800 };
    books.purchases = [{ id: "p1", number: "PO-0001", date: "2026-11-02", supplierId: "sup-lahore", status: "Ordered", lines: [line], total: 38000, amountPaid: 10000, accountId: "meezan" }];
    expect(partyBalances(books).get("sup-lahore")).toBe(-10000); // advance paid
    expect(stockLevels(books).get(black42.id)).toBe(3);
    books.purchases = [{ ...books.purchases[0], status: "Received", receivedDate: "2026-11-05" }];
    expect(partyBalances(books).get("sup-lahore")).toBe(28000);
    expect(stockLevels(books).get(black42.id)).toBe(13);
  });
});

describe("profit & loss", () => {
  it("adds up: gross − discounts − returns = net sales, and net − cost − expenses = profit", () => {
    const books = emptyBooks();
    const sale = sell(books, { discount: 499, lines: [cartLine(runner, black42, 2)] });
    books.sales = [sale];
    const refund = sell(books, { lines: [{ ...sale.lines[0], qty: -1, returnOfSaleId: sale.id }] });
    books.sales = [refund, sale];
    books.expenses = [{ id: "e1", date: sale.date, category: "Rent", amount: 2000, accountId: "cash" }];
    books.adjustments = [...books.adjustments, { id: "a3", date: sale.date, variantId: black43.id, qty: -1, reason: "Damaged" }];

    const pl = profitAndLoss(books, "2000-01-01", "2100-01-01");
    expect(pl.grossSales).toBe(12998);
    expect(pl.discounts).toBe(499);
    expect(pl.returns).toBe(-refund.total);
    expect(pl.grossSales - pl.discounts - pl.returns - pl.taxIncluded).toBe(pl.netSales);
    expect(pl.costOfGoodsSold).toBe(3800);
    expect(pl.stockLoss).toBe(3800);
    expect(pl.netProfit).toBe(pl.netSales - 3800 - 3800 - 2000);
  });
});

describe("demo seed", () => {
  const seed = generateSeed("2026-11-11");
  const books: Books = { styles: fixtureStyles, parties: fixtureParties, accounts: fixtureAccounts, ...seed };

  it("never sells stock it doesn't have", () => {
    for (const qty of stockLevels(books).values()) expect(qty).toBeGreaterThanOrEqual(0);
  });

  it("never overdraws cash", () => {
    for (const balance of accountBalances(books).values()) expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("has sales, returns, credit invoices and a pending order", () => {
    expect(seed.sales.length).toBeGreaterThan(200);
    expect(seed.sales.some((sale) => saleKind(sale) === "Exchange")).toBe(true);
    expect(seed.sales.some((sale) => sale.channel === "invoice" && sale.method === "credit")).toBe(true);
    expect(seed.purchases.some((purchase) => purchase.status === "Ordered")).toBe(true);
    expect(new Set(seed.sales.map((sale) => sale.number)).size).toBe(seed.sales.length);
  });

  it("is profitable with a believable footwear margin", () => {
    const pl = profitAndLoss(books, "2026-10-01", "2026-10-31");
    expect(pl.grossMargin).toBeGreaterThan(0.3);
    expect(pl.grossMargin).toBeLessThan(0.55);
    expect(pl.netProfit).toBeGreaterThan(0);
  });

  it("reports sell-through per size", () => {
    const rows = sizeSellThrough(books, runner, "2026-08-01", "2026-11-11", stockLevels(books));
    expect(rows.map((row) => row.size)).toEqual(runner.sizes);
    expect(rows.reduce((sum, row) => sum + row.sold, 0)).toBeGreaterThan(0);
  });
});
