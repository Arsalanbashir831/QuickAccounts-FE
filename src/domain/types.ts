/**
 * Core data model for a single-store footwear business.
 *
 * Everything that changes stock or money is a document (sale, purchase,
 * adjustment, expense, money entry). Stock levels, cash/bank balances,
 * customer/supplier balances and the profit & loss statement are always
 * derived from those documents in `ledger.ts` — nothing is stored twice.
 */

/** ISO calendar date, e.g. "2026-11-11". */
export type IsoDate = string;

export const categories = [
  "Sneakers",
  "Formal",
  "Casual",
  "Traditional",
  "Sandals & Slides",
  "Heels",
  "Boots",
  "Kids",
  "Accessories",
] as const;
export type Category = (typeof categories)[number];

export const genders = ["Men", "Women", "Kids", "Unisex"] as const;
export type Gender = (typeof genders)[number];

export const sizeSystems = ["EU", "UK", "One size"] as const;
export type SizeSystem = (typeof sizeSystems)[number];

export interface StyleColor {
  name: string;
  /** Swatch colour shown on cards and pickers. */
  hex: string;
}

/** One sellable unit: a style in one colour and one size. */
export interface Variant {
  id: string;
  styleId: string;
  color: string;
  size: string;
  sku: string;
  barcode: string;
  /** Overrides the style's selling price for this variant only. */
  priceOverride?: number;
}

/** A shoe model (article). Owns its size × colour variants. */
export interface Style {
  id: string;
  /** Short article code used as the SKU prefix, e.g. "STR-RUN". */
  code: string;
  name: string;
  brand: string;
  category: Category;
  gender: Gender;
  sizeSystem: SizeSystem;
  sizes: string[];
  colors: StyleColor[];
  /** Average unit cost used for stock value and cost of goods sold. */
  cost: number;
  price: number;
  supplierId?: string;
  active: boolean;
  variants: Variant[];
  createdAt: IsoDate;
}

export type PartyKind = "customer" | "supplier";

export interface Party {
  id: string;
  kind: PartyKind;
  name: string;
  phone?: string;
  city?: string;
  /** Amount they owed us (customer) or we owed them (supplier) before using the app. */
  openingBalance: number;
  /** Customers only: allowed to buy on credit (khata). */
  creditAllowed?: boolean;
  /** Customers only: another shop or reseller buying size runs at trade prices. */
  wholesale?: boolean;
  notes?: string;
}

export type MoneyAccountKind = "cash" | "bank" | "wallet";

export interface MoneyAccount {
  id: string;
  name: string;
  kind: MoneyAccountKind;
  detail?: string;
  openingBalance: number;
}

/** How a sale is settled. "credit" = added to the customer's balance (khata). */
export type PaymentMethod = "cash" | "card" | "transfer" | "credit";

export interface SaleLine {
  variantId: string;
  styleId: string;
  name: string;
  color: string;
  size: string;
  sku: string;
  /** Negative for items returned on this receipt. */
  qty: number;
  /** List price per unit before discount. */
  price: number;
  /** Price per unit actually charged after the bill discount, before tax. */
  unitNet: number;
  /** Cost per unit at the time of sale, for cost of goods sold. */
  unitCost: number;
  /** Receipt the item was originally bought on (returned lines only). */
  returnOfSaleId?: string;
}

export type SaleChannel = "pos" | "invoice";

/**
 * A sale, return or exchange. Lines with positive quantity are sold, lines
 * with negative quantity are returned, so an exchange is one document.
 */
export interface Sale {
  id: string;
  number: string;
  date: IsoDate;
  time: string;
  channel: SaleChannel;
  /** Undefined for walk-in customers. */
  customerId?: string;
  customerName: string;
  lines: SaleLine[];
  /** Σ qty × price (signed). */
  subtotal: number;
  /** Bill discount on sold lines (always ≥ 0). */
  discount: number;
  tax: number;
  /** Amount due for this document. Negative means money goes back to the customer. */
  total: number;
  method: PaymentMethod;
  accountId?: string;
  /** Money actually received now (negative for a refund). */
  amountPaid: number;
  /** Cash handed over by the customer, for change calculation. */
  tendered?: number;
  dueDate?: IsoDate;
  notes?: string;
  cashier: string;
}

export interface PurchaseLine {
  variantId: string;
  styleId: string;
  name: string;
  color: string;
  size: string;
  sku: string;
  qty: number;
  unitCost: number;
}

export type PurchaseStatus = "Ordered" | "Received";

export interface Purchase {
  id: string;
  number: string;
  date: IsoDate;
  supplierId: string;
  supplierRef?: string;
  status: PurchaseStatus;
  receivedDate?: IsoDate;
  lines: PurchaseLine[];
  total: number;
  /** Paid at the time of purchase. The rest is owed to the supplier. */
  amountPaid: number;
  accountId?: string;
  notes?: string;
}

export const adjustmentReasons = [
  "Opening stock",
  "Count correction",
  "Damaged",
  "Lost / theft",
  "Sample / gift",
] as const;
export type AdjustmentReason = (typeof adjustmentReasons)[number];

export interface StockAdjustment {
  id: string;
  date: IsoDate;
  variantId: string;
  /** Signed change in pairs. */
  qty: number;
  reason: AdjustmentReason;
  note?: string;
}

export const expenseCategories = [
  "Rent",
  "Salaries",
  "Electricity & gas",
  "Internet & phone",
  "Shopping bags & packaging",
  "Marketing",
  "Repairs & maintenance",
  "Transport",
  "Bank & card charges",
  "Other",
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];

export interface Expense {
  id: string;
  date: IsoDate;
  category: ExpenseCategory;
  amount: number;
  accountId: string;
  payee?: string;
  note?: string;
}

/**
 * Money that moves without a sale, purchase or expense:
 * collecting a customer's balance, paying a supplier, moving money
 * between accounts, or the owner putting money in / taking it out.
 */
export type MoneyEntryKind = "customer-receipt" | "supplier-payment" | "transfer" | "owner-in" | "owner-out";

export interface MoneyEntry {
  id: string;
  date: IsoDate;
  kind: MoneyEntryKind;
  amount: number;
  /** Account money leaves (supplier-payment, transfer, owner-out). */
  fromAccountId?: string;
  /** Account money enters (customer-receipt, transfer, owner-in). */
  toAccountId?: string;
  partyId?: string;
  note?: string;
}
