import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Plus,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfitExpenseChart } from "./components/profit-expense-chart";
import { QuickActions } from "./components/quick-actions";

const statMetrics = [
  {
    label: "Today's Sales",
    value: "PKR 482,600",
    note: "18 confirmed invoices",
    badge: "+12.4%",
    badgeTone: "success" as const,
    icon: ShoppingCart,
    accent: "text-primary bg-primary/10",
  },
  {
    label: "Pending to Receive",
    value: "PKR 345,000",
    note: "7 customer invoices due",
    badge: "4 due today",
    badgeTone: "warning" as const,
    icon: ArrowDownLeft,
    accent: "text-success bg-success/12",
  },
  {
    label: "Pending to Send",
    value: "PKR 182,500",
    note: "5 supplier bills awaiting pay",
    badge: "2 urgent",
    badgeTone: "danger" as const,
    icon: ArrowUpRight,
    accent: "text-destructive bg-destructive/10",
  },
  {
    label: "Net Cash Position",
    value: "PKR 1,420,800",
    note: "Bank accounts & cash drawers",
    badge: "Liquidity OK",
    badgeTone: "neutral" as const,
    icon: Wallet,
    accent: "text-info bg-info/12",
  },
];

const priorityTasks = [
  {
    title: "Receive PO-0382",
    detail: "Mumtaz Distributors · 32 units",
    kind: "Stock",
    href: "purchases?view=receiving",
  },
  {
    title: "Review price exception",
    detail: "Invoice DOT-1045 · PKR 28,900",
    kind: "Approval",
    href: "sales?view=invoices",
  },
  {
    title: "Resolve transfer shortage",
    detail: "TR-0198 · 2 units in transit",
    kind: "Exception",
    href: "stock?view=transfers",
  },
];

export const HomeWorkspace = ({ companyId }: { companyId: string }) => (
  <div className="workspace-enter">
    <WorkspaceHeader
      eyebrow="Thursday · Main Outlet"
      title="Good morning"
      description="Here is the live operating summary, sales statistics and cash health across your permitted business scope."
      action={
        <Button asChild>
          <Link href={`/c/${companyId}/sales/new`}>
            <Plus className="size-4" />
            New sale
          </Link>
        </Button>
      }
    />

    <DashboardLayout
      summary={statMetrics.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-md ${stat.accent}`}
                  >
                    <Icon className="size-4" strokeWidth={2} />
                  </div>
                  <CardDescription className="font-medium text-muted-foreground">
                    {stat.label}
                  </CardDescription>
                </div>
                <Badge tone={stat.badgeTone} className="text-[10px] tracking-normal">
                  {stat.badge}
                </Badge>
              </div>

              <div className="mt-3">
                <CardTitle className="numeric text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                  {stat.value}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
              </div>
            </CardHeader>
          </Card>
        );
      })}
      main={
        <>
          {/* Monthly Profit & Expense Chart */}
          <ProfitExpenseChart />

          {/* Priority Queue Card */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Priority Action Queue</CardTitle>
                <CardDescription>
                  Pending approvals, receipts and stock exceptions requiring action
                </CardDescription>
              </div>
              <Badge tone="warning">3 open</Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {priorityTasks.map((task, index) => (
                <div key={task.title}>
                  {index ? <Separator /> : null}
                  <Link
                    className="group flex items-center gap-4 py-3.5 transition-colors hover:text-primary"
                    href={`/c/${companyId}/${task.href}`}
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <ClipboardCheck className="size-4.5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-heading group-hover:text-primary">
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.detail}
                      </p>
                    </div>
                    <Badge tone="neutral">{task.kind}</Badge>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          {/* Quick Actions Panel */}
          <QuickActions companyId={companyId} />

          {/* Operating Pulse & Settlement Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Settlement</CardTitle>
                <Badge tone="neutral">Main Outlet</Badge>
              </div>
              <CardDescription>Daily register & counter close preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Cash drawer balance</span>
                <span className="font-semibold text-heading">PKR 94,500</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Bank / Card collections</span>
                <span className="font-semibold text-heading">PKR 388,100</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Customer returns processed</span>
                <span className="font-semibold text-heading">PKR 12,000</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-heading">Gross Sales (Total)</span>
                <span className="font-bold text-primary">PKR 482,600</span>
              </div>

              <div className="pt-3">
                <Button asChild className="w-full" variant="outline" size="sm">
                  <Link href={`/c/${companyId}/daybook`}>
                    Open Daybook &rarr;
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      }
    />
  </div>
);
