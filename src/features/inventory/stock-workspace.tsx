"use client";

import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductsView } from "./components/products-view";
import { StockActivityView } from "./components/stock-activity-view";
import { StockBalancesView } from "./components/stock-balances-view";
import { TransfersView } from "./components/transfers-view";

import { stockViews } from "./stock-views";
export { stockViews } from "./stock-views";

export const StockWorkspace = ({
  companyId,
  initialView = "stock",
}: {
  companyId: string;
  initialView: string;
}) => {
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Stock · Inventory & Custody"
        title="Stock Workspace"
        description="Monitor physical stock across retail outlets and warehouses, track serialized units, and manage transfers."
      />

      {/* View Switcher Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {stockViews.map((tab) => {
          const isActive = initialView === tab.value;
          return (
            <Button
              key={tab.value}
              asChild
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={cn("shrink-0", isActive && "font-bold text-heading shadow-xs")}
            >
              <Link href={`/c/${companyId}/stock?view=${tab.value}`}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      {/* Render active view */}
      {initialView === "stock" && <StockBalancesView companyId={companyId} />}
      {initialView === "products" && <ProductsView />}
      {initialView === "transfers" && <TransfersView companyId={companyId} />}
      {initialView === "activity" && <StockActivityView companyId={companyId} />}
    </div>
  );
};
