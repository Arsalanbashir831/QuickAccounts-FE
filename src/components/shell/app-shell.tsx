"use client";

import { Building2, ChevronDown, LogOut, Menu, ScanBarcode, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { isOwner, signOutDemo, useDemoSession } from "@/features/auth/demo-session";
import { StaffHomeWorkspace } from "@/features/home/staff-home-workspace";
import { useLocations } from "@/features/settings/location-store";
type AppShellProps = {
  companyId: string;
  children: ReactNode;
};

export const AppShell = ({ companyId, children }: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const session = useDemoSession();
  const locations = useLocations(companyId);
  const owner = isOwner(session);
  const assignedLocation = locations.find((location) => location.id === session?.locationId)?.name;
  const visibleNavigation = owner ? navigation : navigation.filter((item) => ["home", "sales", "stock", "locations"].includes(item.slug));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const navigationContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <Link href={`/c/${companyId}/home`} className="flex items-center">
          <Image
            src="/dotcode-dark-theme.png"
            alt="Dotcode logo"
            width={130}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNavigation.map((item) => {
          const href = `/c/${companyId}/${item.slug}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          if (item.children) {
            const isOpen = expanded[item.slug] ?? isActive;
            const groupId = `nav-group-${item.slug}`;
            return (
              <div key={item.slug}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                  onClick={() => setExpanded((current) => ({ ...current, [item.slug]: !isOpen }))}
                  className={cn(
                    "group flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "text-[#ff802b] font-semibold [&>svg]:text-[#ff802b]"
                      : "text-white/70 hover:bg-white/8 hover:text-white [&>svg]:text-white/70 hover:[&>svg]:text-white",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[1.05rem]" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div id={groupId} className="ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {item.children.filter((child) => owner || ["stock/purchases", "stock/products"].includes(child.slug)).map((child) => {
                      const childHref = `/c/${companyId}/${child.slug}`;
                      const isChildActive = pathname === childHref || pathname.startsWith(`${childHref}/`);
                      return (
                        <Link
                          key={child.slug}
                          href={childHref}
                          aria-current={isChildActive ? "page" : undefined}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex min-h-9 items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                            isChildActive
                              ? "bg-[#ea580c]/15 font-semibold text-[#ff802b] shadow-[inset_3px_0_0_#ea580c]"
                              : "text-white/60 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }
          return (
            <Link
              key={item.slug}
              href={href}
              onClick={() => setIsMenuOpen(false)}
              className={cn(
                "group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#ea580c]/15 text-[#ff802b] shadow-[inset_3.5px_0_0_#ea580c] font-semibold [&>svg]:text-[#ff802b]"
                  : "text-white/70 hover:bg-white/8 hover:text-white [&>svg]:text-white/70 hover:[&>svg]:text-white",
              )}
            >
              <Icon aria-hidden="true" className="size-[1.05rem]" strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="grid size-8 place-items-center rounded-full bg-white/15 text-xs font-bold text-white">{session?.name.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "DM"}</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{session?.name}</p>
            <p className="truncate text-[0.68rem] text-white/50">{owner ? `${session?.role} access` : assignedLocation ?? "Outlet access"}</p>
          </div>
          <button type="button" aria-label="Sign out" title="Sign out" onClick={() => { signOutDemo(); router.replace("/access"); }} className="ml-auto grid size-9 shrink-0 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"><LogOut className="size-4" /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#0c0d0e] text-white border-r border-white/10 lg:flex">
        {navigationContent}
      </aside>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/45"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="relative flex h-full w-[min(19rem,86vw)] flex-col bg-[#0c0d0e] text-white shadow-2xl">
            <Button
              aria-label="Close navigation"
              className="absolute right-3 top-5 text-white hover:bg-white/10"
              size="icon"
              variant="ghost"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="size-5" />
            </Button>
            {navigationContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-background/92 px-4 backdrop-blur-md sm:px-6">
          <Button aria-label="Open navigation" className="lg:hidden" size="icon" variant="ghost" onClick={() => setIsMenuOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left select-none text-muted-foreground"
            title="Northstar Traders (Company switching is disabled)"
          >
            <Building2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold text-heading">Northstar Traders</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden sm:inline-flex" tone="warning">Demo data</Badge>
            <Button asChild size="sm" className="gap-1.5 font-semibold shadow-[0_6px_18px_rgb(234_88_12/0.28)]">
              <Link href={`/c/${companyId}/pos`}>
                <ScanBarcode aria-hidden="true" className="size-4" />
                <span className="hidden md:inline">POS Terminal</span>
              </Link>
            </Button>
            <Button aria-label="Open global lookup" size="icon" variant="ghost">
              <Search className="size-[1.1rem]" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 xl:p-8">{!owner && pathname === `/c/${companyId}/home` ? <StaffHomeWorkspace companyId={companyId} /> : children}</main>
      </div>
    </div>
  );
};
