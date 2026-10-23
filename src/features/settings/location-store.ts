"use client";

import { useSyncExternalStore } from "react";

export interface StockLocation {
  id: string;
  name: string;
  type: "Warehouse" | "Outlet";
  address?: string;
  code?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  city?: string;
  notes?: string;
}

const defaults: StockLocation[] = [
  { id: "main-warehouse", name: "Main Warehouse", type: "Warehouse", code: "WH-01", address: "Central Logistics Hub" },
  { id: "main-outlet", name: "Main Outlet", type: "Outlet", code: "OUT-01", address: "Commercial Area, Block B" },
  { id: "north-outlet", name: "North Outlet", type: "Outlet", code: "OUT-02", address: "North Plaza, Sector 4" },
];
const key = (companyId: string) => `quickaccounts:locations:v1:${companyId}`;
const eventName = "stock-locations-updated";
const cache = new Map<string, { raw: string | null; locations: StockLocation[] }>();

export function readLocations(companyId: string): StockLocation[] {
  if (typeof window === "undefined") return defaults;
  const raw = window.localStorage.getItem(key(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.locations;
  let locations = defaults;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) locations = parsed as StockLocation[];
    } catch { /* Keep default locations. */ }
  }
  cache.set(companyId, { raw, locations });
  return locations;
}

export function saveLocations(companyId: string, locations: StockLocation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(companyId), JSON.stringify(locations));
  cache.delete(companyId);
  window.dispatchEvent(new Event(eventName));
}

export function addLocation(companyId: string, location: Omit<StockLocation, "id">): StockLocation {
  const current = readLocations(companyId);
  const newLocation: StockLocation = {
    ...location,
    id: `loc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
  };
  saveLocations(companyId, [...current, newLocation]);
  return newLocation;
}

export function updateLocation(companyId: string, id: string, updates: Partial<Omit<StockLocation, "id">>): StockLocation | null {
  const current = readLocations(companyId);
  const index = current.findIndex((loc) => loc.id === id);
  if (index === -1) return null;
  const updated = { ...current[index], ...updates };
  const next = [...current];
  next[index] = updated;
  saveLocations(companyId, next);
  return updated;
}

export function deleteLocation(companyId: string, id: string): boolean {
  const current = readLocations(companyId);
  if (current.length <= 1) {
    return false; // Prevent deleting the last location
  }
  const next = current.filter((loc) => loc.id !== id);
  saveLocations(companyId, next);
  return true;
}

export function useLocations(companyId: string) {
  return useSyncExternalStore(
    (onChange) => {
      const onStorage = (event: StorageEvent) => { if (event.key === key(companyId)) onChange(); };
      window.addEventListener(eventName, onChange);
      window.addEventListener("storage", onStorage);
      return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
    },
    () => readLocations(companyId),
    () => defaults,
  );
}

