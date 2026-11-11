"use client";

import { ArrowLeft, FileMinus2, Plus, Trash2 } from "lucide-react";
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
import { partyBalances, returnableQuantities, saleKind, stockLevels } from "@/domain/ledger";
import { priceSale, type CartLineInput } from "@/domain/pricing";
import { cartLine, createSale } from "@/domain/sale-builder";
import { newId, recordAdjustments, recordSale, useBooks } from "@/domain/store";
import { categories } from "@/domain/types";
import { useDemoSession } from "@/features/auth/demo-session";
import { QuantityGrid } from "@/features/catalog/components/size-color-grid";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

type Settle = "khata" | "now";

/**
 * Wholesale return / exchange: one screen, few inputs.
 *   Shop → invoice → pairs coming back (per line) → optional replacement size runs
 *   → difference goes on their khata (default) or is paid / received now.
 * Saves one credit note (or exchange note) and opens it for printing.
 */
export function WholesaleReturn({ companyId, invoiceId }: { companyId: string; invoiceId?: string }) {
  const money = useMoney();
  const router = useRouter();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const session = useDemoSession();
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stock = useMemo(() => stockLevels(books), [books]);
  const balances = useMemo(() => partyBalances(books), [books]);

  const initial = books.sales.find((sale) => sale.id === invoiceId);
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [saleId, setSaleId] = useState(initial?.id ?? "");
  const [back, setBack] = useState<Record<string, number>>({});
  const [damaged, setDamaged] = useState<Record<string, boolean>>({});
  const [replaceStyleId, setReplaceStyleId] = useState("");
  const [grid, setGrid] = useState<Record<string, number>>({});
  const [rate, setRate] = useState("");
  const [replacements, setReplacements] = useState<CartLineInput[]>([]);
  const [settle, setSettle] = useState<Settle>("khata");
  const [accountId, setAccountId] = useState(books.accounts.find((account) => account.kind === "bank")?.id ?? books.accounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const shops = books.parties.filter((party) => party.kind === "customer" && books.sales.some((sale) => sale.customerId === party.id && sale.channel === "invoice"));
  const customer = shops.find((party) => party.id === customerId);
  const shopInvoices = books.sales.filter((sale) => sale.customerId === customerId && sale.channel === "invoice" && saleKind(sale) === "Sale");
  const invoice = shopInvoices.find((sale) => sale.id === saleId);
  const returnable = invoice ? returnableQuantities(books, invoice.id) : new Map<string, number>();
  const soldLines = invoice?.lines.filter((line) => line.qty > 0) ?? [];

  const returnLines: CartLineInput[] = soldLines
    .filter((line) => (back[line.variantId] ?? 0) > 0)
    .map((line) => ({ ...line, qty: -(back[line.variantId] ?? 0), returnOfSaleId: invoice!.id }));
  const priced = priceSale([...returnLines, ...replacements], 0, settings.rules.taxRate, settings.rules.taxInclusive);
  const returnValue = Math.round(returnLines.reduce((sum, line) => sum - line.qty * (line.unitNet ?? line.price), 0));
  const newValue = Math.round(replacements.reduce((sum, line) => sum + line.qty * line.price, 0));
  const total = priced.total; // + shop owes us more, − we owe the shop
  const balanceNow = customer ? balances.get(customer.id) ?? 0 : 0;
  const balanceAfter = balanceNow + (settle === "khata" ? total : 0);
  const pairsBack = returnLines.reduce((sum, line) => sum - line.qty, 0);
  const replaceStyle = books.styles.find((style) => style.id === replaceStyleId);
  const available = useMemo(() => {
    const next = new Map(stock);
    for (const line of replacements) next.set(line.variantId, (next.get(line.variantId) ?? 0) - line.qty);
    return next;
  }, [stock, replacements]);

  const pickInvoice = (id: string) => { setSaleId(id); setBack({}); setDamaged({}); };
  const returnAll = () => setBack(Object.fromEntries(soldLines.map((line) => [line.variantId, returnable.get(line.variantId) ?? 0])));

  const addReplacement = () => {
    if (!replaceStyle) return;
    const price = Number(rate) || replaceStyle.price;
    const added = Object.entries(grid).filter(([, qty]) => qty > 0).map(([variantId, qty]) => {
      const found = findVariant(books.styles, variantId);
      return found ? cartLine(found.style, found.variant, qty, price) : undefined;
    }).filter((line): line is CartLineInput => Boolean(line));
    if (!added.length) { toast.error("Enter pairs in the size grid."); return; }
    setReplacements((current) => [...current, ...added]);
    setGrid({});
  };

  const save = () => {
    if (!customer || !invoice || !returnLines.length) return;
    const paidNow = settle === "now" && total !== 0;
    const account = books.accounts.find((entry) => entry.id === accountId);
    const note = createSale({
      books, prefix: settings.rules.invoicePrefix, channel: "invoice", customer, lines: [...returnLines, ...replacements],
      discount: 0, taxRate: settings.rules.taxRate, taxInclusive: settings.rules.taxInclusive,
      method: paidNow ? (account?.kind === "cash" ? "cash" : "transfer") : "credit",
      accountId: paidNow ? accountId : undefined, amountPaid: paidNow ? total : 0,
      cashier: session?.name ?? "Owner",
      notes: [replacements.length ? `Exchange against ${invoice.number}` : `Return against ${invoice.number}`, notes.trim()].filter(Boolean).join(" · "),
    });
    recordSale(companyId, note);
    const damagedLines = returnLines.filter((line) => damaged[line.variantId]);
    if (damagedLines.length) {
      recordAdjustments(companyId, damagedLines.map((line) => ({ id: newId("adj"), date: note.date, variantId: line.variantId, qty: line.qty, reason: "Damaged" as const, note: `Returned damaged by ${customer.name} on ${note.number}` })));
    }
    toast.success(`${replacements.length ? "Exchange note" : "Credit note"} ${note.number} saved`);
    router.push(`${base}/sales/${note.id}?print=invoice`);
  };

  const title = replacements.length ? "Exchange note" : "Credit note";

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/sales/wholesale?view=returns`}><ArrowLeft className="size-4" />Wholesale customers</Link></Button>
      <WorkspaceHeader eyebrow="Wholesale" title="Wholesale return" description="A shop is sending pairs back. Pick the invoice, type how many come back, and the credit goes on their khata — one credit note to print or send." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] xl:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>1 · Shop and invoice</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Shop">
                <Select value={customerId} onChange={(event) => { setCustomerId(event.target.value); pickInvoice(""); }}>
                  <option value="">Choose the shop…</option>
                  {shops.map((party) => <option key={party.id} value={party.id}>{party.name} · balance {money(balances.get(party.id) ?? 0)}</option>)}
                </Select>
              </Field>
              {customer ? (
                shopInvoices.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {shopInvoices.slice(0, 8).map((sale) => {
                      const left = [...returnableQuantities(books, sale.id).values()].reduce((sum, qty) => sum + qty, 0);
                      return (
                        <button key={sale.id} type="button" disabled={!left} onClick={() => pickInvoice(sale.id)}
                          className={cn("rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50", saleId === sale.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40")}>
                          <span className="flex justify-between gap-2"><span className="font-mono font-semibold text-heading">{sale.number}</span><span className="font-semibold tabular-nums">{money(sale.total)}</span></span>
                          <span className="text-xs text-muted-foreground">{formatDate(sale.date)} · {left ? `${left} pairs can come back` : "fully returned"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No invoices for this shop yet.</p>
              ) : null}
            </CardContent>
          </Card>

          {invoice ? (
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div><CardTitle>2 · Pairs coming back</CardTitle><CardDescription>Credited at the rate on {invoice.number}.</CardDescription></div>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={returnAll}>Return all</Button><Button size="sm" variant="ghost" onClick={() => setBack({})}>Clear</Button></div>
              </CardHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Style</TableHead><TableHead>Colour · size</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-center">Can return</TableHead><TableHead className="w-28">Coming back</TableHead><TableHead className="text-center">Damaged</TableHead></TableRow></TableHeader>
                <TableBody>
                  {soldLines.map((line) => {
                    const left = returnable.get(line.variantId) ?? 0;
                    return (
                      <TableRow key={line.variantId}>
                        <TableCell className="font-semibold text-heading">{line.name}</TableCell>
                        <TableCell>{line.size === "OS" ? line.color : `${line.color} · ${line.size}`}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(line.unitNet)}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{left} of {line.qty}</TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={left} disabled={!left} aria-label={`Pairs back ${line.name} ${line.color} ${line.size}`} placeholder="0" className="h-9 text-center"
                            value={back[line.variantId] ?? ""} onChange={(event) => setBack({ ...back, [line.variantId]: Math.max(0, Math.min(left, Math.floor(Number(event.target.value) || 0))) })} />
                        </TableCell>
                        <TableCell className="text-center"><input type="checkbox" aria-label={`${line.name} ${line.size} damaged`} disabled={!(back[line.variantId] ?? 0)} checked={Boolean(damaged[line.variantId])} onChange={(event) => setDamaged({ ...damaged, [line.variantId]: event.target.checked })} className="size-4 accent-destructive" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="px-5 py-3 text-xs text-muted-foreground">Tick “Damaged” for pairs that can’t be sold again — they’re credited to the shop but kept out of stock.</p>
            </Card>
          ) : null}

          {returnLines.length ? (
            <Card>
              <CardHeader><CardTitle>3 · Sending replacements? <span className="font-normal text-muted-foreground">(optional)</span></CardTitle><CardDescription>Skip this for a plain return. Add a size run if the shop wants other sizes or styles instead — the difference is worked out for you.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <Field label="Style">
                    <Select value={replaceStyleId} onChange={(event) => { setReplaceStyleId(event.target.value); setGrid({}); const style = books.styles.find((entry) => entry.id === event.target.value); const sameRate = returnLines.find((line) => line.styleId === event.target.value)?.unitNet; setRate(style ? String(Math.round(sameRate ?? style.price * 0.8)) : ""); }}>
                      <option value="">Choose a style…</option>
                      {categories.map((category) => {
                        const options = books.styles.filter((style) => style.active && style.category === category);
                        return options.length ? <optgroup key={category} label={category}>{options.map((style) => <option key={style.id} value={style.id}>{style.name} · {style.code}</option>)}</optgroup> : null;
                      })}
                    </Select>
                  </Field>
                  <Field label="Trade price / pair"><Input type="number" min={0} value={rate} disabled={!replaceStyle} onChange={(event) => setRate(event.target.value)} /></Field>
                </div>
                {replaceStyle ? (
                  <>
                    <QuantityGrid style={replaceStyle} values={grid} onChange={setGrid} available={available} label={`${replaceStyle.name} replacement pairs`} />
                    <div className="flex justify-end"><Button type="button" variant="outline" onClick={addReplacement}><Plus className="size-4" />Add replacements</Button></div>
                  </>
                ) : null}
                {replacements.length ? (
                  <ul className="divide-y rounded-lg border text-sm">
                    {replacements.map((line, index) => (
                      <li key={`${line.variantId}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span><span className="font-semibold text-heading">{line.name}</span> · {line.size === "OS" ? line.color : `${line.color} ${line.size}`} × {line.qty}</span>
                        <span className="flex items-center gap-2"><span className="tabular-nums">{money(line.qty * line.price)}</span><Button type="button" size="icon" variant="ghost" aria-label="Remove replacement" onClick={() => setReplacements(replacements.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="xl:sticky xl:top-20">
          <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{customer ? customer.name : "Choose a shop and invoice"}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Coming back ({pairsBack} pairs)</dt><dd className="tabular-nums">{money(returnValue)}</dd></div>
              {replacements.length ? <div className="flex justify-between"><dt className="text-muted-foreground">Replacements ({replacements.reduce((sum, line) => sum + line.qty, 0)} pairs)</dt><dd className="tabular-nums">{money(newValue)}</dd></div> : null}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-heading">
                <dt>{total > 0 ? "Shop pays extra" : total < 0 ? "Credit to shop" : "Difference"}</dt>
                <dd className={cn("tabular-nums", total > 0 ? "text-success-foreground" : total < 0 ? "text-destructive" : "")}>{money(Math.abs(total))}</dd>
              </div>
            </dl>

            {total !== 0 ? (
              <div className="space-y-2" role="radiogroup" aria-label="How to settle">
                {([
                  ["khata", total < 0 ? "Take it off their khata" : "Add it to their khata", "No money changes hands now (usual for shops)."],
                  ["now", total < 0 ? "Pay it back now" : "Received now", "Cash or bank transfer today."],
                ] as const).map(([value, label, hint]) => (
                  <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", settle === value && "border-primary bg-primary/5")}>
                    <input type="radio" name="settle" className="mt-0.5 size-4 accent-primary" checked={settle === value} onChange={() => setSettle(value)} />
                    <span><span className="block font-semibold text-heading">{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
                  </label>
                ))}
                {settle === "now" ? (
                  <Field label={total < 0 ? "Paid from" : "Received into"}>
                    <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{books.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select>
                  </Field>
                ) : null}
              </div>
            ) : null}

            {customer ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Khata balance now</span><span className="tabular-nums">{money(balanceNow)}</span></div>
                <div className="flex justify-between font-semibold text-heading"><span>After this note</span><span className="tabular-nums">{money(balanceAfter)}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{balanceAfter < 0 ? "Negative = you owe the shop (advance for their next order)." : "What the shop owes you."}</p>
              </div>
            ) : null}

            <Field label="Note on the document" hint="Optional, e.g. reason for return"><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Wrong size run delivered" /></Field>
            <Button className="w-full" size="lg" disabled={!returnLines.length} onClick={save}><FileMinus2 className="size-4" />Save & print {title.toLowerCase()}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
