"use client";

import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomerReturnsView } from "./components/customer-returns-view";
import { SupplierClaimsView } from "./components/supplier-claims-view";

import { returnViews } from "./return-views";
export { returnViews } from "./return-views";

export const ReturnsWorkspace = ({
  companyId,
  initialView = "customers",
}: {
  companyId: string;
  initialView: string;
}) => {
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Service · Returns, Warranty & Repairs"
        title="Returns & Warranty Workspace"
        description="Verify warranty claims, inspect customer returns, and track supplier defect recovery."
      />

      {/* View Switcher Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {returnViews.map((tab) => {
          const isActive = initialView === tab.value;
          return (
            <Button
              key={tab.value}
              asChild
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={cn("shrink-0", isActive && "font-bold text-heading shadow-xs")}
            >
              <Link href={`/c/${companyId}/returns?view=${tab.value}`}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      {/* Render active view */}
      {initialView === "customers" && <CustomerReturnsView companyId={companyId} />}
      {initialView === "suppliers" && <SupplierClaimsView companyId={companyId} />}
    </div>
  );
};
