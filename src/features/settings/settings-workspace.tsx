"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowDownToLine, FileUp, Plus, Save, ShieldAlert, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LocationsView } from "./locations-view";
import { isSettingsBundleSettings, saveCompanySettings, teamRoles, useCompanySettings, type TeamMemberSetting, type TeamRole } from "./settings-store";
import { saveLocations, useLocations, type StockLocation } from "./location-store";
import { settingViews } from "./setting-views";

export { settingViews } from "./setting-views";

type SettingsPanelProps = { companyId: string };

const isStockLocationArray = (value: unknown): value is StockLocation[] => Array.isArray(value) && value.every((location: unknown) => {
  if (!location || typeof location !== "object") return false;
  const candidate = location as Partial<StockLocation>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && (candidate.type === "Outlet" || candidate.type === "Warehouse");
});

const SettingSection = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <Card>
    <CardHeader className="border-b"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent className="p-4 sm:p-6">{children}</CardContent>
  </Card>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1.5 text-sm font-medium text-heading"><span>{label}</span>{children}</label>
);

const SaveRow = ({ onSave, label = "Save changes" }: { onSave: () => void; label?: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
    <p className="text-xs text-muted-foreground">Saved in this browser for this demo company.</p>
    <Button onClick={onSave}><Save className="size-4" />{label}</Button>
  </div>
);

function BusinessSettings({ companyId }: SettingsPanelProps) {
  const settings = useCompanySettings(companyId);
  const locations = useLocations(companyId);
  const [business, setBusiness] = useState(settings.business);
  const [rules, setRules] = useState(settings.rules);
  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) {
      toast.error("Choose a PNG, JPEG, or WebP logo smaller than 1 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBusiness((current) => ({ ...current, logoDataUrl: reader.result as string }));
    };
    reader.onerror = () => toast.error("Could not read this logo file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const handleSave = () => {
    try {
      saveCompanySettings(companyId, { ...settings, business, rules });
      toast.success("Business profile saved.");
    } catch {
      toast.error("Could not save these settings in this browser.");
    }
  };

  return <div className="space-y-5">
    <SettingSection title="Business profile" description="These details identify your company and are used on printed sales invoices.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><span className="block text-sm font-medium text-heading">Invoice logo</span><div className="flex flex-wrap items-center gap-3"><label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Choose logo<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} /></label>{business.logoDataUrl ? <><span className="text-xs text-muted-foreground">Logo selected · PNG, JPEG, or WebP</span><Button variant="ghost" size="sm" onClick={() => setBusiness({ ...business, logoDataUrl: undefined })}>Remove logo</Button></> : <span className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 1 MB</span>}</div></div>
        <Field label="Business name"><Input required maxLength={100} value={business.name} onChange={(event) => setBusiness({ ...business, name: event.target.value })} /></Field>
        <Field label="Legal name"><Input maxLength={120} value={business.legalName} onChange={(event) => setBusiness({ ...business, legalName: event.target.value })} placeholder="Registered legal name" /></Field>
        <Field label="Registration number"><Input maxLength={80} value={business.registrationNumber} onChange={(event) => setBusiness({ ...business, registrationNumber: event.target.value })} /></Field>
        <Field label="Tax number"><Input maxLength={80} value={business.taxNumber} onChange={(event) => setBusiness({ ...business, taxNumber: event.target.value })} /></Field>
        <Field label="Phone"><Input type="tel" maxLength={40} value={business.phone} onChange={(event) => setBusiness({ ...business, phone: event.target.value })} /></Field>
        <Field label="Email"><Input type="email" maxLength={120} value={business.email} onChange={(event) => setBusiness({ ...business, email: event.target.value })} /></Field>
        <Field label="Business address"><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={240} value={business.address} onChange={(event) => setBusiness({ ...business, address: event.target.value })} /></Field>
        <div className="grid gap-4 content-start">
          <Field label="Currency"><select disabled className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" value={business.currency}><option value="USD">USD · US Dollar</option></select></Field>
          <Field label="Time zone"><select disabled className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" value={business.timeZone}><option value="Asia/Karachi">Pakistan Standard Time · Asia/Karachi</option></select></Field>
          <Field label="Date format"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={business.dateFormat} onChange={(event) => setBusiness({ ...business, dateFormat: event.target.value as typeof business.dateFormat })}><option value="dd MMM yyyy">13 Oct 2026</option><option value="dd/MM/yyyy">13/10/2026</option><option value="yyyy-MM-dd">2026-10-13</option></select></Field>
          <p className="text-xs text-muted-foreground">Currency and time zone are fixed by the current demo workspace. Multi-currency support can be enabled with the company backend settings.</p>
        </div>
      </div>
      <div className="mt-5"><SaveRow onSave={handleSave} /></div>
    </SettingSection>
    <SettingSection title="Default locations" description="Choose which existing location is preselected for new sales and receiving work.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default sales outlet"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rules.defaultSalesLocation} onChange={(event) => setRules({ ...rules, defaultSalesLocation: event.target.value })}>{locations.filter((location) => location.type === "Outlet").map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Default receiving warehouse"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rules.defaultReceivingLocation} onChange={(event) => setRules({ ...rules, defaultReceivingLocation: event.target.value })}>{locations.filter((location) => location.type === "Warehouse").map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field>
      </div>
      <div className="mt-5"><SaveRow onSave={handleSave} label="Save profile and defaults" /></div>
    </SettingSection>
  </div>;
}

function TeamSettings({ companyId }: SettingsPanelProps) {
  const settings = useCompanySettings(companyId);
  const locations = useLocations(companyId);
  const [members, setMembers] = useState(settings.team);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "Sales / Cashier" as TeamRole, locationId: "all" });
  const [error, setError] = useState("");
  const locationName = (id: string) => id === "all" ? "All locations" : locations.find((location) => location.id === id)?.name ?? "Choose a location";
  const saveMembers = (next: TeamMemberSetting[]) => {
    setMembers(next);
    try { saveCompanySettings(companyId, { ...settings, team: next }); }
    catch { toast.error("Could not save team settings in this browser."); }
  };
  const addMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newMember.name.trim();
    const email = newMember.email.trim().toLowerCase();
    if (!name || !email) { setError("Enter the team member’s name and email."); return; }
    if (members.some((member) => member.email.toLowerCase() === email)) { setError("A team member with this email already exists."); return; }
    const next = [...members, { ...newMember, id: `team-${Date.now().toString(36)}`, name, email, status: "Active" as const }];
    saveMembers(next);
    setNewMember({ name: "", email: "", role: "Sales / Cashier", locationId: "all" });
    setError("");
    setIsAdding(false);
    toast.success("Demo team member added.");
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-heading">Team access</h2><p className="mt-1 text-sm text-muted-foreground">Manage the role and location scope shown for each team member.</p></div><Button onClick={() => { setIsAdding((open) => !open); setError(""); }}><Plus className="size-4" />Add team member</Button></div>
    <div className="flex gap-3 rounded-lg border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p><strong>Demo access only.</strong> These roles are saved in this browser and do not grant or restrict access to the backend. Connect the verified Django permissions before using this for real accounts.</p></div>
    {isAdding ? <SettingSection title="Add team member" description="Add a demo team record and choose its role and location scope.">
      <form onSubmit={addMember} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input required autoFocus value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} /></Field>
        <Field label="Email"><Input required type="email" value={newMember.email} onChange={(event) => setNewMember({ ...newMember, email: event.target.value })} /></Field>
        <Field label="Role"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value as TeamRole })}>{teamRoles.filter((role) => role !== "Owner").map((role) => <option key={role}>{role}</option>)}</select></Field>
        <Field label="Location access"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newMember.locationId} onChange={(event) => setNewMember({ ...newMember, locationId: event.target.value })}><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        {error ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" type="button" onClick={() => setIsAdding(false)}>Cancel</Button><Button type="submit">Add member</Button></div>
      </form>
    </SettingSection> : null}
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Users className="size-4" />Team members</CardTitle><CardDescription>Role changes are saved immediately in this demo browser.</CardDescription></CardHeader><CardContent className="divide-y p-0">
      {members.map((member) => <div key={member.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(12rem,1.4fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_auto] sm:items-center">
        <div className="min-w-0"><p className="truncate font-medium text-heading">{member.name}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p></div>
        <Field label="Role"><select disabled={member.role === "Owner"} aria-label={`Role for ${member.name}`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:bg-muted" value={member.role} onChange={(event) => saveMembers(members.map((entry) => entry.id === member.id ? { ...entry, role: event.target.value as TeamRole } : entry))}>{teamRoles.map((role) => <option key={role}>{role}</option>)}</select></Field>
        <Field label="Location access"><select aria-label={`Location access for ${member.name}`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={member.locationId} onChange={(event) => saveMembers(members.map((entry) => entry.id === member.id ? { ...entry, locationId: event.target.value } : entry))}><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><span className="sr-only">Current scope: {locationName(member.locationId)}</span></Field>
        <div className="flex items-center justify-between gap-2 sm:justify-end"><Badge tone={member.status === "Active" ? "success" : "neutral"}>{member.status}</Badge>{member.role !== "Owner" ? <><Button size="sm" variant="outline" onClick={() => saveMembers(members.map((entry) => entry.id === member.id ? { ...entry, status: entry.status === "Active" ? "Inactive" : "Active" } : entry))}>{member.status === "Active" ? "Disable" : "Enable"}</Button><Button size="icon" variant="ghost" aria-label={`Remove ${member.name}`} onClick={() => saveMembers(members.filter((entry) => entry.id !== member.id))}><Trash2 className="size-4" /></Button></> : null}</div>
      </div>)}
      {members.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No team members added yet.</p> : null}
    </CardContent></Card>
  </div>;
}

function RulesSettings({ companyId }: SettingsPanelProps) {
  const settings = useCompanySettings(companyId);
  const [rules, setRules] = useState(settings.rules);
  const [error, setError] = useState("");
  const handleSave = () => {
    if (!rules.invoicePrefix.trim()) { setError("Enter an invoice reference prefix."); return; }
    if (!Number.isFinite(rules.taxRate) || rules.taxRate < 0 || rules.taxRate > 100) { setError("Tax rate must be between 0 and 100 percent."); return; }
    if (!Number.isFinite(rules.lowStockThreshold) || rules.lowStockThreshold < 0) { setError("Stock alert quantity must be zero or higher."); return; }
    setError("");
    try { saveCompanySettings(companyId, { ...settings, rules: { ...rules, invoicePrefix: rules.invoicePrefix.trim().toUpperCase() } }); toast.success("Business rules saved."); }
    catch { toast.error("Could not save these settings in this browser."); }
  };
  return <div className="space-y-5">
    <SettingSection title="Sales defaults" description="Defaults used when starting a sale and creating a new invoice.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Invoice reference prefix"><Input required maxLength={16} value={rules.invoicePrefix} onChange={(event) => setRules({ ...rules, invoicePrefix: event.target.value })} /><span className="block text-xs font-normal text-muted-foreground">Example: {rules.invoicePrefix || "PREFIX"}-12345678</span></Field>
        <Field label="Default sales tax (%)"><Input type="number" min="0" max="100" step="0.01" value={rules.taxRate} onChange={(event) => setRules({ ...rules, taxRate: Number(event.target.value) })} /></Field>
        <label className="flex min-h-10 items-center gap-3 rounded-md border p-3 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-primary" checked={rules.taxInclusive} onChange={(event) => setRules({ ...rules, taxInclusive: event.target.checked })} /><span><strong className="font-medium text-heading">Prices include tax</strong><span className="mt-0.5 block text-xs text-muted-foreground">The demo checkout treats entered prices as tax-inclusive when this is on.</span></span></label>
      </div>
    </SettingSection>
    <SettingSection title="Inventory and accounting period" description="Set a low-stock reminder threshold and the start of the company’s financial year.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Low-stock alert when quantity reaches"><Input type="number" min="0" step="1" value={rules.lowStockThreshold} onChange={(event) => setRules({ ...rules, lowStockThreshold: Number(event.target.value) })} /><span className="block text-xs font-normal text-muted-foreground">Saved as a company default; inventory alerts need the verified stock service.</span></Field>
        <Field label="Financial year begins"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rules.financialYearStart} onChange={(event) => setRules({ ...rules, financialYearStart: event.target.value })}>{Array.from({ length: 12 }, (_, index) => { const month = String(index + 1).padStart(2, "0"); return <option key={month} value={`${month}-01`}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))} 1</option>; })}</select></Field>
      </div>
    </SettingSection>
    {error ? <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
    <SaveRow onSave={handleSave} />
  </div>;
}

function DataSettings({ companyId }: SettingsPanelProps) {
  const settings = useCompanySettings(companyId);
  const locations = useLocations(companyId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const exportBundle = () => {
    const bundle = { format: "quickaccounts-settings", version: 1, companyId, exportedAt: new Date().toISOString(), settings, locations };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quickaccounts-${companyId}-settings.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Settings backup downloaded.");
  };
  const importBundle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object") throw new Error("Choose a QuickAccounts settings backup file.");
      const bundle = value as { format?: unknown; version?: unknown; companyId?: unknown; settings?: unknown; locations?: unknown };
      if (bundle.format !== "quickaccounts-settings" || bundle.version !== 1 || bundle.companyId !== companyId || !isSettingsBundleSettings(bundle.settings) || !isStockLocationArray(bundle.locations) || bundle.locations.length === 0) {
        throw new Error("This file is not a valid QuickAccounts settings backup.");
      }
      if (!window.confirm("Replace this company’s saved settings and locations with the imported backup?")) return;
      saveCompanySettings(companyId, bundle.settings);
      saveLocations(companyId, bundle.locations);
      setError("");
      toast.success("Settings backup restored.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this backup file.");
    } finally {
      event.target.value = "";
    }
  };
  return <div className="space-y-5">
    <SettingSection title="Settings backup" description="Export or restore the configuration stored by this demo in the current browser.">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium text-heading">Export settings and locations</p><p className="mt-1 text-sm text-muted-foreground">Downloads a JSON backup you can keep or restore later.</p></div><Button variant="outline" onClick={exportBundle}><ArrowDownToLine className="size-4" />Download backup</Button></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium text-heading">Restore a settings backup</p><p className="mt-1 text-sm text-muted-foreground">This replaces the saved settings and locations for this company in this browser.</p></div><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={importBundle} /><Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp className="size-4" />Choose backup</Button></div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    </SettingSection>
    <SettingSection title="Business records" description="Customer, supplier, invoice, purchase, and payment data is not included in this settings backup.">
      <div className="rounded-lg border border-dashed p-5"><p className="font-medium text-heading">Record import and export needs the company data service.</p><p className="mt-1 max-w-3xl text-sm text-muted-foreground">The frontend currently keeps demo records in browser storage and the verified backend import, export, backup, and restore contracts are not available yet. This section will become the company-wide data center when those contracts are connected.</p></div>
    </SettingSection>
  </div>;
}

const viewDescription: Record<string, string> = {
  business: "Set up your business profile and the defaults used by daily work.",
  locations: "Manage the outlets and warehouses available to your company.",
  team: "Manage team roles and the locations each person works in.",
  rules: "Choose the default sales, tax, inventory, and accounting rules.",
  data: "Back up and restore your company configuration.",
};

export const SettingsWorkspace = ({ companyId, initialView, isSetup = false }: { companyId: string; initialView: string; isSetup?: boolean }) => (
  <div className="workspace-enter space-y-5">
    <WorkspaceHeader eyebrow={isSetup ? "Guided setup" : "Company configuration"} title={isSetup ? "Set up your company" : "Settings"} description={viewDescription[initialView] ?? viewDescription.business} />
    <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Settings sections">
      {settingViews.map((view) => <Button asChild key={view.value} size="sm" variant={view.value === initialView ? "secondary" : "ghost"} className="shrink-0"><Link href={`/c/${companyId}/settings?view=${view.value}`} role="tab" aria-selected={view.value === initialView}>{view.label}</Link></Button>)}
    </div>
    {initialView === "business" ? <BusinessSettings companyId={companyId} /> : null}
    {initialView === "locations" ? <LocationsView companyId={companyId} /> : null}
    {initialView === "team" ? <TeamSettings companyId={companyId} /> : null}
    {initialView === "rules" ? <RulesSettings companyId={companyId} /> : null}
    {initialView === "data" ? <DataSettings companyId={companyId} /> : null}
    <div className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">Demo configuration is saved in this browser. Team roles do not secure backend access. Tax rules and location defaults apply to the demo checkout; stock alerts, financial period controls, and company record backups still need the verified Django services.</div>
  </div>
);
