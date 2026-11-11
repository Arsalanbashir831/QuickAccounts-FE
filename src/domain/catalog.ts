import type { Style, StyleColor, Variant } from "./types";

const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 3) || "X";

/** Deterministic 13-digit, EAN-13 style barcode with a valid check digit. */
export function barcodeFor(seed: string): string {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const body = `20${String(hash).padStart(10, "0").slice(-10)}`;
  const sum = body.split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

export const variantId = (styleId: string, color: string, size: string) =>
  `${styleId}:${color.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${size.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;

export const variantSku = (code: string, color: string, size: string) =>
  `${code}-${slug(color)}-${size.replace(/\s+/g, "").toUpperCase()}`;

/**
 * Builds the full size × colour matrix for a style. Existing variants are kept
 * (so their barcodes and price overrides survive edits); new combinations get
 * fresh SKUs and barcodes.
 */
export function buildVariants(
  style: Pick<Style, "id" | "code" | "sizes" | "colors"> & { variants?: Variant[] },
): Variant[] {
  const existing = new Map((style.variants ?? []).map((variant) => [variant.id, variant]));
  return style.colors.flatMap((color: StyleColor) =>
    style.sizes.map((size) => {
      const id = variantId(style.id, color.name, size);
      const sku = variantSku(style.code, color.name, size);
      return existing.get(id) ?? { id, styleId: style.id, color: color.name, size, sku, barcode: barcodeFor(sku) };
    }),
  );
}

export const variantPrice = (style: Pick<Style, "price">, variant: Pick<Variant, "priceOverride">) =>
  variant.priceOverride ?? style.price;

export const sizeLabel = (style: Pick<Style, "sizeSystem">, size: string) =>
  style.sizeSystem === "One size" ? "One size" : `${style.sizeSystem} ${size}`;

export const variantLabel = (style: Pick<Style, "sizeSystem">, variant: Pick<Variant, "color" | "size">) =>
  style.sizeSystem === "One size" ? variant.color : `${variant.color} · ${sizeLabel(style, variant.size)}`;

/** Inclusive numeric size range, e.g. ("39", "45") → ["39", …, "45"]. Supports half sizes with step 0.5. */
export function sizeRange(from: number, to: number, step = 1): string[] {
  const sizes: string[] = [];
  for (let size = from; size <= to + 1e-9; size += step) sizes.push(String(Math.round(size * 10) / 10));
  return sizes;
}

export const sizePresets: ReadonlyArray<{ label: string; system: "EU" | "UK" | "One size"; sizes: string[] }> = [
  { label: "Men EU 39–45", system: "EU", sizes: sizeRange(39, 45) },
  { label: "Women EU 36–41", system: "EU", sizes: sizeRange(36, 41) },
  { label: "Kids EU 26–34", system: "EU", sizes: sizeRange(26, 34) },
  { label: "Men UK 6–11", system: "UK", sizes: sizeRange(6, 11) },
  { label: "Women UK 3–8", system: "UK", sizes: sizeRange(3, 8) },
  { label: "One size", system: "One size", sizes: ["OS"] },
];

export function findVariant(styles: readonly Style[], id: string): { style: Style; variant: Variant } | undefined {
  const styleId = id.split(":")[0];
  const style = styles.find((entry) => entry.id === styleId);
  const variant = style?.variants.find((entry) => entry.id === id);
  return style && variant ? { style, variant } : undefined;
}

/** Looks up a variant by exact barcode or SKU (case-insensitive). */
export function findByCode(styles: readonly Style[], code: string): { style: Style; variant: Variant } | undefined {
  const needle = code.trim().toLowerCase();
  if (!needle) return undefined;
  for (const style of styles) {
    const variant = style.variants.find((entry) => entry.barcode === needle || entry.sku.toLowerCase() === needle);
    if (variant) return { style, variant };
  }
  return undefined;
}
