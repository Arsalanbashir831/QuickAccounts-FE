"use client";

import { sizeLabel } from "@/domain/catalog";
import type { Style } from "@/domain/types";
import { cn } from "@/lib/utils";

export function Swatch({ hex, className, label }: { hex?: string; className?: string; label?: string }) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("inline-block size-3.5 shrink-0 rounded-full border border-black/15 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]", className)}
      style={{ backgroundColor: hex ?? "#ccc" }}
    />
  );
}

const variantKey = (style: Style, color: string, size: string) =>
  style.variants.find((variant) => variant.color === color && variant.size === size)?.id;

/** Read-only stock matrix: colours down, sizes across. Low and empty sizes are highlighted. */
export function StockGrid({ style, stock, lowThreshold, compact = false }: { style: Style; stock: Map<string, number>; lowThreshold: number; compact?: boolean }) {
  const oneSize = style.sizeSystem === "One size";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-sm">
        <thead>
          <tr>
            <th scope="col" className="sr-only">Colour</th>
            {style.sizes.map((size) => (
              <th key={size} scope="col" className="min-w-11 px-1 text-[0.68rem] font-bold text-muted-foreground">{oneSize ? "Qty" : size}</th>
            ))}
            {!oneSize ? <th scope="col" className="px-2 text-[0.68rem] font-bold uppercase text-muted-foreground">Total</th> : null}
          </tr>
        </thead>
        <tbody>
          {style.colors.map((color) => {
            const total = style.sizes.reduce((sum, size) => sum + Math.max(0, stock.get(variantKey(style, color.name, size) ?? "") ?? 0), 0);
            return (
              <tr key={color.name}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-semibold text-heading">
                  <span className="inline-flex items-center gap-1.5"><Swatch hex={color.hex} />{color.name}</span>
                </th>
                {style.sizes.map((size) => {
                  const id = variantKey(style, color.name, size);
                  const qty = id ? stock.get(id) ?? 0 : 0;
                  return (
                    <td
                      key={size}
                      title={`${color.name} · ${sizeLabel(style, size)}: ${qty} in stock`}
                      className={cn(
                        "numeric rounded-md font-semibold",
                        compact ? "h-8" : "h-10",
                        qty <= 0 ? "bg-destructive/10 text-destructive" : qty <= lowThreshold ? "bg-warning/14 text-warning-foreground" : "bg-muted/70 text-heading",
                      )}
                    >
                      {qty <= 0 ? "–" : qty}
                    </td>
                  );
                })}
                {!oneSize ? <td className="numeric px-2 font-bold text-heading">{total}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Editable quantity matrix for entering a size run in one go (purchases,
 * wholesale invoices, opening stock). Values are keyed by variant id.
 */
export function QuantityGrid({
  style,
  values,
  onChange,
  available,
  label,
}: {
  style: Style;
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  /** When given, each cell is capped at what is in stock and shows it. */
  available?: Map<string, number>;
  label: string;
}) {
  const oneSize = style.sizeSystem === "One size";
  const set = (id: string, raw: string) => {
    const parsed = Math.max(0, Math.floor(Number(raw) || 0));
    const capped = available ? Math.min(parsed, Math.max(0, available.get(id) ?? 0)) : parsed;
    const next = { ...values };
    if (capped) next[id] = capped;
    else delete next[id];
    onChange(next);
  };
  const fillRow = (color: string, qty: number) => {
    const next = { ...values };
    for (const size of style.sizes) {
      const id = variantKey(style, color, size);
      if (!id) continue;
      const capped = available ? Math.min(qty, Math.max(0, available.get(id) ?? 0)) : qty;
      if (capped) next[id] = capped;
      else delete next[id];
    }
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-sm" aria-label={label}>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Colour</th>
            {style.sizes.map((size) => <th key={size} scope="col" className="min-w-14 text-[0.68rem] font-bold text-muted-foreground">{oneSize ? "Qty" : size}</th>)}
            <th scope="col" className="sr-only">Fill</th>
          </tr>
        </thead>
        <tbody>
          {style.colors.map((color) => (
            <tr key={color.name}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-semibold text-heading">
                <span className="inline-flex items-center gap-1.5"><Swatch hex={color.hex} />{color.name}</span>
              </th>
              {style.sizes.map((size) => {
                const id = variantKey(style, color.name, size);
                if (!id) return <td key={size} />;
                const max = available ? Math.max(0, available.get(id) ?? 0) : undefined;
                return (
                  <td key={size} className="align-top">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={max}
                      disabled={max === 0}
                      aria-label={`${color.name} ${sizeLabel(style, size)} quantity`}
                      value={values[id] ?? ""}
                      placeholder="0"
                      onChange={(event) => set(id, event.target.value)}
                      className="numeric h-10 w-full min-w-12 rounded-md border border-input bg-background px-1 text-center font-semibold text-heading outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:bg-muted disabled:opacity-60"
                    />
                    {max !== undefined ? <span className="mt-0.5 block text-[0.62rem] text-muted-foreground">{max} left</span> : null}
                  </td>
                );
              })}
              <td className="whitespace-nowrap pl-1 text-left">
                <button type="button" onClick={() => fillRow(color.name, 1)} className="rounded px-1.5 py-1 text-[0.68rem] font-semibold text-primary hover:bg-primary/10">1 each</button>
                <button type="button" onClick={() => fillRow(color.name, 0)} className="rounded px-1.5 py-1 text-[0.68rem] font-semibold text-muted-foreground hover:bg-muted">Clear</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
