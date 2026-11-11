"use client";

import { useSyncExternalStore } from "react";

export type DemoRole = "Owner" | "Cashier";
export type DemoSession = Readonly<{
  email: string;
  name: string;
  role: DemoRole;
}>;

const sessionKey = "quickaccounts:demo-session:v2";
const sessionEvent = "quickaccounts:demo-session-changed";
const password = "Demo123!";

export const demoAccounts: readonly DemoSession[] = [
  { email: "owner@kadam.demo", name: "Demo Owner", role: "Owner" },
  { email: "cashier@kadam.demo", name: "Usman", role: "Cashier" },
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

/** Cashiers can sell, look up receipts and check stock. Money, costs and settings stay with the owner. */
export function canOpenPath(session: DemoSession, pathname: string, companyId: string): boolean {
  if (companyId !== "demo-company") return false;
  const base = `/c/${encodeURIComponent(companyId)}/`;
  if (!pathname.startsWith(base)) return false;
  if (isOwner(session)) return true;
  const path = pathname.slice(base.length);
  return path === "home" || path === "pos" || path === "sales" || (/^sales\/[^/]+$/.test(path) && path !== "sales/new") ||
    path === "products" || (/^products\/[^/]+$/.test(path) && path !== "products/new") || path === "stock";
}
