"use client";

import { ArrowLeft, CheckCircle2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { accountBalances, nextDocumentNumber, stockLevels, todayIso } from "@/domain/ledger";
import { newId, savePurchase, saveStyle, useBooks } from "@/domain/store";
import { categories, type PurchaseLine } from "@/domain/types";
import { QuantityGrid } from "@/features/catalog/components/size-color-grid";
import { useMoney } from "@/lib/format/money";

export function NewPurchase({ companyId, initialStyleId }: { companyId: string; initialStyleId?: string }) {
  const money = useMoney();
  const router = useRouter();
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stock = useMemo(() => stockLevels(books), [books]);
  const balances = useMemo(() => accountBalances(books), [books]);
  const suppliers = books.parties.filter((party) => party.kind === "supplier");
  const initialStyle = books.styles.find((style) => style.id === initialStyleId);

  const [supplierId, setSupplierId] = useState(initialStyle?.supplierId ?? suppliers[0]?.id ?? "");
  const [supplierRef, setSupplierRef] = useState("");
  const [styleId, setStyleId] = useState(initialStyle?.id ?? "");
  const [grid, setGrid] = useState<Record<string, number>>({});
  const [unitCost, setUnitCost] = useState(initialStyle ? String(initialStyle.cost) : "");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [received, setReceived] = useState(true);
  const [paidNow, setPaidNow] = useState("");
  const [accountId, setAccountId] = useState(books.accounts.find((account) => account.kind === "bank")?.id ?? books.accounts[0]?.id ?? "");
  const [updateCost, setUpdateCost] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const style = books.styles.find((entry) => entry.id === styleId);
  const total = lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
  const paid = Math.min(Math.max(0, Number(paidNow) || 0), total);
  const supplierStyles = new Set(books.styles.filter((entry) => entry.supplierId === supplierId).map((entry) => entry.id));

  /** Fills every size up to `target` pairs, counting what's already in stock. */
  const suggest = (target: number) => {
    if (!style) return;
    const next: Record<string, number> = {};
    for (const variant of style.variants) {
      const need = target - Math.max(0, stock.get(variant.id) ?? 0);
      if (need > 0) next[variant.id] = need;
    }
    setGrid(next);
  };

  const addLines = () => {
    if (!style) return;
    const cost = Number(unitCost);
    if (!(cost > 0)) { setError("Enter the cost per pair."); return; }
    const added = Object.entries(grid).filter(([, qty]) => qty > 0).map(([variantId, qty]) => {
      const found = findVariant(books.styles, variantId)!;
      return { variantId, styleId: found.style.id, name: found.style.name, color: found.variant.color, size: found.variant.size, sku: found.variant.sku, qty, unitCost: cost };
    });
    if (!added.length) { setError("Enter pairs for at least one size."); return; }
    setLines((current) => [...current.filter((line) => !added.some((entry) => entry.variantId === line.variantId)), ...added]);
    setGrid({});
    setError("");
  };

  const save = () => {
    if (!supplierId) { setError("Choose a supplier."); return; }
    if (!lines.length) { setError("Add at least one style."); return; }
    const today = todayIso();
    const purchase = {
      id: newId("po"), number: nextDocumentNumber(books.purchases.map((entry) => entry.number), "PO", 4),
      date: today, supplierId, supplierRef: supplierRef.trim() || undefined, status: received ? "Received" as const : "Ordered" as const,
      receivedDate: received ? today : undefined, lines, total, amountPaid: paid, accountId: paid ? accountId : undefined, notes: notes.trim() || undefined,
    };
    savePurchase(companyId, purchase);
    if (updateCost) {
      for (const styleIdToUpdate of new Set(lines.map((line) => line.styleId))) {
        const target = books.styles.find((entry) => entry.id === styleIdToUpdate);
        const cost = lines.find((line) => line.styleId === styleIdToUpdate)?.unitCost;
        if (target && cost && cost !== target.cost) saveStyle(companyId, { ...target, cost });
      }
    }
    toast.success(`${purchase.number} saved${received ? " — stock updated" : ""}`);
    router.push(`${base}/purchases/${purchase.id}`);
  };

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/purchases`}><ArrowLeft className="size-4" />Purchases</Link></Button>
      <WorkspaceHeader eyebrow="Buying" title="New purchase" description="Enter the size run you’re buying for each style. If the cartons are already here, it goes straight into stock." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] xl:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Add a style</CardTitle><CardDescription>Styles from this supplier are listed first.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Field label="Style">
                  <Select value={styleId} onChange={(event) => { setStyleId(event.target.value); setGrid({}); setUnitCost(String(books.styles.find((entry) => entry.id === event.target.value)?.cost ?? "")); }}>
                    <option value="">Choose a style…</option>
                    {supplierStyles.size ? <optgroup label="From this supplier">{books.styles.filter((entry) => supplierStyles.has(entry.id)).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.code}</option>)}</optgroup> : null}
                    {categories.map((category) => {
                      const options = books.styles.filter((entry) => entry.category === category && !supplierStyles.has(entry.id));
                      return options.length ? <optgroup key={category} label={category}>{options.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.code}</option>)}</optgroup> : null;
                    })}
                  </Select>
                </Field>
                <Field label="Cost per pair" hint={style ? `Last cost ${money(style.cost)}` : undefined}><Input type="number" min={0} inputMode="numeric" value={unitCost} disabled={!style} onChange={(event) => setUnitCost(event.target.value)} /></Field>
              </div>
              {style ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Sparkles className="size-3.5 text-primary" /><span className="text-muted-foreground">Refill every size up to</span>
                    {[2, 3, 4, 6].map((target) => <button key={target} type="button" onClick={() => suggest(target)} className="rounded-full border px-2.5 py-1 font-semibold text-heading hover:border-primary/40 hover:bg-primary/5">{target} pairs</button>)}
                  </div>
                  <QuantityGrid style={style} values={grid} onChange={setGrid} label={`${style.name} pairs to buy`} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{Object.values(grid).reduce((sum, qty) => sum + qty, 0)} pairs · {money(Object.values(grid).reduce((sum, qty) => sum + qty, 0) * (Number(unitCost) || 0))}</p>
                    <Button type="button" onClick={addLines}><Plus className="size-4" />Add to purchase</Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Purchase lines</CardTitle></CardHeader>
            {lines.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Style</TableHead><TableHead>Colour · size</TableHead><TableHead className="text-right">Pairs</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Amount</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.variantId}>
                      <TableCell className="font-semibold text-heading">{line.name}</TableCell>
                      <TableCell>{line.size === "OS" ? line.color : `${line.color} · ${line.size}`}</TableCell>
                      <TableCell className="text-right tabular-nums">{line.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.unitCost)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(line.qty * line.unitCost)}</TableCell>
                      <TableCell className="w-10"><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${line.sku}`} onClick={() => setLines((current) => current.filter((entry) => entry.variantId !== line.variantId))}><Trash2 className="size-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing added yet.</p>}
          </Card>
        </div>

        <Card className="xl:sticky xl:top-20">
          <CardHeader><CardTitle>Supplier & payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Supplier">
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Choose…</option>
                {suppliers.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </Select>
            </Field>
            <Field label="Supplier bill no." hint="Optional"><Input value={supplierRef} onChange={(event) => setSupplierRef(event.target.value)} /></Field>
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pairs</span><span className="tabular-nums">{lines.reduce((sum, line) => sum + line.qty, 0)}</span></div>
              <div className="mt-1 flex justify-between text-base font-bold text-heading"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
            </div>
            <label className="flex items-start gap-2 text-sm text-heading"><input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={received} onChange={(event) => setReceived(event.target.checked)} /><span>Goods received today<span className="block text-xs text-muted-foreground">Untick if you only placed the order — stock is added when you mark it received.</span></span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Paid now"><Input type="number" min={0} placeholder="0" value={paidNow} onChange={(event) => setPaidNow(event.target.value)} /></Field>
              <Field label="From account" hint={paid ? `Balance ${money(balances.get(accountId) ?? 0)}` : undefined}>
                <Select value={accountId} disabled={!paid} onChange={(event) => setAccountId(event.target.value)}>
                  {books.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setPaidNow(String(total))}>Paid in full</Button><Button type="button" size="sm" variant="ghost" onClick={() => setPaidNow("")}>On credit</Button></div>
            {total - paid > 0 ? <p className="text-sm text-muted-foreground">{money(total - paid)} will be owed to the supplier.</p> : null}
            <label className="flex items-center gap-2 text-sm text-heading"><input type="checkbox" className="size-4 accent-primary" checked={updateCost} onChange={(event) => setUpdateCost(event.target.checked)} />Use these prices as the new cost per pair</label>
            <Field label="Notes"><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" onClick={save}><CheckCircle2 className="size-4" />{received ? "Save & add to stock" : "Save order"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
