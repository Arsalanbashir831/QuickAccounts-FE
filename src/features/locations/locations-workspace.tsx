"use client";

import { useId, useState } from "react";
import {
  Building2,
  Check,
  Edit2,
  MapPin,
  Plus,
  Search,
  Store,
  Trash2,
  Warehouse,
  X,
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
  addLocation,
  deleteLocation,
  updateLocation,
  useLocations,
  type StockLocation,
} from "@/features/settings/location-store";

interface LocationsWorkspaceProps {
  companyId: string;
}

export function LocationsWorkspace({ companyId }: LocationsWorkspaceProps) {
  const locations = useLocations(companyId);

  // Form states for adding
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<StockLocation["type"]>("Outlet");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<StockLocation["type"]>("Outlet");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");

  // Filter & search
  const [filterType, setFilterType] = useState<"ALL" | "Outlet" | "Warehouse">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirm delete dialog state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nameInputId = useId();
  const typeSelectId = useId();
  const codeInputId = useId();
  const addressInputId = useId();

  const outlets = locations.filter((loc) => loc.type === "Outlet");
  const warehouses = locations.filter((loc) => loc.type === "Warehouse");

  const filteredLocations = locations.filter((loc) => {
    if (filterType !== "ALL" && loc.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = loc.name.toLowerCase().includes(q);
      const matchCode = loc.code?.toLowerCase().includes(q);
      const matchAddress = loc.address?.toLowerCase().includes(q);
      return matchName || matchCode || matchAddress;
    }
    return true;
  });

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a location name.");
      return;
    }
    if (locations.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A location with this name already exists.");
      return;
    }

    addLocation(companyId, {
      name: trimmed,
      type,
      code: code.trim() || undefined,
      address: address.trim() || undefined,
    });

    setName("");
    setCode("");
    setAddress("");
    setError("");
    setIsAdding(false);
    toast.success(`${type} "${trimmed}" added successfully.`);
  };

  const startEdit = (loc: StockLocation) => {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditType(loc.type);
    setEditCode(loc.code ?? "");
    setEditAddress(loc.address ?? "");
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const handleUpdate = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Location name cannot be empty.");
      return;
    }
    if (
      locations.some(
        (l) => l.id !== id && l.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setEditError("Another location with this name already exists.");
      return;
    }

    updateLocation(companyId, id, {
      name: trimmed,
      type: editType,
      code: editCode.trim() || undefined,
      address: editAddress.trim() || undefined,
    });

    setEditingId(null);
    toast.success(`Location "${trimmed}" updated.`);
  };

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
          <Button onClick={() => setIsAdding(true)}>
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

      {/* Add location collapsible form */}
      {isAdding && (
        <Card className="border-primary/30 bg-primary/[0.02] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Add New Store or Warehouse</CardTitle>
              <CardDescription>
                Create a new location for sales counters or warehouse inventory.
              </CardDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setError("");
              }}
              aria-label="Close add form"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label htmlFor={nameInputId} className="text-sm font-medium text-heading">
                    Location Name *
                  </label>
                  <Input
                    id={nameInputId}
                    placeholder="e.g. DHA Phase 5 Store"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={typeSelectId} className="text-sm font-medium text-heading">
                    Location Type *
                  </label>
                  <select
                    id={typeSelectId}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={type}
                    onChange={(e) => setType(e.target.value as StockLocation["type"])}
                  >
                    <option value="Outlet">Outlet (Retail Store)</option>
                    <option value="Warehouse">Warehouse (Storage / Transit)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={codeInputId} className="text-sm font-medium text-heading">
                    Site Code / ID (optional)
                  </label>
                  <Input
                    id={codeInputId}
                    placeholder="e.g. OUT-03, WH-02"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={addressInputId} className="text-sm font-medium text-heading">
                    Address / Details (optional)
                  </label>
                  <Input
                    id={addressInputId}
                    placeholder="e.g. Main Boulevard, Plaza 4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit">
                  <Plus className="size-4" />
                  Save Location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
              const isEditing = editingId === loc.id;
              const isDeleting = deletingId === loc.id;
              const isOutlet = loc.type === "Outlet";

              if (isEditing) {
                return (
                  <div key={loc.id} className="bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Editing Location
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="size-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-heading">Name *</label>
                        <Input
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditError("");
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-heading">Type *</label>
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-heading"
                          value={editType}
                          onChange={(e) =>
                            setEditType(e.target.value as StockLocation["type"])
                          }
                        >
                          <option value="Outlet">Outlet</option>
                          <option value="Warehouse">Warehouse</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-heading">Code</label>
                        <Input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="e.g. OUT-01"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-heading">Address</label>
                        <Input
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Physical address"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {editError && (
                      <p className="text-xs font-medium text-destructive">{editError}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => handleUpdate(loc.id)}>
                        <Check className="size-3.5 mr-1" />
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

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

                    <div className="min-w-0 space-y-0.5">
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
                        {loc.address || "No address specified"}
                      </p>
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
                          onClick={() => startEdit(loc)}
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
                    onClick={() => setIsAdding(true)}
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
    </div>
  );
}
