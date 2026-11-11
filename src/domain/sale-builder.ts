import { findVariant, variantPrice } from "./catalog";
import { CARD_SETTLEMENT_ACCOUNT } from "./fixtures";
import { nextDocumentNumber, todayIso, type Books } from "./ledger";
import { priceSale, type CartLineInput } from "./pricing";
import type { Party, PaymentMethod, Sale, SaleChannel, Style, Variant } from "./types";

export function cartLine(style: Style, variant: Variant, qty = 1, price = variantPrice(style, variant)): CartLineInput {
  return {
    variantId: variant.id, styleId: style.id, name: style.name, color: variant.color, size: variant.size,
    sku: variant.sku, qty, price, unitCost: style.cost,
  };
}

/** Rebuilds a cart line from the catalog; returns undefined if the variant was deleted. */
export function cartLineFor(books: Pick<Books, "styles">, variantId: string, qty = 1) {
  const found = findVariant(books.styles, variantId);
  return found ? cartLine(found.style, found.variant, qty) : undefined;
}

export interface NewSaleInput {
  books: Books;
  prefix: string;
  channel: SaleChannel;
  customer?: Party;
  lines: CartLineInput[];
  discount: number;
  taxRate: number;
  taxInclusive: boolean;
  method: PaymentMethod;
  /** For transfers: which bank / wallet. Cash goes to the cash drawer, card to the card settlement bank. */
  accountId?: string;
  /** Defaults to the full total (or the full refund). Credit sales may record a part payment. */
  amountPaid?: number;
  tendered?: number;
  cashier: string;
  notes?: string;
  dueDate?: string;
  now?: Date;
}

export function createSale(input: NewSaleInput): Sale {
  const priced = priceSale(input.lines, input.discount, input.taxRate, input.taxInclusive);
  const now = input.now ?? new Date();
  const cashAccount = input.books.accounts.find((account) => account.kind === "cash")?.id ?? "cash";
  const cardAccount = input.books.accounts.some((account) => account.id === CARD_SETTLEMENT_ACCOUNT)
    ? CARD_SETTLEMENT_ACCOUNT
    : input.books.accounts.find((account) => account.kind === "bank")?.id;
  const amountPaid = input.method === "credit" ? Math.max(0, input.amountPaid ?? 0) : input.amountPaid ?? priced.total;
  const accountId = !amountPaid
    ? undefined
    : input.method === "cash"
      ? cashAccount
      : input.method === "credit"
        ? input.accountId ?? cashAccount
      : input.method === "card"
        ? cardAccount
        : input.accountId ?? cardAccount;

  return {
    id: `sale-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    number: nextDocumentNumber(input.books.sales.map((sale) => sale.number), input.prefix, 5, 10001),
    date: todayIso(),
    time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }),
    channel: input.channel,
    customerId: input.customer?.id,
    customerName: input.customer?.name ?? "Walk-in customer",
    lines: priced.lines.filter((line) => line.qty !== 0),
    subtotal: priced.subtotal,
    discount: priced.discount,
    tax: priced.tax,
    total: priced.total,
    method: input.method,
    accountId,
    amountPaid,
    tendered: input.method === "cash" && input.tendered !== undefined && priced.total > 0 ? input.tendered : undefined,
    dueDate: input.dueDate,
    notes: input.notes?.trim() || undefined,
    cashier: input.cashier,
  };
}
