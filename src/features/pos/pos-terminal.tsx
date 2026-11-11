"use client";

import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Footprints,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field } from "@/components/shared/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findByCode, sizeLabel } from "@/domain/catalog";
import { stockLevels } from "@/domain/ledger";
import { priceSale, type CartLineInput } from "@/domain/pricing";
import { cartLine, createSale } from "@/domain/sale-builder";
import { newId, recordSale, saveParty, useBooks } from "@/domain/store";
import { categories, type Category, type Sale, type Style } from "@/domain/types";
import { useDemoSession } from "@/features/auth/demo-session";
import { Swatch } from "@/features/catalog/components/size-color-grid";
import { useCompanySettings } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { initialPayment, PaymentPanel, resolvePayment, type PaymentState } from "./components/payment-panel";
import { SizePicker } from "./components/size-picker";
import { ReturnExchange } from "./return-exchange";
import { PosReceiptDialog } from "./components/pos-receipt-dialog";

type CartLine = CartLineInput & { key: string; sizeSystem: Style["sizeSystem"] };
type Mode = "sell" | "return";

const stripCartLine = (line: CartLine): CartLineInput => {
  const { key, sizeSystem, ...rest } = line;
  void key;
  void sizeSystem;
  return rest;
};

export const PosTerminal = ({ companyId, returnSaleId }: { companyId: string; returnSaleId?: string }) => {
  const money = useMoney();
  const settings = useCompanySettings(companyId);
  const books = useBooks(companyId);
  const session = useDemoSession();
  const searchRef = useRef<HTMLInputElement>(null);

  const stock = useMemo(() => stockLevels(books), [books]);
  const customers = useMemo(() => books.parties.filter((party) => party.kind === "customer"), [books.parties]);

  const [mode, setMode] = useState<Mode>(() => (returnSaleId !== undefined ? "return" : "sell"));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");
  const [pickerStyleId, setPickerStyleId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [payment, setPayment] = useState<PaymentState>(() => initialPayment(books.accounts));
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const customer = customers.find((entry) => entry.id === customerId);
  const activeStyles = useMemo(() => books.styles.filter((style) => style.active), [books.styles]);
  const filteredStyles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeStyles.filter((style) =>
      (category === "All" || style.category === category) &&
      (!needle || [style.name, style.brand, style.code, style.category].some((value) => value.toLowerCase().includes(needle))));
  }, [activeStyles, category, query]);
  const usedCategories = useMemo(() => categories.filter((entry) => activeStyles.some((style) => style.category === entry)), [activeStyles]);
  const pickerStyle = books.styles.find((style) => style.id === pickerStyleId);

  // ---------------------------------------------------------------- cart math
  const inCart = (variantId: string) => cart.filter((line) => line.variantId === variantId).reduce((sum, line) => sum + line.qty, 0);
  const soldGross = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const discountValue = Number(discountInput || 0);
  const discountAmount = discountType === "percent" ? Math.round((soldGross * Math.min(100, Math.max(0, discountValue))) / 100) : discountValue;
  const discountInvalid = !Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > soldGross || (discountType === "percent" && discountValue > 100);
  const priced = priceSale(cart, discountInvalid ? 0 : discountAmount, settings.rules.taxRate, settings.rules.taxInclusive);
  const total = priced.total;
  const pairs = cart.reduce((sum, line) => sum + line.qty, 0);
  const resolved = resolvePayment(payment, total, "in", customer);
  const canCharge = cart.length > 0 && !discountInvalid && !resolved.error;

  // ---------------------------------------------------------------- cart actions
  const addVariant = (style: Style, variantId: string) => {
    const variant = style.variants.find((entry) => entry.id === variantId);
    if (!variant) return;
    const available = stock.get(variantId) ?? 0;
    if (inCart(variantId) >= available) {
      toast.error(`No more ${style.name} in ${variant.color} ${sizeLabel(style, variant.size)} in stock.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((line) => line.key === variantId);
      if (existing) return current.map((line) => (line.key === variantId ? { ...line, qty: line.qty + 1 } : line));
      return [...current, { ...cartLine(style, variant), key: variantId, sizeSystem: style.sizeSystem }];
    });
  };

  const changeQty = (key: string, qty: number) => {
    setCart((current) => current.map((line) =>
      line.key === key ? { ...line, qty: Math.max(1, Math.min(qty, stock.get(line.variantId) ?? 0)) } : line));
  };

  const removeLine = (key: string) => setCart((current) => current.filter((line) => line.key !== key));

  const resetSale = () => {
    setCart([]);
    setDiscountInput("");
    setPayment(initialPayment(books.accounts));
    setCustomerId("");
  };

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const match = findByCode(books.styles, query);
    if (match) {
      addVariant(match.style, match.variant.id);
      setQuery("");
      return;
    }
    if (filteredStyles.length === 1) setPickerStyleId(filteredStyles[0].id);
  };

  // ---------------------------------------------------------------- charge
  const finish = (sale: Sale) => {
    setLastSale(sale);
    setShowReceipt(true);
  };

  const charge = () => {
    if (!canCharge) return;
    const sale = createSale({
      books, prefix: settings.rules.invoicePrefix, channel: "pos", customer, lines: cart.map(stripCartLine),
      discount: discountInvalid ? 0 : discountAmount, taxRate: settings.rules.taxRate, taxInclusive: settings.rules.taxInclusive,
      method: resolved.method, accountId: resolved.accountId, amountPaid: resolved.amountPaid, tendered: resolved.tendered,
      cashier: session?.name ?? "Cashier",
    });
    try {
      recordSale(companyId, sale);
    } catch {
      toast.error("The sale could not be saved in this browser. Nothing was recorded.");
      return;
    }
    finish(sale);
    resetSale();
  };

  const chargeLabel = resolved.method === "credit" ? `Add ${money(total - (resolved.amountPaid ?? 0))} to khata` : `Charge ${money(total)}`;

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f4f5f3] lg:h-screen lg:overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === "F2") { event.preventDefault(); setMode("sell"); searchRef.current?.focus(); searchRef.current?.select(); }
        if (event.key === "F9" && mode === "sell") { event.preventDefault(); charge(); }
      }}
    >
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-white sm:px-5">
        <div className="flex items-center gap-2.5">
          <Link href={`/c/${encodeURIComponent(companyId)}/home`} className="flex items-center gap-2 font-semibold" aria-label="Back to dashboard">
            <span className="grid size-8 place-items-center rounded-lg bg-primary"><Footprints className="size-4" /></span>
            <span className="hidden max-w-40 truncate text-sm sm:inline">{settings.business.name}</span>
          </Link>
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-emerald-300">Counter open</span>
        </div>

        <div role="tablist" aria-label="POS mode" className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          {([["sell", "Sell", ShoppingBag], ["return", "Return / exchange", ArrowLeftRight]] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold", mode === value ? "bg-white text-[#0c0d0e]" : "text-white/70 hover:text-white")}
            >
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden items-center gap-1.5 text-[0.7rem] text-white/50 lg:flex"><Clock className="size-3.5" /><span className="tabular-nums">{clock || "—"}</span></div>
          <span className="hidden max-w-32 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/75 sm:block">{session?.name ?? "Cashier"}</span>
          <Button aria-label="Reprint last receipt" title="Reprint last receipt" className="text-white/70 hover:bg-white/10 hover:text-white" disabled={!lastSale} size="icon" variant="ghost" onClick={() => setShowReceipt(true)}>
            <Printer className="size-4" />
          </Button>
          <Button asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" size="sm" variant="outline">
            <Link href={`/c/${encodeURIComponent(companyId)}/home`}><ArrowLeft className="size-4" /><span className="hidden sm:inline">Exit POS</span></Link>
          </Button>
        </div>
      </header>

      {mode === "return" ? (
        <ReturnExchange companyId={companyId} initialSaleId={returnSaleId || undefined} onComplete={finish} />
      ) : (
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6 lg:min-h-0">
            <>
              <div className="relative">
                <ScanBarcode className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  ref={searchRef}
                  aria-label="Scan barcode or search styles"
                  autoComplete="off"
                  autoFocus
                  className="h-14 rounded-xl bg-white pl-11 pr-16 text-base shadow-sm"
                  placeholder="Scan barcode, or search style name / brand / code"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKey}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-muted-foreground sm:block">F2</span>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {(["All", ...usedCategories] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setCategory(entry)}
                    className={cn(
                      "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-4 text-xs font-semibold transition-colors",
                      category === entry ? "border-[#0c0d0e] bg-[#0c0d0e] text-white" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-heading",
                    )}
                  >
                    {entry === "All" ? <LayoutGrid className="size-3.5" /> : null}
                    {entry === "All" ? "All styles" : entry}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:thin]">
                {filteredStyles.length ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredStyles.map((style) => {
                      const pairsInStock = style.variants.reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0);
                      const sizesInStock = style.sizes.filter((size) => style.variants.some((variant) => variant.size === size && (stock.get(variant.id) ?? 0) > 0));
                      const inBag = style.variants.reduce((sum, variant) => sum + inCart(variant.id), 0);
                      return (
                        <button
                          key={style.id}
                          type="button"
                          disabled={pairsInStock <= 0}
                          onClick={() => setPickerStyleId(style.id)}
                          className={cn(
                            "group relative flex min-h-36 flex-col rounded-xl border border-border bg-white p-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            pairsInStock <= 0 ? "cursor-not-allowed opacity-55" : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-md bg-[#f2f3f0] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">{style.category}{style.gender !== style.category ? ` · ${style.gender}` : ""}</span>
                            {inBag ? <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">{inBag}</span> : null}
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-heading">{style.name}</p>
                          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{style.brand} · {style.code}</p>
                          <div className="mt-2 flex items-center gap-1">{style.colors.map((color) => <Swatch key={color.name} hex={color.hex} />)}</div>
                          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                            <span className="text-base font-bold tracking-tight text-heading">{money(style.price)}</span>
                            <span className={cn("text-[0.68rem] font-semibold", pairsInStock <= 0 ? "text-destructive" : "text-muted-foreground")}>
                              {pairsInStock <= 0 ? "Sold out" : style.sizeSystem === "One size" ? `${pairsInStock} in stock` : `${sizesInStock.length}/${style.sizes.length} sizes · ${pairsInStock} pairs`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card/60 p-8 text-center">
                    <div>
                      <Search className="mx-auto size-6 text-muted-foreground" />
                      <p className="mt-3 text-sm font-bold text-heading">No styles found</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try another name, brand or code, or scan the box barcode.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
        </section>

        <aside className="flex w-full flex-col border-t bg-white lg:min-h-0 lg:w-[26rem] lg:border-l lg:border-t-0 xl:w-[28rem]">
          <div className="shrink-0 border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-tight text-heading">Current sale</p>
                <p className="text-[0.7rem] text-muted-foreground">{pairs ? `${pairs} item${pairs === 1 ? "" : "s"}` : "No items yet"}</p>
              </div>
              <Button className="text-muted-foreground hover:text-destructive" disabled={!cart.length} size="sm" variant="ghost" onClick={resetSale}><Trash2 className="size-3.5" />Clear</Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <label htmlFor="pos-customer" className="sr-only">Customer</label>
              <select id="pos-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20">
                <option value="">Walk-in customer</option>
                {customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.phone ? ` · ${entry.phone}` : ""}</option>)}
              </select>
              <Button aria-label="Add customer" title="Add customer" size="icon" variant="outline" onClick={() => setShowNewCustomer(true)}><UserPlus className="size-4" /></Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!cart.length ? (
              <div className="grid h-full min-h-48 place-items-center p-8 text-center">
                <div>
                  <ShoppingBag className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-bold text-heading">Bag is empty</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Scan a box, or tap a style and pick the size.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y px-4">
                {cart.map((line) => (
                  <li key={line.key} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.82rem] font-semibold leading-5 text-heading">{line.name}</p>
                        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{line.sizeSystem === "One size" ? line.color : `${line.color} · ${line.sizeSystem} ${line.size}`} · {money(line.price)}</p>
                      </div>
                      <button type="button" aria-label={`Remove ${line.name} ${line.size}`} className="grid size-9 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeLine(line.key)}><X className="size-3.5" /></button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-md border bg-background">
                        <button type="button" aria-label="Decrease quantity" className="grid size-9 place-items-center text-muted-foreground hover:text-heading disabled:opacity-35" disabled={line.qty <= 1} onClick={() => changeQty(line.key, line.qty - 1)}><Minus className="size-3" /></button>
                        <span className="w-8 text-center font-mono text-xs font-bold text-heading">{line.qty}</span>
                        <button type="button" aria-label="Increase quantity" className="grid size-9 place-items-center text-muted-foreground hover:text-heading disabled:opacity-35" disabled={line.qty >= (stock.get(line.variantId) ?? 0)} onClick={() => changeQty(line.key, line.qty + 1)}><Plus className="size-3" /></button>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-heading">{money(line.qty * line.price)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t bg-white p-5 shadow-[0_-8px_24px_rgb(12_13_14/0.04)]">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold tabular-nums text-heading">{money(priced.subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="flex items-center gap-1">
                  <div className="flex overflow-hidden rounded border text-[0.65rem] font-bold">
                    {(["amount", "percent"] as const).map((type) => (
                      <button key={type} type="button" aria-pressed={discountType === type} onClick={() => setDiscountType(type)} className={cn("px-1.5 py-1", discountType === type ? "bg-heading text-white" : "text-muted-foreground")}>{type === "amount" ? "Rs" : "%"}</button>
                    ))}
                  </div>
                  <input type="number" min="0" inputMode="decimal" aria-label="Discount" aria-invalid={discountInvalid} value={discountInput} placeholder="0" onChange={(event) => setDiscountInput(event.target.value)} className="h-7 w-20 rounded border border-input bg-background px-1.5 text-right font-mono text-xs font-bold text-heading outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
                </dd>
              </div>
              {priced.discount > 0 ? <div className="flex justify-between"><dt className="text-muted-foreground">Discount applied</dt><dd className="font-semibold tabular-nums text-success">−{money(priced.discount)}</dd></div> : null}
              {settings.rules.taxRate > 0 ? <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax ({settings.rules.taxRate}%{settings.rules.taxInclusive ? " incl." : ""})</dt><dd className="font-semibold tabular-nums text-heading">{money(priced.tax)}</dd></div> : null}
            </dl>
            {discountInvalid ? <p className="mt-1 text-[0.65rem] text-destructive">Discount can’t be more than the items being sold.</p> : null}

            <div className="mt-3 flex items-end justify-between gap-3 border-t pt-3">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total to pay</span>
              <span className="numeric text-3xl font-black tracking-tight text-heading">{money(total)}</span>
            </div>

            {total > 0 ? <div className="mt-3"><PaymentPanel amount={total} direction="in" customer={customer} accounts={books.accounts} value={payment} onChange={setPayment} /></div> : null}

            <Button className="mt-4 h-14 w-full text-base font-bold shadow-md" disabled={!canCharge} size="lg" onClick={charge}>
              <CheckCircle2 className="size-5" />{chargeLabel}
            </Button>
            <p className="mt-2 text-center text-[0.68rem] text-muted-foreground">F2 search · F9 charge · customer returning shoes? use <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode("return")}>Return / exchange</button></p>
          </div>
        </aside>
      </div>
      )}

      {pickerStyle ? (
        <SizePicker
          style={pickerStyle}
          stock={stock}
          inCart={inCart}
          onPick={(variantId) => addVariant(pickerStyle, variantId)}
          onClose={() => { setPickerStyleId(null); searchRef.current?.focus(); }}
        />
      ) : null}

      {showNewCustomer ? (
        <NewCustomerDialog
          onClose={() => setShowNewCustomer(false)}
          onSave={(name, phone, credit) => {
            const party = { id: newId("cus"), kind: "customer" as const, name, phone, openingBalance: 0, creditAllowed: credit };
            saveParty(companyId, party);
            setCustomerId(party.id);
            setShowNewCustomer(false);
          }}
        />
      ) : null}

      {showReceipt && lastSale ? (
        <PosReceiptDialog
          sale={lastSale}
          settings={settings}
          accountName={books.accounts.find((account) => account.id === lastSale.accountId)?.name}
          onClose={() => { setShowReceipt(false); searchRef.current?.focus(); }}
        />
      ) : null}
    </div>
  );
};

function NewCustomerDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string, phone: string, credit: boolean) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [credit, setCredit] = useState(false);
  const [error, setError] = useState("");
  return (
    <FormDialog
      title="Add customer"
      description="Save a regular customer to keep their purchase history or give khata (credit)."
      icon={UserPlus}
      onClose={onClose}
      onSubmit={() => (name.trim() ? onSave(name.trim(), phone.trim(), credit) : setError("Enter the customer’s name."))}
      footer={<><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save customer</Button></>}
    >
      <div className="space-y-4">
        <Field label="Name" error={error}><Input data-dialog-autofocus value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Mobile number"><Input inputMode="tel" placeholder="03xx-xxxxxxx" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-heading"><input type="checkbox" checked={credit} onChange={(event) => setCredit(event.target.checked)} className="size-4 accent-primary" />Allow khata (buy now, pay later)</label>
      </div>
    </FormDialog>
  );
}
