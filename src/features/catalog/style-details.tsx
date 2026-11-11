"use client";

import { ArrowLeft, Boxes, Footprints, Pencil, SlidersHorizontal, TrendingUp, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { variantPrice } from "@/domain/catalog";
import { addDays, sizeSellThrough, stockLevels, stockMovements, stylePerformance, todayIso } from "@/domain/ledger";
import { saveStyle, useBooks } from "@/domain/store";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { StockGrid, Swatch } from "./components/size-color-grid";

export function StyleDetails({ companyId, styleId }: { companyId: string; styleId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const owner = isOwner(useDemoSession());
  const base = `/c/${encodeURIComponent(companyId)}`;
  const style = books.styles.find((entry) => entry.id === styleId);
  const stock = useMemo(() => stockLevels(books), [books]);
  const today = todayIso();
  const from = addDays(today, -89);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const sizes = useMemo(() => (style ? sizeSellThrough(books, style, from, today, stock) : []), [books, style, from, today, stock]);
  const perf = useMemo(() => (style ? stylePerformance(books, from, today, stock).find((row) => row.styleId === style.id) : undefined), [books, style, from, today, stock]);
  const movements = useMemo(() => stockMovements(books, { styleId }).slice(0, 25), [books, styleId]);

  if (!style) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="font-semibold text-heading">Style not found</p>
        <Button asChild className="mt-4" variant="outline"><Link href={`${base}/products`}>Back to products</Link></Button>
      </Card>
    );
  }

  const pairs = style.variants.reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0);
  const maxSold = Math.max(1, ...sizes.map((row) => row.sold));
  const variantName = (id: string) => {
    const variant = style.variants.find((entry) => entry.id === id);
    return variant ? (style.sizeSystem === "One size" ? variant.color : `${variant.color} · ${variant.size}`) : id.split(":").slice(1).join(" · ");
  };

  const savePrice = (variantId: string) => {
    const raw = priceDrafts[variantId];
    if (raw === undefined) return;
    const value = raw.trim() === "" ? undefined : Number(raw);
    if (value !== undefined && !(value > 0)) { toast.error("Enter a price above zero, or leave it empty to use the style price."); return; }
    saveStyle(companyId, { ...style, variants: style.variants.map((variant) => (variant.id === variantId ? { ...variant, priceOverride: value === style.price ? undefined : value } : variant)) });
    setPriceDrafts((current) => { const next = { ...current }; delete next[variantId]; return next; });
    toast.success("Price saved");
  };

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/products`}><ArrowLeft className="size-4" />Products</Link></Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{style.brand} · {style.category} · {style.gender}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-heading sm:text-4xl">{style.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{style.code}</span> · {style.sizeSystem === "One size" ? "One size" : `${style.sizeSystem} ${style.sizes.join(", ")}`}
            {!style.active ? <Badge>Archived</Badge> : null}
          </p>
        </div>
        {owner ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`${base}/stock?view=adjust&style=${style.id}`}><SlidersHorizontal className="size-4" />Adjust stock</Link></Button>
            <Button asChild variant="outline"><Link href={`${base}/purchases/new?style=${style.id}`}><Truck className="size-4" />Reorder</Link></Button>
            <Button asChild><Link href={`${base}/products/${style.id}/edit`}><Pencil className="size-4" />Edit</Link></Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Price" value={money(style.price)} note={owner ? `Cost ${money(style.cost)} · ${Math.round(((style.price - style.cost) / style.price) * 100)}% margin` : undefined} icon={Footprints} tone="primary" />
        <StatCard label="In stock" value={`${pairs} pairs`} note={owner ? `Worth ${money(pairs * style.cost)} at cost` : `${style.variants.length} variants`} icon={Boxes} />
        <StatCard label="Sold (90 days)" value={`${perf?.pairs ?? 0} pairs`} note={perf?.lastSold ? `Last sold ${formatDate(perf.lastSold)}` : "Not sold yet"} icon={TrendingUp} tone="success" />
        {owner ? <StatCard label="Profit (90 days)" value={money(perf?.profit ?? 0)} note={`On ${money(perf?.revenue ?? 0)} sales`} icon={Wallet} tone="info" /> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Stock by size</CardTitle>
            <CardDescription>
              <span className="mr-3 inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-destructive/20" />Sold out</span>
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-warning/25" />{settings.rules.lowStockThreshold} or fewer left</span>
            </CardDescription>
          </CardHeader>
          <CardContent><StockGrid style={style} stock={stock} lowThreshold={settings.rules.lowStockThreshold} /></CardContent>
        </Card>

        {style.sizeSystem !== "One size" ? (
          <Card>
            <CardHeader><CardTitle>Which sizes sell</CardTitle><CardDescription>Last 90 days, all colours. Sell-through = sold ÷ (sold + still in stock).</CardDescription></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {sizes.map((row) => (
                  <li key={row.size} className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm">
                    <span className="font-semibold text-heading">{row.size}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-muted" title={`${row.sold} sold`}>
                      <span className="block h-full rounded-full bg-[#2a78d6]" style={{ width: `${(row.sold / maxSold) * 100}%` }} />
                    </span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground"><strong className="text-heading">{row.sold}</strong> sold · {Math.round(row.sellThrough * 100)}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">Tip: reorder more of the sizes with high sell-through and fewer of the sizes that sit.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Variants</CardTitle><CardDescription>Each colour + size has its own SKU and barcode. {owner ? "Set a different price for one size if needed (e.g. bigger sizes cost more)." : ""}</CardDescription></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colour</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">In stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {style.variants.map((variant) => {
              const qty = stock.get(variant.id) ?? 0;
              const draft = priceDrafts[variant.id];
              return (
                <TableRow key={variant.id}>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><Swatch hex={style.colors.find((color) => color.name === variant.color)?.hex} />{variant.color}</span></TableCell>
                  <TableCell className="font-semibold">{variant.size === "OS" ? "One size" : variant.size}</TableCell>
                  <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{variant.barcode}</TableCell>
                  <TableCell className="text-right">
                    {owner ? (
                      <input
                        aria-label={`Price for ${variant.sku}`}
                        type="number"
                        min={0}
                        value={draft ?? String(variantPrice(style, variant))}
                        onChange={(event) => setPriceDrafts((current) => ({ ...current, [variant.id]: event.target.value }))}
                        onBlur={() => savePrice(variant.id)}
                        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                        className={cn("h-8 w-24 rounded-md border border-transparent bg-transparent px-2 text-right tabular-nums hover:border-input focus-visible:border-ring focus-visible:outline-none", variant.priceOverride !== undefined && "font-semibold text-primary")}
                      />
                    ) : <span className="tabular-nums">{money(variantPrice(style, variant))}</span>}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", qty <= 0 ? "text-destructive" : qty <= settings.rules.lowStockThreshold ? "text-warning-foreground" : "")}>{qty}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Stock history</CardTitle><CardDescription>Latest 25 movements for this style</CardDescription></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Variant</TableHead><TableHead>Detail</TableHead><TableHead className="text-right">Change</TableHead></TableRow></TableHeader>
          <TableBody>
            {movements.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
                <TableCell><Badge tone={row.type === "Purchase" ? "info" : row.type === "Return" ? "warning" : row.type === "Adjustment" ? "neutral" : "success"}>{row.type}</Badge></TableCell>
                <TableCell className="text-sm">{row.href && (owner || row.href.startsWith("sales")) ? <Link href={`${base}/${row.href}`} className="font-mono text-xs font-semibold text-primary hover:underline">{row.reference}</Link> : row.reference}</TableCell>
                <TableCell className="text-sm">{variantName(row.variantId)}</TableCell>
                <TableCell className="max-w-56 truncate text-xs text-muted-foreground">{row.detail}</TableCell>
                <TableCell className={cn("text-right font-semibold tabular-nums", row.qty < 0 ? "text-destructive" : "text-success")}>{row.qty > 0 ? `+${row.qty}` : row.qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
