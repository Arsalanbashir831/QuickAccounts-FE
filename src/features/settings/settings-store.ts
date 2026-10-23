"use client";

import { useSyncExternalStore } from "react";

export type TeamRole = "Owner" | "Manager" | "Accountant" | "Sales / Cashier" | "Inventory / Warehouse" | "Read only";

export interface TeamMemberSetting {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  locationId: string;
  status: "Active" | "Inactive";
}

export interface CompanySettings {
  business: {
    name: string;
    legalName: string;
    registrationNumber: string;
    taxNumber: string;
    phone: string;
    email: string;
    address: string;
    logoDataUrl?: string;
    currency: "USD";
    timeZone: "Asia/Karachi";
    dateFormat: "dd MMM yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  };
  team: TeamMemberSetting[];
  rules: {
    invoicePrefix: string;
    taxRate: number;
    taxInclusive: boolean;
    lowStockThreshold: number;
    defaultSalesLocation: string;
    defaultReceivingLocation: string;
    financialYearStart: string;
  };
}

export const teamRoles: readonly TeamRole[] = ["Owner", "Manager", "Accountant", "Sales / Cashier", "Inventory / Warehouse", "Read only"];

export const defaultCompanySettings: CompanySettings = {
  business: {
    name: "Northstar Traders",
    legalName: "",
    registrationNumber: "",
    taxNumber: "",
    phone: "",
    email: "",
    address: "",
    currency: "USD",
    timeZone: "Asia/Karachi",
    dateFormat: "dd MMM yyyy",
  },
  team: [
    { id: "owner", name: "Demo Owner", email: "owner@dotcode.demo", role: "Owner", locationId: "all", status: "Active" },
    { id: "stf-2", name: "Muhammad Usman", email: "usman@dotcode.demo", role: "Sales / Cashier", locationId: "main-outlet", status: "Active" },
    { id: "stf-3", name: "Bilal Ahmed", email: "bilal@dotcode.demo", role: "Inventory / Warehouse", locationId: "main-warehouse", status: "Active" },
    { id: "stf-4", name: "Ali Hassan", email: "ali@dotcode.demo", role: "Accountant", locationId: "main-outlet", status: "Active" },
  ],
  rules: {
    invoicePrefix: "DOT-INV",
    taxRate: 5,
    taxInclusive: false,
    lowStockThreshold: 5,
    defaultSalesLocation: "main-outlet",
    defaultReceivingLocation: "main-warehouse",
    financialYearStart: "07-01",
  },
};

const storageKey = (companyId: string) => `quickaccounts:settings:v1:${companyId}`;
const eventName = "quickaccounts:settings-updated";
const cache = new Map<string, { raw: string | null; settings: CompanySettings }>();

const isTeamRole = (value: unknown): value is TeamRole => teamRoles.includes(value as TeamRole);

const isCompanySettings = (value: unknown): value is CompanySettings => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CompanySettings>;
  return Boolean(
    candidate.business && typeof candidate.business.name === "string" &&
    (candidate.business.logoDataUrl === undefined || (typeof candidate.business.logoDataUrl === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(candidate.business.logoDataUrl) && candidate.business.logoDataUrl.length <= 1_400_000)) &&
    candidate.team && Array.isArray(candidate.team) && candidate.team.every((member) =>
      member && typeof member.id === "string" && typeof member.name === "string" &&
      typeof member.email === "string" && isTeamRole(member.role) &&
      typeof member.locationId === "string" && (member.status === "Active" || member.status === "Inactive")) &&
    candidate.rules && typeof candidate.rules.invoicePrefix === "string" &&
    typeof candidate.rules.taxRate === "number" && typeof candidate.rules.lowStockThreshold === "number" &&
    typeof candidate.rules.defaultSalesLocation === "string" && typeof candidate.rules.defaultReceivingLocation === "string" &&
    typeof candidate.rules.financialYearStart === "string"
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
      if (isCompanySettings(parsed)) settings = { ...parsed, business: { ...parsed.business, currency: "USD" } };
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
