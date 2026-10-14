import type { Metadata } from "next";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { StaffPayView } from "@/features/payments/components/staff-pay-view";

export const metadata: Metadata = { title: "Staff & Salaries" };

export default function StaffSalariesPage() {
  return <div className="workspace-enter space-y-5"><WorkspaceHeader eyebrow="Team · Payroll" title="Staff & Salaries" description="Review staff payroll, monthly salary amounts, commissions, deductions, and payment status." /><StaffPayView /></div>;
}
