import {
  Boxes,
  ChartNoAxesCombined,
  Footprints,
  House,
  ReceiptText,
  Settings,
  Truck,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavigationChild = Readonly<{
  label: string;
  slug: string;
  cashier?: boolean;
}>;

export type NavigationItem = Readonly<{
  label: string;
  slug: string;
  icon: LucideIcon;
  /** Visible to the cashier role as well as the owner. */
  cashier?: boolean;
  children?: readonly NavigationChild[];
}>;

export const navigation: readonly NavigationItem[] = [
  { label: "Home", slug: "home", icon: House, cashier: true },
  {
    label: "Sales & Returns",
    slug: "sales",
    icon: ReceiptText,
    cashier: true,
    children: [
      { label: "Walk-in Customers", slug: "sales/walk-in", cashier: true },
      { label: "Wholesale Customers", slug: "sales/wholesale" },
    ],
  },
  { label: "Products", slug: "products", icon: Footprints, cashier: true },
  { label: "Stock", slug: "stock", icon: Boxes, cashier: true },
  { label: "Purchases", slug: "purchases", icon: Truck },
  { label: "Customers & Suppliers", slug: "parties", icon: UsersRound },
  { label: "Money", slug: "money", icon: Wallet },
  { label: "Reports", slug: "reports", icon: ChartNoAxesCombined },
  { label: "Settings", slug: "settings", icon: Settings },
];
