/**
 * Returns and exchanges, in shop language.
 *
 * Every return or exchange is ONE document with two halves:
 *   - pairs coming back  (negative lines, valued at what the customer paid)
 *   - pairs going out    (positive lines, at today's price — exchanges only)
 * The document total is the difference, which decides who pays whom.
 */
import { saleKind } from "./ledger";
import type { Sale } from "./types";

export type SettlementKind = "sale" | "refund" | "even" | "customer-pays" | "shop-pays";

export interface Settlement {
  kind: SettlementKind;
  /** Always positive: the money that changes hands. */
  amount: number;
  /** Value of pairs coming back. */
  returnValue: number;
  /** Value of pairs going out. */
  newValue: number;
}

export function settlementOf(sale: Pick<Sale, "lines" | "total">): Settlement {
  const returnValue = Math.round(sale.lines.reduce((sum, line) => sum + (line.qty < 0 ? -line.qty * line.unitNet : 0), 0));
  const newValue = Math.round(sale.lines.reduce((sum, line) => sum + (line.qty > 0 ? line.qty * line.unitNet : 0), 0));
  const kind = saleKind(sale);
  if (kind === "Sale") return { kind: "sale", amount: sale.total, returnValue, newValue };
  if (kind === "Return") return { kind: "refund", amount: Math.abs(sale.total), returnValue, newValue };
  if (sale.total === 0) return { kind: "even", amount: 0, returnValue, newValue };
  return { kind: sale.total > 0 ? "customer-pays" : "shop-pays", amount: Math.abs(sale.total), returnValue, newValue };
}

/** One-line description for lists and receipts, e.g. "Exchange · customer paid Rs 2,000 extra". */
export function settlementLabel(sale: Pick<Sale, "lines" | "total" | "method">, money: (amount: number) => string): string {
  const settlement = settlementOf(sale);
  const toKhata = sale.method === "credit";
  switch (settlement.kind) {
    case "sale": return "Sale";
    case "refund": return toKhata ? `Return · ${money(settlement.amount)} credited to khata` : `Return · refunded ${money(settlement.amount)}`;
    case "even": return "Exchange · same value, nothing paid";
    case "customer-pays": return `Exchange · customer paid ${money(settlement.amount)} extra`;
    case "shop-pays": return toKhata ? `Exchange · ${money(settlement.amount)} credited to khata` : `Exchange · gave back ${money(settlement.amount)}`;
  }
}
