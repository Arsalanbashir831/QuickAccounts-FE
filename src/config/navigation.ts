import {
  Boxes,
  ChartNoAxesCombined,
  BookOpenCheck,
  CreditCard,
  ContactRound,
  House,
  Landmark,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = Readonly<{
  label: string;
  slug: string;
  icon: LucideIcon;
}>;

export const navigation: readonly NavigationItem[] = [
  { label: "Home", slug: "home", icon: House },
  { label: "Sales", slug: "sales", icon: ShoppingCart },
  { label: "Purchases", slug: "purchases", icon: ShoppingBag },
  { label: "Stock", slug: "stock", icon: Boxes },
  { label: "Stores & Warehouses", slug: "locations", icon: Store },
  { label: "Returns and Warranty", slug: "returns", icon: RotateCcw },
  { label: "Bill Payments", slug: "bill-payments", icon: CreditCard },
  { label: "Staff & Salaries", slug: "staff-salaries", icon: ContactRound },
  { label: "Daybook Entry", slug: "daybook", icon: BookOpenCheck },
  { label: "Chart of Accounts", slug: "accounts", icon: Landmark },
  { label: "Ledger", slug: "contacts", icon: ContactRound },
  { label: "Profit & Loss Statement", slug: "reports", icon: ChartNoAxesCombined },
  { label: "Settings", slug: "settings", icon: Settings },
];
