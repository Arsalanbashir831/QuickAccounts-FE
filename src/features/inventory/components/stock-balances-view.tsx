"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices } from "@/features/sales/invoice-store";
import { buildStockBalances, stockTotals, type StockBalance } from "../stock-data";
import { useTransfers } from "../transfer-store";

type StockPreset = "all" | "reserved" | "faulty";

export function StockBalancesView({ companyId }: { companyId: string }) {
  const router = useRouter();
  const invoices = useInvoices(companyId);
  const transfers = useTransfers(companyId);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [preset, setPreset] = useState<StockPreset>("all");
  const rows = buildStockBalances(invoices, transfers);
  const totals = stockTotals(rows);
  const locations = [...new Set(rows.map((row) => row.location))];
  const filtered = rows.filter((row) => {
    const matchesSearch = `${row.sku} ${row.name}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesLocation = siteFilter === "all" || row.location === siteFilter;
    const matchesPreset = preset === "all" || (preset === "reserved" ? row.reserved > 0 : row.faulty + row.dead > 0);
    return matchesSearch && matchesLocation && matchesPreset;
  });
  const openDetails = (row: StockBalance) => router.push(`/c/${encodeURIComponent(companyId)}/stock/${encodeURIComponent(row.sku)}`);
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: StockBalance) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    openDetails(row);
  };
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: StockBalance) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDetails(row);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {([
          { key: "all", label: "Available to Sell", value: totals.available, description: "Across all locations" },
          { key: "reserved", label: "Reserved for Shipment", value: totals.reserved, description: "Across transfers, invoices, and RMAs" },
          { key: "faulty", label: "Total Faulty Stock", value: totals.faulty + totals.dead, description: `${totals.faulty} faulty · ${totals.dead} dead` },
        ] as const).map((metric) => <button
          key={metric.key}
          type="button"
          aria-pressed={preset === metric.key}
          onClick={() => setPreset(metric.key)}
          className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${preset === metric.key ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}
        ><p className="text-xs font-semibold text-muted-foreground">{metric.label}</p><p className="numeric mt-1 text-2xl font-bold tabular-nums text-heading">{metric.value} <span className="text-sm font-medium text-muted-foreground">units</span></p><p className="mt-1 text-xs text-muted-foreground">{metric.description}</p></button>)}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Stock Sheet</CardTitle><CardDescription>Physical stock by SKU and location. Select a row to view locations and shipment reservations.</CardDescription></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search stock by SKU or product" placeholder="Search SKU or product" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <select aria-label="Filter by location" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-heading" value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="all">All locations</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Location</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Reserved for Shipment</TableHead><TableHead className="text-right">Available to Sell</TableHead><TableHead className="text-right">Faulty/Dead</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.length ? filtered.map((row) => <TableRow
              key={row.id}
              role="link"
              tabIndex={0}
              aria-label={`View stock details for ${row.name} at ${row.location}`}
              className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary hover:bg-primary/5"
              onClick={(event) => handleRowClick(event, row)}
              onKeyDown={(event) => handleRowKeyDown(event, row)}
            ><TableCell className="font-mono font-bold text-primary">{row.sku}</TableCell><TableCell className="font-semibold text-heading">{row.name}</TableCell><TableCell className="text-sm text-muted-foreground">{row.location}</TableCell><TableCell className="text-right tabular-nums">{row.onHand}</TableCell><TableCell className="text-right tabular-nums">{row.reserved}</TableCell><TableCell className="text-right font-semibold tabular-nums text-heading">{row.available}</TableCell><TableCell className="text-right font-semibold tabular-nums">{row.faulty + row.dead}</TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No stock matches your filters.</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
