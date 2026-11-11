"use client";

import { stockViews, type StockView } from "@/config/views";
import { Boxes, CheckCircle2, PackageX, Search, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Select } from "@/components/shared/fields";
import { PageTabs } from "@/components/shared/page-tabs";
import { StatCard } from "@/components/shared/stat-card";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findVariant, sizeLabel } from "@/domain/catalog";
import { inventoryValue, lowStock, stockLevels, stockMovements, todayIso, type MovementType } from "@/domain/ledger";
import { newId, recordAdjustments, useBooks } from "@/domain/store";
import { adjustmentReasons, categories, type AdjustmentReason, type Category } from "@/domain/types";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { QuantityGrid, StockGrid, Swatch } from "@/features/catalog/components/size-color-grid";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";


export function StockWorkspace({ companyId, view, styleParam }: { companyId: string; view: StockView; styleParam?: string }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const owner = isOwner(useDemoSession());
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stock = useMemo(() => stockLevels(books), [books]);
  const value = useMemo(() => inventoryValue(books, stock), [books, stock]);
  const low = useMemo(() => lowStock(books, stock, settings.rules.lowStockThreshold), [books, stock, settings.rules.lowStockThreshold]);
  const activeView = owner || view === "grid" || view === "low" ? view : "grid";
  const tabs = stockViews.filter((tab) => owner || tab.value === "grid" || tab.value === "low").map((tab) => (tab.value === "low" ? { ...tab, count: low.length } : tab));
  const soldOut = low.filter((row) => row.qty <= 0).length;

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader eyebrow="Inventory" title="Stock" description="Pairs on hand for every style, colour and size. Stock moves automatically with sales, returns, purchases and adjustments." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pairs in stock" value={value.pairs} note={`${books.styles.filter((style) => style.active).length} active styles`} icon={Boxes} tone="primary" />
        {owner ? <StatCard label="Stock value at cost" value={money(value.cost)} note={`Retail value ${money(value.retail)}`} icon={Wallet} tone="info" /> : null}
        <StatCard label="Sizes sold out" value={soldOut} note="Lost sales until restocked" icon={PackageX} tone="danger" href={`${base}/stock?view=low`} />
        <StatCard label="Sizes running low" value={low.length - soldOut} note={`${settings.rules.lowStockThreshold} pair${settings.rules.lowStockThreshold === 1 ? "" : "s"} or fewer`} icon={Truck} href={`${base}/stock?view=low`} />
      </div>
      <PageTabs tabs={tabs} active={activeView} hrefFor={(next) => `${base}/stock?view=${next}`} />
      {activeView === "grid" ? <GridView companyId={companyId} stock={stock} /> : null}
      {activeView === "low" ? <LowView companyId={companyId} rows={low} owner={owner} /> : null}
      {activeView === "adjust" ? <AdjustView companyId={companyId} stock={stock} initialStyleId={styleParam} /> : null}
      {activeView === "history" ? <HistoryView companyId={companyId} /> : null}
    </div>
  );
}

function GridView({ companyId, stock }: { companyId: string; stock: Map<string, number> }) {
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | Category>("");
  const styles = books.styles.filter((style) => style.active && (!category || style.category === category) &&
    (!query.trim() || [style.name, style.brand, style.code].some((field) => field.toLowerCase().includes(query.trim().toLowerCase()))));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search styles" className="pl-9" placeholder="Search styles" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select aria-label="Category" className="sm:w-52" value={category} onChange={(event) => setCategory(event.target.value as Category | "")}>
          <option value="">All categories</option>
          {categories.map((entry) => <option key={entry}>{entry}</option>)}
        </Select>
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {styles.map((style) => (
          <Card key={style.id}>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <Link href={`${base}/products/${style.id}`} className="font-semibold text-heading hover:text-primary">{style.name}</Link>
                <p className="text-xs text-muted-foreground">{style.category} · {style.sizeSystem === "One size" ? "One size" : `${style.sizeSystem} sizes`}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-heading">{style.variants.reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0)} pairs</span>
            </CardHeader>
            <CardContent><StockGrid style={style} stock={stock} lowThreshold={settings.rules.lowStockThreshold} compact /></CardContent>
          </Card>
        ))}
      </div>
      {!styles.length ? <p className="py-8 text-center text-sm text-muted-foreground">No styles match.</p> : null}
    </div>
  );
}

function LowView({ companyId, rows, owner }: { companyId: string; rows: ReturnType<typeof lowStock>; owner: boolean }) {
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stylesToRestock = owner ? new Set(rows.map((row) => row.style.id)).size : 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div><CardTitle>Sizes to reorder</CardTitle><CardDescription>Sold-out sizes first. Customers who can’t find their size walk out — keep popular sizes in stock.</CardDescription></div>
      </CardHeader>
      <Table>
        <TableHeader><TableRow><TableHead>Style</TableHead><TableHead>Colour</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Left</TableHead>{owner ? <TableHead /> : null}</TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.variantId}>
              <TableCell><Link href={`${base}/products/${row.style.id}`} className="font-semibold text-heading hover:text-primary">{row.style.name}</Link><p className="text-xs text-muted-foreground">{row.style.category}</p></TableCell>
              <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><Swatch hex={row.style.colors.find((color) => color.name === row.color)?.hex} />{row.color}</span></TableCell>
              <TableCell className="font-semibold">{sizeLabel(row.style, row.size)}</TableCell>
              <TableCell className="text-right"><Badge tone={row.qty <= 0 ? "danger" : "warning"}>{row.qty <= 0 ? "Sold out" : row.qty}</Badge></TableCell>
              {owner ? <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`${base}/purchases/new?style=${row.style.id}`}>Reorder</Link></Button></TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">Nothing is running low.</p> : null}
      {stylesToRestock ? <p className="border-t px-5 py-3 text-xs text-muted-foreground">{stylesToRestock} styles need restocking.</p> : null}
    </Card>
  );
}

function AdjustView({ companyId, stock, initialStyleId }: { companyId: string; stock: Map<string, number>; initialStyleId?: string }) {
  const books = useBooks(companyId);
  const router = useRouter();
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [reason, setReason] = useState<AdjustmentReason>("Count correction");
  const [styleId, setStyleId] = useState(initialStyleId && books.styles.some((style) => style.id === initialStyleId) ? initialStyleId : "");
  const [values, setValues] = useState<Record<string, number>>({});
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const style = books.styles.find((entry) => entry.id === styleId);
  const counting = reason === "Count correction";
  const adding = reason === "Opening stock";

  const changes = useMemo(() => {
    if (!style) return [];
    if (counting) {
      return style.variants.flatMap((variant) => {
        const raw = counted[variant.id];
        if (raw === undefined || raw.trim() === "") return [];
        const diff = Math.max(0, Math.floor(Number(raw) || 0)) - (stock.get(variant.id) ?? 0);
        return diff ? [{ variantId: variant.id, qty: diff }] : [];
      });
    }
    return Object.entries(values).filter(([, qty]) => qty > 0).map(([variantId, qty]) => ({ variantId, qty: adding ? qty : -qty }));
  }, [adding, counted, counting, stock, style, values]);

  const save = () => {
    if (!changes.length) { toast.error(counting ? "Type the counted pairs for at least one size that differs." : "Enter at least one pair."); return; }
    recordAdjustments(companyId, changes.map((change) => ({ id: newId("adj"), date: todayIso(), variantId: change.variantId, qty: change.qty, reason, note: note.trim() || undefined })));
    toast.success(`Stock adjusted for ${changes.length} size${changes.length === 1 ? "" : "s"}`);
    setValues({}); setCounted({}); setNote("");
    router.push(`${base}/stock?view=history`);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:items-start">
      <Card>
        <CardHeader><CardTitle>{counting ? "Count the shelf" : adding ? "Add opening stock" : `Remove ${reason.toLowerCase()} pairs`}</CardTitle><CardDescription>{counting ? "Type what you actually counted. Only sizes that differ are changed." : adding ? "Pairs you already had before using the app." : "Pairs that leave stock without a sale. Their cost is shown as a loss in Profit & Loss."}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reason"><Select value={reason} onChange={(event) => { setReason(event.target.value as AdjustmentReason); setValues({}); setCounted({}); }}>{adjustmentReasons.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
            <Field label="Style">
              <Select value={styleId} onChange={(event) => { setStyleId(event.target.value); setValues({}); setCounted({}); }}>
                <option value="">Choose a style…</option>
                {books.styles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.code}</option>)}
              </Select>
            </Field>
          </div>
          {style ? (counting ? (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-center text-sm" aria-label="Counted pairs">
                <thead><tr><th className="sr-only">Colour</th>{style.sizes.map((size) => <th key={size} className="min-w-14 text-[0.68rem] font-bold text-muted-foreground">{size === "OS" ? "Qty" : size}</th>)}</tr></thead>
                <tbody>
                  {style.colors.map((color) => (
                    <tr key={color.name}>
                      <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-semibold"><span className="inline-flex items-center gap-1.5"><Swatch hex={color.hex} />{color.name}</span></th>
                      {style.sizes.map((size) => {
                        const variant = style.variants.find((entry) => entry.color === color.name && entry.size === size);
                        if (!variant) return <td key={size} />;
                        const current = stock.get(variant.id) ?? 0;
                        const raw = counted[variant.id] ?? "";
                        const diff = raw.trim() === "" ? 0 : (Number(raw) || 0) - current;
                        return (
                          <td key={size} className="align-top">
                            <input type="number" min={0} inputMode="numeric" placeholder={String(current)} aria-label={`Counted ${color.name} ${size}`} value={raw} onChange={(event) => setCounted((prev) => ({ ...prev, [variant.id]: event.target.value }))} className={cn("numeric h-10 w-full min-w-12 rounded-md border bg-background px-1 text-center font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/20", diff ? "border-primary" : "border-input")} />
                            <span className={cn("mt-0.5 block text-[0.62rem]", diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground")}>{diff ? (diff > 0 ? `+${diff}` : diff) : `has ${current}`}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <QuantityGrid style={style} values={values} onChange={setValues} available={adding ? undefined : stock} label={`${reason} pairs`} />
          )) : null}
        </CardContent>
      </Card>
      <Card className="xl:sticky xl:top-20">
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {changes.length ? (
            <ul className="space-y-1 text-sm">
              {changes.map((change) => {
                const found = findVariant(books.styles, change.variantId);
                return <li key={change.variantId} className="flex justify-between gap-2"><span>{found ? `${found.variant.color} · ${sizeLabel(found.style, found.variant.size)}` : change.variantId}</span><span className={cn("font-semibold tabular-nums", change.qty < 0 ? "text-destructive" : "text-success")}>{change.qty > 0 ? `+${change.qty}` : change.qty}</span></li>;
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No changes yet.</p>}
          <Field label="Note"><Input value={note} placeholder="e.g. Monthly count, sole came off" onChange={(event) => setNote(event.target.value)} /></Field>
          <Button className="w-full" onClick={save} disabled={!changes.length}><CheckCircle2 className="size-4" />Save adjustment</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryView({ companyId }: { companyId: string }) {
  const books = useBooks(companyId);
  const formatDate = useDateFormatter(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const [type, setType] = useState<"" | MovementType>("");
  const rows = useMemo(() => stockMovements(books).filter((row) => !type || row.type === type), [books, type]);
  const label = (variantId: string) => {
    const found = findVariant(books.styles, variantId);
    return found ? { style: found.style.name, variant: `${found.variant.color} · ${sizeLabel(found.style, found.variant.size)}`, href: `${base}/products/${found.style.id}` } : { style: variantId.split(":")[0], variant: variantId.split(":").slice(1).join(" "), href: undefined };
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>All stock movements</CardTitle>
        <Select aria-label="Movement type" className="w-44" value={type} onChange={(event) => setType(event.target.value as MovementType | "")}>
          <option value="">All types</option>
          {(["Sale", "Return", "Purchase", "Adjustment"] as const).map((entry) => <option key={entry}>{entry}</option>)}
        </Select>
      </CardHeader>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Style</TableHead><TableHead>Variant</TableHead><TableHead className="text-right">Change</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.slice(0, 300).map((row) => {
            const info = label(row.variantId);
            return (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
                <TableCell><Badge tone={row.type === "Purchase" ? "info" : row.type === "Return" ? "warning" : row.type === "Adjustment" ? "neutral" : "success"}>{row.type}</Badge></TableCell>
                <TableCell>{row.href ? <Link href={`${base}/${row.href}`} className="font-mono text-xs font-semibold text-primary hover:underline">{row.reference}</Link> : <span className="text-sm">{row.reference}</span>}{row.detail && row.type === "Adjustment" ? <p className="text-xs text-muted-foreground">{row.detail}</p> : null}</TableCell>
                <TableCell className="text-sm">{info.href ? <Link href={info.href} className="hover:text-primary">{info.style}</Link> : info.style}</TableCell>
                <TableCell className="text-sm">{info.variant}</TableCell>
                <TableCell className={cn("text-right font-semibold tabular-nums", row.qty < 0 ? "text-destructive" : "text-success")}>{row.qty > 0 ? `+${row.qty}` : row.qty}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length > 300 ? <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing the latest 300 of {rows.length} movements.</p> : null}
    </Card>
  );
}
