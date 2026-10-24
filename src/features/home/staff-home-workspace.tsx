"use client";

import { Boxes, ClipboardList, ScanBarcode, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { useDemoSession } from "@/features/auth/demo-session";
import { useLocations } from "@/features/settings/location-store";

export function StaffHomeWorkspace({ companyId }: { companyId: string }) {
  const session = useDemoSession();
  const locations = useLocations(companyId);
  const outlet = locations.find((location) => location.id === session?.locationId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const actions = [
    { label: "Open POS", detail: "Record a counter sale", href: `${base}/pos`, icon: ScanBarcode },
    { label: "New sale", detail: "Create an invoice", href: `${base}/sales/new`, icon: ShoppingCart },
    { label: "Purchase orders", detail: "Order stock for this outlet", href: `${base}/stock/purchases`, icon: ClipboardList },
    { label: "Stock", detail: "See assigned outlet stock", href: `${base}/stock`, icon: Boxes },
    { label: "My outlet", detail: "Update outlet details", href: `${base}/locations`, icon: Store },
  ];

  return <div className="space-y-6">
    <div className="rounded-2xl bg-[#0c0d0e] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff802b]">Outlet workspace</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Welcome, {session?.name ?? "Manager"}</h1>
      <p className="mt-2 text-sm text-white/65">You are working in {outlet?.name ?? "your assigned outlet"}. Sales, purchases, stock and outlet details are available here.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map(({ label, detail, href, icon: Icon }) => <Link key={label} href={href} className="group rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <span className="mt-4 block text-base font-bold text-heading group-hover:text-primary">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{detail}</span>
      </Link>)}
    </div>
  </div>;
}
