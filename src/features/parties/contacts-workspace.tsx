"use client";

import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomersView } from "./components/customers-view";
import { SuppliersView } from "./components/suppliers-view";

import { contactViews } from "./contact-views";
export { contactViews } from "./contact-views";

export const ContactsWorkspace = ({
  companyId,
  initialView = "customers",
}: {
  companyId: string;
  initialView: string;
}) => {
  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Ledger · Customers & Vendors"
        title="Ledger Workspace"
        description="Review customer receivables, vendor payables, and the full transaction history for each account."
      />

      {/* View Switcher Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {contactViews.map((tab) => {
          const isActive = initialView === tab.value;
          return (
            <Button
              key={tab.value}
              asChild
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={cn("shrink-0", isActive && "font-bold text-heading shadow-xs")}
            >
              <Link href={`/c/${companyId}/contacts?view=${tab.value}`}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      {/* Render active view */}
      {initialView === "customers" && <CustomersView companyId={companyId} />}
      {initialView === "suppliers" && <SuppliersView companyId={companyId} />}
    </div>
  );
};
