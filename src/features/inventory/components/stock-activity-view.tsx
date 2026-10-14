"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Barcode,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Package,
  PackageCheck,
  PackagePlus,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Wrench,
  X,
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
import { useLocations } from "@/features/settings/location-store";
import { stockLocations } from "../stock-data";
import { useTransfers } from "../transfer-store";
import {
  buildStockActivities,
  nextAdjustmentReference,
  useAdjustments,
  writeAdjustments,
  type ActivityType,
  type MovementDirection,
  type StockActivity,
  type StockAdjustment,
} from "../stock-activity-store";
import { StockFormDialog } from "./stock-form-dialog";
import { useRepairActivities } from "@/features/service/repair-activity-store";

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-heading focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";

const activityBadgeConfig: Record<
  ActivityType,
  { label: string; tone: "danger" | "success" | "info" | "warning" | "neutral"; icon: typeof ArrowUpRight }
> = {
  Sale: { label: "Sale", tone: "danger", icon: ArrowUpRight },
  Purchase: { label: "Purchase", tone: "success", icon: ArrowDownLeft },
  Transfer: { label: "Transfer", tone: "info", icon: ArrowRightLeft },
  Exchange: { label: "Exchange", tone: "warning", icon: RotateCcw },
  Return: { label: "Return (RMA)", tone: "info", icon: ShieldCheck },
  Adjustment: { label: "Adjustment", tone: "neutral", icon: SlidersHorizontal },
};

const uniqueProducts = [...new Map(stockLocations.map((stock) => [stock.sku, { sku: stock.sku, name: stock.name }])).values()];

export function StockActivityView({ companyId }: { companyId: string }) {
  const invoices = useInvoices(companyId);
  const purchaseOrders = usePurchaseOrders(companyId);
  const transfers = useTransfers(companyId);
  const adjustments = useAdjustments(companyId);
  const repairActivities = useRepairActivities(companyId);
  const locations = useLocations(companyId);

  const activities = [...repairActivities, ...buildStockActivities(companyId, invoices, purchaseOrders, transfers, adjustments)];

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // Modals state
  const [inspectActivity, setInspectActivity] = useState<StockActivity | null>(null);
  const [targetedSerial, setTargetedSerial] = useState<string | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // Adjustment form state
  const [adjSku, setAdjSku] = useState(uniqueProducts[0]?.sku ?? "SAM-A55-BLK");
  const [adjLocation, setAdjLocation] = useState("Main Warehouse");
  const [adjQty, setAdjQty] = useState(1);
  const [adjSign, setAdjSign] = useState<"positive" | "negative">("negative");
  const [adjReason, setAdjReason] = useState<StockAdjustment["reason"]>("Damaged / Faulty Write-off");
  const [adjNotes, setAdjNotes] = useState("");
  const [adjSerialsText, setAdjSerialsText] = useState("");
  const [adjError, setAdjError] = useState("");

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

  // Filtered activities
  const filteredActivities = activities.filter((act) => {
    // Search match across serial, sku, product, reference, party, notes, location
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      act.reference.toLowerCase().includes(q) ||
      act.productName.toLowerCase().includes(q) ||
      act.productSku.toLowerCase().includes(q) ||
      act.party.toLowerCase().includes(q) ||
      act.location.toLowerCase().includes(q) ||
      (act.notes && act.notes.toLowerCase().includes(q)) ||
      act.serials.some((s) => s.toLowerCase().includes(q));

    const matchesType = typeFilter === "all" || act.type === typeFilter;
    const matchesDirection = directionFilter === "all" || act.direction === directionFilter;
    const matchesLocation =
      locationFilter === "all" ||
      act.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
      (act.fromLocation && act.fromLocation.toLowerCase() === locationFilter.toLowerCase()) ||
      (act.toLocation && act.toLocation.toLowerCase() === locationFilter.toLowerCase());

    return matchesSearch && matchesType && matchesDirection && matchesLocation;
  });

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

  const handleCreateAdjustment = () => {
    const product = uniqueProducts.find((p) => p.sku === adjSku);
    if (!product) {
      setAdjError("Please select a valid product.");
      return;
    }
    if (adjQty < 1) {
      setAdjError("Quantity must be at least 1 unit.");
      return;
    }

    const serials = adjSerialsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const netQuantity = adjSign === "positive" ? adjQty : -adjQty;

    const newAdjustment: StockAdjustment = {
      id: `adj-${crypto.randomUUID()}`,
      adjustmentRef: nextAdjustmentReference(adjustments),
      date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      productSku: product.sku,
      productName: product.name,
      quantity: netQuantity,
      reason: adjReason,
      location: adjLocation,
      serials,
      notes: adjNotes.trim() || undefined,
      performedBy: "Current Operator",
    };

    writeAdjustments(companyId, [newAdjustment, ...adjustments]);
    setShowAdjustmentModal(false);
    setNotice(`Stock adjustment ${newAdjustment.adjustmentRef} recorded successfully.`);
    setAdjQty(1);
    setAdjNotes("");
    setAdjSerialsText("");
    setAdjError("");
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
            <p className="text-[0.7rem] text-muted-foreground">Purchases, RMAs & positive adjustments</p>
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
              End-to-end chronological traceability of every stock movement: sales, purchases, transfers, exchanges, and warranty returns.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdjustmentModal(true)}>
              <Plus className="size-4" />Record Adjustment
            </Button>
          </div>
        </CardHeader>

        {notice ? (
          <div role="status" className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-sm text-heading">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col gap-3 border-b bg-muted/15 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search stock activity"
              placeholder="Search serial, barcode, SKU, reference (DOT-*, PO-*, TR-*, RMA-*), or contact..."
              className="pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direction Filter */}
            <div className="flex items-center rounded-lg border bg-background p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDirectionFilter("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${directionFilter === "all" ? "bg-muted font-bold text-heading shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("IN")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${directionFilter === "IN" ? "bg-success/15 font-bold text-success-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                In (+)
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("OUT")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${directionFilter === "OUT" ? "bg-destructive/15 font-bold text-destructive" : "text-muted-foreground hover:text-foreground"}`}
              >
                Out (-)
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("TRANSFER")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${directionFilter === "TRANSFER" ? "bg-info/15 font-bold text-info-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Transfers (⇄)
              </button>
            </div>

            {/* Activity Type Filter */}
            <select
              aria-label="Filter by activity type"
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-heading"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Activity Types</option>
              <option value="Sale">Sales (Outflow)</option>
              <option value="Purchase">Purchases (Inflow)</option>
              <option value="Transfer">Inter-Site Transfers</option>
              <option value="Exchange">Warranty Exchanges</option>
              <option value="Return">Customer Returns (RMA)</option>
              <option value="Adjustment">Manual Adjustments</option>
            </select>

            {/* Location Filter */}
            <select
              aria-label="Filter by location"
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-heading"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
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
              {filteredActivities.length ? (
                filteredActivities.map((act) => {
                  const badgeCfg = activityBadgeConfig[act.type];
                  const Icon = badgeCfg.icon;

                  const hasSerials = act.serials.length > 0;
                  const firstSerial = act.serials[0];

                  return (
                    <TableRow key={act.id} className="hover:bg-muted/30">
                      {/* Date */}
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {act.date}
                      </TableCell>

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
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    No stock activities match your current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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

      {/* Manual Stock Adjustment Dialog */}
      {showAdjustmentModal && (
        <StockFormDialog
          eyebrow="Inventory Audit & Reconciliation"
          title="Record Stock Adjustment"
          description="Adjust physical stock on hand for damaged goods, physical count discrepancies, or opening balance intake."
          icon={SlidersHorizontal}
          wide
          onClose={() => {
            setShowAdjustmentModal(false);
            setAdjError("");
          }}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setAdjError("");
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateAdjustment}>
                <CheckCircle2 className="size-4" />
                Post Adjustment
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-heading">
                Product Item
                <select
                  data-dialog-autofocus
                  className={selectClass}
                  value={adjSku}
                  onChange={(e) => setAdjSku(e.target.value)}
                >
                  {uniqueProducts.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} · {p.sku}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-heading">
                Stock Location
                <select
                  className={selectClass}
                  value={adjLocation}
                  onChange={(e) => setAdjLocation(e.target.value)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-heading">
                Adjustment Reason
                <select
                  className={selectClass}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as StockAdjustment["reason"])}
                >
                  <option value="Damaged / Faulty Write-off">Damaged / Faulty Write-off (-)</option>
                  <option value="Physical Count Discrepancy">Physical Count Discrepancy (Cycle Count)</option>
                  <option value="Initial Stock Intake">Initial Stock Intake (+)</option>
                  <option value="Found Inventory">Found Inventory (+)</option>
                  <option value="Internal Store Use">Internal Store Use (-)</option>
                </select>
              </label>

              <div className="grid grid-cols-[auto_1fr] gap-2">
                <label className="block space-y-1.5 text-sm font-medium text-heading">
                  Direction
                  <select
                    className={selectClass}
                    value={adjSign}
                    onChange={(e) => setAdjSign(e.target.value as "positive" | "negative")}
                  >
                    <option value="negative">Deduct (-)</option>
                    <option value="positive">Add (+)</option>
                  </select>
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-heading">
                  Quantity
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={adjQty}
                    onChange={(e) => setAdjQty(Math.max(1, Number(e.target.value) || 1))}
                    className="h-10 text-base font-semibold tabular-nums"
                  />
                </label>
              </div>
            </div>

            <label className="block space-y-1.5 text-sm font-medium text-heading">
              Serial Numbers / Barcodes (Optional)
              <textarea
                rows={2}
                placeholder="Paste serial numbers separated by commas or new lines (optional)..."
                className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs text-heading focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                value={adjSerialsText}
                onChange={(e) => setAdjSerialsText(e.target.value)}
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-heading">
              Adjustment Audit Notes
              <Input
                placeholder="Reason, investigation outcome, or authorized manager..."
                className="h-10 text-xs"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
              />
            </label>

            {adjError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {adjError}
              </p>
            )}
          </div>
        </StockFormDialog>
      )}
    </div>
  );
}
