"use client";

import { Banknote, BookUser, Building2, CreditCard, type LucideIcon } from "lucide-react";
import type { MoneyAccount, Party, PaymentMethod } from "@/domain/types";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

export interface PaymentState {
  method: PaymentMethod;
  transferAccount: string;
  /** Cash handed over by the customer (money in only). */
  tendered: string;
  /** Part paid now when the rest goes on khata (money in only). */
  paidNow: string;
}

export const initialPayment = (accounts: readonly MoneyAccount[]): PaymentState => ({
  method: "cash",
  transferAccount: accounts.find((account) => account.kind === "wallet")?.id ?? accounts.find((account) => account.kind !== "cash")?.id ?? "",
  tendered: "",
  paidNow: "",
});

/** Who may use khata: buying on credit needs approval, refunds to a named customer's account are always fine. */
export const khataAllowed = (direction: "in" | "out", customer?: Party) => Boolean(customer && (direction === "out" || customer.creditAllowed));

export interface ResolvedPayment {
  method: PaymentMethod;
  accountId?: string;
  /** Only set for khata (part payment) – otherwise the full amount moves. */
  amountPaid?: number;
  tendered?: number;
  error?: string;
}

/** Turns the panel's inputs into what `createSale` needs, plus a validation message. */
export function resolvePayment(state: PaymentState, amount: number, direction: "in" | "out", customer?: Party): ResolvedPayment {
  const method: PaymentMethod =
    (direction === "out" && state.method === "card") || (state.method === "credit" && !khataAllowed(direction, customer)) ? "cash" : state.method;
  if (amount === 0) return { method: "cash" };
  if (method === "transfer") return state.transferAccount ? { method, accountId: state.transferAccount } : { method, error: "Choose the bank or wallet." };
  if (method === "credit") {
    if (direction === "out") return { method, amountPaid: 0 };
    const paidNow = Math.max(0, Math.min(Number(state.paidNow || 0), amount));
    return { method, amountPaid: paidNow };
  }
  if (method === "cash" && direction === "in") {
    const tendered = state.tendered.trim() === "" ? amount : Number(state.tendered);
    if (!Number.isFinite(tendered) || tendered < amount) return { method, tendered, error: "Cash received is less than the amount due." };
    return { method, tendered };
  }
  return { method };
}

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

export function PaymentPanel({ amount, direction, customer, accounts, value, onChange }: {
  /** Always positive: the money that has to move. */
  amount: number;
  direction: "in" | "out";
  customer?: Party;
  accounts: readonly MoneyAccount[];
  value: PaymentState;
  onChange: (next: PaymentState) => void;
}) {
  const money = useMoney();
  const resolved = resolvePayment(value, amount, direction, customer);
  const transferAccounts = accounts.filter((account) => account.kind !== "cash");
  const options: ReadonlyArray<{ value: PaymentMethod; label: string; icon: LucideIcon; hint?: string }> = direction === "in"
    ? [
        { value: "cash", label: "Cash", icon: Banknote },
        { value: "card", label: "Card", icon: CreditCard },
        { value: "transfer", label: "Transfer", icon: Building2 },
        { value: "credit", label: "Khata", icon: BookUser, hint: "Choose a customer who is allowed khata" },
      ]
    : [
        { value: "cash", label: "Cash back", icon: Banknote },
        { value: "transfer", label: "Transfer back", icon: Building2 },
        { value: "credit", label: "To khata", icon: BookUser, hint: "Choose a saved customer to credit their account" },
      ];
  const tendered = value.tendered.trim() === "" ? undefined : Number(value.tendered);

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-1.5", options.length === 4 ? "grid-cols-4" : "grid-cols-3")} role="group" aria-label={direction === "in" ? "Payment method" : "How to give the money back"}>
        {options.map((option) => {
          const Icon = option.icon;
          const disabled = option.value === "credit" && !khataAllowed(direction, customer);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              title={disabled ? option.hint : undefined}
              aria-pressed={resolved.method === option.value}
              onClick={() => onChange({ ...value, method: option.value })}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[0.7rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                resolved.method === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />{option.label}
            </button>
          );
        })}
      </div>

      {resolved.method === "cash" && direction === "in" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor={`tendered-${direction}`} className="shrink-0 text-xs font-semibold text-heading">Cash received</label>
            <input id={`tendered-${direction}`} type="number" inputMode="numeric" min={0} placeholder={String(amount)} value={value.tendered} onChange={(event) => onChange({ ...value, tendered: event.target.value })} aria-invalid={Boolean(resolved.error)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-right font-mono text-sm font-bold text-heading outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([amount, roundUp(amount, 500), roundUp(amount, 1000), roundUp(amount, 5000)])].map((option) => (
              <button key={option} type="button" onClick={() => onChange({ ...value, tendered: String(option) })} className="rounded-md border px-2 py-1 font-mono text-[0.7rem] font-semibold text-heading hover:border-primary/40 hover:bg-muted">{option === amount ? "Exact" : money(option)}</button>
            ))}
          </div>
          {tendered !== undefined && !resolved.error && tendered > amount ? <p className="rounded-md bg-success/12 px-3 py-1.5 text-sm font-bold text-success-foreground">Give change: {money(tendered - amount)}</p> : null}
        </div>
      ) : null}

      {resolved.method === "cash" && direction === "out" ? <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Take {money(amount)} out of the cash drawer and hand it to the customer.</p> : null}

      {resolved.method === "transfer" ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <label htmlFor={`account-${direction}`} className="sr-only">Account</label>
          <select id={`account-${direction}`} value={value.transferAccount} onChange={(event) => onChange({ ...value, transferAccount: event.target.value })} className="h-9 min-w-0 flex-1 bg-transparent text-xs font-semibold text-heading outline-none">
            {transferAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.detail ? ` · ${account.detail}` : ""}</option>)}
          </select>
        </div>
      ) : null}

      {resolved.method === "credit" && direction === "in" ? (
        <div className="space-y-1.5 rounded-lg border border-dashed px-3 py-2">
          <div className="flex items-center gap-2">
            <label htmlFor="paid-now" className="shrink-0 text-xs font-semibold text-heading">Paid now in cash</label>
            <input id="paid-now" type="number" min={0} max={amount} placeholder="0" value={value.paidNow} onChange={(event) => onChange({ ...value, paidNow: event.target.value })} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-right font-mono text-sm font-bold outline-none" />
          </div>
          <p className="text-xs text-muted-foreground">{money(amount - (resolved.amountPaid ?? 0))} will be added to {customer?.name}’s khata.</p>
        </div>
      ) : null}
      {resolved.method === "credit" && direction === "out" ? <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{money(amount)} will be taken off what {customer?.name} owes (or kept as their advance for next time).</p> : null}

      {resolved.error ? <p className="text-xs text-destructive">{resolved.error}</p> : null}
    </div>
  );
}
