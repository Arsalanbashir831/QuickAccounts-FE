export type PosCategory = "Smartphones" | "Audio" | "Charging" | "Accessories" | "Wearables";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: PosCategory;
  price: number;
  stock: number;
}

export const posCategories: readonly PosCategory[] = [
  "Smartphones",
  "Audio",
  "Charging",
  "Accessories",
  "Wearables",
];

export const posProducts: readonly PosProduct[] = [
  { id: "p-sam-a55", name: "Samsung Galaxy A55 5G (8/256GB)", sku: "SAM-A55-BLK", barcode: "8806091829102", category: "Smartphones", price: 114500, stock: 14 },
  { id: "p-xia-rn13", name: "Redmi Note 13 Pro (12/512GB)", sku: "XIA-RN13-BLU", barcode: "6941812739182", category: "Smartphones", price: 78900, stock: 9 },
  { id: "p-apl-ip15", name: "Apple iPhone 15 (128GB)", sku: "APL-IP15-128", barcode: "194253771111", category: "Smartphones", price: 279999, stock: 5 },
  { id: "p-inf-hot40i", name: "Infinix Hot 40i (8/128GB)", sku: "INF-HOT40I", barcode: "4895183400011", category: "Smartphones", price: 34999, stock: 21 },
  { id: "p-bas-h1", name: "Baseus Bowie H1 ANC Headphones", sku: "BAS-H1-GRY", barcode: "6932174608215", category: "Audio", price: 14500, stock: 6 },
  { id: "p-sam-buds", name: "Samsung Galaxy Buds FE", sku: "SAM-BUDS-FE", barcode: "8806095322114", category: "Audio", price: 21999, stock: 11 },
  { id: "p-ank-65w", name: "Anker 65W GaN Fast Charger", sku: "ANK-65W-WHT", barcode: "0848061048291", category: "Charging", price: 6800, stock: 250 },
  { id: "p-apl-20w", name: "Apple 20W USB-C Power Adapter", sku: "APL-20W-ORIG", barcode: "190199588500", category: "Charging", price: 5200, stock: 22 },
  { id: "p-ank-pc20k", name: "Anker PowerCore 20K 30W Power Bank", sku: "ANK-PC20K-BLK", barcode: "0194644123836", category: "Accessories", price: 12900, stock: 17 },
  { id: "p-bas-cable", name: "Baseus Crystal Shine USB-C Cable 1m", sku: "BAS-CS-C1M", barcode: "6932174612380", category: "Accessories", price: 1850, stock: 120 },
  { id: "p-spg-a55", name: "Spigen Rugged Armor Case (Galaxy A55)", sku: "SPG-RA-A55", barcode: "8809811852236", category: "Accessories", price: 3200, stock: 38 },
  { id: "p-apl-wse", name: "Apple Watch SE 40mm GPS", sku: "APL-WSE-40", barcode: "194253750925", category: "Wearables", price: 94999, stock: 4 },
];

export const posCustomers = [
  "Walk-in Customer",
  "Apex Mobiles",
  "Hamza Electronics",
  "City Devices",
] as const;

export const posBankAccounts = [
  { value: "hbl-main", label: "HBL – Main Account (****4821)" },
  { value: "meezan-main", label: "Meezan Bank – Business (****3305)" },
  { value: "ubl-current", label: "UBL – Current Account (****7102)" },
  { value: "allied-saving", label: "Allied Bank – Savings (****9964)" },
] as const;
