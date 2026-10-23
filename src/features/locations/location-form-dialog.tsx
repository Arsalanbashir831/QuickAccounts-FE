"use client";

import { Check, Store, Warehouse, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addLocation, updateLocation, useLocations, type StockLocation } from "@/features/settings/location-store";

const fieldClass = "block space-y-1.5 text-sm font-medium text-heading";
const textareaClass = "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-[0_1px_0_rgb(0_0_0/0.03)] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

const typeOptions = [
  { value: "Outlet", label: "Retail outlet", description: "Sales counter with a POS register and cash drawer.", icon: Store },
  { value: "Warehouse", label: "Warehouse", description: "Storage, receiving, and distribution facility.", icon: Warehouse },
] as const;

export function LocationFormDialog({
  companyId,
  location,
  onClose,
  onSaved,
}: {
  companyId: string;
  location?: StockLocation | null;
  onClose: () => void;
  onSaved: (saved: StockLocation, mode: "created" | "updated") => void;
}) {
  const locations = useLocations(companyId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isEdit = Boolean(location);

  const [type, setType] = useState<StockLocation["type"]>(location?.type ?? "Outlet");
  const [name, setName] = useState(location?.name ?? "");
  const [code, setCode] = useState(location?.code ?? "");
  const [contactName, setContactName] = useState(location?.contactName ?? "");
  const [phone, setPhone] = useState(location?.phone ?? "");
  const [email, setEmail] = useState(location?.email ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Enter a name for this location."); return; }
    if (locations.some((item) => item.id !== location?.id && item.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Another location already uses this name.");
      return;
    }
    const trimmedCode = code.trim();
    if (trimmedCode && locations.some((item) => item.id !== location?.id && item.code?.toLowerCase() === trimmedCode.toLowerCase())) {
      setError("Another location already uses this site code.");
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const payload = {
      name: trimmedName,
      type,
      code: trimmedCode || undefined,
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: trimmedEmail || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const saved = location ? updateLocation(companyId, location.id, payload) : addLocation(companyId, payload);
      if (!saved) { setError("Could not save this location."); return; }
      onSaved(saved, isEdit ? "updated" : "created");
    } catch {
      setError("Could not save this location in the browser.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-heading/65 backdrop:backdrop-blur-sm sm:max-w-2xl"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start gap-4 border-b bg-muted/35 px-5 py-5 sm:px-7">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            {type === "Outlet" ? <Store className="size-5" aria-hidden="true" /> : <Warehouse className="size-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-primary">Stores &amp; Warehouses</p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight text-heading">{isEdit ? `Edit ${location?.name}` : "Add store or warehouse"}</h2>
            <p id={descriptionId} className="mt-1 max-w-lg text-sm leading-5 text-muted-foreground">
              {isEdit ? "Update the site details used across sales, purchases, and stock transfers." : "Register a new retail outlet or storage facility and its contact details."}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Close location form" onClick={onClose}><X className="size-5" /></Button>
        </header>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-heading">Location type *</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {typeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = type === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        selected ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <input type="radio" name="location-type" value={option.value} className="sr-only" checked={selected} onChange={() => { setType(option.value); setError(""); }} />
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", selected ? "border-primary/20 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-heading">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{option.description}</span>
                      </span>
                      {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={cn(fieldClass, "sm:col-span-2")}>
                {type === "Outlet" ? "Outlet name *" : "Warehouse name *"}
                <Input data-dialog-autofocus required maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder={type === "Outlet" ? "e.g. DHA Phase 5 Store" : "e.g. Central Fulfilment Warehouse"} />
              </label>
              <label className={fieldClass}>
                Site code
                <Input maxLength={20} value={code} onChange={(event) => { setCode(event.target.value); setError(""); }} placeholder={type === "Outlet" ? "e.g. OUT-03" : "e.g. WH-02"} />
              </label>
              <label className={fieldClass}>
                City / region
                <Input maxLength={60} value={city} onChange={(event) => { setCity(event.target.value); setError(""); }} placeholder="e.g. Karachi" />
              </label>
              <label className={fieldClass}>
                Contact person
                <Input maxLength={80} value={contactName} onChange={(event) => { setContactName(event.target.value); setError(""); }} placeholder="e.g. Site supervisor" />
              </label>
              <label className={fieldClass}>
                Phone
                <Input type="tel" maxLength={30} value={phone} onChange={(event) => { setPhone(event.target.value); setError(""); }} placeholder="e.g. +92 300 1234567" />
              </label>
              <label className={cn(fieldClass, "sm:col-span-2")}>
                Email
                <Input type="email" maxLength={120} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="e.g. store@company.com" />
              </label>
              <label className={cn(fieldClass, "sm:col-span-2")}>
                Street address
                <Input maxLength={160} value={address} onChange={(event) => { setAddress(event.target.value); setError(""); }} placeholder="e.g. Main Boulevard, Plaza 4" />
              </label>
              <label className={cn(fieldClass, "sm:col-span-2")}>
                Notes
                <textarea className={textareaClass} maxLength={240} value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} placeholder="Opening hours, delivery instructions, or internal remarks" />
              </label>
            </div>

            {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t bg-muted/25 px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEdit ? "Save changes" : `Add ${type === "Outlet" ? "outlet" : "warehouse"}`}</Button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
