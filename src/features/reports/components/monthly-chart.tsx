"use client";

import { useState } from "react";
import type { MonthPoint } from "@/domain/ledger";
import { useMoney } from "@/lib/format/money";

// Validated pair (dataviz validator: CVD ΔE 24.7, normal ΔE 33.6, contrast ≥ 3:1 on white).
const SERIES = [
  { key: "netSales", label: "Net sales", color: "#2a78d6" },
  { key: "netProfit", label: "Net profit", color: "#eb6834" },
] as const;

const compact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 100000) return `${Number((value / 100000).toFixed(1))}L`;
  if (abs >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
};

/** Grouped bars: monthly net sales and net profit on one rupee axis. */
export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const money = useMoney();
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 240;
  const pad = { left: 44, right: 8, top: 12, bottom: 28 };
  const values = data.flatMap((point) => [point.netSales, point.netProfit]);
  const rawMax = Math.max(1, ...values);
  const rawMin = Math.min(0, ...values);
  // "Nice" tick step (1, 2 or 5 × 10ⁿ) so gridlines land on round rupee amounts.
  const roughStep = (rawMax - rawMin) / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= roughStep) ?? roughStep;
  const max = Math.ceil(rawMax / step) * step;
  const min = Math.floor(rawMin / step) * step;
  const plotH = height - pad.top - pad.bottom;
  const plotW = width - pad.left - pad.right;
  const y = (value: number) => pad.top + ((max - value) / (max - min)) * plotH;
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(26, groupW * 0.3);
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + step * index);

  const bar = (x: number, value: number, color: string) => {
    const top = Math.min(y(value), y(0));
    const h = Math.max(1, Math.abs(y(value) - y(0)));
    const r = Math.min(4, h, barW / 2);
    // Rounded at the data end, square at the baseline.
    const d = value >= 0
      ? `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`
      : `M${x},${top} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + barW - r} Q${x + barW},${top + h} ${x + barW},${top + h - r} V${top} Z`;
    return <path d={d} fill={color} />;
  };

  const active = hover !== null ? data[hover] : undefined;

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: series.color }} />{series.label}</span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Net sales and net profit by month">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "#b8b9bf" : "#ececef"} strokeWidth={1} />
              <text x={pad.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="10" fill="#636672">{compact(tick)}</text>
            </g>
          ))}
          {data.map((point, index) => {
            const x0 = pad.left + index * groupW + groupW / 2 - barW - 1;
            return (
              <g key={point.month}>
                {hover === index ? <rect x={pad.left + index * groupW + 2} y={pad.top} width={groupW - 4} height={plotH} fill="#f2f2f5" rx={4} /> : null}
                {bar(x0, point.netSales, SERIES[0].color)}
                {bar(x0 + barW + 2, point.netProfit, SERIES[1].color)}
                <text x={pad.left + index * groupW + groupW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#636672">{point.label}</text>
                <rect
                  x={pad.left + index * groupW}
                  y={pad.top}
                  width={groupW}
                  height={plotH + pad.bottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${point.label}: net sales ${money(point.netSales)}, net profit ${money(point.netProfit)}`}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
        {active && hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border bg-card p-2.5 text-xs shadow-lg"
            style={{ left: `clamp(0px, calc(${((pad.left + hover * groupW + groupW / 2) / width) * 100}% - 88px), calc(100% - 176px))` }}
          >
            <p className="font-semibold text-heading">{new Date(`${active.month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
            {SERIES.map((series) => (
              <p key={series.key} className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: series.color }} />{series.label}</span>
                <span className="font-semibold tabular-nums text-heading">{money(active[series.key])}</span>
              </p>
            ))}
            <p className="mt-1 flex justify-between gap-2 text-muted-foreground"><span>Expenses</span><span className="tabular-nums text-heading">{money(active.expenses)}</span></p>
          </div>
        ) : null}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr className="text-muted-foreground"><th className="py-1">Month</th><th className="text-right">Net sales</th><th className="text-right">Expenses</th><th className="text-right">Net profit</th></tr></thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.month} className="border-t"><td className="py-1">{point.label}</td><td className="text-right tabular-nums">{money(point.netSales)}</td><td className="text-right tabular-nums">{money(point.expenses)}</td><td className="text-right tabular-nums">{money(point.netProfit)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
