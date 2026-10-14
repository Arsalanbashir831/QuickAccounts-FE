import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
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
      <AppShell companyId={companyId}>{children}</AppShell>
    </CompanyRuntimeProvider>
  );
}
