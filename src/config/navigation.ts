import {
  Boxes,
  ChartNoAxesCombined,
  BookOpenCheck,
  CreditCard,
  ContactRound,
  House,
  Landmark,
  Settings,
  ShoppingCart,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavigationChild = Readonly<{
  label: string;
  slug: string;
}>;

export type NavigationItem = Readonly<{
  label: string;
  slug: string;
  icon: LucideIcon;
  children?: readonly NavigationChild[];
}>;

export const navigation: readonly NavigationItem[] = [
  { label: "Home", slug: "home", icon: House },
  { label: "Sales", slug: "sales", icon: ShoppingCart },
  {
    label: "Stock",
    slug: "stock",
    icon: Boxes,
    children: [
      { label: "Purchase", slug: "stock/purchases" },
      { label: "Transfer", slug: "stock/transfers" },
      { label: "Activity", slug: "stock/activity" },
      { label: "Products", slug: "stock/products" },
    ],
  },
  { label: "Stores & Warehouses", slug: "locations", icon: Store },
  {
    label: "Bill Payments",
    slug: "bill-payments",
    icon: CreditCard,
    children: [
      { label: "Send Payments", slug: "bill-payments/send" },
      { label: "Receive Payments", slug: "bill-payments/receive" },
    ],
  },
  { label: "Staff & Salaries", slug: "staff-salaries", icon: ContactRound },
  {
    label: "Daybook Entry",
    slug: "daybook",
    icon: BookOpenCheck,
    children: [
      { label: "Today Entry", slug: "daybook/today" },
      { label: "Daybook History", slug: "daybook/history" },
    ],
  },
  { label: "Cash Accounts", slug: "cash-accounts", icon: Wallet },
  { label: "Chart of Accounts", slug: "accounts", icon: Landmark },
  { label: "Ledger", slug: "contacts", icon: ContactRound },
  { label: "Profit & Loss Statement", slug: "reports", icon: ChartNoAxesCombined },
  { label: "Settings", slug: "settings", icon: Settings },
];
