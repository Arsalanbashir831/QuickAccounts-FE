"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Select } from "@/components/shared/fields";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stockLevels } from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { categories, genders, type Category, type Gender } from "@/domain/types";
import { isOwner, useDemoSession } from "@/features/auth/demo-session";
import { useCompanySettings } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { Swatch } from "./components/size-color-grid";

export function ProductsWorkspace({ companyId }: { companyId: string }) {
  const money = useMoney();
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const owner = isOwner(useDemoSession());
  const base = `/c/${encodeURIComponent(companyId)}`;
  const stock = useMemo(() => stockLevels(books), [books]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | Category>("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return books.styles
      .filter((style) => (showArchived || style.active) && (!category || style.category === category) && (!gender || style.gender === gender))
      .filter((style) => !needle || [style.name, style.brand, style.code].some((value) => value.toLowerCase().includes(needle)) || style.variants.some((variant) => variant.barcode === needle || variant.sku.toLowerCase() === needle))
      .map((style) => {
        const pairs = style.variants.reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0);
        const empty = style.variants.filter((variant) => (stock.get(variant.id) ?? 0) <= 0).length;
        const low = style.variants.filter((variant) => { const qty = stock.get(variant.id) ?? 0; return qty > 0 && qty <= settings.rules.lowStockThreshold; }).length;
        return { style, pairs, empty, low };
      });
  }, [books.styles, category, gender, query, settings.rules.lowStockThreshold, showArchived, stock]);

  const totalPairs = rows.reduce((sum, row) => sum + row.pairs, 0);
  const totalVariants = rows.reduce((sum, row) => sum + row.style.variants.length, 0);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Catalog"
        title="Products"
        description="Each style has its own colours and sizes. Every colour + size is a variant with its own SKU, barcode and stock."
        action={owner ? <Button asChild><Link href={`${base}/products/new`}><Plus className="size-4" />Add style</Link></Button> : undefined}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search styles" className="pl-9" placeholder="Name, brand, code, SKU or barcode" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select aria-label="Category" className="lg:w-48" value={category} onChange={(event) => setCategory(event.target.value as Category | "")}>
          <option value="">All categories</option>
          {categories.map((entry) => <option key={entry}>{entry}</option>)}
        </Select>
        <Select aria-label="For" className="lg:w-36" value={gender} onChange={(event) => setGender(event.target.value as Gender | "")}>
          <option value="">Everyone</option>
          {genders.map((entry) => <option key={entry}>{entry}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" className="size-4 accent-primary" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Show archived</label>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-muted/30 px-4 py-3 text-sm">
          <span><strong className="text-heading">{rows.length}</strong> <span className="text-muted-foreground">styles</span></span>
          <span><strong className="text-heading">{totalVariants}</strong> <span className="text-muted-foreground">variants</span></span>
          <span><strong className="text-heading">{totalPairs}</strong> <span className="text-muted-foreground">pairs in stock</span></span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Style</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead>Colours</TableHead>
              {owner ? <TableHead className="text-right">Cost</TableHead> : null}
              <TableHead className="text-right">Price</TableHead>
              {owner ? <TableHead className="text-right">Margin</TableHead> : null}
              <TableHead className="text-right">In stock</TableHead>
              <TableHead>Size gaps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ style, pairs, empty, low }) => (
              <TableRow key={style.id} className={style.active ? undefined : "opacity-60"}>
                <TableCell>
                  <Link href={`${base}/products/${style.id}`} className="font-semibold text-heading hover:text-primary">{style.name}</Link>
                  <p className="text-xs text-muted-foreground">{style.brand} · <span className="font-mono">{style.code}</span>{style.active ? "" : " · archived"}</p>
                </TableCell>
                <TableCell className="text-sm">{style.category}<p className="text-xs text-muted-foreground">{style.gender}</p></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{style.sizeSystem === "One size" ? "One size" : `${style.sizeSystem} ${style.sizes[0]}–${style.sizes[style.sizes.length - 1]}`}</TableCell>
                <TableCell><span className="flex items-center gap-1">{style.colors.map((color) => <Swatch key={color.name} hex={color.hex} label={color.name} />)}</span></TableCell>
                {owner ? <TableCell className="text-right tabular-nums text-muted-foreground">{money(style.cost)}</TableCell> : null}
                <TableCell className="text-right font-semibold tabular-nums text-heading">{money(style.price)}</TableCell>
                {owner ? <TableCell className="text-right tabular-nums">{style.price ? Math.round(((style.price - style.cost) / style.price) * 100) : 0}%</TableCell> : null}
                <TableCell className="text-right font-semibold tabular-nums">{pairs}</TableCell>
                <TableCell>
                  {empty ? <Badge tone="danger" className="mr-1">{empty} out</Badge> : null}
                  {low ? <Badge tone="warning">{low} low</Badge> : null}
                  {!empty && !low ? <span className="text-xs text-muted-foreground">Full run</span> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No styles match. {owner ? <Link className="font-semibold text-primary" href={`${base}/products/new`}>Add a style</Link> : null}</p> : null}
      </Card>
    </div>
  );
}
