"use client";

import { useState } from "react";
import {
  Building2,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  UserRound,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteLocation,
  useLocations,
  type StockLocation,
} from "@/features/settings/location-store";
import { LocationFormDialog } from "./location-form-dialog";

interface LocationsWorkspaceProps {
  companyId: string;
}

export function LocationsWorkspace({ companyId }: LocationsWorkspaceProps) {
  const locations = useLocations(companyId);

  const [formTarget, setFormTarget] = useState<StockLocation | "new" | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "Outlet" | "Warehouse">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const outlets = locations.filter((loc) => loc.type === "Outlet");
  const warehouses = locations.filter((loc) => loc.type === "Warehouse");

  const filteredLocations = locations.filter((loc) => {
    if (filterType !== "ALL" && loc.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return [loc.name, loc.code, loc.address, loc.city, loc.contactName, loc.phone, loc.email]
        .some((value) => value?.toLowerCase().includes(q));
    }
    return true;
  });

  const handleDelete = (id: string, locationName: string) => {
    if (locations.length <= 1) {
      toast.error("You must have at least one active location.");
      setDeletingId(null);
      return;
    }

    const success = deleteLocation(companyId, id);
    setDeletingId(null);
    if (success) {
      toast.success(`Location "${locationName}" removed.`);
    } else {
      toast.error("Could not remove location.");
    }
  };

  return (
    <div className="workspace-enter space-y-6">
      <WorkspaceHeader
        eyebrow="Inventory & Fulfillment Hub"
        title="Stores & Warehouses"
        description="Add, update, and manage retail store outlets and central warehouses. These locations are available across POS sales checkout, purchase receiving, and inventory stock transfers."
        action={
          <Button onClick={() => setFormTarget("new")}>
            <Plus className="size-4" />
            Add Store / Warehouse
          </Button>
        }
      />

      {/* Metrics overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              Total Locations
            </CardDescription>
            <CardTitle className="numeric text-3xl font-bold tracking-tight text-heading">
              {locations.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Registered operational sites
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Store className="size-3.5 text-primary" />
              Retail Outlets
            </CardDescription>
            <CardTitle className="numeric text-3xl font-bold tracking-tight text-heading">
              {outlets.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Active point-of-sale store registers
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Warehouse className="size-3.5 text-amber-500" />
              Central Warehouses
            </CardDescription>
            <CardTitle className="numeric text-3xl font-bold tracking-tight text-heading">
              {warehouses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Bulk stock & distribution facilities
          </CardContent>
        </Card>
      </div>

      {/* List & Controls */}
      <Card>
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Registered Locations</CardTitle>
            <CardDescription>
              Showing {filteredLocations.length} of {locations.length} locations
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Type Filter Buttons */}
            <div className="flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === "ALL"
                    ? "bg-background text-heading shadow-sm"
                    : "text-muted-foreground hover:text-heading"
                }`}
              >
                All ({locations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("Outlet")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === "Outlet"
                    ? "bg-background text-heading shadow-sm"
                    : "text-muted-foreground hover:text-heading"
                }`}
              >
                Outlets ({outlets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("Warehouse")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === "Warehouse"
                    ? "bg-background text-heading shadow-sm"
                    : "text-muted-foreground hover:text-heading"
                }`}
              >
                Warehouses ({warehouses.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search locations"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredLocations.map((loc) => {
              const isDeleting = deletingId === loc.id;
              const isOutlet = loc.type === "Outlet";
              const place = [loc.address, loc.city].filter(Boolean).join(", ");

              return (
                <div
                  key={loc.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-lg border ${
                        isOutlet
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {isOutlet ? (
                        <Store className="size-4" />
                      ) : (
                        <Warehouse className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-heading truncate text-sm">
                          {loc.name}
                        </span>
                        <Badge tone={isOutlet ? "info" : "neutral"} className="text-[0.65rem] px-2 py-0">
                          {loc.type}
                        </Badge>
                        {loc.code && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.68rem] font-mono text-muted-foreground">
                            {loc.code}
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin className="size-3 shrink-0" />
                        {place || "No address specified"}
                      </p>
                      {loc.contactName || loc.phone || loc.email ? (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {loc.contactName ? <span className="flex items-center gap-1"><UserRound className="size-3 shrink-0" />{loc.contactName}</span> : null}
                          {loc.phone ? <span className="flex items-center gap-1"><Phone className="size-3 shrink-0" />{loc.phone}</span> : null}
                          {loc.email ? <span className="flex items-center gap-1"><Mail className="size-3 shrink-0" />{loc.email}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1">
                        <span className="text-xs font-medium text-destructive">
                          Confirm remove?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDelete(loc.id, loc.name)}
                        >
                          Yes, delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setFormTarget(loc)}
                        >
                          <Edit2 className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingId(loc.id)}
                          title="Delete location"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLocations.length === 0 && (
              <div className="py-12 text-center">
                <Store className="mx-auto size-9 text-muted-foreground/50" />
                <h3 className="mt-3 text-sm font-semibold text-heading">No locations found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query or filter"
                    : "Get started by adding your first store or warehouse location"}
                </p>
                {!searchQuery && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setFormTarget("new")}
                  >
                    <Plus className="size-4 mr-1" />
                    Add Location
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {formTarget ? (
        <LocationFormDialog
          key={formTarget === "new" ? "new" : formTarget.id}
          companyId={companyId}
          location={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={(saved, mode) => {
            setFormTarget(null);
            toast.success(
              mode === "created"
                ? `${saved.type} "${saved.name}" added successfully.`
                : `Location "${saved.name}" updated.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}
