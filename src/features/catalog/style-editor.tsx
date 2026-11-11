"use client";

import { ArrowLeft, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Select } from "@/components/shared/fields";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildVariants, sizePresets } from "@/domain/catalog";
import { stockLevels, todayIso } from "@/domain/ledger";
import { newId, recordAdjustments, saveStyle, useBooks } from "@/domain/store";
import { categories, genders, sizeSystems, type Category, type Gender, type SizeSystem, type Style, type StyleColor } from "@/domain/types";
import { useMoney } from "@/lib/format/money";
import { QuantityGrid, Swatch } from "./components/size-color-grid";

const suggestCode = (name: string) => {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.length === 1 ? words[0].slice(0, 6) : `${words[0].slice(0, 3)}-${words[1].slice(0, 3)}`;
};

const commonColors: StyleColor[] = [
  { name: "Black", hex: "#1f2328" }, { name: "White", hex: "#f4f4f2" }, { name: "Brown", hex: "#6b4226" },
  { name: "Tan", hex: "#b07a4a" }, { name: "Navy", hex: "#22335b" }, { name: "Grey", hex: "#9aa0a6" },
  { name: "Maroon", hex: "#7a1f2b" }, { name: "Beige", hex: "#d9c3a3" }, { name: "Pink", hex: "#e77fa6" }, { name: "Gold", hex: "#c9a646" },
];

export function StyleEditor({ companyId, styleId }: { companyId: string; styleId?: string }) {
  const money = useMoney();
  const router = useRouter();
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const existing = books.styles.find((style) => style.id === styleId);
  const stock = useMemo(() => stockLevels(books), [books]);
  const suppliers = books.parties.filter((party) => party.kind === "supplier");

  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [codeTouched, setCodeTouched] = useState(Boolean(existing));
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [category, setCategory] = useState<Category>(existing?.category ?? "Sneakers");
  const [gender, setGender] = useState<Gender>(existing?.gender ?? "Men");
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>(existing?.sizeSystem ?? "EU");
  const [sizesText, setSizesText] = useState((existing?.sizes ?? sizePresets[0].sizes).join(", "));
  const [colors, setColors] = useState<StyleColor[]>(existing?.colors ?? [commonColors[0]]);
  const [cost, setCost] = useState(existing ? String(existing.cost) : "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [supplierId, setSupplierId] = useState(existing?.supplierId ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [opening, setOpening] = useState<Record<string, number>>({});
  const [newColor, setNewColor] = useState({ name: "", hex: "#6b4226" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sizes = useMemo(() => (sizeSystem === "One size" ? ["OS"] : [...new Set(sizesText.split(/[\s,]+/).map((size) => size.trim()).filter(Boolean))]), [sizeSystem, sizesText]);
  const id = existing?.id ?? (code ? code.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "new");
  const draft: Style = {
    id, code: code.toUpperCase(), name, brand, category, gender, sizeSystem, sizes, colors,
    cost: Number(cost) || 0, price: Number(price) || 0, supplierId: supplierId || undefined, active,
    createdAt: existing?.createdAt ?? todayIso(),
    variants: buildVariants({ id, code: code.toUpperCase(), sizes, colors, variants: existing?.variants }),
  };

  // Variants that would be removed but still have pairs in stock.
  const removedWithStock = (existing?.variants ?? []).filter((variant) => !draft.variants.some((entry) => entry.id === variant.id) && (stock.get(variant.id) ?? 0) > 0);
  const margin = Number(price) ? Math.round(((Number(price) - Number(cost)) / Number(price)) * 100) : 0;

  const addColor = (color: StyleColor) => {
    if (!color.name.trim() || colors.some((entry) => entry.name.toLowerCase() === color.name.trim().toLowerCase())) return;
    setColors((current) => [...current, { name: color.name.trim(), hex: color.hex }]);
    setNewColor({ name: "", hex: newColor.hex });
  };

  const save = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the style name.";
    if (!/^[A-Z0-9-]{2,12}$/.test(code.toUpperCase())) next.code = "2–12 letters, numbers or dashes.";
    else if (!existing && books.styles.some((style) => style.code === code.toUpperCase() || style.id === id)) next.code = "Another style already uses this code.";
    if (!sizes.length) next.sizes = "Add at least one size.";
    if (!colors.length) next.colors = "Add at least one colour.";
    if (!(Number(price) > 0)) next.price = "Enter the selling price.";
    if (Number(cost) < 0) next.cost = "Cost can’t be negative.";
    if (removedWithStock.length) next.sizes = `${removedWithStock.length} size/colour combinations you removed still have stock. Sell or adjust them first.`;
    setErrors(next);
    if (Object.keys(next).length) return;

    saveStyle(companyId, { ...draft, name: name.trim(), brand: brand.trim() });
    const openingRows = Object.entries(opening).filter(([, qty]) => qty > 0);
    if (!existing && openingRows.length) {
      recordAdjustments(companyId, openingRows.map(([variantId, qty]) => ({ id: newId("adj"), date: todayIso(), variantId, qty, reason: "Opening stock" as const, note: "Entered when the style was added" })));
    }
    toast.success(existing ? "Style updated" : `${name} added with ${draft.variants.length} variants`);
    router.push(`${base}/products/${draft.id}`);
  };

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={existing ? `${base}/products/${existing.id}` : `${base}/products`}><ArrowLeft className="size-4" />{existing ? existing.name : "Products"}</Link></Button>
      <WorkspaceHeader eyebrow="Catalog" title={existing ? `Edit ${existing.name}` : "Add a style"} description="Set it up once: sizes × colours become variants, each with its own SKU and barcode." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] xl:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Style</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Style name" error={errors.name} className="sm:col-span-2">
                <Input value={name} placeholder="e.g. Stride Runner Pro" onChange={(event) => { setName(event.target.value); if (!codeTouched) setCode(suggestCode(event.target.value)); }} />
              </Field>
              <Field label="Article code" hint="Used at the start of every SKU" error={errors.code}>
                <Input className="font-mono uppercase" value={code} disabled={Boolean(existing)} onChange={(event) => { setCode(event.target.value.toUpperCase()); setCodeTouched(true); }} />
              </Field>
              <Field label="Brand"><Input value={brand} placeholder="Your brand or the maker’s" onChange={(event) => setBrand(event.target.value)} /></Field>
              <Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
              <Field label="For"><Select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>{genders.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
              <Field label="Usual supplier">
                <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                  <option value="">None</option>
                  {suppliers.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                </Select>
              </Field>
              {existing ? <label className="flex items-center gap-2 self-end pb-2 text-sm text-heading"><input type="checkbox" className="size-4 accent-primary" checked={active} onChange={(event) => setActive(event.target.checked)} />Active (shown in POS)</label> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sizes & colours</CardTitle><CardDescription>Pick a size run, or type your own sizes separated by commas (half sizes like 7.5 are fine).</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {sizePresets.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => { setSizeSystem(preset.system); setSizesText(preset.sizes.join(", ")); }} className="rounded-full border px-3 py-1.5 text-xs font-semibold text-heading hover:border-primary/40 hover:bg-primary/5">{preset.label}</button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <Field label="Size system"><Select value={sizeSystem} onChange={(event) => setSizeSystem(event.target.value as SizeSystem)}>{sizeSystems.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
                <Field label="Sizes" error={errors.sizes}><Input value={sizeSystem === "One size" ? "One size" : sizesText} disabled={sizeSystem === "One size"} onChange={(event) => setSizesText(event.target.value)} /></Field>
              </div>
              <div>
                <p className="text-sm font-medium text-heading">Colours</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <span key={color.name} className="inline-flex h-9 items-center gap-2 rounded-full border bg-muted/30 pl-3 pr-1 text-sm font-medium text-heading">
                      <Swatch hex={color.hex} />{color.name}
                      <button type="button" aria-label={`Remove ${color.name}`} onClick={() => setColors((current) => current.filter((entry) => entry.name !== color.name))} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button>
                    </span>
                  ))}
                </div>
                {errors.colors ? <p className="mt-1 text-xs text-destructive">{errors.colors}</p> : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {commonColors.filter((color) => !colors.some((entry) => entry.name === color.name)).map((color) => (
                    <button key={color.name} type="button" onClick={() => addColor(color)} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-heading"><Plus className="size-3" /><Swatch hex={color.hex} className="size-3" />{color.name}</button>
                  ))}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <Field label="Other colour" className="flex-1"><Input value={newColor.name} placeholder="e.g. Olive / Mustard" onChange={(event) => setNewColor({ ...newColor, name: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addColor(newColor); } }} /></Field>
                  <input type="color" aria-label="Swatch colour" value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value })} className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1" />
                  <Button type="button" variant="outline" onClick={() => addColor(newColor)}><Plus className="size-4" />Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {!existing && draft.variants.length ? (
            <Card>
              <CardHeader><CardTitle>Opening stock</CardTitle><CardDescription>How many pairs of each size you have right now. Leave empty if none — stock can also come in through a purchase.</CardDescription></CardHeader>
              <CardContent><QuantityGrid style={draft} values={opening} onChange={setOpening} label="Opening pairs per size" /></CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="xl:sticky xl:top-20">
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Cost per pair" hint="What you pay the supplier" error={errors.cost}><Input type="number" min={0} inputMode="numeric" value={cost} onChange={(event) => setCost(event.target.value)} /></Field>
              <Field label="Selling price" error={errors.price}><Input type="number" min={0} inputMode="numeric" className="font-semibold" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
            </div>
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm">Profit per pair <strong className="tabular-nums">{money((Number(price) || 0) - (Number(cost) || 0))}</strong> · margin <strong>{margin}%</strong></p>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold text-heading">{draft.variants.length} variants</p>
              <p className="text-muted-foreground">{colors.length} colour{colors.length === 1 ? "" : "s"} × {sizes.length} size{sizes.length === 1 ? "" : "s"}</p>
              {draft.variants[0] ? <p className="mt-2 font-mono text-xs text-muted-foreground">e.g. {draft.variants[0].sku}</p> : null}
              {!existing && Object.values(opening).some(Boolean) ? <p className="mt-2 text-muted-foreground">Opening stock: {Object.values(opening).reduce((sum, qty) => sum + qty, 0)} pairs</p> : null}
            </div>
            {removedWithStock.length ? <p className="text-sm text-destructive">{removedWithStock.length} removed size/colour combinations still have stock.</p> : null}
            <Button className="w-full" size="lg" onClick={save}><Save className="size-4" />{existing ? "Save changes" : "Add style"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
