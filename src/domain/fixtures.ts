/**
 * Demo master data for "Kadam Footwear", a single-store startup.
 * All brand and product names are fictional.
 */
import { buildVariants, sizeRange } from "./catalog";
import type { MoneyAccount, Party, Style } from "./types";

type StyleSeed = Omit<Style, "variants" | "active" | "createdAt">;

const styleSeeds: StyleSeed[] = [
  {
    id: "stride-runner", code: "STR-RUN", name: "Stride Runner Pro", brand: "Stride", category: "Sneakers", gender: "Men",
    sizeSystem: "EU", sizes: sizeRange(39, 45), cost: 3800, price: 6499, supplierId: "sup-lahore",
    colors: [{ name: "Black", hex: "#1f2328" }, { name: "Grey", hex: "#9aa0a6" }, { name: "Navy", hex: "#22335b" }],
  },
  {
    id: "stride-airlite", code: "STR-AIR", name: "Stride Air Lite", brand: "Stride", category: "Sneakers", gender: "Women",
    sizeSystem: "EU", sizes: sizeRange(36, 41), cost: 3400, price: 5999, supplierId: "sup-lahore",
    colors: [{ name: "Blush", hex: "#f2b8c0" }, { name: "White", hex: "#f4f4f2" }],
  },
  {
    id: "court-classic", code: "CRT-CLS", name: "Court Classic", brand: "Urbano", category: "Sneakers", gender: "Unisex",
    sizeSystem: "EU", sizes: sizeRange(37, 44), cost: 2900, price: 4999, supplierId: "sup-karachi",
    colors: [{ name: "White", hex: "#f4f4f2" }, { name: "Black", hex: "#1f2328" }],
  },
  {
    id: "metro-oxford", code: "MET-OXF", name: "Metro Oxford", brand: "Urbano", category: "Formal", gender: "Men",
    sizeSystem: "EU", sizes: sizeRange(39, 45), cost: 4500, price: 7999, supplierId: "sup-sialkot",
    colors: [{ name: "Black", hex: "#1f2328" }, { name: "Brown", hex: "#6b4226" }],
  },
  {
    id: "urban-loafer", code: "URB-LOF", name: "Urban Loafer", brand: "Urbano", category: "Casual", gender: "Men",
    sizeSystem: "EU", sizes: sizeRange(39, 44), cost: 3200, price: 5499, supplierId: "sup-sialkot",
    colors: [{ name: "Tan", hex: "#b07a4a" }, { name: "Navy", hex: "#22335b" }],
  },
  {
    id: "peshawari-classic", code: "KDM-PSH", name: "Peshawari Classic", brand: "Kadam", category: "Traditional", gender: "Men",
    sizeSystem: "UK", sizes: sizeRange(6, 11), cost: 2200, price: 3999, supplierId: "sup-sialkot",
    colors: [{ name: "Brown", hex: "#6b4226" }, { name: "Black", hex: "#1f2328" }],
  },
  {
    id: "grace-khussa", code: "KDM-KHS", name: "Grace Khussa", brand: "Kadam", category: "Traditional", gender: "Women",
    sizeSystem: "UK", sizes: sizeRange(3, 8), cost: 1500, price: 2999, supplierId: "sup-karachi",
    colors: [{ name: "Gold", hex: "#c9a646" }, { name: "Maroon", hex: "#7a1f2b" }],
  },
  {
    id: "bella-block", code: "BEL-BLK", name: "Bella Block Heel", brand: "Bella", category: "Heels", gender: "Women",
    sizeSystem: "EU", sizes: sizeRange(36, 40), cost: 2800, price: 4999, supplierId: "sup-karachi",
    colors: [{ name: "Nude", hex: "#d9b99b" }, { name: "Black", hex: "#1f2328" }],
  },
  {
    id: "trail-blazer", code: "TRL-MID", name: "Trail Blazer Mid", brand: "Stride", category: "Boots", gender: "Men",
    sizeSystem: "EU", sizes: sizeRange(40, 45), cost: 5200, price: 8999, supplierId: "sup-lahore",
    colors: [{ name: "Brown", hex: "#6b4226" }],
  },
  {
    id: "breeze-slide", code: "BRZ-SLD", name: "Breeze Slide", brand: "Aero", category: "Sandals & Slides", gender: "Unisex",
    sizeSystem: "EU", sizes: sizeRange(38, 45), cost: 650, price: 1299, supplierId: "sup-karachi",
    colors: [{ name: "Black", hex: "#1f2328" }, { name: "Olive", hex: "#6b7445" }],
  },
  {
    id: "comfy-home", code: "CMF-HOM", name: "Comfy Home Slipper", brand: "Aero", category: "Sandals & Slides", gender: "Women",
    sizeSystem: "EU", sizes: sizeRange(36, 41), cost: 450, price: 899, supplierId: "sup-karachi",
    colors: [{ name: "Grey", hex: "#9aa0a6" }, { name: "Maroon", hex: "#7a1f2b" }],
  },
  {
    id: "kiddo-bounce", code: "KID-BNC", name: "Kiddo Bounce", brand: "Tiny Toes", category: "Kids", gender: "Kids",
    sizeSystem: "EU", sizes: sizeRange(26, 33), cost: 1300, price: 2499, supplierId: "sup-kids",
    colors: [{ name: "Blue", hex: "#3b6fd4" }, { name: "Pink", hex: "#e77fa6" }],
  },
  {
    id: "school-champ", code: "KID-SCH", name: "School Champ Strap", brand: "Tiny Toes", category: "Kids", gender: "Kids",
    sizeSystem: "EU", sizes: sizeRange(28, 34), cost: 1100, price: 1999, supplierId: "sup-kids",
    colors: [{ name: "Black", hex: "#1f2328" }],
  },
  {
    id: "ankle-socks", code: "ACC-SCK", name: "Cotton Ankle Socks (3 pairs)", brand: "Kadam", category: "Accessories", gender: "Unisex",
    sizeSystem: "One size", sizes: ["OS"], cost: 220, price: 499, supplierId: "sup-karachi",
    colors: [{ name: "Black", hex: "#1f2328" }, { name: "White", hex: "#f4f4f2" }],
  },
  {
    id: "shoe-care", code: "ACC-CARE", name: "Shoe Care Kit", brand: "Kadam", category: "Accessories", gender: "Unisex",
    sizeSystem: "One size", sizes: ["OS"], cost: 380, price: 799, supplierId: "sup-karachi",
    colors: [{ name: "Neutral", hex: "#c8bfae" }],
  },
];

export const fixtureStyles: Style[] = styleSeeds.map((seed) => ({
  ...seed,
  active: true,
  createdAt: "2026-06-01",
  variants: buildVariants(seed),
}));

export const fixtureParties: Party[] = [
  { id: "sup-lahore", kind: "supplier", name: "Lahore Footwear Mfg.", phone: "0300-1112233", city: "Lahore", openingBalance: 0 },
  { id: "sup-karachi", kind: "supplier", name: "Karachi Sole Traders", phone: "0321-4455667", city: "Karachi", openingBalance: 0 },
  { id: "sup-sialkot", kind: "supplier", name: "Sialkot Leather Works", phone: "0333-7788990", city: "Sialkot", openingBalance: 0 },
  { id: "sup-kids", kind: "supplier", name: "Little Steps Wholesale", phone: "0345-2233445", city: "Faisalabad", openingBalance: 0 },
  { id: "cus-alnoor", kind: "customer", name: "Al-Noor Shoe Corner", phone: "0301-5566778", city: "Gujranwala", openingBalance: 0, creditAllowed: true, notes: "Buys sneakers in size runs. 15-day credit." },
  { id: "cus-fashionhub", kind: "customer", name: "Fashion Hub Gulberg", phone: "0322-9988776", city: "Lahore", openingBalance: 0, creditAllowed: true },
  { id: "cus-kamran", kind: "customer", name: "Kamran Ali", phone: "0312-3344556", city: "Lahore", openingBalance: 0, creditAllowed: true, notes: "Regular customer, monthly khata." },
  { id: "cus-sana", kind: "customer", name: "Sana Tariq", phone: "0308-6677889", city: "Lahore", openingBalance: 0 },
];

export const fixtureAccounts: MoneyAccount[] = [
  { id: "cash", name: "Cash drawer", kind: "cash", detail: "Counter cash", openingBalance: 25000 },
  { id: "meezan", name: "Meezan Bank", kind: "bank", detail: "Current ****3305", openingBalance: 350000 },
  { id: "jazzcash", name: "JazzCash", kind: "wallet", detail: "0300-0001122", openingBalance: 0 },
];

/** Card payments settle into this account. */
export const CARD_SETTLEMENT_ACCOUNT = "meezan";
