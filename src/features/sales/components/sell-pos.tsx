"use client";

import {
  Building2,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/features/settings/location-store";
import { useCompanySettings } from "@/features/settings/settings-store";
import { InvoicePrintTemplate, type PrintableInvoice } from "./invoice-print-template";
import { SerialEntryTable } from "./serial-entry-table";
import { addSerialCodes, pasteSerialCodes } from "./serial-code-utils";

type WarrantyUnit = "days" | "months" | "years";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  serials: string[];
  warrantyEnabled: boolean;
  warrantyLength: number;
  warrantyUnit: WarrantyUnit;
  stock: number;
}

const SAVED_INVOICE_NOTES = [
  { value: "none", label: "No saved note", text: "" },
  { value: "thank-you", label: "Thank you", text: "Thank you for your purchase. Please keep this invoice for your records." },
  { value: "collection", label: "Collection details", text: "Please present this invoice when collecting your items." },
] as const;

const BANK_ACCOUNTS = [
  { value: "hbl-main", label: "HBL – Main Account (****4821)" },
  { value: "meezan-main", label: "Meezan Bank – Business (****3305)" },
  { value: "ubl-current", label: "UBL – Current Account (****7102)" },
  { value: "allied-saving", label: "Allied Bank – Savings (****9964)" },
  { value: "faysal-biz", label: "Faysal Bank – Business (****2278)" },
  { value: "js-bank", label: "JS Bank – Current (****5590)" },
  { value: "mcb-current", label: "MCB – Current Account (****6437)" },
];

const sampleCatalog = [
  {
    id: "p1",
    name: "Samsung Galaxy A55 5G (8/256GB)",
    sku: "SAM-A55-BLK",
    price: 114500,
    warrantyLength: 1,
    warrantyUnit: "years" as const,
    stock: 14,
  },
  {
    id: "p2",
    name: "Redmi Note 13 Pro (12/512GB)",
    sku: "XIA-RN13-BLU",
    price: 78900,
    warrantyLength: 1,
    warrantyUnit: "years" as const,
    stock: 9,
  },
  {
    id: "p3",
    name: "Anker 65W GaN Fast Charger",
    sku: "ANK-65W-WHT",
    price: 6800,
    warrantyLength: 6,
    warrantyUnit: "months" as const,
    stock: 250,
  },
  {
    id: "p4",
    name: "Apple 20W USB-C Power Adapter",
    sku: "APL-20W-ORIG",
    price: 5200,
    warrantyLength: 1,
    warrantyUnit: "years" as const,
    stock: 22,
  },
  {
    id: "p5",
    name: "Baseus Bowie H1 ANC Wireless Headphones",
    sku: "BAS-H1-GRY",
    price: 14500,
    warrantyLength: 1,
    warrantyUnit: "years" as const,
    stock: 6,
  },
];

export const SellPos = ({
  companyId = "demo",
  onCreate,
  startEmpty = false,
}: {
  companyId?: string;
  onCreate?: (invoice: PrintableInvoice) => void;
  startEmpty?: boolean;
}) => {
  const locations = useLocations(companyId);
  const companySettings = useCompanySettings(companyId);
  const [sellingFrom, setSellingFrom] = useState(() => locations.find((location) => location.id === companySettings.rules.defaultSalesLocation)?.name ?? locations.find((location) => location.type === "Outlet")?.name ?? "Main Outlet");
  const [customer, setCustomer] = useState("Walk-in Customer");
  const [cart, setCart] = useState<CartItem[]>(() => startEmpty ? [] : [
    {
      id: "p1",
      name: "Samsung Galaxy A55 5G (8/256GB)",
      sku: "SAM-A55-BLK",
      price: 114500,
      qty: 1,
      serials: ["358291048291048"],
      warrantyEnabled: true,
      warrantyLength: 1,
      warrantyUnit: "years",
      stock: 14,
    },
    {
      id: "p3",
      name: "Anker 65W GaN Fast Charger",
      sku: "ANK-65W-WHT",
      price: 6800,
      qty: 2,
      serials: ["", ""],
      warrantyEnabled: true,
      warrantyLength: 6,
      warrantyUnit: "months",
      stock: 250,
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit">("cash");
  const [bankAccount, setBankAccount] = useState(BANK_ACCOUNTS[0].value);
  const [discount, setDiscount] = useState(0);
  const [tenderedAmount, setTenderedAmount] = useState(150000);
  const [searchQuery, setSearchQuery] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [savedNote, setSavedNote] = useState("none");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [confirmedInvoice, setConfirmedInvoice] = useState<PrintableInvoice | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxRate = companySettings.rules.taxRate / 100;
  const tax = Math.round(taxableAmount * (companySettings.rules.taxInclusive ? taxRate / (1 + taxRate) : taxRate));
  const grandTotal = Math.max(0, companySettings.rules.taxInclusive ? taxableAmount : taxableAmount + tax);
  const changeDue = Math.max(0, tenderedAmount - grandTotal);
  const allSerials = cart.flatMap((item) => item.serials.map((serial) => serial.trim()).filter(Boolean));
  const duplicateSerials = new Set(allSerials.filter((serial, index) => allSerials.indexOf(serial) !== index));
  const missingSerials = cart.reduce((count, item) => count + item.serials.filter((serial) => !serial.trim()).length, 0);
  const hasInvalidItems = cart.some((item) =>
    !Number.isFinite(item.price) || item.price <= 0 || item.qty > item.stock || item.serials.length !== item.qty ||
    (item.warrantyEnabled && (!Number.isInteger(item.warrantyLength) || item.warrantyLength <= 0)),
  );
  const hasQuantityIssues = Object.values(quantityErrors).some(Boolean) ||
    Object.entries(quantityDrafts).some(([id, draft]) => cart.some((item) => item.id === id && draft !== String(item.qty)));
  const canConfirm = cart.length > 0 && !hasInvalidItems && missingSerials === 0 && duplicateSerials.size === 0 &&
    !hasQuantityIssues && discount >= 0 && discount <= subtotal && (paymentMethod !== "cash" || tenderedAmount >= grandTotal);

  const addItem = (item: (typeof sampleCatalog)[0]) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id && p.qty < p.stock ? { ...p, qty: p.qty + 1, serials: [...p.serials, ""] } : p));
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          qty: 1,
          serials: [""],
          warrantyEnabled: item.warrantyLength > 0,
          warrantyLength: item.warrantyLength,
          warrantyUnit: item.warrantyUnit,
          stock: item.stock,
        },
      ];
    });
  };

  const setQuantity = (id: string, qty: number) => {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    if (!Number.isInteger(qty) || qty < 1 || qty > item.stock) {
      setQuantityErrors((current) => ({ ...current, [id]: `Enter a whole quantity from 1 to ${item.stock}.` }));
      return;
    }
    if (item.serials.slice(qty).some((serial) => serial.trim())) {
      setQuantityErrors((current) => ({ ...current, [id]: "Clear codes in the rows you want to remove first." }));
      return;
    }
    setQuantityErrors((current) => ({ ...current, [id]: "" }));
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setCart((current) => current.map((entry) => entry.id === id
      ? { ...entry, qty, serials: Array.from({ length: qty }, (_, index) => entry.serials[index] ?? "") }
      : entry));
  };

  const commitQuantity = (id: string) => {
    const draft = quantityDrafts[id];
    if (draft === undefined) return;
    if (!draft.trim()) {
      setQuantityErrors((current) => ({ ...current, [id]: "Enter a quantity." }));
      return;
    }
    setQuantity(id, Number(draft));
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setQuantityErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    setQuantityDrafts({});
    setQuantityErrors({});
  };

  const updateItem = (id: string, changes: Partial<CartItem>) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, ...changes } : item));
  };

  const updateSerial = (id: string, index: number, value: string) => {
    setCart((prev) => prev.map((item) => item.id === id
      ? { ...item, serials: item.serials.map((serial, serialIndex) => serialIndex === index ? value : serial) }
      : item));
  };

  const handleAddSerials = (id: string, codes: string[]) => {
    const result = addSerialCodes(cart, id, codes);
    setCart(result.items);
    return result;
  };

  const handlePasteSerials = (id: string, startIndex: number, codes: string[]) => {
    const result = pasteSerialCodes(cart, id, startIndex, codes);
    setCart(result.items);
    return result;
  };

  const filteredCatalog = sampleCatalog.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleConfirmSale = () => {
    if (!canConfirm) return;
    const issuedAt = new Date();
    const invRef = `${companySettings.rules.invoicePrefix}-${issuedAt.getTime().toString().slice(-8)}`;
    const invoice: PrintableInvoice = {
      reference: invRef,
      date: companySettings.business.dateFormat === "dd/MM/yyyy"
        ? issuedAt.toLocaleDateString("en-GB")
        : companySettings.business.dateFormat === "yyyy-MM-dd"
          ? issuedAt.toLocaleDateString("en-CA")
          : issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      customer,
      outlet: sellingFrom,
      total: grandTotal,
      paid: paymentMethod === "credit" ? 0 : grandTotal,
      balance: paymentMethod === "credit" ? grandTotal : 0,
      status: paymentMethod === "credit" ? "Unpaid" : "Paid",
      paymentMethod: paymentMethod === "card" ? "bank" : paymentMethod,
      bankAccount: paymentMethod === "card" ? BANK_ACCOUNTS.find((bank) => bank.value === bankAccount)?.label : undefined,
      discount,
      tax,
      taxRate: companySettings.rules.taxRate,
      taxInclusive: companySettings.rules.taxInclusive,
      notes: invoiceNotes.trim(),
      items: cart.map((item) => ({
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        price: item.price,
        serials: item.serials.map((serial) => serial.trim()),
        warranty: item.warrantyEnabled ? { length: item.warrantyLength, unit: item.warrantyUnit } : undefined,
      })),
    };
    if (onCreate) onCreate(invoice);
    else setConfirmedInvoice(invoice);
  };

  if (confirmedInvoice) {
    return (
      <>
        <Card className="mx-auto max-w-xl text-center">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-bold text-heading">Sale ready to print</h2>
            <p className="text-sm text-muted-foreground">
              Invoice preview <strong className="text-heading">{confirmedInvoice.reference}</strong> is ready.
              Posting and stock updates are not connected in this demo.
            </p>

            <div className="my-4 rounded-lg border bg-muted/30 p-4 text-left text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-heading">{customer}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-bold text-primary">${confirmedInvoice.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold capitalize text-heading">{paymentMethod === "card" ? "Card / Bank" : paymentMethod}</span>
              </div>
              {paymentMethod === "card" && (
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Bank Account:</span>
                  <span className="font-semibold text-heading text-right max-w-[60%]">
                    {BANK_ACCOUNTS.find((b) => b.value === bankAccount)?.label ?? bankAccount}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowPrintPreview(true)}>
                <Printer className="size-4" />
                Preview / Print Invoice
              </Button>
              <Button
                onClick={() => {
                  setConfirmedInvoice(null);
                  setCart([]);
                  setDiscount(0);
                  setInvoiceNotes("");
                  setSavedNote("none");
                  setShowPrintPreview(false);
                }}
              >
                Start New Sale
              </Button>
            </div>
          </CardContent>
        </Card>
        {showPrintPreview ? <InvoicePrintTemplate invoice={confirmedInvoice} business={companySettings.business} onClose={() => setShowPrintPreview(false)} /> : null}
      </>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.8fr)] xl:items-start">
      {/* Left Column: Context, Search & Line Items */}
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Invoice details</CardTitle><p className="text-xs text-muted-foreground">Customer and selling outlet</p></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-heading">Customer
              <select
                aria-label="Select Customer"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-base text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="Walk-in Customer">Walk-in Customer</option>
                <option value="Apex Mobiles">Apex Mobiles (Credit OK)</option>
                <option value="Hamza Electronics">Hamza Electronics</option>
                <option value="City Devices">City Devices</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-heading">
              Selling from
              <select
                aria-label="Selling from outlet or warehouse"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-base text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={sellingFrom}
                onChange={(e) => setSellingFrom(e.target.value)}
              >
                {locations.filter((loc) => loc.type === "Outlet").length > 0 && (
                  <optgroup label="Retail Outlets">
                    {locations
                      .filter((loc) => loc.type === "Outlet")
                      .map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                  </optgroup>
                )}
                {locations.filter((loc) => loc.type === "Warehouse").length > 0 && (
                  <optgroup label="Warehouses">
                    {locations
                      .filter((loc) => loc.type === "Warehouse")
                      .map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </label>
          </CardContent>
        </Card>

        {/* Customer & Product Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan barcode or search products..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Quick Product Pick List (if searching) */}
        {searchQuery.trim() && (
          <div className="rounded-lg border bg-card p-2 shadow-sm">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              Catalog Search Results ({filteredCatalog.length})
            </p>
            <div className="divide-y">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} · Available: {item.stock} units
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-heading">
                      ${item.price.toLocaleString()}
                    </span>
                    <Button size="sm" disabled={cart.some((line) => line.id === item.id && line.qty >= line.stock)} onClick={() => addItem(item)}>
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Cart Line Items Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Products and serials</CardTitle>
              <p className="text-xs text-muted-foreground">
                {cart.length} item{cart.length === 1 ? "" : "s"} in transaction
              </p>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={clearCart}
              >
                <RotateCcw className="size-3.5" />
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <ShoppingCart className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-semibold text-heading">Cart is empty</p>
                <p className="text-xs text-muted-foreground">
                  Scan a barcode or choose from product catalog above.
                </p>
              </div>
            ) : (
              <div className="divide-y border-t">
                {cart.map((item) => (
                  <div key={item.id} className="p-4 transition-colors hover:bg-muted/20">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-heading">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-heading">
                          ${(item.price * item.qty).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.qty} × ${item.price.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-5 rounded-lg border bg-muted/20 p-3 sm:p-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <label htmlFor={`price-${item.id}`} className="mb-1 block text-xs font-semibold text-heading">Invoice unit price (USD)</label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.price}
                            onChange={(event) => updateItem(item.id, { price: Number(event.target.value) })}
                            aria-invalid={item.price <= 0}
                          />
                          {item.price <= 0 ? <p className="mt-1 text-xs text-destructive">Enter a price greater than zero.</p> : null}
                        </div>
                        <div>
                          <label htmlFor={`qty-${item.id}`} className="mb-1 block text-xs font-semibold text-heading">Quantity</label>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label={`Decrease quantity of ${item.name}`} onClick={() => item.qty === 1 ? removeItem(item.id) : setQuantity(item.id, item.qty - 1)}>
                              <Minus className="size-4" />
                            </Button>
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              min="1"
                              max={item.stock}
                              step="1"
                              aria-label={`Quantity for ${item.name}`}
                              aria-invalid={Boolean(quantityErrors[item.id])}
                              value={quantityDrafts[item.id] ?? item.qty}
                              onChange={(event) => setQuantityDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                              onBlur={() => commitQuantity(item.id)}
                              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                              className="h-9 w-24 text-center font-mono"
                            />
                            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label={`Increase quantity of ${item.name}`} disabled={item.qty >= item.stock} onClick={() => setQuantity(item.id, item.qty + 1)}>
                              <Plus className="size-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground">of {item.stock} available</span>
                          </div>
                          {quantityErrors[item.id] ? <p className="mt-1 text-xs text-destructive">{quantityErrors[item.id]}</p> : null}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <label htmlFor={`warranty-${item.id}`} className="text-xs font-semibold text-heading">Warranty for this item</label>
                          <input
                            id={`warranty-${item.id}`}
                            type="checkbox"
                            role="switch"
                            checked={item.warrantyEnabled}
                            onChange={(event) => updateItem(item.id, { warrantyEnabled: event.target.checked })}
                            className="size-5 accent-primary"
                          />
                        </div>
                        {item.warrantyEnabled ? (
                          <div className="grid grid-cols-[5rem_1fr] gap-2">
                            <div>
                              <label htmlFor={`warranty-length-${item.id}`} className="mb-1 block text-xs text-muted-foreground">Duration</label>
                              <Input
                                id={`warranty-length-${item.id}`}
                                type="number"
                                min="1"
                                step="1"
                                value={item.warrantyLength}
                                onChange={(event) => updateItem(item.id, { warrantyLength: Number(event.target.value) })}
                                aria-invalid={item.warrantyLength <= 0 || !Number.isInteger(item.warrantyLength)}
                              />
                            </div>
                            <div>
                              <label htmlFor={`warranty-unit-${item.id}`} className="mb-1 block text-xs text-muted-foreground">Unit</label>
                              <select
                                id={`warranty-unit-${item.id}`}
                                value={item.warrantyUnit}
                                onChange={(event) => updateItem(item.id, { warrantyUnit: event.target.value as WarrantyUnit })}
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                            {item.warrantyLength <= 0 || !Number.isInteger(item.warrantyLength) ? <p className="col-span-2 text-xs text-destructive">Enter a whole number of days, months, or years.</p> : null}
                          </div>
                        ) : <p className="text-xs text-muted-foreground">No warranty will appear on the invoice.</p>}
                      </div>
                    </div>
                    <SerialEntryTable
                      itemId={item.id}
                      productName={item.name}
                      qty={item.qty}
                      stock={item.stock}
                      serials={item.serials}
                      duplicateSerials={duplicateSerials}
                      onChange={(index, value) => updateSerial(item.id, index, value)}
                      onAddCodes={(codes) => handleAddSerials(item.id, codes)}
                      onPasteCodes={(startIndex, codes) => handlePasteSerials(item.id, startIndex, codes)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="size-3.5" />Remove item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Checkout & Summary */}
      <div className="space-y-5">
        <Card className="xl:sticky xl:top-5">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Payment & Settlement</CardTitle>
            <p className="text-xs text-muted-foreground">Complete transaction and issue receipt</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-heading">Payment Option</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition-all ${paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <Wallet className="size-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition-all ${paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <CreditCard className="size-4" />
                  Card / Bank
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition-all ${paymentMethod === "credit"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <User className="size-4" />
                  Store Credit
                </button>
              </div>

              {/* Bank Account Selector — visible only when Card/Bank is selected */}
              {paymentMethod === "card" && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5">
                  <Building2 className="size-4 shrink-0 text-primary" />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <label
                      htmlFor="bank-account-select"
                      className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Receiving Bank Account
                    </label>
                    <select
                      id="bank-account-select"
                      aria-label="Select bank account"
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                    >
                      {BANK_ACCOUNTS.map((bank) => (
                        <option key={bank.value} value={bank.value}>
                          {bank.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-semibold text-heading">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount (USD):</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  aria-label="Discount amount"
                  aria-invalid={discount < 0 || discount > subtotal}
                  className="w-24 rounded border bg-background px-2 py-0.5 text-right font-mono text-xs font-bold text-heading"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                />
              </div>
              {discount < 0 || discount > subtotal ? <p className="text-xs text-destructive">Discount must be between $0 and the subtotal.</p> : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Tax ({companySettings.rules.taxRate}%{companySettings.rules.taxInclusive ? ", included" : ""}):</span>
                <span className="font-semibold text-heading">${tax.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2.5 flex items-center justify-between text-sm">
                <span className="font-bold text-heading">Net Total:</span>
                <span className="numeric font-black text-xl text-primary">
                  ${grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Cash Tendered Input */}
            {paymentMethod === "cash" && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-heading">Tendered Cash:</label>
                  <input
                    type="number"
                    min="0"
                    aria-label="Tendered cash"
                    className="w-32 rounded border bg-background px-2.5 py-1 text-right font-mono text-sm font-bold text-heading"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Change Due to Customer:</span>
                  <span className="font-bold text-success">
                    ${changeDue.toLocaleString()}
                  </span>
                </div>
                {tenderedAmount < grandTotal ? <p className="text-xs text-destructive">Tendered cash must cover the invoice total.</p> : null}
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <label htmlFor="saved-invoice-note" className="block text-xs font-semibold text-heading">Additional invoice notes</label>
              <select
                id="saved-invoice-note"
                value={savedNote}
                onChange={(event) => {
                  setSavedNote(event.target.value);
                  setInvoiceNotes(SAVED_INVOICE_NOTES.find((note) => note.value === event.target.value)?.text ?? "");
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SAVED_INVOICE_NOTES.map((note) => <option key={note.value} value={note.value}>{note.label}</option>)}
              </select>
              <textarea
                aria-label="Invoice note text"
                value={invoiceNotes}
                onChange={(event) => setInvoiceNotes(event.target.value)}
                placeholder="Add a note to appear on the invoice…"
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Saved notes are a settings preview; edit this invoice’s copy here.</p>
            </div>

            {/* Confirmation Buttons */}
            <div className="space-y-2 pt-2">
              {!canConfirm && cart.length > 0 ? (
                <p role="status" className="text-xs text-destructive">
                  {missingSerials > 0 ? `${missingSerials} unit ${missingSerials === 1 ? "code is" : "codes are"} still required. ` : ""}
                  {duplicateSerials.size > 0 ? "Each serial or barcode must be unique. " : ""}
                  {hasInvalidItems ? "Check item price, stock, and warranty duration. " : ""}
                  {hasQuantityIssues ? "Finish or correct the quantity entry. " : ""}
                  {discount < 0 || discount > subtotal ? "Check the discount amount. " : ""}
                  {paymentMethod === "cash" && tenderedAmount < grandTotal ? "Cash received is below the total. " : ""}
                </p>
              ) : null}
              <Button
                disabled={!canConfirm}
                className="w-full text-base font-bold shadow-md"
                size="lg"
                onClick={handleConfirmSale}
              >
                {onCreate ? "Create Invoice" : "Confirm Sale"} (${grandTotal.toLocaleString()})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
