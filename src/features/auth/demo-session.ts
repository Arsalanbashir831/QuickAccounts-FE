"use client";

import { useSyncExternalStore } from "react";

export type DemoRole = "Owner" | "Outlet Manager";
export type DemoSession = Readonly<{
  email: string;
  name: string;
  role: DemoRole;
  locationId: string;
}>;

const sessionKey = "quickaccounts:demo-session:v1";
const sessionEvent = "quickaccounts:demo-session-changed";
const password = "Demo123!";

export const demoAccounts: readonly DemoSession[] = [
  { email: "owner@dotcode.demo", name: "Demo Owner", role: "Owner", locationId: "all" },
  { email: "manager@dotcode.demo", name: "Outlet Manager", role: "Outlet Manager", locationId: "main-outlet" },
  { email: "north@dotcode.demo", name: "North Outlet Manager", role: "Outlet Manager", locationId: "north-outlet" },
];

let cachedRaw: string | null | undefined;
let cachedSession: DemoSession | null = null;

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    const email = JSON.parse(raw ?? "null")?.email;
    cachedSession = demoAccounts.find((account) => account.email === email) ?? null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export function signInDemo(email: string, enteredPassword: string): DemoSession | null {
  const account = demoAccounts.find((entry) => entry.email === email.trim().toLowerCase());
  if (!account || enteredPassword !== password) return null;
  window.localStorage.setItem(sessionKey, JSON.stringify({ email: account.email }));
  cachedRaw = undefined;
  window.dispatchEvent(new Event(sessionEvent));
  return account;
}

export function signOutDemo() {
  window.localStorage.removeItem(sessionKey);
  cachedRaw = undefined;
  window.dispatchEvent(new Event(sessionEvent));
}

export function useDemoSession() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(sessionEvent, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(sessionEvent, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readDemoSession,
    () => null,
  );
}

export function isOwner(session: DemoSession | null): boolean {
  return session?.role === "Owner";
}

export function canOpenPath(session: DemoSession, pathname: string, companyId: string): boolean {
  if (companyId !== "demo-company") return false;
  const base = `/c/${encodeURIComponent(companyId)}/`;
  if (!pathname.startsWith(base)) return false;
  if (isOwner(session)) return true;
  const path = pathname.slice(base.length);
  return path === "home" || path === "pos" || path === "locations" ||
    path === "sales" || path === "sales/new" || /^sales\/[^/]+$/.test(path) ||
    path === "stock" || path === "stock/products" || path === "stock/purchases" ||
    path === "stock/purchases/new" || /^stock\/purchases\/[^/]+$/.test(path);
}

export function canOpenOutletRecord(
  path: string,
  assignedName: string | undefined,
  invoices: readonly { id: string; outlet: string }[],
  orders: readonly { id: string; destination: string }[],
): boolean {
  if (path === "sales/new" || path === "stock/purchases/new") return true;
  const invoiceId = path.match(/^sales\/([^/]+)$/)?.[1];
  const orderId = path.match(/^stock\/purchases\/([^/]+)$/)?.[1];
  let decodedId: string;
  try { decodedId = decodeURIComponent(invoiceId ?? orderId ?? ""); }
  catch { return false; }
  if (invoiceId) return Boolean(assignedName && invoices.some((invoice) => invoice.id === decodedId && invoice.outlet === assignedName));
  if (orderId) return Boolean(assignedName && orders.some((order) => order.id === decodedId && order.destination === assignedName));
  return true;
}
