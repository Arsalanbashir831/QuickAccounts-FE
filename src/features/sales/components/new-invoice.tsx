"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { useInvoices, writeInvoices } from "../invoice-store";
import { SellPos } from "./sell-pos";
import type { PrintableInvoice } from "./invoice-print-template";

export function NewInvoice({ companyId }: { companyId: string }) {
  const router = useRouter();
  const invoices = useInvoices(companyId);
  const [error, setError] = useState("");
  const handleCreate = (invoice: PrintableInvoice) => {
    const id = crypto.randomUUID();
    try {
      writeInvoices(companyId, [{ ...invoice, id, shipmentStatus: "Preparing" }, ...invoices]);
      router.push(`/c/${encodeURIComponent(companyId)}/sales/${encodeURIComponent(id)}`);
    } catch { setError("Could not save this invoice in this browser. Please check available storage and try again."); }
  };

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <Button asChild variant="ghost" size="sm"><Link href={`/c/${companyId}/sales?view=invoices`}><ArrowLeft className="size-4" />Back to invoices</Link></Button>
      <WorkspaceHeader eyebrow="Sales · New invoice" title="New Invoice" description="Choose a customer, add products and serials, then complete payment." />
      {error ? <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <SellPos companyId={companyId} startEmpty onCreate={handleCreate} />
    </div>
  );
}
