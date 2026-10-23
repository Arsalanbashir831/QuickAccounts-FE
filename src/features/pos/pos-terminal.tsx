"use client";

import {
  ArrowLeft,
  Banknote,
  BatteryCharging,
  Cable,
  CheckCircle2,
  Clock,
  CreditCard,
  Headphones,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingCart,
  Smartphone,
  Store,
  Trash2,
  UserRound,
  Wallet,
  Watch,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readInvoices, writeInvoices, type InvoiceRecord } from "@/features/sales/invoice-store";
import { useLocations } from "@/features/settings/location-store";
import { useCompanySettings } from "@/features/settings/settings-store";
import { cn } from "@/lib/utils";
import { PosReceiptDialog, type PosReceiptData } from "./components/pos-receipt-dialog";
import {
  posBankAccounts,
  posCategories,
  posCustomers,
  posProducts,
  type PosCategory,
  type PosProduct,
} from "./pos-catalog";

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
}

type PaymentMethod = "cash" | "card" | "credit";

const categoryStyles: Record<PosCategory, { icon: LucideIcon; tile: string }> = {
  Smartphones: { icon: Smartphone, tile: "bg-sky-100 text-sky-700" },
  Audio: { icon: Headphones, tile: "bg-violet-100 text-violet-700" },
  Charging: { icon: BatteryCharging, tile: "bg-amber-100 text-amber-700" },
  Accessories: { icon: Cable, tile: "bg-emerald-100 text-emerald-700" },
  Wearables: { icon: Watch, tile: "bg-rose-100 text-rose-700" },
};

const paymentOptions: ReadonlyArray<{ value: PaymentMethod; label: string; icon: LucideIcon }> = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "credit", label: "Credit", icon: Wallet },
];

const formatDate = (date: Date, format: "dd MMM yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd") => {
  if (format === "yyyy-MM-dd") return date.toLocaleDateString("en-CA");
  if (format === "dd/MM/yyyy") return date.toLocaleDateString("en-GB");
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;

export const PosTerminal = ({ companyId }: { companyId: string }) => {
  const companySettings = useCompanySettings(companyId);
  const locations = useLocations(companyId);
  const searchRef = useRef<HTMLInputElement>(null);

  const outletOptions = useMemo(() => {
    const outlets = locations.filter((location) => location.type === "Outlet");
    return outlets.length > 0 ? outlets : locations;
  }, [locations]);

  const [sellingFrom, setSellingFrom] = useState(() => {
    const preferred = locations.find((location) => location.id === companySettings.rules.defaultSalesLocation);
    return preferred?.id ?? outletOptions[0]?.id ?? "main-outlet";
  });
  const [stocks, setStocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(posProducts.map((product) => [product.id, product.stock])),
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<"All" | PosCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState<string>(posCustomers[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [bankAccount, setBankAccount] = useState<string>(posBankAccounts[0].value);
  const [discountInput, setDiscountInput] = useState("0");
  const [tenderedInput, setTenderedInput] = useState("");
  const [lastReceipt, setLastReceipt] = useState<PosReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [clockLabel, setClockLabel] = useState("");

  useEffect(() => {
    const update = () => setClockLabel(new Date().toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const cashier = companySettings.team.find((member) => member.role === "Sales / Cashier" && member.status === "Active")?.name ?? "Cashier";
  const cashierInitials = cashier.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const sellingFromName = locations.find((location) => location.id === sellingFrom)?.name ?? "Main Outlet";

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posProducts.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesQuery = !query
        || product.name.toLowerCase().includes(query)
        || product.sku.toLowerCase().includes(query)
        || product.barcode.includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const parsedDiscount = Number(discountInput || 0);
  const discountInvalid = !Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > subtotal;
  const discount = discountInvalid ? 0 : parsedDiscount;
  const taxRate = companySettings.rules.taxRate;
  const taxRateFraction = taxRate / 100;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * (companySettings.rules.taxInclusive ? taxRateFraction / (1 + taxRateFraction) : taxRateFraction));
  const total = Math.max(0, companySettings.rules.taxInclusive ? taxableAmount : taxableAmount + tax);
  const tendered = Number(tenderedInput || 0);
  const change = Math.max(0, tendered - total);
  const isCashShort = paymentMethod === "cash" && tendered < total;
  const needsCustomerAccount = paymentMethod === "credit" && customer === "Walk-in Customer";
  const canCharge = cart.length > 0 && !discountInvalid && !isCashShort && !needsCustomerAccount;

  const quickCash = useMemo(() => {
    if (total <= 0) return [];
    const roundUp = (step: number) => Math.ceil(total / step) * step;
    return Array.from(new Set([total, roundUp(500), roundUp(1000), roundUp(5000)])).slice(0, 4);
  }, [total]);

  const addProduct = (product: PosProduct) => {
    const available = stocks[product.id] ?? 0;
    if (available <= 0) return;
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        if (existing.qty >= available) return current;
        return current.map((line) => line.productId === product.id ? { ...line, qty: line.qty + 1 } : line);
      }
      return [...current, { productId: product.id, name: product.name, sku: product.sku, price: product.price, qty: 1 }];
    });
  };

  const changeQuantity = (productId: string, nextQuantity: number) => {
    const available = stocks[productId] ?? 0;
    setCart((current) => current.map((line) => line.productId === productId
      ? { ...line, qty: Math.min(Math.max(1, nextQuantity), available) }
      : line));
  };

  const removeLine = (productId: string) => {
    setCart((current) => current.filter((line) => line.productId !== productId));
  };

  const clearSale = () => {
    setCart([]);
    setDiscountInput("0");
    setTenderedInput("");
    setPaymentMethod("cash");
    setCustomer(posCustomers[0]);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const match = posProducts.find((product) => product.barcode.toLowerCase() === query || product.sku.toLowerCase() === query)
      ?? (filteredProducts.length === 1 ? filteredProducts[0] : undefined);
    if (match) {
      addProduct(match);
      setSearchQuery("");
    }
  };

  const handleCharge = () => {
    if (!canCharge) return;

    const soldAt = new Date();
    const reference = `${companySettings.rules.invoicePrefix}-${soldAt.getTime().toString().slice(-8)}`;
    const dateLabel = formatDate(soldAt, companySettings.business.dateFormat);
    const timeLabel = soldAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const paymentLabel = paymentMethod === "cash" ? "Cash" : paymentMethod === "card" ? "Card / Bank" : "Store Credit";
    const selectedBank = paymentMethod === "card"
      ? posBankAccounts.find((account) => account.value === bankAccount)?.label
      : undefined;
    const paid = paymentMethod === "credit" ? 0 : total;

    const receipt: PosReceiptData = {
      reference,
      dateLabel,
      timeLabel,
      outlet: sellingFromName,
      cashier,
      customer,
      items: cart.map(({ name, sku, qty, price }) => ({ name, sku, qty, price })),
      subtotal,
      discount,
      tax,
      taxRate,
      taxInclusive: companySettings.rules.taxInclusive,
      total,
      paid,
      change: paymentMethod === "cash" ? change : 0,
      paymentLabel,
      bankAccount: selectedBank,
      business: companySettings.business,
    };

    const invoice: InvoiceRecord = {
      id: crypto.randomUUID(),
      reference,
      date: dateLabel,
      customer,
      outlet: sellingFromName,
      total,
      paid,
      balance: paymentMethod === "credit" ? total : 0,
      status: paymentMethod === "credit" ? "Unpaid" : "Paid",
      paymentMethod: paymentMethod === "card" ? "bank" : paymentMethod,
      bankAccount: selectedBank,
      discount,
      tax,
      taxRate,
      taxInclusive: companySettings.rules.taxInclusive,
      items: cart.map(({ name, sku, qty, price }) => ({ name, sku, qty, price })),
      shipmentStatus: "Shipped",
      shippedAt: dateLabel,
    };

    try {
      writeInvoices(companyId, [invoice, ...readInvoices(companyId)]);
    } catch {
      toast.error("Sale completed, but it could not be saved to invoice history.");
    }

    setStocks((current) => {
      const next = { ...current };
      for (const line of cart) next[line.productId] = Math.max(0, (next[line.productId] ?? 0) - line.qty);
      return next;
    });
    setLastReceipt(receipt);
    setIsReceiptOpen(true);
    clearSale();
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f5f5f6] lg:h-screen lg:overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        }
        if (event.key === "F9") {
          event.preventDefault();
          if (canCharge) handleCharge();
        }
      }}
    >
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-white sm:px-5">
        <div className="flex items-center gap-2.5">
          <Link href={`/c/${encodeURIComponent(companyId)}/home`} className="flex items-center" aria-label="Back to dashboard">
            <Image src="/dotcode-dark-theme.png" alt="Dotcode" width={118} height={36} className="h-7 w-auto object-contain" priority />
          </Link>
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <span className="hidden items-center gap-1.5 text-sm font-semibold text-white/90 sm:flex">
            <ScanBarcode className="size-4 text-[#ff802b]" aria-hidden="true" />
            POS Terminal
          </span>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-emerald-300">
            Register open
          </span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 md:flex">
          <Store className="size-3.5 text-white/50" aria-hidden="true" />
          <label htmlFor="pos-outlet" className="sr-only">Selling outlet</label>
          <select
            id="pos-outlet"
            value={sellingFrom}
            onChange={(event) => setSellingFrom(event.target.value)}
            className="max-w-44 bg-transparent text-xs font-semibold text-white outline-none [&>option]:bg-white [&>option]:text-[#111]"
          >
            {outletOptions.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden items-center gap-1.5 text-[0.7rem] text-white/50 lg:flex">
            <Clock className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{clockLabel || "—"}</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 sm:flex">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.58rem] font-bold text-white">{cashierInitials || "CA"}</span>
            <span className="max-w-32 truncate text-xs font-semibold text-white/75">{cashier}</span>
          </div>
          <Button
            aria-label="Reprint last receipt"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            disabled={!lastReceipt}
            size="icon"
            title="Reprint last receipt"
            variant="ghost"
            onClick={() => setIsReceiptOpen(true)}
          >
            <Printer className="size-4" />
          </Button>
          <Button asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" size="sm" variant="outline">
            <Link href={`/c/${encodeURIComponent(companyId)}/home`}>
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Exit POS</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5 lg:min-h-0">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <ScanBarcode className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchRef}
                aria-label="Scan barcode or search products"
                autoComplete="off"
                autoFocus
                className="h-12 bg-card pl-11 pr-16 text-base shadow-card"
                placeholder="Scan barcode or search by name / SKU"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-muted-foreground sm:block">
                F2
              </span>
            </div>
            <p className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-heading">{filteredProducts.length}</span> products
              <span className="text-border">/</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Live stock
              </span>
            </p>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeCategory === "All"
                  ? "border-[#0c0d0e] bg-[#0c0d0e] text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-heading",
              )}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              All items
            </button>
            {posCategories.map((category) => {
              const Icon = categoryStyles[category].icon;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeCategory === category
                      ? "border-[#0c0d0e] bg-[#0c0d0e] text-white shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-heading",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {category}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-0.5 [scrollbar-width:thin]">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => {
                  const available = stocks[product.id] ?? 0;
                  const inCart = cart.find((line) => line.productId === product.id)?.qty ?? 0;
                  const meta = categoryStyles[product.category];
                  const Icon = meta.icon;
                  const soldOut = available <= 0;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={soldOut}
                      aria-label={`Add ${product.name} to sale`}
                      onClick={() => addProduct(product)}
                      className={cn(
                        "group relative flex min-h-40 flex-col rounded-xl border border-border bg-card p-3 text-left shadow-card transition-all",
                        soldOut
                          ? "cursor-not-allowed opacity-55"
                          : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", meta.tile)}>
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        {inCart > 0 ? (
                          <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground shadow-sm" aria-label={`${inCart} in cart`}>
                            {inCart}
                          </span>
                        ) : !soldOut && available <= 5 ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.06em] text-amber-700">
                            Low · {available}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2.5 line-clamp-2 min-h-9 text-[0.82rem] font-semibold leading-[1.35] text-heading">{product.name}</p>
                      <p className="mt-1 truncate text-[0.62rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                        {product.sku} · {soldOut ? "Out of stock" : `${available} in stock`}
                      </p>

                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <span className="text-sm font-bold tracking-tight text-heading">{money(product.price)}</span>
                        <span className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-md border transition-colors",
                          soldOut ? "border-border text-muted-foreground" : "border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                        )}>
                          <Plus className="size-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Search className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-heading">No products found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try another name, SKU, or barcode.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex w-full flex-col border-t border-border bg-card lg:min-h-0 lg:w-[25.5rem] lg:border-l lg:border-t-0 xl:w-[27rem]">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-heading">Current sale</p>
                <p className="text-[0.7rem] text-muted-foreground">
                  {itemCount === 0 ? "No items yet" : `${itemCount} item${itemCount === 1 ? "" : "s"} · ${cart.length} line${cart.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button
                className="text-muted-foreground hover:text-destructive"
                disabled={cart.length === 0}
                size="sm"
                variant="ghost"
                onClick={clearSale}
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="pos-customer" className="sr-only">Customer</label>
              <select
                id="pos-customer"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm font-medium text-heading focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                {posCustomers.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="grid h-full min-h-48 place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground/60">
                    <ShoppingCart className="size-6" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-heading">Cart is empty</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Scan a barcode or tap a product to start a sale.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border px-4">
                {cart.map((line) => {
                  const available = stocks[line.productId] ?? 0;
                  return (
                    <li key={line.productId} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[0.82rem] font-semibold leading-5 text-heading">{line.name}</p>
                          <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                            {line.sku} · {money(line.price)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${line.name}`}
                          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeLine(line.productId)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-md border border-border bg-background">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${line.name}`}
                            className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-heading disabled:cursor-not-allowed disabled:opacity-35"
                            disabled={line.qty <= 1}
                            onClick={() => changeQuantity(line.productId, line.qty - 1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-bold text-heading">{line.qty}</span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${line.name}`}
                            className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-heading disabled:cursor-not-allowed disabled:opacity-35"
                            disabled={line.qty >= available}
                            onClick={() => changeQuantity(line.productId, line.qty + 1)}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-heading">{money(line.price * line.qty)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-card p-4 shadow-[0_-8px_24px_rgb(12_13_14/0.04)]">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-heading">{money(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="flex items-center gap-1">
                  <span className="text-[0.65rem] font-semibold text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    inputMode="decimal"
                    aria-label="Discount amount"
                    aria-invalid={discountInvalid}
                    value={discountInput}
                    onChange={(event) => setDiscountInput(event.target.value)}
                    className="h-7 w-20 rounded border border-input bg-background px-1.5 text-right font-mono text-xs font-bold text-heading outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sales tax ({taxRate}%{companySettings.rules.taxInclusive ? ", incl." : ""})</dt>
                <dd className="font-semibold tabular-nums text-heading">{money(tax)}</dd>
              </div>
            </dl>
            {discountInvalid ? <p className="mt-1 text-[0.65rem] text-destructive">Discount must be between $0 and the subtotal.</p> : null}

            <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Amount due</span>
              <span className="numeric text-2xl font-black tracking-tight text-primary">{money(total)}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const active = paymentMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[0.68rem] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {paymentMethod === "card" ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-2.5 py-2">
                <CreditCard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="pos-bank" className="sr-only">Receiving bank account</label>
                <select
                  id="pos-bank"
                  value={bankAccount}
                  onChange={(event) => setBankAccount(event.target.value)}
                  className="h-7 flex-1 bg-transparent text-[0.7rem] font-semibold text-heading outline-none"
                >
                  {posBankAccounts.map((account) => (
                    <option key={account.value} value={account.value}>{account.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {paymentMethod === "cash" ? (
              <div className="mt-2 space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="pos-tendered" className="text-[0.7rem] font-semibold text-heading">Cash received</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[0.6rem] font-semibold text-muted-foreground">$</span>
                    <input
                      id="pos-tendered"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      value={tenderedInput}
                      onChange={(event) => setTenderedInput(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-7 w-24 rounded border border-input bg-background px-1.5 text-right font-mono text-xs font-bold text-heading outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    />
                  </div>
                </div>
                {quickCash.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {quickCash.map((amount, index) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setTenderedInput(String(amount))}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[0.62rem] font-semibold text-heading transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        {index === 0 ? "Exact" : amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border/70 pt-1.5 text-xs">
                  <span className="text-muted-foreground">Change due</span>
                  <span className={cn("font-bold tabular-nums", isCashShort ? "text-destructive" : "text-success")}>{money(change)}</span>
                </div>
                {isCashShort && tenderedInput !== "" ? (
                  <p className="text-[0.62rem] text-destructive">Cash received is less than the amount due.</p>
                ) : null}
              </div>
            ) : null}

            {paymentMethod === "credit" ? (
              <p className={cn(
                "mt-2 rounded-lg border border-dashed px-2.5 py-2 text-[0.66rem] leading-4",
                needsCustomerAccount ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted/30 text-muted-foreground",
              )}>
                {needsCustomerAccount
                  ? "Choose a customer account above to record this sale on credit."
                  : `Full amount will be posted to ${customer}'s account.`}
              </p>
            ) : null}

            <Button
              className="mt-3 h-12 w-full text-base font-bold shadow-md"
              disabled={!canCharge}
              size="lg"
              onClick={handleCharge}
            >
              <CheckCircle2 className="size-5" />
              Charge {money(total)}
            </Button>
            {!canCharge && cart.length > 0 && !discountInvalid ? (
              <p role="status" className="mt-1.5 text-center text-[0.65rem] text-destructive">
                {needsCustomerAccount
                  ? "Select a customer account to continue."
                  : isCashShort
                    ? "Enter the cash received to complete payment."
                    : "Complete the sale details to continue."}
              </p>
            ) : null}
            <p className="mt-2 text-center text-[0.6rem] text-muted-foreground">F2 search · F9 charge</p>
          </div>
        </aside>
      </div>

      {isReceiptOpen && lastReceipt ? (
        <PosReceiptDialog receipt={lastReceipt} onClose={() => setIsReceiptOpen(false)} />
      ) : null}
    </div>
  );
};
