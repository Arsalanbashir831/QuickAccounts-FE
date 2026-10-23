"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MonthlyFinanceData {
  month: string;
  shortMonth: string;
  profit: number;
  expense: number;
}

const fullYearData: MonthlyFinanceData[] = [
  { month: "January", shortMonth: "Jan", profit: 385000, expense: 220000 },
  { month: "February", shortMonth: "Feb", profit: 410000, expense: 250000 },
  { month: "March", shortMonth: "Mar", profit: 460000, expense: 275000 },
  { month: "April", shortMonth: "Apr", profit: 495000, expense: 310000 },
  { month: "May", shortMonth: "May", profit: 530000, expense: 295000 },
  { month: "June", shortMonth: "Jun", profit: 580000, expense: 340000 },
  { month: "July", shortMonth: "Jul", profit: 620000, expense: 360000 },
  { month: "August", shortMonth: "Aug", profit: 665000, expense: 380000 },
  { month: "September", shortMonth: "Sep", profit: 710000, expense: 410000 },
  { month: "October", shortMonth: "Oct", profit: 785000, expense: 435000 },
  { month: "November", shortMonth: "Nov", profit: 740000, expense: 415000 },
  { month: "December", shortMonth: "Dec", profit: 825000, expense: 460000 },
];

export const ProfitExpenseChart = () => {
  const [range, setRange] = useState<"6m" | "12m">("6m");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartId = useId();

  const data = range === "6m" ? fullYearData.slice(6) : fullYearData;

  const totalProfit = data.reduce((acc, curr) => acc + curr.profit, 0);
  const totalExpense = data.reduce((acc, curr) => acc + curr.expense, 0);
  const netMargin = Math.round(((totalProfit - totalExpense) / totalProfit) * 100);

  const maxVal = Math.max(...data.flatMap((d) => [d.profit, d.expense]));
  // Round up to clean ceiling for scale
  const yCeiling = Math.ceil((maxVal * 1.15) / 100000) * 100000;

  // SVG dimensions
  const svgWidth = 720;
  const svgHeight = 260;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartAreaWidth = svgWidth - paddingLeft - paddingRight;
  const chartAreaHeight = svgHeight - paddingTop - paddingBottom;

  const groupWidth = chartAreaWidth / data.length;
  const barWidth = Math.min(Math.max(groupWidth * 0.28, 8), 18);
  const barGap = 4;

  const formatUSD = (amount: number) => `$${(amount / 1000).toFixed(0)}k`;
  const formatFullUSD = (amount: number) =>
    `$${amount.toLocaleString("en-US")}`;

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <CardTitle>Profit & Expense Overview</CardTitle>
            <Badge tone="neutral" className="font-medium lowercase tracking-normal">
              monthly performance
            </Badge>
          </div>
          <CardDescription className="mt-1">
            Compare monthly operational gross profit against company expenses.
          </CardDescription>
        </div>

        {/* Range switcher & legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" />
              <span className="text-foreground">Profit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-zinc-800" />
              <span className="text-muted-foreground">Expense</span>
            </span>
          </div>

          <div className="flex rounded-md border bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setRange("6m")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                range === "6m"
                  ? "bg-card text-heading shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Last 6 Months
            </button>
            <button
              type="button"
              onClick={() => setRange("12m")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                range === "12m"
                  ? "bg-card text-heading shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              12 Months
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Metric summary banner */}
        <div className="mb-6 grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3 sm:gap-4 sm:p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Period Profit
            </p>
            <p className="numeric mt-0.5 text-base font-bold text-primary sm:text-lg">
              {formatFullUSD(totalProfit)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Period Expenses
            </p>
            <p className="numeric mt-0.5 text-base font-bold text-heading sm:text-lg">
              {formatFullUSD(totalExpense)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Net Margin
            </p>
            <p className="numeric mt-0.5 text-base font-bold text-success sm:text-lg">
              +{netMargin}%
            </p>
          </div>
        </div>

        {/* Hover info tooltip card */}
        <div className="mb-3 flex h-7 items-center justify-between text-xs">
          {hoveredItem ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-heading">{hoveredItem.month}:</span>
              <span className="font-semibold text-primary">
                Profit: {formatFullUSD(hoveredItem.profit)}
              </span>
              <span className="font-semibold text-zinc-700">
                Expense: {formatFullUSD(hoveredItem.expense)}
              </span>
              <span className="font-semibold text-success">
                Net: {formatFullUSD(hoveredItem.profit - hoveredItem.expense)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Hover over bars to inspect monthly breakdown details
            </span>
          )}
        </div>

        {/* SVG Bar Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-64 w-full min-w-[540px] select-none overflow-visible"
            aria-label="Profit and expense chart"
            role="img"
          >
            {/* Horizontal Grid lines and labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = paddingTop + chartAreaHeight * (1 - pct);
              const labelVal = yCeiling * pct;
              return (
                <g key={pct}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/80"
                    strokeDasharray={pct === 0 ? "none" : "3 3"}
                    strokeWidth={pct === 0 ? 1.5 : 1}
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10.5px] font-medium"
                  >
                    {formatUSD(labelVal)}
                  </text>
                </g>
              );
            })}

            {/* Bars for each month */}
            {data.map((item, index) => {
              const groupCenterX =
                paddingLeft + index * groupWidth + groupWidth / 2;
              const profitHeight =
                (item.profit / yCeiling) * chartAreaHeight;
              const expenseHeight =
                (item.expense / yCeiling) * chartAreaHeight;

              const profitX = groupCenterX - barWidth - barGap / 2;
              const expenseX = groupCenterX + barGap / 2;

              const profitY =
                paddingTop + chartAreaHeight - profitHeight;
              const expenseY =
                paddingTop + chartAreaHeight - expenseHeight;

              const isHovered = hoveredIndex === index;

              return (
                <g
                  key={`${chartId}-${item.shortMonth}`}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Subtle hover background pillar */}
                  <rect
                    x={paddingLeft + index * groupWidth + 2}
                    y={paddingTop}
                    width={groupWidth - 4}
                    height={chartAreaHeight}
                    fill="currentColor"
                    className={cn(
                      "transition-colors",
                      isHovered ? "text-muted/70" : "text-transparent",
                    )}
                    rx={6}
                  />

                  {/* Profit Bar (Orange Primary) */}
                  <rect
                    x={profitX}
                    y={profitY}
                    width={barWidth}
                    height={profitHeight}
                    rx={3}
                    className={cn(
                      "fill-primary transition-all duration-200",
                      isHovered
                        ? "brightness-110 filter"
                        : hoveredIndex !== null
                          ? "opacity-60"
                          : "opacity-100",
                    )}
                  />

                  {/* Expense Bar (Coal Black / Dark Slate) */}
                  <rect
                    x={expenseX}
                    y={expenseY}
                    width={barWidth}
                    height={expenseHeight}
                    rx={3}
                    className={cn(
                      "fill-zinc-800 transition-all duration-200",
                      isHovered
                        ? "brightness-125 filter"
                        : hoveredIndex !== null
                          ? "opacity-60"
                          : "opacity-90",
                    )}
                  />

                  {/* X Axis Month Label */}
                  <text
                    x={groupCenterX}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className={cn(
                      "text-[11px] font-semibold transition-colors",
                      isHovered
                        ? "fill-primary font-bold"
                        : "fill-muted-foreground",
                    )}
                  >
                    {item.shortMonth}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
