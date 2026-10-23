import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ShoppingCart,
  Truck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const QuickActions = ({ companyId }: { companyId: string }) => {
  const actions = [
    {
      title: "New Sale",
      description: "Counter POS or credit invoice",
      icon: ShoppingCart,
      href: `/c/${companyId}/sales/new`,
      badge: "Sales",
      accent: "text-primary bg-primary/10",
      primary: true,
    },
    {
      title: "Receive Payment",
      description: "Collect customer balance",
      icon: ArrowDownLeft,
      href: `/c/${companyId}/bill-payments/receive`,
      badge: "Inbound",
      accent: "text-success bg-success/12",
      primary: false,
    },
    {
      title: "New Purchase",
      description: "Raise supplier order or GRN",
      icon: Truck,
      href: `/c/${companyId}/stock/purchases`,
      badge: "Purchases",
      accent: "text-info bg-info/12",
      primary: false,
    },
    {
      title: "Send Payment",
      description: "Pay supplier bill or expense",
      icon: ArrowUpRight,
      href: `/c/${companyId}/bill-payments/send`,
      badge: "Outbound",
      accent: "text-warning bg-warning/14",
      primary: false,
    },
    {
      title: "Add Product",
      description: "Create SKU, barcodes & stock",
      icon: Boxes,
      href: `/c/${companyId}/stock/products`,
      badge: "Inventory",
      accent: "text-muted-foreground bg-muted",
      primary: false,
    },
    {
      title: "Add Customer",
      description: "Register party or vendor profile",
      icon: UserPlus,
      href: `/c/${companyId}/contacts?view=customers`,
      badge: "Contacts",
      accent: "text-muted-foreground bg-muted",
      primary: false,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Quick Actions</CardTitle>
          <Badge tone="neutral">Shortcuts</Badge>
        </div>
        <CardDescription>
          Execute everyday business transactions directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2.5 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs active:translate-y-px"
            >
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-md ${action.accent} transition-transform group-hover:scale-105`}
              >
                <Icon className="size-4.5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-heading group-hover:text-primary">
                    {action.title}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {action.badge}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
