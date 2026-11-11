"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { canOpenPath, useDemoSession } from "./demo-session";

const noopSubscribe = () => () => {};

export function DemoAccessGate({ companyId, children }: { companyId: string; children: ReactNode }) {
  const session = useDemoSession();
  const pathname = usePathname();
  const router = useRouter();
  // The session lives in localStorage, so it is unknown until hydration finishes.
  // Without this flag the first (server-snapshot) render would redirect signed-in users.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (hydrated && !session) router.replace(`/access?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, session, pathname, router]);

  if (!session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Opening sign in…</div>;

  if (!canOpenPath(session, pathname, companyId)) return (
    <div className="grid min-h-screen place-items-center bg-[#f4f5f3] p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-heading">This area is for the owner</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cashiers can sell, take returns, look up receipts and check stock. Purchases, money, reports and settings are for the owner.</p>
        <Button asChild className="mt-5"><Link href={`/c/${encodeURIComponent(companyId)}/home`}>Go to my home</Link></Button>
      </div>
    </div>
  );

  return children;
}
