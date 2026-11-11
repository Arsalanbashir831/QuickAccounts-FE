/**
 * Derived figures for the whole business. Every function here is pure: given
 * the same documents it returns the same numbers, so stock, balances and the
 * profit & loss statement can never drift apart.
 */
import type {
  Expense,
  ExpenseCategory,
  IsoDate,
  MoneyAccount,
  MoneyEntry,
  Party,
  Purchase,
  Sale,
  StockAdjustment,
  Style,
} from "./types";

export interface Books {
  styles: readonly Style[];
  parties: readonly Party[];
  accounts: readonly MoneyAccount[];
  sales: readonly Sale[];
  purchases: readonly Purchase[];
  adjustments: readonly StockAdjustment[];
  expenses: readonly Expense[];
  moneyEntries: readonly MoneyEntry[];
}

const inRange = (date: IsoDate, from?: IsoDate, to?: IsoDate) => (!from || date >= from) && (!to || date <= to);

// ---------------------------------------------------------------- dates

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Today in the business time zone (Pakistan), so server and browser agree. */
export const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const addDays = (iso: IsoDate, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

export const monthStart = (iso: IsoDate) => `${iso.slice(0, 7)}-01`;

export const monthEnd = (iso: IsoDate) => {
  const date = new Date(`${monthStart(iso)}T12:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return toIsoDate(date);
};

export const addMonths = (iso: IsoDate, months: number) => {
  const date = new Date(`${monthStart(iso)}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
};

// ---------------------------------------------------------------- sales helpers

export type SaleKind = "Sale" | "Return" | "Exchange";

export function saleKind(sale: Pick<Sale, "lines">): SaleKind {
  const sold = sale.lines.some((line) => line.qty > 0);
  const returned = sale.lines.some((line) => line.qty < 0);
  if (sold && returned) return "Exchange";
  return returned ? "Return" : "Sale";
}

export type SaleStatus = "Paid" | "Partly paid" | "On credit" | "Refunded" | "Even exchange";

export function saleStatus(sale: Pick<Sale, "total" | "amountPaid">): SaleStatus {
  if (sale.total < 0) return "Refunded";
  if (sale.total === 0) return "Even exchange";
  if (sale.amountPaid >= sale.total) return "Paid";
  return sale.amountPaid > 0 ? "Partly paid" : "On credit";
}

export const pairsSold = (sale: Pick<Sale, "lines">) => sale.lines.reduce((sum, line) => sum + Math.max(0, line.qty), 0);

/** How many units of each variant on a sale can still be returned. */
export function returnableQuantities(books: Pick<Books, "sales">, saleId: string): Map<string, number> {
  const original = books.sales.find((sale) => sale.id === saleId);
  const remaining = new Map<string, number>();
  if (!original) return remaining;
  for (const line of original.lines) {
    if (line.qty > 0) remaining.set(line.variantId, (remaining.get(line.variantId) ?? 0) + line.qty);
  }
  for (const sale of books.sales) {
    for (const line of sale.lines) {
      if (line.qty < 0 && line.returnOfSaleId === saleId) {
        remaining.set(line.variantId, Math.max(0, (remaining.get(line.variantId) ?? 0) + line.qty));
      }
    }
  }
  return remaining;
}

// ---------------------------------------------------------------- stock

/** Pairs on hand per variant id, optionally as at a date. */
export function stockLevels(books: Pick<Books, "sales" | "purchases" | "adjustments">, asOf?: IsoDate): Map<string, number> {
  const stock = new Map<string, number>();
  const add = (variantId: string, qty: number) => stock.set(variantId, (stock.get(variantId) ?? 0) + qty);
  for (const adjustment of books.adjustments) if (inRange(adjustment.date, undefined, asOf)) add(adjustment.variantId, adjustment.qty);
  for (const purchase of books.purchases) {
    if (purchase.status !== "Received" || !inRange(purchase.receivedDate ?? purchase.date, undefined, asOf)) continue;
    for (const line of purchase.lines) add(line.variantId, line.qty);
  }
  for (const sale of books.sales) {
    if (!inRange(sale.date, undefined, asOf)) continue;
    for (const line of sale.lines) add(line.variantId, -line.qty);
  }
  return stock;
}

export type MovementType = "Sale" | "Return" | "Purchase" | "Adjustment";

export interface StockMovement {
  id: string;
  date: IsoDate;
  type: MovementType;
  reference: string;
  /** Link target inside the company, e.g. "sales/abc". */
  href?: string;
  variantId: string;
  qty: number;
  detail: string;
}

export function stockMovements(books: Books, filter?: { styleId?: string; variantId?: string }): StockMovement[] {
  const matches = (variantId: string) =>
    (!filter?.variantId || filter.variantId === variantId) && (!filter?.styleId || variantId.startsWith(`${filter.styleId}:`));
  const partyName = (id?: string) => books.parties.find((party) => party.id === id)?.name;
  const rows: StockMovement[] = [];
  for (const sale of books.sales) {
    sale.lines.forEach((line, index) => {
      if (!matches(line.variantId)) return;
      rows.push({
        id: `s-${sale.id}-${index}`, date: sale.date, type: line.qty < 0 ? "Return" : "Sale", reference: sale.number,
        href: `sales/${sale.id}`, variantId: line.variantId, qty: -line.qty, detail: sale.customerName,
      });
    });
  }
  for (const purchase of books.purchases) {
    if (purchase.status !== "Received") continue;
    purchase.lines.forEach((line, index) => {
      if (!matches(line.variantId)) return;
      rows.push({
        id: `p-${purchase.id}-${index}`, date: purchase.receivedDate ?? purchase.date, type: "Purchase", reference: purchase.number,
        href: `purchases/${purchase.id}`, variantId: line.variantId, qty: line.qty, detail: partyName(purchase.supplierId) ?? "Supplier",
      });
    });
  }
  for (const adjustment of books.adjustments) {
    if (!matches(adjustment.variantId)) continue;
    rows.push({
      id: `a-${adjustment.id}`, date: adjustment.date, type: "Adjustment", reference: adjustment.reason,
      variantId: adjustment.variantId, qty: adjustment.qty, detail: adjustment.note ?? "",
    });
  }
  return rows.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export function inventoryValue(books: Pick<Books, "styles">, stock: Map<string, number>) {
  let pairs = 0;
  let cost = 0;
  let retail = 0;
  for (const style of books.styles) {
    for (const variant of style.variants) {
      const onHand = Math.max(0, stock.get(variant.id) ?? 0);
      pairs += onHand;
      cost += onHand * style.cost;
      retail += onHand * (variant.priceOverride ?? style.price);
    }
  }
  return { pairs, cost, retail };
}

// ---------------------------------------------------------------- money

/** Signed effect of every document on each money account. */
export function accountBalances(books: Books, asOf?: IsoDate): Map<string, number> {
  const balances = new Map(books.accounts.map((account) => [account.id, account.openingBalance]));
  const add = (accountId: string | undefined, amount: number) => {
    if (!accountId || !amount) return;
    balances.set(accountId, (balances.get(accountId) ?? 0) + amount);
  };
  for (const sale of books.sales) if (inRange(sale.date, undefined, asOf)) add(sale.accountId, sale.amountPaid);
  for (const purchase of books.purchases) if (inRange(purchase.date, undefined, asOf)) add(purchase.accountId, -purchase.amountPaid);
  for (const expense of books.expenses) if (inRange(expense.date, undefined, asOf)) add(expense.accountId, -expense.amount);
  for (const entry of books.moneyEntries) {
    if (!inRange(entry.date, undefined, asOf)) continue;
    add(entry.fromAccountId, -entry.amount);
    add(entry.toAccountId, entry.amount);
  }
  return balances;
}

export interface CashbookRow {
  id: string;
  date: IsoDate;
  type: string;
  description: string;
  href?: string;
  amountIn: number;
  amountOut: number;
}

/** All money in / out of one account (or every account when omitted), newest first. */
export function cashbook(books: Books, accountId?: string): CashbookRow[] {
  const rows: CashbookRow[] = [];
  const matches = (id?: string) => Boolean(id) && (!accountId || id === accountId);
  const push = (row: Omit<CashbookRow, "amountIn" | "amountOut">, amount: number) =>
    rows.push({ ...row, amountIn: Math.max(0, amount), amountOut: Math.max(0, -amount) });
  const partyName = (id?: string) => books.parties.find((party) => party.id === id)?.name ?? "";
  const accountName = (id?: string) => books.accounts.find((account) => account.id === id)?.name ?? "";

  for (const sale of books.sales) {
    if (!sale.amountPaid || !matches(sale.accountId)) continue;
    push({ id: `s-${sale.id}`, date: sale.date, type: sale.amountPaid < 0 ? "Refund" : "Sale", description: `${sale.number} · ${sale.customerName}`, href: `sales/${sale.id}` }, sale.amountPaid);
  }
  for (const purchase of books.purchases) {
    if (!purchase.amountPaid || !matches(purchase.accountId)) continue;
    push({ id: `p-${purchase.id}`, date: purchase.date, type: "Purchase", description: `${purchase.number} · ${partyName(purchase.supplierId)}`, href: `purchases/${purchase.id}` }, -purchase.amountPaid);
  }
  for (const expense of books.expenses) {
    if (!matches(expense.accountId)) continue;
    push({ id: `e-${expense.id}`, date: expense.date, type: "Expense", description: [expense.category, expense.payee || expense.note].filter(Boolean).join(" · ") }, -expense.amount);
  }
  for (const entry of books.moneyEntries) {
    const label = moneyEntryLabel(entry.kind);
    const who = entry.partyId ? partyName(entry.partyId) : entry.kind === "transfer" ? `${accountName(entry.fromAccountId)} → ${accountName(entry.toAccountId)}` : entry.note ?? "";
    if (matches(entry.fromAccountId)) push({ id: `m-${entry.id}-out`, date: entry.date, type: label, description: who }, -entry.amount);
    if (matches(entry.toAccountId)) push({ id: `m-${entry.id}-in`, date: entry.date, type: label, description: who }, entry.amount);
  }
  return rows.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export const moneyEntryLabel = (kind: MoneyEntry["kind"]) =>
  ({
    "customer-receipt": "Customer payment",
    "supplier-payment": "Supplier payment",
    transfer: "Transfer",
    "owner-in": "Owner put in",
    "owner-out": "Owner took out",
  })[kind];

// ---------------------------------------------------------------- customers & suppliers

/**
 * Positive = they owe us (customer) / we owe them (supplier).
 * Receipts are applied to the running balance (khata), not to single invoices.
 */
export function partyBalances(books: Books): Map<string, number> {
  const balances = new Map(books.parties.map((party) => [party.id, party.openingBalance]));
  const add = (partyId: string | undefined, amount: number) => {
    if (!partyId) return;
    balances.set(partyId, (balances.get(partyId) ?? 0) + amount);
  };
  for (const sale of books.sales) add(sale.customerId, sale.total - sale.amountPaid);
  for (const purchase of books.purchases) {
    add(purchase.supplierId, (purchase.status === "Received" ? purchase.total : 0) - purchase.amountPaid);
  }
  for (const entry of books.moneyEntries) {
    if (entry.kind === "customer-receipt" || entry.kind === "supplier-payment") add(entry.partyId, -entry.amount);
  }
  return balances;
}

export interface PartyLedgerRow {
  id: string;
  date: IsoDate;
  description: string;
  href?: string;
  /** Increases the balance (customer bought on credit / we received goods). */
  charge: number;
  /** Decreases the balance (payment, return, advance). */
  payment: number;
  balance: number;
}

export function partyLedger(books: Books, partyId: string): PartyLedgerRow[] {
  const party = books.parties.find((entry) => entry.id === partyId);
  if (!party) return [];
  const events: Array<Omit<PartyLedgerRow, "balance">> = [];
  if (party.kind === "customer") {
    for (const sale of books.sales) {
      if (sale.customerId !== partyId) continue;
      if (sale.total !== 0) events.push({ id: `s-${sale.id}`, date: sale.date, description: `${saleKind(sale)} ${sale.number}`, href: `sales/${sale.id}`, charge: Math.max(0, sale.total), payment: Math.max(0, -sale.total) });
      if (sale.amountPaid !== 0) events.push({ id: `s-${sale.id}-paid`, date: sale.date, description: sale.amountPaid > 0 ? `Paid on ${sale.number}` : `Refund on ${sale.number}`, href: `sales/${sale.id}`, charge: Math.max(0, -sale.amountPaid), payment: Math.max(0, sale.amountPaid) });
    }
  } else {
    for (const purchase of books.purchases) {
      if (purchase.supplierId !== partyId) continue;
      if (purchase.status === "Received") events.push({ id: `p-${purchase.id}`, date: purchase.receivedDate ?? purchase.date, description: `Goods received ${purchase.number}`, href: `purchases/${purchase.id}`, charge: purchase.total, payment: 0 });
      if (purchase.amountPaid) events.push({ id: `p-${purchase.id}-paid`, date: purchase.date, description: `Paid on ${purchase.number}`, href: `purchases/${purchase.id}`, charge: 0, payment: purchase.amountPaid });
    }
  }
  for (const entry of books.moneyEntries) {
    if (entry.partyId !== partyId) continue;
    events.push({ id: `m-${entry.id}`, date: entry.date, description: entry.note ? `Payment · ${entry.note}` : "Payment", charge: 0, payment: entry.amount });
  }
  events.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  let balance = party.openingBalance;
  const rows: PartyLedgerRow[] = [];
  if (party.openingBalance) rows.push({ id: "opening", date: "", description: "Opening balance", charge: Math.max(0, party.openingBalance), payment: Math.max(0, -party.openingBalance), balance });
  for (const event of events) {
    balance += event.charge - event.payment;
    rows.push({ ...event, balance });
  }
  return rows;
}

// ---------------------------------------------------------------- profit & loss

export interface ProfitAndLoss {
  grossSales: number;
  discounts: number;
  returns: number;
  /** Sales tax included in shelf prices (tax-inclusive pricing only). */
  taxIncluded: number;
  netSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  /** Damaged, lost, sampled or miscounted stock at cost (positive = loss). */
  stockLoss: number;
  expenses: Array<{ category: ExpenseCategory; amount: number }>;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  pairsSold: number;
  bills: number;
}

export function profitAndLoss(books: Books, from: IsoDate, to: IsoDate): ProfitAndLoss {
  let grossSales = 0;
  let charged = 0;
  let discounts = 0;
  let netSales = 0;
  let cogs = 0;
  let pairs = 0;
  let bills = 0;
  for (const sale of books.sales) {
    if (!inRange(sale.date, from, to)) continue;
    netSales += sale.total - sale.tax;
    if (sale.lines.some((line) => line.qty > 0)) bills += 1;
    for (const line of sale.lines) {
      cogs += line.qty * line.unitCost;
      charged += line.qty * line.unitNet;
      if (line.qty > 0) {
        grossSales += line.qty * line.price;
        discounts += line.qty * (line.price - line.unitNet);
        pairs += line.qty;
      }
    }
  }
  grossSales = Math.round(grossSales);
  discounts = Math.round(discounts);
  netSales = Math.round(netSales);
  cogs = Math.round(cogs);
  charged = Math.round(charged);
  // Returns take up rupee rounding so the lines add up exactly:
  // gross − discounts − returns − tax in price = net sales.
  const returns = grossSales - discounts - charged;
  const taxIncluded = Math.max(0, charged - netSales);

  const costOf = (variantId: string) => books.styles.find((style) => variantId.startsWith(`${style.id}:`))?.cost ?? 0;
  const stockLoss = Math.round(
    books.adjustments
      .filter((adjustment) => adjustment.reason !== "Opening stock" && inRange(adjustment.date, from, to))
      .reduce((sum, adjustment) => sum - adjustment.qty * costOf(adjustment.variantId), 0),
  );

  const byCategory = new Map<ExpenseCategory, number>();
  for (const expense of books.expenses) {
    if (!inRange(expense.date, from, to)) continue;
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
  }
  const expenses = [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - stockLoss - totalExpenses;

  return {
    grossSales, discounts, returns, taxIncluded, netSales,
    costOfGoodsSold: cogs, grossProfit, grossMargin: netSales ? grossProfit / netSales : 0,
    stockLoss, expenses, totalExpenses, netProfit, netMargin: netSales ? netProfit / netSales : 0,
    pairsSold: pairs, bills,
  };
}

export interface MonthPoint {
  month: string;
  label: string;
  netSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export function monthlyResults(books: Books, months: number, endingOn: IsoDate = todayIso()): MonthPoint[] {
  return Array.from({ length: months }, (_, index) => {
    const start = addMonths(endingOn, index - months + 1);
    const end = monthEnd(start);
    const pl = profitAndLoss(books, start, end);
    return {
      month: start.slice(0, 7),
      label: new Date(`${start}T12:00:00`).toLocaleDateString("en-GB", { month: "short" }),
      netSales: pl.netSales,
      grossProfit: pl.grossProfit,
      expenses: pl.totalExpenses + pl.stockLoss,
      netProfit: pl.netProfit,
    };
  });
}

// ---------------------------------------------------------------- footwear reports

export interface StylePerformance {
  styleId: string;
  name: string;
  category: Style["category"];
  pairs: number;
  revenue: number;
  profit: number;
  onHand: number;
  lastSold?: IsoDate;
}

export function stylePerformance(books: Books, from: IsoDate, to: IsoDate, stock: Map<string, number>): StylePerformance[] {
  const rows = new Map<string, StylePerformance>(
    books.styles.map((style) => [style.id, {
      styleId: style.id, name: style.name, category: style.category, pairs: 0, revenue: 0, profit: 0,
      onHand: style.variants.reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0),
    }]),
  );
  for (const sale of books.sales) {
    for (const line of sale.lines) {
      const row = rows.get(line.styleId);
      if (!row) continue;
      if (line.qty > 0 && (!row.lastSold || sale.date > row.lastSold)) row.lastSold = sale.date;
      if (!inRange(sale.date, from, to)) continue;
      row.pairs += line.qty;
      row.revenue += line.qty * line.unitNet;
      row.profit += line.qty * (line.unitNet - line.unitCost);
    }
  }
  return [...rows.values()].map((row) => ({ ...row, revenue: Math.round(row.revenue), profit: Math.round(row.profit) }));
}

export interface SizeSellThrough {
  size: string;
  sold: number;
  onHand: number;
  /** sold ÷ (sold + on hand) */
  sellThrough: number;
}

/** Which sizes sell and which sit on the shelf — the core footwear buying report. */
export function sizeSellThrough(books: Books, style: Style, from: IsoDate, to: IsoDate, stock: Map<string, number>): SizeSellThrough[] {
  return style.sizes.map((size) => {
    const variantIds = new Set(style.variants.filter((variant) => variant.size === size).map((variant) => variant.id));
    let sold = 0;
    for (const sale of books.sales) {
      if (!inRange(sale.date, from, to)) continue;
      for (const line of sale.lines) if (variantIds.has(line.variantId)) sold += line.qty;
    }
    const onHand = [...variantIds].reduce((sum, id) => sum + Math.max(0, stock.get(id) ?? 0), 0);
    return { size, sold, onHand, sellThrough: sold + onHand > 0 ? sold / (sold + onHand) : 0 };
  });
}

export function nextDocumentNumber(existing: readonly string[], prefix: string, width = 5, start = 1) {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  const highest = existing.reduce((max, number) => {
    const match = pattern.exec(number);
    return match ? Math.max(max, Number(match[1])) : max;
  }, start - 1);
  return `${prefix}-${String(highest + 1).padStart(width, "0")}`;
}

export interface LowStockRow {
  style: Style;
  variantId: string;
  color: string;
  size: string;
  qty: number;
}

/** Active sizes at or below the threshold, emptiest first, best sellers first within that. */
export function lowStock(books: Pick<Books, "styles">, stock: Map<string, number>, threshold: number): LowStockRow[] {
  const rows: LowStockRow[] = [];
  for (const style of books.styles) {
    if (!style.active) continue;
    for (const variant of style.variants) {
      const qty = stock.get(variant.id) ?? 0;
      if (qty <= threshold) rows.push({ style, variantId: variant.id, color: variant.color, size: variant.size, qty });
    }
  }
  return rows.sort((a, b) => a.qty - b.qty || a.style.name.localeCompare(b.style.name));
}

/**
 * What is still unpaid on each credit sale, per customer.
 * Customers pay against their khata, not a specific invoice, so payments,
 * credit notes and advances are applied to the oldest unpaid invoices first.
 * The amounts add up to the customer's balance (ignoring any opening balance).
 */
export function unpaidBySale(books: Pick<Books, "parties" | "sales" | "moneyEntries">): Map<string, number> {
  const unpaid = new Map<string, number>();
  for (const party of books.parties) {
    if (party.kind !== "customer") continue;
    const sales = books.sales.filter((sale) => sale.customerId === party.id).sort((a, b) => (a.date === b.date ? a.number.localeCompare(b.number) : a.date.localeCompare(b.date)));
    const charges = sales.filter((sale) => sale.total - sale.amountPaid > 0).map((sale) => ({ id: sale.id, left: sale.total - sale.amountPaid }));
    // Credits: payments received, plus returns / overpayments that reduced the balance.
    let credit = -Math.min(0, party.openingBalance)
      + books.moneyEntries.filter((entry) => entry.kind === "customer-receipt" && entry.partyId === party.id).reduce((sum, entry) => sum + entry.amount, 0)
      + sales.reduce((sum, sale) => sum + Math.max(0, sale.amountPaid - sale.total), 0);
    credit -= Math.max(0, party.openingBalance); // opening balance is the oldest debt
    for (const charge of charges) {
      const applied = Math.max(0, Math.min(charge.left, credit));
      credit -= applied;
      unpaid.set(charge.id, charge.left - applied);
    }
  }
  return unpaid;
}
