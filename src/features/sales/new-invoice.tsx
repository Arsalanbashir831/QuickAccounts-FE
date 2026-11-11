"use client";

import { ArrowLeft, FilePlus2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Select, Textarea } from "@/components/shared/fields";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findVariant } from "@/domain/catalog";
import { addDays, stockLevels, todayIso } from "@/domain/ledger";
import { priceSale, type CartLineInput } from "@/domain/pricing";
import { cartLine, createSale } from "@/domain/sale-builder";
import { recordSale, useBooks } from "@/domain/store";
import { categories } from "@/domain/types";
import { useDemoSession } from "@/features/auth/demo-session";
import { QuantityGrid } from "@/features/catalog/components/size-color-grid";
import { useCompanySettings } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";

/**
 * Wholesale / credit invoice for shops and regular buyers. Pairs are entered
 * as a size run per colour, at a trade price, and usually go on khata.
 */
export function NewInvoice({ companyId }: { companyId: string }) {
  const money = useMoney();
  const router = useRouter();
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const session = useDemoSession();
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stock = useMemo(() => stockLevels(books), [books]);
  // Wholesale buyers first, then any other saved customer.
  const customers = books.parties.filter((party) => party.kind === "customer").sort((a, b) => Number(Boolean(b.wholesale)) - Number(Boolean(a.wholesale)));

  const [customerId, setCustomerId] = useState(customers.find((party) => party.wholesale)?.id ?? "");
  const [styleId, setStyleId] = useState("");
  const [grid, setGrid] = useState<Record<string, number>>({});
  const [rate, setRate] = useState("");
  const [lines, setLines] = useState<CartLineInput[]>([]);
  const [discount, setDiscount] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [accountId, setAccountId] = useState(books.accounts.find((account) => account.kind === "bank")?.id ?? books.accounts[0]?.id ?? "");
  const [dueDays, setDueDays] = useState("15");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const style = books.styles.find((entry) => entry.id === styleId);
  const customer = customers.find((party) => party.id === customerId);
  // Pairs already on this invoice can't be added again from the same stock.
  const available = useMemo(() => {
    const next = new Map(stock);
    for (const line of lines) next.set(line.variantId, (next.get(line.variantId) ?? 0) - line.qty);
    return next;
  }, [stock, lines]);

  const priced = priceSale(lines, Number(discount) || 0, settings.rules.taxRate, settings.rules.taxInclusive);
  const paid = Math.min(Math.max(0, Number(paidNow) || 0), Math.max(0, priced.total));

  const addToInvoice = () => {
    if (!style) return;
    const price = Number(rate) || style.price;
    const added = Object.entries(grid).filter(([, qty]) => qty > 0).map(([variantId, qty]) => {
      const found = findVariant(books.styles, variantId);
      return found ? cartLine(found.style, found.variant, qty, price) : undefined;
    }).filter((line): line is CartLineInput => Boolean(line));
    if (!added.length) {
      setError("Enter at least one pair in the size grid.");
      return;
    }
    setLines((current) => {
      const next = [...current];
      for (const line of added) {
        const existing = next.findIndex((entry) => entry.variantId === line.variantId && entry.price === line.price);
        if (existing >= 0) next[existing] = { ...next[existing], qty: next[existing].qty + line.qty };
        else next.push(line);
      }
      return next;
    });
    setGrid({});
    setError("");
  };

  const create = () => {
    if (!customer) return setError("Choose the customer this invoice is for.");
    if (!lines.length) return setError("Add at least one style to the invoice.");
    const sale = createSale({
      books, prefix: settings.rules.invoicePrefix, channel: "invoice", customer, lines,
      discount: Number(discount) || 0, taxRate: settings.rules.taxRate, taxInclusive: settings.rules.taxInclusive,
      method: paid >= priced.total ? "transfer" : "credit", accountId: paid ? accountId : undefined, amountPaid: paid,
      cashier: session?.name ?? "Owner", notes, dueDate: addDays(todayIso(), Number(dueDays) || 0),
    });
    recordSale(companyId, sale);
    toast.success(`Invoice ${sale.number} created`);
    router.push(`${base}/sales/${sale.id}`);
  };

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/sales/wholesale`}><ArrowLeft className="size-4" />Wholesale customers</Link></Button>
      <WorkspaceHeader eyebrow="Sales" title="Wholesale invoice" description="Sell size runs to other shops or regular buyers at a trade price. Unpaid amounts go on their khata." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] xl:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Add pairs</CardTitle><CardDescription>Pick a style, type the pairs per size, then add them to the invoice.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Field label="Style">
                  <Select value={styleId} onChange={(event) => { setStyleId(event.target.value); setGrid({}); const next = books.styles.find((entry) => entry.id === event.target.value); setRate(next ? String(Math.round(next.price * 0.8 / 10) * 10) : ""); }}>
                    <option value="">Choose a style…</option>
                    {categories.map((category) => {
                      const options = books.styles.filter((entry) => entry.category === category && entry.active);
                      return options.length ? <optgroup key={category} label={category}>{options.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.code}</option>)}</optgroup> : null;
                    })}
                  </Select>
                </Field>
                <Field label="Trade price / pair" hint={style ? `Retail ${money(style.price)}` : undefined}>
                  <Input type="number" min={0} inputMode="numeric" value={rate} onChange={(event) => setRate(event.target.value)} disabled={!style} />
                </Field>
              </div>
              {style ? (
                <>
                  <QuantityGrid style={style} values={grid} onChange={setGrid} available={available} label={`${style.name} pairs per size`} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{Object.values(grid).reduce((sum, qty) => sum + qty, 0)} pairs selected</p>
                    <Button type="button" onClick={addToInvoice}><Plus className="size-4" />Add to invoice</Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Invoice lines</CardTitle></CardHeader>
            {lines.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Style</TableHead><TableHead>Colour · size</TableHead><TableHead className="text-right">Pairs</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={`${line.variantId}-${line.price}`}>
                      <TableCell className="font-semibold text-heading">{line.name}</TableCell>
                      <TableCell>{line.size === "OS" ? line.color : `${line.color} · ${line.size}`}</TableCell>
                      <TableCell className="text-right tabular-nums">{line.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.price)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(line.qty * line.price)}</TableCell>
                      <TableCell className="w-10"><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${line.name} ${line.size}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing added yet.</p>}
          </Card>
        </div>

        <Card className="xl:sticky xl:top-20">
          <CardHeader><CardTitle>Customer & payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Customer" hint={customer && !customer.creditAllowed ? "This customer isn’t marked for khata — collect payment now or update their profile." : undefined}>
              <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Choose…</option>
                {customers.map((party) => <option key={party.id} value={party.id}>{party.name}{party.city ? ` · ${party.city}` : ""}</option>)}
              </Select>
            </Field>
            <dl className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Pairs</dt><dd className="tabular-nums">{lines.reduce((sum, line) => sum + line.qty, 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(priced.subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Discount</dt><dd><Input aria-label="Discount" type="number" min={0} className="h-8 w-28 text-right" value={discount} onChange={(event) => setDiscount(event.target.value)} /></dd></div>
              {priced.tax ? <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax</dt><dd className="tabular-nums">{money(priced.tax)}</dd></div> : null}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-heading"><dt>Total</dt><dd className="tabular-nums">{money(priced.total)}</dd></div>
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Received now"><Input type="number" min={0} value={paidNow} placeholder="0" onChange={(event) => setPaidNow(event.target.value)} /></Field>
              <Field label="Into account">
                <Select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={!paid}>
                  {books.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Payment due in" hint={`${money(Math.max(0, priced.total - paid))} will be added to the customer’s khata.`}>
              <Select value={dueDays} onChange={(event) => setDueDays(event.target.value)}>
                {["0", "7", "15", "30", "45"].map((days) => <option key={days} value={days}>{days === "0" ? "Due today" : `${days} days`}</option>)}
              </Select>
            </Field>
            <Field label="Notes"><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Delivered via TCS, carton 3 of 3" /></Field>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" onClick={create}><FilePlus2 className="size-4" />Create invoice</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
