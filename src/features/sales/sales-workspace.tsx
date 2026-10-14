"use client";

import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InvoicesView } from "./components/invoices-view";
import { ShipmentStatusView } from "./components/shipment-status-view";
import { salesViews } from "./sales-views";
export { salesViews } from "./sales-views";

export const SalesWorkspace = ({
  companyId,
  initialView = "invoices",
}: {
  companyId: string;
  initialView: string;
}) => {
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Sales · Revenue & Fulfilment"
        title="Sales Workspace"
        description="Create point-of-sale invoices, follow credit balances, and fulfill customer commitments."
      />

      {/* View Switcher Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {salesViews.map((tab) => {
          const isActive = initialView === tab.value;
          return (
            <Button
              key={tab.value}
              asChild
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={cn("shrink-0", isActive && "font-bold text-heading shadow-xs")}
            >
              <Link href={`/c/${companyId}/sales?view=${tab.value}`}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      {initialView === "invoices" && <InvoicesView companyId={companyId} />}
      {initialView === "shipments" && <ShipmentStatusView companyId={companyId} />}
    </div>
  );
};
