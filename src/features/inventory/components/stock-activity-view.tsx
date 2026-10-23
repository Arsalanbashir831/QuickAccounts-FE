"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Barcode,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Package,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  SlidersHorizontal,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices } from "@/features/sales/invoice-store";
import { usePurchaseOrders } from "@/features/purchases/purchase-store";
import { useTransfers } from "../transfer-store";
import {
  buildStockActivities,
  parseDateScore,
  useAdjustments,
  type ActivityType,
  type MovementDirection,
  type StockActivity,
} from "../stock-activity-store";
import { StockFormDialog } from "./stock-form-dialog";

const activityBadgeConfig: Record<
  ActivityType,
  { label: string; tone: "danger" | "success" | "info" | "warning" | "neutral"; icon: typeof ArrowUpRight }
> = {
  Sale: { label: "Sale", tone: "danger", icon: ArrowUpRight },
  Purchase: { label: "Purchase", tone: "success", icon: ArrowDownLeft },
  Transfer: { label: "Transfer", tone: "info", icon: ArrowRightLeft },
  Adjustment: { label: "Adjustment", tone: "neutral", icon: SlidersHorizontal },
};

export function StockActivityView({ companyId }: { companyId: string }) {
  const invoices = useInvoices(companyId);
  const purchaseOrders = usePurchaseOrders(companyId);
  const transfers = useTransfers(companyId);
  const adjustments = useAdjustments(companyId);

  const activities = buildStockActivities(companyId, invoices, purchaseOrders, transfers, adjustments);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals state
  const [inspectActivity, setInspectActivity] = useState<StockActivity | null>(null);
  const [targetedSerial, setTargetedSerial] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Metrics computation
  const totalInwardUnits = activities
    .filter((a) => a.direction === "IN")
    .reduce((sum, a) => sum + a.quantity, 0);

  const totalOutwardUnits = activities
    .filter((a) => a.direction === "OUT")
    .reduce((sum, a) => sum + a.quantity, 0);

  const totalTransferUnits = activities
    .filter((a) => a.direction === "TRANSFER")
    .reduce((sum, a) => sum + a.quantity, 0);

  const allRecordedSerials = new Set(activities.flatMap((a) => a.serials));

  const filteredActivities = activities.filter((act) => {
    const score = parseDateScore(act.date);
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return (from === null || score >= from) && (to === null || score <= to);
  });

  const groupedActivities = [...filteredActivities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .reduce<{ date: string; activities: StockActivity[] }[]>((groups, act) => {
      const last = groups.at(-1);
      if (last?.date === act.date) last.activities.push(act);
      else groups.push({ date: act.date, activities: [act] });
      return groups;
    }, []);

  const formatGroupDate = (date: string) => {
    const score = parseDateScore(date);
    return Number.isFinite(score) && score > 0
      ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(score))
      : date;
  };

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleOpenInspector = (activity: StockActivity, serial?: string) => {
    setInspectActivity(activity);
    setTargetedSerial(serial ?? null);
  };

  // Lifecycle trail for a targeted serial
  const serialLifecycle = targetedSerial
    ? activities.filter((act) => act.serials.some((s) => s.toLowerCase() === targetedSerial.toLowerCase()))
    : inspectActivity
    ? activities.filter((act) => act.reference === inspectActivity.reference || (inspectActivity.serials.length > 0 && act.serials.some((s) => inspectActivity.serials.includes(s))))
    : [];

  return (
    <div className="space-y-5">
      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <ArrowDownLeft className="size-3.5 text-success" />
              Stock Received / Inflow
            </CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-success-foreground">
              +{totalInwardUnits}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </CardTitle>
            <p className="text-[0.7rem] text-muted-foreground">Purchases & positive adjustments</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <ArrowUpRight className="size-3.5 text-destructive" />
              Stock Dispatched / Outflow
            </CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-destructive">
              -{totalOutwardUnits}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </CardTitle>
            <p className="text-[0.7rem] text-muted-foreground">Sales invoices, replacements & write-offs</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <ArrowRightLeft className="size-3.5 text-info" />
              Inter-Site Transfers
            </CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-info-foreground">
              {totalTransferUnits}{" "}
              <span className="text-xs font-normal text-muted-foreground">units moved</span>
            </CardTitle>
            <p className="text-[0.7rem] text-muted-foreground">Warehouse & retail outlet transit</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Barcode className="size-3.5 text-primary" />
              Serialized Traceability
            </CardDescription>
            <CardTitle className="numeric text-2xl font-bold text-primary">
              {allRecordedSerials.size}{" "}
              <span className="text-xs font-normal text-muted-foreground">unique units</span>
            </CardTitle>
            <p className="text-[0.7rem] text-muted-foreground">Individual barcode audit history</p>
          </CardHeader>
        </Card>
      </div>

      {/* Main Ledger Card */}
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Stock Activity & Traceability Ledger</CardTitle>
            <CardDescription>
              Every stock movement grouped by date, latest first: sales, purchases, transfers, and adjustments.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block">
              <span className="sr-only">Filter from date</span>
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Filter from date" type="date" className="w-[150px] pl-8" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <span className="text-xs text-muted-foreground">to</span>
            <Input aria-label="Filter to date" type="date" className="w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {groupedActivities.map((group) => (
            <section key={group.date} aria-label={`Stock activity on ${group.date}`} className="overflow-hidden rounded-lg border">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                <h2 className="font-semibold text-heading">{formatGroupDate(group.date)}</h2>
                <p className="text-xs text-muted-foreground">{group.activities.length} {group.activities.length === 1 ? "movement" : "movements"}</p>
              </header>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Activity</TableHead>
                    <TableHead className="w-28">Reference</TableHead>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Location / Route</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Serial / Barcodes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Traceability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {group.activities.map((act) => {
                  const badgeCfg = activityBadgeConfig[act.type];
                  const Icon = badgeCfg.icon;

                  const hasSerials = act.serials.length > 0;
                  const firstSerial = act.serials[0];

                  return (
                    <TableRow key={act.id} className="hover:bg-muted/30">
                      {/* Activity Type */}
                      <TableCell>
                        <Badge tone={badgeCfg.tone} className="inline-flex items-center gap-1 text-[0.65rem]">
                          <Icon className="size-3" />
                          {badgeCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Reference Link */}
                      <TableCell>
                        {act.referenceHref ? (
                          <Link
                            href={act.referenceHref}
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                            title={`Open source document ${act.reference}`}
                          >
                            {act.reference}
                            <ExternalLink className="size-2.5 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-mono text-xs font-bold text-heading">{act.reference}</span>
                        )}
                      </TableCell>

                      {/* Product Item */}
                      <TableCell>
                        <Link
                          href={`/c/${encodeURIComponent(companyId)}/stock/${encodeURIComponent(act.productSku)}`}
                          className="font-semibold text-heading hover:text-primary hover:underline"
                        >
                          {act.productName}
                        </Link>
                        <span className="block font-mono text-xs text-muted-foreground">{act.productSku}</span>
                      </TableCell>

                      {/* Quantity Impact */}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {act.direction === "IN" ? (
                          <span className="text-success font-bold">+{act.quantity}</span>
                        ) : act.direction === "OUT" ? (
                          <span className="text-destructive font-bold">-{act.quantity}</span>
                        ) : (
                          <span className="text-info font-bold">⇄ {act.quantity}</span>
                        )}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">units</span>
                      </TableCell>

                      {/* Location / Movement Route */}
                      <TableCell className="text-xs">
                        {act.direction === "TRANSFER" && act.fromLocation && act.toLocation ? (
                          <div className="flex items-center gap-1 font-medium text-heading">
                            <span>{act.fromLocation}</span>
                            <ArrowRight className="size-3 text-muted-foreground" />
                            <span>{act.toLocation}</span>
                          </div>
                        ) : (
                          <span className="font-medium text-heading">{act.location}</span>
                        )}
                      </TableCell>

                      {/* Counterparty (Customer / Supplier / Internal) */}
                      <TableCell className="text-xs">
                        <span className="font-medium text-heading">{act.party}</span>
                        <span className="block text-[0.68rem] text-muted-foreground">{act.partyRole}</span>
                      </TableCell>

                      {/* Serials / Barcodes */}
                      <TableCell>
                        {hasSerials ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenInspector(act, firstSerial)}
                              className="inline-flex items-center gap-1 rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-heading hover:border-primary/50 hover:bg-primary/5"
                              title="Click to trace this serial number"
                            >
                              <Barcode className="size-3 text-primary" />
                              {firstSerial}
                            </button>
                            {act.serials.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleOpenInspector(act)}
                                className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-primary hover:bg-primary/20"
                                title="View all tracked serials"
                              >
                                +{act.serials.length - 1} more
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non-serialized</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge tone="neutral" className="text-[0.65rem] font-medium">
                          {act.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-xs text-primary hover:bg-primary/10"
                          onClick={() => handleOpenInspector(act)}
                        >
                          <Clock className="size-3.5" />
                          Trace
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </section>
          ))}
          {groupedActivities.length === 0 ? (
            <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">No stock activity in this date range.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Traceability Inspector Dialog */}
      {inspectActivity && (
        <StockFormDialog
          eyebrow="Stock Traceability & Audit"
          title={`Traceability: ${inspectActivity.reference}`}
          description={`Trace custody, document origin, and serialized lifecycle for ${inspectActivity.productName}.`}
          icon={Barcode}
          wide
          onClose={() => {
            setInspectActivity(null);
            setTargetedSerial(null);
          }}
          footer={
            <>
              {inspectActivity.referenceHref && (
                <Button asChild variant="outline">
                  <Link href={inspectActivity.referenceHref}>
                    <ExternalLink className="size-4" />
                    Open Document ({inspectActivity.reference})
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  setInspectActivity(null);
                  setTargetedSerial(null);
                }}
              >
                Close Trace
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Overview cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Movement Type</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={activityBadgeConfig[inspectActivity.type].tone}>
                    {inspectActivity.type}
                  </Badge>
                  <span className="text-xs font-semibold">
                    {inspectActivity.direction === "IN" ? "+ Inward" : inspectActivity.direction === "OUT" ? "- Outward" : "⇄ Inter-Site"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Document Reference</p>
                <p className="mt-1 font-mono text-base font-bold text-primary">{inspectActivity.reference}</p>
                <p className="text-[0.7rem] text-muted-foreground">Date: {inspectActivity.date}</p>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Custody Location</p>
                <p className="mt-1 text-sm font-semibold text-heading">{inspectActivity.location}</p>
                <p className="text-[0.7rem] text-muted-foreground">Party: {inspectActivity.party}</p>
              </div>
            </div>

            {/* Product details */}
            <div className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-heading">{inspectActivity.productName}</h4>
                  <p className="font-mono text-xs text-muted-foreground">SKU: {inspectActivity.productSku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Quantity Affected</p>
                  <p className="font-mono text-base font-bold text-heading">{inspectActivity.quantity} units</p>
                </div>
              </div>
              {inspectActivity.notes && (
                <p className="mt-3 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-heading">Audit Note: </span>
                  {inspectActivity.notes}
                </p>
              )}
            </div>

            {/* Serials / Barcodes Register */}
            {inspectActivity.serials.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-heading">
                    Serialized Units Register ({inspectActivity.serials.length} units)
                  </h4>
                  <p className="text-xs text-muted-foreground">Select a code to inspect its chronological journey</p>
                </div>

                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border bg-muted/10 p-3">
                  {inspectActivity.serials.map((serial) => {
                    const isSelected = targetedSerial === serial;
                    return (
                      <div
                        key={serial}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${isSelected ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40" : "bg-card text-heading hover:border-primary/40"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setTargetedSerial(serial)}
                          className="font-mono font-semibold"
                          title="Filter traceability timeline to this serial"
                        >
                          {serial}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(serial)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy serial number"
                        >
                          {copiedCode === serial ? <CheckCircle2 className="size-3 text-success" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Traceability Lifecycle Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-heading">
                  {targetedSerial ? (
                    <>
                      Lifecycle History for Serial: <span className="font-mono text-primary">{targetedSerial}</span>
                    </>
                  ) : (
                    "Traceability Audit Chain"
                  )}
                </h4>
                {targetedSerial && (
                  <button
                    type="button"
                    onClick={() => setTargetedSerial(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear serial filter
                  </button>
                )}
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                {serialLifecycle.length > 0 ? (
                  serialLifecycle.map((step, idx) => {
                    const cfg = activityBadgeConfig[step.type];
                    const StepIcon = cfg.icon;
                    return (
                      <div key={step.id} className="relative flex items-start gap-3 pb-3 last:pb-0">
                        {idx !== serialLifecycle.length - 1 && (
                          <div className="absolute left-4 top-8 -bottom-1 w-0.5 bg-border" aria-hidden="true" />
                        )}
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-heading shadow-xs">
                          <StepIcon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-heading">{step.type}</span>
                            <Badge tone={cfg.tone} className="text-[0.65rem]">{step.status}</Badge>
                            {step.referenceHref ? (
                              <Link href={step.referenceHref} className="font-mono text-xs font-bold text-primary hover:underline">
                                {step.reference}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs font-semibold text-primary">{step.reference}</span>
                            )}
                            <span className="text-xs text-muted-foreground">· {step.date}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Location: <span className="font-medium text-heading">{step.location}</span> · Counterparty: <span className="font-medium text-heading">{step.party}</span>
                          </p>
                          {step.notes && <p className="mt-0.5 text-xs text-muted-foreground">{step.notes}</p>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">No additional lifecycle records found for this unit.</p>
                )}
              </div>
            </div>
          </div>
        </StockFormDialog>
      )}

    </div>
  );
}
