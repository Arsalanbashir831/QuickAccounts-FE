import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { DemoAccessGate } from "@/features/auth/demo-access-gate";
import { CompanyRuntimeProvider } from "@/providers/company-runtime-provider";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <CompanyRuntimeProvider key={`demo-user:demo-tenant:${companyId}`}>
      <DemoAccessGate companyId={companyId}><AppShell companyId={companyId}>{children}</AppShell></DemoAccessGate>
    </CompanyRuntimeProvider>
  );
}
