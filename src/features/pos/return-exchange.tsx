"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, CheckCircle2, Minus, PackageCheck, PackageX, Plus, Repeat2, ScanBarcode, Search, Undo2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findByCode, variantPrice } from "@/domain/catalog";
import { addDays, returnableQuantities, stockLevels, todayIso } from "@/domain/ledger";
import { priceSale, type CartLineInput } from "@/domain/pricing";
import { cartLine, createSale } from "@/domain/sale-builder";
import { newId, recordAdjustments, recordSale, useBooks } from "@/domain/store";
import { categories, type Category, type Sale, type SaleLine, type Style } from "@/domain/types";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { Swatch } from "@/features/catalog/components/size-color-grid";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { initialPayment, PaymentPanel, resolvePayment, type PaymentState } from "./components/payment-panel";
import { SizePicker } from "./components/size-picker";

type Choice = "refund" | "exchange";

const Step = ({ number, title, done, children }: { number: number; title: string; done?: boolean; children: ReactNode }) => (
  <section className="rounded-xl border bg-white shadow-sm">
    <header className="flex items-center gap-3 border-b px-5 py-3.5">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-success text-white" : "bg-heading text-white")}>{done ? <CheckCircle2 className="size-4" /> : number}</span>
      <h2 className="font-semibold text-heading">{title}</h2>
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const variantText = (line: Pick<SaleLine, "color" | "size">) => (line.size === "OS" ? line.color : `${line.color} · size ${line.size}`);

/**
 * Guided flow for the counter:
 *   1. Find the receipt   2. Pick what comes back   3. Refund or exchange
 *   4. Settle the difference — one document, stock and money handled automatically.
 */
export function ReturnExchange({ companyId, initialSaleId, onComplete }: { companyId: string; initialSaleId?: string; onComplete: (sale: Sale) => void }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const session = useDemoSession();
  const owner = isOwner(session);
  const stock = useMemo(() => stockLevels(books), [books]);

  const [lookup, setLookup] = useState(() => books.sales.find((sale) => sale.id === initialSaleId)?.number ?? "");
  const [backQty, setBackQty] = useState<Record<string, number>>({});
  const [damaged, setDamaged] = useState<Record<string, boolean>>({});
  const [choice, setChoice] = useState<Choice | null>(null);
  const [newItems, setNewItems] = useState<CartLineInput[]>([]);
  const [styleQuery, setStyleQuery] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [picker, setPicker] = useState<{ styleId: string; color?: string; size?: string } | null>(null);
  const [payment, setPayment] = useState<PaymentState>(() => initialPayment(books.accounts));

  const sale = useMemo(() => {
    const needle = lookup.trim().toLowerCase();
    return needle ? books.sales.find((entry) => (entry.number.toLowerCase() === needle || entry.id === needle) && entry.lines.some((line) => line.qty > 0)) : undefined;
  }, [books.sales, lookup]);
  const returnable = useMemo(() => (sale ? returnableQuantities(books, sale.id) : new Map<string, number>()), [books, sale]);
  const cutoff = addDays(todayIso(), -settings.rules.returnDays);
  const outsideWindow = Boolean(sale && sale.date < cutoff);
  const blocked = outsideWindow && !owner;
  const customer = books.parties.find((party) => party.id === sale?.customerId);
  const recent = useMemo(() => books.sales.filter((entry) => entry.date >= cutoff && entry.lines.some((line) => line.qty > 0)).slice(0, 6), [books.sales, cutoff]);

  const soldLines = sale ? sale.lines.filter((line) => line.qty > 0) : [];
  const returnLines: CartLineInput[] = soldLines
    .filter((line) => (backQty[line.variantId] ?? 0) > 0)
    .map((line) => ({ ...line, qty: -(backQty[line.variantId] ?? 0), returnOfSaleId: sale!.id }));
  const exchangeLines = choice === "exchange" ? newItems : [];
  const priced = priceSale([...returnLines, ...exchangeLines], 0, settings.rules.taxRate, settings.rules.taxInclusive);
  const returnValue = Math.round(returnLines.reduce((sum, line) => sum - line.qty * (line.unitNet ?? line.price), 0));
  const newValue = Math.round(exchangeLines.reduce((sum, line) => sum + line.qty * line.price, 0));
  const total = priced.total; // > 0 customer pays, < 0 shop pays back
  const direction: "in" | "out" = total >= 0 ? "in" : "out";
  const resolved = resolvePayment(payment, Math.abs(total), direction, customer);
  const inNew = (variantId: string) => newItems.filter((line) => line.variantId === variantId).reduce((sum, line) => sum + line.qty, 0);

  const ready = Boolean(sale) && returnLines.length > 0 && choice !== null && (choice === "refund" || newItems.length > 0) && !resolved.error && !blocked;

  const reset = () => {
    setLookup(""); setBackQty({}); setDamaged({}); setChoice(null); setNewItems([]); setStyleQuery(""); setPayment(initialPayment(books.accounts));
  };

  const addNew = (style: Style, variantId: string) => {
    const variant = style.variants.find((entry) => entry.id === variantId);
    if (!variant) return;
    if (inNew(variantId) >= (stock.get(variantId) ?? 0)) { toast.error("No more of that size in stock."); return; }
    setNewItems((current) => current.some((line) => line.variantId === variantId)
      ? current.map((line) => (line.variantId === variantId ? { ...line, qty: line.qty + 1 } : line))
      : [...current, cartLine(style, variant, 1, variantPrice(style, variant))]);
  };

  const complete = () => {
    if (!sale || !ready) return;
    const out = exchangeLines.map((line) => `${line.name} ${variantText(line)}`).join(", ");
    const back = returnLines.map((line) => `${line.name} ${variantText(line)}`).join(", ");
    const document = createSale({
      books, prefix: settings.rules.invoicePrefix, channel: "pos", customer, lines: [...returnLines, ...exchangeLines],
      discount: 0, taxRate: settings.rules.taxRate, taxInclusive: settings.rules.taxInclusive,
      method: resolved.method, accountId: resolved.accountId, amountPaid: resolved.amountPaid, tendered: resolved.tendered,
      cashier: session?.name ?? "Cashier",
      notes: choice === "exchange" ? `Exchange for ${sale.number}: ${back} → ${out}` : `Return from ${sale.number}: ${back}`,
    });
    recordSale(companyId, document);
    const damagedLines = returnLines.filter((line) => damaged[line.variantId]);
    if (damagedLines.length) {
      recordAdjustments(companyId, damagedLines.map((line) => ({
        id: newId("adj"), date: document.date, variantId: line.variantId, qty: line.qty, reason: "Damaged" as const,
        note: `Came back damaged on ${document.number} (receipt ${sale.number})`,
      })));
    }
    onComplete(document);
    reset();
  };

  // Any product can be taken in exchange — the difference (up or down) is settled on the right.
  const activeStyles = books.styles.filter((style) => style.active);
  const usedCategories = categories.filter((entry) => activeStyles.some((style) => style.category === entry));
  const filteredStyles = activeStyles.filter((style) => (category === "All" || style.category === category) &&
    (!styleQuery.trim() || [style.name, style.brand, style.code].some((value) => value.toLowerCase().includes(styleQuery.trim().toLowerCase()))));
  const changeNewQty = (variantId: string, qty: number) => setNewItems((current) => qty <= 0
    ? current.filter((line) => line.variantId !== variantId)
    : current.map((line) => (line.variantId === variantId ? { ...line, qty: Math.min(qty, stock.get(variantId) ?? 0) } : line)));
  const scanNew = (code: string) => {
    const match = findByCode(books.styles, code);
    if (!match) return false;
    addNew(match.style, match.variant.id);
    return true;
  };
  const pickerStyle = books.styles.find((style) => style.id === picker?.styleId);
  const accountName = (id?: string) => books.accounts.find((account) => account.id === id)?.name ?? "cash drawer";

  // ------------------------------------------------------------ "what will be recorded"
  const records: Array<{ icon: typeof PackageCheck; tone: string; text: string }> = [];
  for (const line of returnLines) {
    records.push(damaged[line.variantId]
      ? { icon: PackageX, tone: "text-destructive", text: `${-line.qty} × ${line.name} (${variantText(line)}) comes back damaged — not put on sale, cost counted as a loss` }
      : { icon: PackageCheck, tone: "text-success", text: `+${-line.qty} × ${line.name} (${variantText(line)}) back in stock` });
  }
  for (const line of exchangeLines) records.push({ icon: ArrowUpRight, tone: "text-heading", text: `−${line.qty} × ${line.name} (${variantText(line)}) leaves stock` });
  if (returnLines.length) {
    const money_ = Math.abs(total);
    if (total === 0) records.push({ icon: Repeat2, tone: "text-muted-foreground", text: "No money changes hands" });
    else if (direction === "in") records.push({ icon: ArrowDownLeft, tone: "text-success", text: resolved.method === "credit" ? `${money(money_ - (resolved.amountPaid ?? 0))} added to ${customer?.name}’s khata` : `${money(money_)} received into ${resolved.method === "transfer" ? accountName(resolved.accountId) : resolved.method === "card" ? "the bank (card)" : "the cash drawer"}` });
    else records.push({ icon: Banknote, tone: "text-destructive", text: resolved.method === "credit" ? `${money(money_)} taken off ${customer?.name}’s khata` : `${money(money_)} paid out of ${resolved.method === "transfer" ? accountName(resolved.accountId) : "the cash drawer"}` });
    records.push({ icon: Undo2, tone: "text-muted-foreground", text: `Sales reduced by ${money(returnValue)}${newValue ? `, new sale of ${money(newValue)}` : ""} — profit report updates itself` });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {/* 1. Receipt */}
        <Step number={1} title="Find the receipt" done={Boolean(sale)}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus aria-label="Receipt number" className="h-12 pl-9 font-mono text-base" placeholder={`Type or scan the receipt number, e.g. ${books.sales[0]?.number ?? "KF-10001"}`}
              value={lookup} onChange={(event) => { setLookup(event.target.value); setBackQty({}); setDamaged({}); setChoice(null); setNewItems([]); }} />
          </div>
          {sale ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <span><strong className="font-mono">{sale.number}</strong> · {formatDate(sale.date)} · {sale.customerName} · paid {money(sale.total)}</span>
              {outsideWindow ? <span className="rounded-full bg-warning/14 px-2.5 py-1 text-xs font-bold text-warning-foreground">{owner ? `Older than ${settings.rules.returnDays} days · owner approval` : `Older than ${settings.rules.returnDays} days — ask the owner`}</span> : <span className="text-xs font-semibold text-success">Within {settings.rules.returnDays}-day return window</span>}
            </div>
          ) : lookup.trim() ? <p className="mt-3 text-sm text-destructive">No sale found with that receipt number.</p> : (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent receipts</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {recent.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setLookup(entry.number)} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-muted/40">
                    <span><span className="font-mono font-semibold text-heading">{entry.number}</span><span className="block text-xs text-muted-foreground">{formatDate(entry.date)} · {entry.customerName}</span></span>
                    <span className="font-semibold tabular-nums text-heading">{money(entry.total)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Step>

        {/* 2. What comes back */}
        {sale && !blocked ? (
          <Step number={2} title="What is the customer bringing back?" done={returnLines.length > 0}>
            <ul className="space-y-2">
              {soldLines.map((line) => {
                const left = returnable.get(line.variantId) ?? 0;
                const qty = backQty[line.variantId] ?? 0;
                return (
                  <li key={line.variantId} className={cn("rounded-lg border p-3", qty > 0 && "border-primary/40 bg-primary/5")}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-heading">{line.name}</p>
                        <p className="text-xs text-muted-foreground">{variantText(line)} · paid {money(line.unitNet)} each{left < line.qty ? ` · ${line.qty - left} already returned` : ""}</p>
                      </div>
                      {left > 0 ? (
                        <div className="inline-flex items-center rounded-md border bg-background">
                          <button type="button" aria-label={`Fewer ${line.name} back`} disabled={qty <= 0} onClick={() => setBackQty({ ...backQty, [line.variantId]: qty - 1 })} className="grid size-9 place-items-center text-muted-foreground disabled:opacity-35"><Minus className="size-3.5" /></button>
                          <span className="w-16 text-center text-xs font-bold text-heading">{qty} of {left}</span>
                          <button type="button" aria-label={`Return ${line.name} ${line.size}`} disabled={qty >= left} onClick={() => setBackQty({ ...backQty, [line.variantId]: qty + 1 })} className="grid size-9 place-items-center text-muted-foreground disabled:opacity-35"><Plus className="size-3.5" /></button>
                        </div>
                      ) : <span className="text-xs font-semibold text-muted-foreground">Already returned</span>}
                    </div>
                    {qty > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Condition">
                        {[{ value: false, label: "Good — back on the shelf", icon: PackageCheck }, { value: true, label: "Damaged / worn — don’t resell", icon: PackageX }].map((option) => (
                          <button key={String(option.value)} type="button" aria-pressed={Boolean(damaged[line.variantId]) === option.value} onClick={() => setDamaged({ ...damaged, [line.variantId]: option.value })}
                            className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold", Boolean(damaged[line.variantId]) === option.value ? (option.value ? "border-destructive bg-destructive/10 text-destructive" : "border-success bg-success/10 text-success-foreground") : "text-muted-foreground hover:bg-muted")}>
                            <option.icon className="size-3.5" />{option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Step>
        ) : null}

        {/* 3. Refund or exchange */}
        {returnLines.length ? (
          <Step number={3} title="What does the customer want?" done={choice !== null}>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { value: "refund", title: "Money back", text: `Refund ${money(returnValue)}`, icon: Undo2 },
                { value: "exchange", title: "Exchange", text: "Another size, colour or style", icon: ArrowLeftRight },
              ] as const).map((option) => (
                <button key={option.value} type="button" aria-pressed={choice === option.value} onClick={() => setChoice(option.value)}
                  className={cn("flex items-center gap-3 rounded-xl border p-4 text-left transition-colors", choice === option.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}>
                  <span className="grid size-10 place-items-center rounded-lg bg-muted"><option.icon className="size-5 text-heading" /></span>
                  <span><span className="block font-semibold text-heading">{option.title}</span><span className="text-sm text-muted-foreground">{option.text}</span></span>
                </button>
              ))}
            </div>
          </Step>
        ) : null}

        {/* 3b. Exchange items */}
        {choice === "exchange" ? (
          <Step number={4} title="What are they taking instead?" done={newItems.length > 0}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick size swap</p>
            <div className="mt-2 space-y-2">
              {returnLines.map((line) => {
                const style = books.styles.find((entry) => entry.id === line.styleId);
                if (!style) return null;
                const options = style.variants.filter((variant) => variant.color === line.color && variant.size !== line.size && (stock.get(variant.id) ?? 0) - inNew(variant.id) > 0);
                return (
                  <div key={line.variantId} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{line.name} {line.color}, instead of {line.size}:</span>
                    {options.length ? options.map((variant) => (
                      <button key={variant.id} type="button" onClick={() => addNew(style, variant.id)} className="rounded-md border px-2.5 py-1 text-xs font-semibold text-heading hover:border-primary hover:bg-primary/5">
                        {variant.size} <span className="font-normal text-muted-foreground">({stock.get(variant.id)})</span>
                      </button>
                    )) : <span className="text-xs text-muted-foreground">no other sizes in stock</span>}
                    <button type="button" onClick={() => setPicker({ styleId: style.id, color: line.color, size: line.size })} className="text-xs font-semibold text-primary hover:underline">Other colour…</button>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Or any other product — cheaper or dearer</p>
            <div className="relative mt-2">
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search styles for exchange" className="pl-9" placeholder="Scan a box, or search style name, brand or code" value={styleQuery}
                onChange={(event) => setStyleQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && scanNew(styleQuery)) { event.preventDefault(); setStyleQuery(""); } }} />
            </div>
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {(["All", ...usedCategories] as const).map((entry) => (
                <button key={entry} type="button" aria-pressed={category === entry} onClick={() => setCategory(entry)}
                  className={cn("h-8 shrink-0 rounded-md border px-3 text-xs font-semibold", category === entry ? "border-heading bg-heading text-white" : "text-muted-foreground hover:text-heading")}>
                  {entry === "All" ? "All" : entry}
                </button>
              ))}
            </div>
            <div className="mt-2 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredStyles.map((style) => {
                const pairs = style.variants.reduce((sum, v) => sum + Math.max(0, (stock.get(v.id) ?? 0) - inNew(v.id)), 0);
                const diff = style.price - returnValue;
                return (
                  <button key={style.id} type="button" disabled={pairs <= 0} onClick={() => setPicker({ styleId: style.id })}
                    className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-left text-sm hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-heading">{style.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{money(style.price)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">{style.colors.map((color) => <Swatch key={color.name} hex={color.hex} className="size-2.5" />)}<span className="ml-1">{pairs ? `${pairs} in stock` : "sold out"}</span></span>
                      {returnLines.length && newItems.length === 0 ? (
                        <span className={cn("font-semibold", diff > 0 ? "text-success-foreground" : diff < 0 ? "text-destructive" : "")}>
                          {diff > 0 ? `+${money(diff)}` : diff < 0 ? `−${money(-diff)}` : "same value"}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
              {!filteredStyles.length ? <p className="text-sm text-muted-foreground">No styles match.</p> : null}
            </div>
            {newItems.length ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Going out with the customer</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {newItems.map((line) => (
                    <li key={line.variantId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span><span className="font-semibold text-heading">{line.name}</span> · {variantText(line)} · {money(line.price)}</span>
                      <span className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md border bg-background">
                          <button type="button" aria-label={`Fewer ${line.name} ${line.size}`} onClick={() => changeNewQty(line.variantId, line.qty - 1)} className="grid size-8 place-items-center text-muted-foreground"><Minus className="size-3" /></button>
                          <span className="w-7 text-center text-xs font-bold">{line.qty}</span>
                          <button type="button" aria-label={`More ${line.name} ${line.size}`} disabled={line.qty >= (stock.get(line.variantId) ?? 0)} onClick={() => changeNewQty(line.variantId, line.qty + 1)} className="grid size-8 place-items-center text-muted-foreground disabled:opacity-35"><Plus className="size-3" /></button>
                        </span>
                        <span className="w-20 text-right font-semibold tabular-nums">{money(line.qty * line.price)}</span>
                        <button type="button" aria-label={`Remove ${line.name} ${line.size}`} onClick={() => changeNewQty(line.variantId, 0)} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">You can add more than one item, including socks or care kits. If the new items cost less, the customer gets the difference back.</p>
              </div>
            ) : null}
          </Step>
        ) : null}
      </div>

      {/* Settlement */}
      <aside className="flex w-full flex-col border-t bg-white lg:min-h-0 lg:w-[26rem] lg:border-l lg:border-t-0 xl:w-[28rem]">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="text-lg font-bold tracking-tight text-heading">Settle up</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Coming back</dt><dd className="font-semibold tabular-nums text-heading">{money(returnValue)}</dd></div>
            {choice === "exchange" ? <div className="flex justify-between"><dt className="text-muted-foreground">Going out</dt><dd className="font-semibold tabular-nums text-heading">{money(newValue)}</dd></div> : null}
            {priced.tax && !settings.rules.taxInclusive ? <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax on difference</dt><dd className="tabular-nums">{money(priced.tax)}</dd></div> : null}
          </dl>

          {!returnLines.length || !choice ? (
            <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Pick the pairs coming back and whether it’s a refund or an exchange. The difference shows here.</p>
          ) : (
            <>
              <div className={cn("mt-4 rounded-xl p-4", total === 0 ? "bg-muted" : direction === "in" ? "bg-success/12" : "bg-destructive/10")}>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {total === 0 ? "Even exchange" : choice === "refund" ? "Refund" : direction === "in" ? "Difference to collect" : "Difference to give back"}
                </p>
                <p className={cn("numeric mt-1 text-3xl font-black", total === 0 ? "text-heading" : direction === "in" ? "text-success-foreground" : "text-destructive")}>
                  {total === 0 ? "Nothing to pay" : money(Math.abs(total))}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {total === 0 ? "Same value — just swap the pairs." : direction === "in" ? "What they’re taking costs more. Customer pays the difference." : choice === "refund" ? "Give the customer their money back." : "What they’re taking costs less. Give the customer the difference."}
                </p>
              </div>
              {total !== 0 ? <div className="mt-4"><PaymentPanel amount={Math.abs(total)} direction={direction} customer={customer} accounts={books.accounts} value={payment} onChange={setPayment} /></div> : null}

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What will be recorded</p>
                <ul className="mt-2 space-y-2">
                  {records.map((record, index) => (
                    <li key={index} className="flex gap-2 text-xs leading-5"><record.icon className={cn("mt-0.5 size-3.5 shrink-0", record.tone)} /><span>{record.text}</span></li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 border-t p-5">
          <Button className="h-14 w-full text-base font-bold" size="lg" variant={direction === "out" && total !== 0 ? "destructive" : "default"} disabled={!ready} onClick={complete}>
            <CheckCircle2 className="size-5" />
            {!choice ? "Complete" : total === 0 ? "Complete exchange" : direction === "in" ? `Collect ${money(total)} & complete` : resolved.method === "credit" ? `Credit ${money(-total)} & complete` : `Give back ${money(-total)} & complete`}
          </Button>
          {sale || lookup ? <button type="button" onClick={reset} className="mt-2 w-full text-center text-xs font-semibold text-muted-foreground hover:text-heading">Start over</button> : null}
        </div>
      </aside>

      {pickerStyle ? (
        <SizePicker style={pickerStyle} stock={stock} inCart={inNew} initialColor={picker?.color} highlightSize={picker?.size}
          onPick={(variantId) => { addNew(pickerStyle, variantId); setPicker(null); }} onClose={() => setPicker(null)} />
      ) : null}
    </div>
  );
}

