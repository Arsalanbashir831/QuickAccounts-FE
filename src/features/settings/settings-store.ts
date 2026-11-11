"use client";

import { useSyncExternalStore } from "react";

export type TeamRole = "Owner" | "Cashier";

export interface TeamMemberSetting {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "Active" | "Inactive";
}

export interface CompanySettings {
  business: {
    name: string;
    legalName: string;
    taxNumber: string;
    phone: string;
    email: string;
    address: string;
    logoDataUrl?: string;
    dateFormat: "dd MMM yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  };
  team: TeamMemberSetting[];
  rules: {
    /** Prefix for receipts and invoices, e.g. "KF" → KF-10231. */
    invoicePrefix: string;
    taxRate: number;
    /** Shelf prices already include tax. */
    taxInclusive: boolean;
    /** A size is "low" when this many pairs or fewer are left. */
    lowStockThreshold: number;
    /** Days after purchase a customer can return or exchange. */
    returnDays: number;
    receiptFooter: string;
    financialYearStart: string;
  };
}

export const teamRoles: readonly TeamRole[] = ["Owner", "Cashier"];

export const defaultCompanySettings: CompanySettings = {
  business: {
    name: "Kadam Footwear",
    legalName: "",
    taxNumber: "",
    phone: "0300-0001122",
    email: "",
    address: "Shop 14, Liberty Market, Lahore",
    dateFormat: "dd MMM yyyy",
  },
  team: [
    { id: "owner", name: "Demo Owner", email: "owner@kadam.demo", role: "Owner", status: "Active" },
    { id: "cashier", name: "Usman", email: "cashier@kadam.demo", role: "Cashier", status: "Active" },
  ],
  rules: {
    invoicePrefix: "KF",
    taxRate: 0,
    taxInclusive: true,
    lowStockThreshold: 1,
    returnDays: 7,
    receiptFooter: "Exchange within 7 days with this receipt. Worn or damaged shoes cannot be returned.",
    financialYearStart: "07-01",
  },
};

const storageKey = (companyId: string) => `quickaccounts:v2:settings:${companyId}`;
const eventName = "quickaccounts:settings-updated";
const cache = new Map<string, { raw: string | null; settings: CompanySettings }>();

const isCompanySettings = (value: unknown): value is CompanySettings => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CompanySettings>;
  return Boolean(
    candidate.business && typeof candidate.business.name === "string" &&
    (candidate.business.logoDataUrl === undefined || (typeof candidate.business.logoDataUrl === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(candidate.business.logoDataUrl) && candidate.business.logoDataUrl.length <= 1_400_000)) &&
    Array.isArray(candidate.team) && candidate.team.every((member) =>
      member && typeof member.id === "string" && typeof member.name === "string" &&
      typeof member.email === "string" && teamRoles.includes(member.role) &&
      (member.status === "Active" || member.status === "Inactive")) &&
    candidate.rules && typeof candidate.rules.invoicePrefix === "string" &&
    typeof candidate.rules.taxRate === "number" && typeof candidate.rules.lowStockThreshold === "number" &&
    typeof candidate.rules.returnDays === "number" && typeof candidate.rules.receiptFooter === "string",
  );
};

export function readCompanySettings(companyId: string): CompanySettings {
  if (typeof window === "undefined") return defaultCompanySettings;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.settings;
  let settings = defaultCompanySettings;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isCompanySettings(parsed)) settings = parsed;
    } catch { /* Use the demo defaults when saved browser settings are malformed. */ }
  }
  cache.set(companyId, { raw, settings });
  return settings;
}

export function saveCompanySettings(companyId: string, settings: CompanySettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(settings));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function resetCompanySettings(companyId: string) {
  window.localStorage.removeItem(storageKey(companyId));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function useCompanySettings(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readCompanySettings(companyId),
    () => defaultCompanySettings,
  );
}

export function isSettingsBundleSettings(value: unknown): value is CompanySettings {
  return isCompanySettings(value);
}

/** Formats an ISO date (yyyy-mm-dd) using the business's chosen date format. */
export function formatDateWith(format: CompanySettings["business"]["dateFormat"], iso: string) {
  if (!iso) return "";
  if (format === "yyyy-MM-dd") return iso;
  const date = new Date(`${iso}T12:00:00`);
  if (format === "dd/MM/yyyy") return date.toLocaleDateString("en-GB");
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function useDateFormatter(companyId: string) {
  const { business } = useCompanySettings(companyId);
  return (iso: string) => formatDateWith(business.dateFormat, iso);
}
