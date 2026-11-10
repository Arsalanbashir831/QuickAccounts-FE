"use client";

import { useMoney, type FormatMoneyOptions } from "@/lib/format/money";

/** Renders an amount in the viewer's display currency ($ or Rs). Usable from server components. */
export function Money({ amount, ...options }: { amount: number | string } & FormatMoneyOptions) {
  const money = useMoney();
  return <>{money(amount, options)}</>;
}
