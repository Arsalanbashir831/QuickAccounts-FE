"use client";

import { Footprints } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { variantPrice } from "@/domain/catalog";
import type { Style } from "@/domain/types";
import { Swatch } from "@/features/catalog/components/size-color-grid";
import { useMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

/** Colour + size chooser for one style. Numbers show pairs still available. */
export function SizePicker({ style, stock, inCart, onPick, onClose, initialColor, highlightSize }: {
  style: Style;
  stock: Map<string, number>;
  inCart: (variantId: string) => number;
  onPick: (variantId: string) => void;
  onClose: () => void;
  initialColor?: string;
  /** Size the customer is giving back, shown for reference in exchanges. */
  highlightSize?: string;
}) {
  const money = useMoney();
  const firstInStock = style.colors.find((color) => style.variants.some((variant) => variant.color === color.name && (stock.get(variant.id) ?? 0) > 0));
  const [color, setColor] = useState(initialColor ?? firstInStock?.name ?? style.colors[0]?.name ?? "");
  const variants = style.variants.filter((variant) => variant.color === color);

  return (
    <FormDialog
      eyebrow={`${style.brand} · ${style.category}`}
      title={style.name}
      description={style.sizeSystem === "One size" ? "Pick a colour to add it." : `Pick colour and ${style.sizeSystem} size. Numbers show pairs left.`}
      icon={Footprints}
      size="lg"
      onClose={onClose}
      footer={<Button type="button" onClick={onClose}>Done</Button>}
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Colour</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {style.colors.map((entry) => {
              const left = style.variants.filter((variant) => variant.color === entry.name).reduce((sum, variant) => sum + Math.max(0, stock.get(variant.id) ?? 0), 0);
              return (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={color === entry.name}
                  onClick={() => setColor(entry.name)}
                  className={cn("inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold", color === entry.name ? "border-primary bg-primary/10 text-heading ring-2 ring-primary/20" : "hover:bg-muted")}
                >
                  <Swatch hex={entry.hex} className="size-4" />{entry.name}<span className="text-xs font-normal text-muted-foreground">{left}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{style.sizeSystem === "One size" ? "Add" : `Size (${style.sizeSystem})`}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {variants.map((variant) => {
              const left = (stock.get(variant.id) ?? 0) - inCart(variant.id);
              const price = variantPrice(style, variant);
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={left <= 0}
                  onClick={() => onPick(variant.id)}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    left <= 0 ? "cursor-not-allowed border-dashed bg-muted/50 text-muted-foreground line-through" : "bg-white hover:border-primary hover:bg-primary/5",
                  )}
                >
                  {highlightSize === variant.size ? <span className="absolute -top-2 rounded-full bg-heading px-1.5 text-[0.55rem] font-bold uppercase text-white">returned</span> : null}
                  <span className="text-lg font-bold text-heading">{variant.size === "OS" ? "+1" : variant.size}</span>
                  <span className={cn("text-[0.65rem] font-semibold", left <= 0 ? "" : left <= 1 ? "text-warning-foreground" : "text-muted-foreground")}>
                    {left <= 0 ? "none" : `${left} left`}{price !== style.price ? ` · ${money(price)}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
