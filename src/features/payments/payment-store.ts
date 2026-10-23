"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PaymentDirection = "send" | "receive";
export type PaymentMethod = "Cash" | "Bank transfer" | "Cheque";

export type PartyPayment = {
  id: string;
  reference: string;
  direction: PaymentDirection;
  partyId: string;
  partyName: string;
  date: string;
  method: PaymentMethod;
  amount: number;
  notes: string;
};

export const demoPayments: PartyPayment[] = [
  { id: "demo-pay-1083", reference: "PAY-1083", direction: "receive", partyId: "cust-1", partyName: "Apex Mobiles (Kashif)", date: "2026-10-13", method: "Cash", amount: 84500, notes: "" },
  { id: "demo-pay-1082", reference: "PAY-1082", direction: "receive", partyId: "cust-2", partyName: "Hamza Electronics", date: "2026-10-12", method: "Cash", amount: 42000, notes: "" },
  { id: "demo-pay-1081", reference: "PAY-1081", direction: "send", partyId: "sup-2", partyName: "Apex Importers", date: "2026-10-12", method: "Bank transfer", amount: 120000, notes: "" },
  { id: "demo-pay-1080", reference: "PAY-1080", direction: "receive", partyId: "cust-4", partyName: "Tariq Telecom", date: "2026-10-11", method: "Bank transfer", amount: 35000, notes: "" },
  { id: "demo-pay-1079", reference: "PAY-1079", direction: "send", partyId: "sup-1", partyName: "Mumtaz Distributors", date: "2026-10-10", method: "Cash", amount: 27500, notes: "" },
];

const storageKey = (companyId: string) => `quickaccounts:party-payments:v1:${companyId}`;
const eventName = "quickaccounts:party-payments-changed";
const emptyPayments: PartyPayment[] = [];
const cache = new Map<string, { raw: string | null; payments: PartyPayment[] }>();

export function readRecordedPayments(companyId: string): PartyPayment[] {
  if (typeof window === "undefined") return emptyPayments;
  const raw = window.localStorage.getItem(storageKey(companyId));
  const cached = cache.get(companyId);
  if (cached?.raw === raw) return cached.payments;
  let payments = emptyPayments;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) payments = parsed as PartyPayment[];
    } catch { /* Ignore malformed browser data. */ }
  }
  cache.set(companyId, { raw, payments });
  return payments;
}

export function recordPayment(companyId: string, payment: PartyPayment) {
  window.localStorage.setItem(storageKey(companyId), JSON.stringify([payment, ...readRecordedPayments(companyId)]));
  window.dispatchEvent(new Event(eventName));
}

export function useRecordedPayments(companyId: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey(companyId)) onChange(); };
    window.addEventListener(eventName, onChange);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(eventName, onChange); window.removeEventListener("storage", onStorage); };
  }, [companyId]);
  return useSyncExternalStore(subscribe, () => readRecordedPayments(companyId), () => emptyPayments);
}
