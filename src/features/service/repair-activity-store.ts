"use client";

import { useSyncExternalStore } from "react";
import type { StockActivity } from "@/features/inventory/stock-activity-store";

const storageKey = (companyId: string) => `quickaccounts:repair-activities:v1:${companyId}`;
const eventName = "repair-activities-updated";
const emptyActivities: StockActivity[] = [];
const cache = new Map<string, { raw: string | null; activities: StockActivity[] }>();

export function readRepairActivities(companyId: string): StockActivity[] {
  if (typeof window === "undefined") return emptyActivities;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.activities;
  if (!raw) {
    cache.set(companyId, { raw, activities: emptyActivities });
    return emptyActivities;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const activities = Array.isArray(parsed) ? (parsed as StockActivity[]) : emptyActivities;
    cache.set(companyId, { raw, activities });
    return activities;
  } catch {
    cache.set(companyId, { raw, activities: emptyActivities });
    return emptyActivities;
  }
}

export function writeRepairActivity(companyId: string, activity: StockActivity) {
  const activities = readRepairActivities(companyId);
  window.localStorage.setItem(storageKey(companyId), JSON.stringify([activity, ...activities]));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function useRepairActivities(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey(companyId)) onChange();
      };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(eventName, onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => readRepairActivities(companyId),
    () => emptyActivities,
  );
}
