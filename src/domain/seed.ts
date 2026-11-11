/**
 * Generates ~4 months of believable, internally consistent demo history for a
 * small shoe shop by simulating each day: opening stock, walk-in sales,
 * size exchanges, wholesale credit invoices, restock purchases, expenses and
 * payments. Stock never goes negative and cash never goes below zero.
 *
 * Deterministic for a given "today", so server and browser render the same data.
 */
import { addDays, monthStart, todayIso } from "./ledger";
import { CARD_SETTLEMENT_ACCOUNT, fixtureAccounts, fixtureParties, fixtureStyles } from "./fixtures";
import { priceSale, type CartLineInput } from "./pricing";
import type { Expense, IsoDate, MoneyEntry, Purchase, PurchaseLine, Sale, StockAdjustment, Style, Variant } from "./types";

export interface SeedData {
  sales: Sale[];
  purchases: Purchase[];
  adjustments: StockAdjustment[];
  expenses: Expense[];
  moneyEntries: MoneyEntry[];
}

const HISTORY_DAYS = 120;
const SALE_PREFIX = "KF";

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How popular each style is relative to others (weights for picking). */
const popularity: Record<string, number> = {
  "stride-runner": 10, "stride-airlite": 7, "court-classic": 8, "metro-oxford": 4, "urban-loafer": 4,
  "peshawari-classic": 6, "grace-khussa": 5, "bella-block": 3, "trail-blazer": 1, "breeze-slide": 7,
  "comfy-home": 4, "kiddo-bounce": 5, "school-champ": 4, "ankle-socks": 0, "shoe-care": 0,
};

/** Stock target per size: more pairs in the middle of the size run. */
function sizeTarget(style: Style, size: string) {
  if (style.sizeSystem === "One size") return 24;
  const index = style.sizes.indexOf(size);
  const middle = (style.sizes.length - 1) / 2;
  const distance = Math.abs(index - middle) / Math.max(middle, 1);
  const base = distance < 0.35 ? 4 : distance < 0.75 ? 3 : 1;
  return (popularity[style.id] ?? 3) >= 7 ? base + 1 : base;
}

export function generateSeed(today: IsoDate = todayIso()): SeedData {
  const random = mulberry32(20261111);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const weighted = <T,>(items: readonly T[], weight: (item: T) => number) => {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let roll = random() * total;
    for (const item of items) {
      roll -= weight(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  };

  const styles = fixtureStyles;
  const stock = new Map<string, number>();
  const cash = new Map(fixtureAccounts.map((account) => [account.id, account.openingBalance]));
  const supplierOwed = new Map<string, number>();
  const customerOwed = new Map<string, number>();
  const move = (accountId: string, amount: number) => cash.set(accountId, (cash.get(accountId) ?? 0) + amount);

  const sales: Sale[] = [];
  const purchases: Purchase[] = [];
  const adjustments: StockAdjustment[] = [];
  const expenses: Expense[] = [];
  const moneyEntries: MoneyEntry[] = [];
  let saleNo = 10000;
  let poNo = 0;
  let id = 0;
  const nextId = (prefix: string) => `${prefix}-${(++id).toString(36)}`;

  const start = addDays(today, -HISTORY_DAYS);

  // Opening stock
  for (const style of styles) {
    for (const variant of style.variants) {
      const qty = Math.max(0, sizeTarget(style, variant.size) - (random() < 0.12 ? 2 : 0));
      if (!qty) continue;
      stock.set(variant.id, qty);
      adjustments.push({ id: nextId("adj"), date: start, variantId: variant.id, qty, reason: "Opening stock" });
    }
  }

  const lineFor = (style: Style, variant: Variant, qty: number, price = variant.priceOverride ?? style.price): CartLineInput => ({
    variantId: variant.id, styleId: style.id, name: style.name, color: variant.color, size: variant.size,
    sku: variant.sku, qty, price, unitCost: style.cost,
  });

  const addSale = (date: IsoDate, partial: Omit<Sale, "id" | "number" | "date" | "time" | "subtotal" | "discount" | "tax" | "total" | "lines" | "amountPaid">, inputs: CartLineInput[], discount: number, paid?: number) => {
    const priced = priceSale(inputs, discount, 0, true);
    const amountPaid = paid ?? priced.total;
    const hour = 11 + Math.floor(random() * 10);
    const sale: Sale = {
      ...partial, id: nextId("sale"), number: `${SALE_PREFIX}-${++saleNo}`, date,
      time: `${String(hour).padStart(2, "0")}:${String(Math.floor(random() * 60)).padStart(2, "0")}`,
      lines: priced.lines, subtotal: priced.subtotal, discount: priced.discount, tax: priced.tax, total: priced.total, amountPaid,
    };
    for (const line of sale.lines) stock.set(line.variantId, (stock.get(line.variantId) ?? 0) - line.qty);
    if (sale.accountId) move(sale.accountId, amountPaid);
    if (sale.customerId) customerOwed.set(sale.customerId, (customerOwed.get(sale.customerId) ?? 0) + sale.total - amountPaid);
    sales.push(sale);
    return sale;
  };

  const restock = (date: IsoDate, supplierId: string, received: boolean) => {
    const lines: PurchaseLine[] = [];
    for (const style of styles.filter((entry) => entry.supplierId === supplierId)) {
      for (const variant of style.variants) {
        const target = sizeTarget(style, variant.size) + (style.sizeSystem === "One size" ? 0 : 1);
        const short = target - (stock.get(variant.id) ?? 0);
        // Small shops don't refill every size every time, so some sizes run out.
        if ((short >= 2 && random() > 0.22) || (style.sizeSystem === "One size" && short >= 8)) {
          lines.push({ variantId: variant.id, styleId: style.id, name: style.name, color: variant.color, size: variant.size, sku: variant.sku, qty: short, unitCost: style.cost });
        }
      }
    }
    if (!lines.length) return;
    const total = lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
    const onCredit = supplierId === "sup-lahore" || supplierId === "sup-sialkot";
    const bank = cash.get("meezan") ?? 0;
    const amountPaid = !received ? 0 : onCredit ? Math.min(Math.round(total * 0.4 / 1000) * 1000, Math.max(0, bank - 50000)) : Math.min(total, Math.max(0, bank - 50000));
    const purchase: Purchase = {
      id: nextId("po"), number: `PO-${String(++poNo).padStart(4, "0")}`, date, supplierId,
      supplierRef: `INV-${Math.floor(1000 + random() * 8000)}`, status: received ? "Received" : "Ordered",
      receivedDate: received ? date : undefined, lines, total, amountPaid, accountId: amountPaid ? "meezan" : undefined,
      notes: received ? "" : "Confirmed on WhatsApp, arriving next week.",
    };
    if (received) {
      for (const line of lines) stock.set(line.variantId, (stock.get(line.variantId) ?? 0) + line.qty);
      supplierOwed.set(supplierId, (supplierOwed.get(supplierId) ?? 0) + total - amountPaid);
    }
    if (amountPaid) move("meezan", -amountPaid);
    purchases.push(purchase);
  };

  const spend = (date: IsoDate, category: Expense["category"], amount: number, preferred: string, payee?: string) => {
    const accountId = (cash.get(preferred) ?? 0) >= amount + 5000 ? preferred : "meezan";
    move(accountId, -amount);
    expenses.push({ id: nextId("exp"), date, category, amount, accountId, payee });
  };

  const recentPosSales: Sale[] = [];
  let cardSalesThisMonth = 0;
  const suppliers = fixtureParties.filter((party) => party.kind === "supplier").map((party) => party.id);
  const wholesale = ["cus-alnoor", "cus-fashionhub"];

  for (let day = 0; day <= HISTORY_DAYS; day += 1) {
    const date = addDays(start, day);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const isToday = date === today;

    // Month start: rent, salaries, card charges for last month
    if (date.endsWith("-01") || day === 0) {
      spend(date, "Rent", 45000, "meezan", "Shop landlord");
      spend(date, "Salaries", 28000, "cash", "Usman (sales)");
      spend(date, "Salaries", 24000, "cash", "Hamid (helper)");
      if (cardSalesThisMonth) spend(date, "Bank & card charges", Math.round(cardSalesThisMonth * 0.018), "meezan", "Card machine fees");
      cardSalesThisMonth = 0;
    }
    if (date.endsWith("-10")) spend(date, "Electricity & gas", 9000 + Math.round(random() * 6000 / 100) * 100, "cash", "LESCO bill");
    if (date.endsWith("-12")) spend(date, "Internet & phone", 3500, "jazzcash", "PTCL + mobile");
    if (date.endsWith("-05")) spend(date, "Marketing", 6000, "meezan", "Instagram ads");
    if (day % 14 === 3) spend(date, "Shopping bags & packaging", 2500, "cash", "Printed bags");
    if (day % 30 === 17) spend(date, "Transport", 1800 + Math.round(random() * 10) * 100, "cash", "Loader rickshaw");

    // Restock every 3 weeks; the newest order is still on its way.
    if (day > 0 && day % 21 === 7) for (const supplierId of suppliers) restock(date, supplierId, true);
    if (day === HISTORY_DAYS - 3) restock(date, "sup-lahore", false);

    // Walk-in sales
    const busy = weekday === 0 || weekday === 6 ? 2.2 : weekday === 5 ? 1.5 : 1;
    const count = Math.round((1.5 + random() * 3) * busy * (isToday ? 0.6 : 1));
    for (let index = 0; index < count; index += 1) {
      const inputs: CartLineInput[] = [];
      const pairs = random() < 0.18 ? 2 : 1;
      for (let pair = 0; pair < pairs; pair += 1) {
        const style = weighted(styles.filter((entry) => popularity[entry.id]), (entry) => popularity[entry.id]);
        const color = pick(style.colors);
        const middle = (style.sizes.length - 1) / 2;
        const size = weighted(style.sizes, (entry) => 1 / (1 + Math.abs(style.sizes.indexOf(entry) - middle)));
        const variant = style.variants.find((entry) => entry.color === color.name && entry.size === size);
        if (!variant || (stock.get(variant.id) ?? 0) <= 0 || inputs.some((line) => line.variantId === variant.id)) continue;
        inputs.push(lineFor(style, variant, 1));
      }
      if (!inputs.length) continue;
      if (random() < 0.22) {
        const addOn = pick(styles.filter((style) => style.category === "Accessories"));
        const variant = pick(addOn.variants);
        if ((stock.get(variant.id) ?? 0) > 0) inputs.push(lineFor(addOn, variant, 1));
      }
      const gross = inputs.reduce((sum, line) => sum + line.qty * line.price, 0);
      const discount = random() < 0.15 ? Math.round((gross * 0.1) / 100) * 100 : random() < 0.2 ? gross % 100 : 0;
      const roll = random();
      const method = roll < 0.58 ? "cash" : roll < 0.83 ? "card" : "transfer";
      const accountId = method === "cash" ? "cash" : method === "card" ? CARD_SETTLEMENT_ACCOUNT : "jazzcash";
      const regular = random() < 0.06 ? fixtureParties.find((party) => party.id === "cus-sana") : undefined;
      const sale = addSale(date, {
        channel: "pos", customerId: regular?.id, customerName: regular?.name ?? "Walk-in customer",
        method, accountId, cashier: random() < 0.7 ? "Usman" : "Owner",
      }, inputs, discount);
      if (method === "card") cardSalesThisMonth += sale.total;
      recentPosSales.push(sale);
    }

    // Size exchange or return roughly twice a week
    if (!isToday && random() < 0.28) {
      const candidates = recentPosSales.filter((sale) => sale.date >= addDays(date, -7) && sale.date < date && sale.lines.some((line) => line.qty > 0 && !line.styleId.startsWith("ankle") && !line.styleId.startsWith("shoe")));
      const original = candidates.length ? pick(candidates) : undefined;
      const line = original?.lines.find((entry) => entry.qty > 0 && !entry.styleId.startsWith("ankle") && !entry.styleId.startsWith("shoe"));
      const alreadyReturned = original && sales.some((sale) => sale.lines.some((entry) => entry.returnOfSaleId === original.id));
      if (original && line && !alreadyReturned) {
        const style = styles.find((entry) => entry.id === line.styleId)!;
        const index = style.sizes.indexOf(line.size);
        const nextSize = style.sizes[index + (random() < 0.6 ? 1 : -1)];
        const swap = style.variants.find((entry) => entry.color === line.color && entry.size === nextSize);
        const returned: CartLineInput = { ...line, qty: -1, returnOfSaleId: original.id };
        if (swap && (stock.get(swap.id) ?? 0) > 0 && random() < 0.75) {
          addSale(date, { channel: "pos", customerName: original.customerName, customerId: original.customerId, method: "cash", accountId: "cash", cashier: "Usman", notes: `Size exchange: ${line.size} → ${nextSize}` },
            [returned, { ...lineFor(style, swap, 1, line.unitNet) }], 0);
        } else if ((cash.get("cash") ?? 0) > line.unitNet) {
          addSale(date, { channel: "pos", customerName: original.customerName, customerId: original.customerId, method: "cash", accountId: "cash", cashier: "Owner", notes: "Did not fit, refunded" },
            [returned], 0);
        }
      }
    }

    // Wholesale size-run invoices on credit
    if (day % 11 === 5 && !isToday) {
      const customerId = wholesale[(day / 11) % 2 < 1 ? 0 : 1];
      const style = pick(styles.filter((entry) => entry.category === "Sneakers"));
      const color = pick(style.colors);
      const inputs = style.variants
        .filter((variant) => variant.color === color.name && (stock.get(variant.id) ?? 0) >= 3)
        .map((variant) => lineFor(style, variant, 1 + (random() < 0.4 ? 1 : 0), Math.round(style.price * 0.78 / 10) * 10));
      if (inputs.length >= 3) {
        const total = inputs.reduce((sum, line) => sum + line.qty * line.price, 0);
        const paid = Math.round((total * (random() < 0.5 ? 0.3 : 0)) / 1000) * 1000;
        addSale(date, {
          channel: "invoice", customerId, customerName: fixtureParties.find((party) => party.id === customerId)!.name,
          method: paid ? "transfer" : "credit", accountId: paid ? "meezan" : undefined, cashier: "Owner",
          dueDate: addDays(date, 15), notes: "Wholesale size run",
        }, inputs, 0, paid);
      }
    }

    // Collect customer balances and pay suppliers about once a week
    if (weekday === 2 && !isToday) {
      for (const customerId of [...wholesale, "cus-kamran"]) {
        const owed = customerOwed.get(customerId) ?? 0;
        if (owed < 5000 || random() < 0.4) continue;
        const amount = Math.round((owed * (random() < 0.5 ? 1 : 0.5)) / 500) * 500;
        if (!amount) continue;
        customerOwed.set(customerId, owed - amount);
        move("meezan", amount);
        moneyEntries.push({ id: nextId("me"), date, kind: "customer-receipt", amount, toAccountId: "meezan", partyId: customerId, note: "Bank transfer" });
      }
      for (const supplierId of suppliers) {
        const owed = supplierOwed.get(supplierId) ?? 0;
        const available = (cash.get("meezan") ?? 0) - 80000;
        if (owed < 10000 || available < 10000 || random() < 0.5) continue;
        const amount = Math.min(Math.round((owed * 0.5) / 1000) * 1000, Math.round(available / 1000) * 1000);
        supplierOwed.set(supplierId, owed - amount);
        move("meezan", -amount);
        moneyEntries.push({ id: nextId("me"), date, kind: "supplier-payment", amount, fromAccountId: "meezan", partyId: supplierId, note: "Online transfer" });
      }
    }

    // Deposit surplus counter cash and wallet money every Monday
    if (weekday === 1 && !isToday) {
      const wallet = (cash.get("jazzcash") ?? 0) - 10000;
      if (wallet > 20000) {
        const amount = Math.floor(wallet / 5000) * 5000;
        move("jazzcash", -amount);
        move("meezan", amount);
        moneyEntries.push({ id: nextId("me"), date, kind: "transfer", amount, fromAccountId: "jazzcash", toAccountId: "meezan", note: "Wallet to bank" });
      }
      const surplus = (cash.get("cash") ?? 0) - 30000;
      if (surplus > 20000) {
        const amount = Math.floor(surplus / 5000) * 5000;
        move("cash", -amount);
        move("meezan", amount);
        moneyEntries.push({ id: nextId("me"), date, kind: "transfer", amount, fromAccountId: "cash", toAccountId: "meezan", note: "Cash deposit" });
      }
    }

    // A few stock problems
    if (day === 37 || day === 88) {
      const style = styles.find((entry) => entry.id === (day === 37 ? "bella-block" : "court-classic"))!;
      const variant = style.variants.find((entry) => (stock.get(entry.id) ?? 0) > 0);
      if (variant) {
        stock.set(variant.id, (stock.get(variant.id) ?? 0) - 1);
        adjustments.push({ id: nextId("adj"), date, variantId: variant.id, qty: -1, reason: day === 37 ? "Damaged" : "Lost / theft", note: day === 37 ? "Heel came loose on display pair" : "Missing after weekend count" });
      }
    }
    if (date === monthStart(date) && day > 0) {
      const style = styles.find((entry) => entry.id === "breeze-slide")!;
      const variant = style.variants.find((entry) => (stock.get(entry.id) ?? 0) > 1);
      if (variant) {
        stock.set(variant.id, (stock.get(variant.id) ?? 0) + 1);
        adjustments.push({ id: nextId("adj"), date, variantId: variant.id, qty: 1, reason: "Count correction", note: "Found in back shelf during monthly count" });
      }
    }
  }

  const newestFirst = <T extends { date: string; id: string }>(rows: T[]) => rows.reverse();
  return {
    sales: newestFirst(sales),
    purchases: newestFirst(purchases),
    adjustments,
    expenses: newestFirst(expenses),
    moneyEntries: newestFirst(moneyEntries),
  };
}

let cached: { today: IsoDate; data: SeedData } | undefined;

export function demoSeed(): SeedData {
  const today = todayIso();
  if (!cached || cached.today !== today) cached = { today, data: generateSeed(today) };
  return cached.data;
}
