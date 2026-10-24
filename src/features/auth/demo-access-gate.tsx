"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { readPurchaseOrders } from "@/features/purchases/purchase-store";
import { readInvoices } from "@/features/sales/invoice-store";
import { readLocations } from "@/features/settings/location-store";
import { canOpenOutletRecord, canOpenPath, isOwner, useDemoSession } from "./demo-session";

export function DemoAccessGate({ companyId, children }: { companyId: string; children: ReactNode }) {
  const session = useDemoSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!session) router.replace(`/access?next=${encodeURIComponent(pathname)}`);
  }, [session, pathname, router]);

  if (!session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Opening sign in…</div>;

  let allowed = canOpenPath(session, pathname, companyId);
  if (allowed && !isOwner(session)) {
    const base = `/c/${encodeURIComponent(companyId)}/`;
    const path = pathname.slice(base.length);
    const assignedName = readLocations(companyId).find((location) => location.id === session.locationId)?.name;
    allowed = canOpenOutletRecord(path, assignedName, readInvoices(companyId), readPurchaseOrders(companyId));
  }

  if (!allowed) return (
    <div className="grid min-h-screen place-items-center bg-[#f4f5f3] p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-heading">This area is for the owner</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your demo role can work with its assigned outlet, sales, purchases, and stock. Company finance and other outlets are hidden.</p>
        <Button asChild className="mt-5"><Link href={`/c/${encodeURIComponent(companyId)}/home`}>Go to my workspace</Link></Button>
      </div>
    </div>
  );

  return children;
}
