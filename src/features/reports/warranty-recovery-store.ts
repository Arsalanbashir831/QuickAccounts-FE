"use client";

import { useSyncExternalStore } from "react";

export interface WarrantyRecoveryRecord {
  id: string;
  claimReference: string;
  supplier: string;
  product: string;
  dateReceived: string;
  quantity: number;
  unitValue: number;
  recoveryValue: number;
  note: string;
}

export interface WarrantyCostRecord {
  id: string;
  claimReference: string;
  costType: "Repair" | "Replacement / exchange";
  product: string;
  dateRecorded: string;
  amount: number;
  note: string;
}

const storageKey = (companyId: string) => `quickaccounts:warranty-recoveries:v1:${companyId}`;
const eventName = "quickaccounts:warranty-recoveries-updated";
const costStorageKey = (companyId: string) => `quickaccounts:warranty-costs:v1:${companyId}`;
const costEventName = "quickaccounts:warranty-costs-updated";
const cache = new Map<string, { raw: string | null; records: WarrantyRecoveryRecord[] }>();
const costCache = new Map<string, { raw: string | null; records: WarrantyCostRecord[] }>();

const isRecoveryRecord = (value: unknown): value is WarrantyRecoveryRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<WarrantyRecoveryRecord>;
  return typeof record.id === "string" && typeof record.claimReference === "string" &&
    typeof record.supplier === "string" && typeof record.product === "string" &&
    typeof record.dateReceived === "string" && typeof record.quantity === "number" &&
    typeof record.unitValue === "number" && typeof record.recoveryValue === "number" &&
    typeof record.note === "string";
};

const isWarrantyCostRecord = (value: unknown): value is WarrantyCostRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<WarrantyCostRecord>;
  return typeof record.id === "string" && typeof record.claimReference === "string" &&
    (record.costType === "Repair" || record.costType === "Replacement / exchange") &&
    typeof record.product === "string" && typeof record.dateRecorded === "string" &&
    typeof record.amount === "number" && typeof record.note === "string";
};

export function readWarrantyRecoveries(companyId: string): WarrantyRecoveryRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.records;
  let records: WarrantyRecoveryRecord[] = [];
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) records = parsed.filter(isRecoveryRecord);
    } catch { /* Keep an empty recovery register if saved demo data is malformed. */ }
  }
  cache.set(companyId, { raw, records });
  return records;
}

export function writeWarrantyRecoveries(companyId: string, records: WarrantyRecoveryRecord[]) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(records));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function useWarrantyRecoveries(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readWarrantyRecoveries(companyId),
    () => [],
  );
}

export function readWarrantyCosts(companyId: string): WarrantyCostRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(costStorageKey(companyId));
  const cached = costCache.get(companyId);
  if (cached?.raw === raw) return cached.records;
  let records: WarrantyCostRecord[] = [];
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) records = parsed.filter(isWarrantyCostRecord);
    } catch { /* Keep an empty warranty cost register if saved demo data is malformed. */ }
  }
  costCache.set(companyId, { raw, records });
  return records;
}

export function writeWarrantyCosts(companyId: string, records: WarrantyCostRecord[]) {
  window.localStorage.setItem(costStorageKey(companyId), JSON.stringify(records));
  costCache.delete(companyId);
  window.dispatchEvent(new Event(costEventName));
}

export function useWarrantyCosts(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === costStorageKey(companyId)) onChange(); };
      window.addEventListener(costEventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(costEventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readWarrantyCosts(companyId),
    () => [],
  );
}
