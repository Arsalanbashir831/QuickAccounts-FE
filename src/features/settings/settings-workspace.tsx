"use client";

import { ArrowDownToLine, Eraser, FileUp, Plus, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Field, Select, Textarea } from "@/components/shared/fields";
import { PageTabs } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readBooks, resetDemoData, startEmptyBooks, stores } from "@/domain/store";
import { isSettingsBundleSettings, resetCompanySettings, saveCompanySettings, teamRoles, useCompanySettings, type TeamRole } from "./settings-store";
import { settingViews } from "./setting-views";

export { settingViews } from "./setting-views";

const Section = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <Card>
    <CardHeader className="border-b"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent className="p-4 sm:p-6">{children}</CardContent>
  </Card>
);

function BusinessSettings({ companyId }: { companyId: string }) {
  const settings = useCompanySettings(companyId);
  const [business, setBusiness] = useState(settings.business);
  const onLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) { toast.error("Choose a PNG, JPEG or WebP logo under 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setBusiness((current) => ({ ...current, logoDataUrl: reader.result as string })); };
    reader.readAsDataURL(file);
  };
  const save = () => {
    if (!business.name.trim()) { toast.error("Enter the shop name."); return; }
    saveCompanySettings(companyId, { ...settings, business: { ...business, name: business.name.trim() } });
    toast.success("Shop details saved");
  };
  return (
    <Section title="Shop details" description="Printed on receipts and invoices.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <span className="block text-sm font-medium text-heading">Logo</span>
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            {business.logoDataUrl ? <img src={business.logoDataUrl} alt="" className="h-10 w-auto rounded border" /> : null}
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Choose logo<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} /></label>
            {business.logoDataUrl ? <Button variant="ghost" size="sm" onClick={() => setBusiness({ ...business, logoDataUrl: undefined })}>Remove</Button> : <span className="text-xs text-muted-foreground">PNG, JPEG or WebP · up to 1 MB</span>}
          </div>
        </div>
        <Field label="Shop name"><Input maxLength={80} value={business.name} onChange={(event) => setBusiness({ ...business, name: event.target.value })} /></Field>
        <Field label="Registered / legal name" hint="Optional"><Input maxLength={120} value={business.legalName} onChange={(event) => setBusiness({ ...business, legalName: event.target.value })} /></Field>
        <Field label="Phone / WhatsApp"><Input type="tel" value={business.phone} onChange={(event) => setBusiness({ ...business, phone: event.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={business.email} onChange={(event) => setBusiness({ ...business, email: event.target.value })} /></Field>
        <Field label="NTN / tax number" hint="Optional"><Input value={business.taxNumber} onChange={(event) => setBusiness({ ...business, taxNumber: event.target.value })} /></Field>
        <Field label="Date format">
          <Select value={business.dateFormat} onChange={(event) => setBusiness({ ...business, dateFormat: event.target.value as typeof business.dateFormat })}>
            <option value="dd MMM yyyy">11 Nov 2026</option><option value="dd/MM/yyyy">11/11/2026</option><option value="yyyy-MM-dd">2026-11-11</option>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2"><Textarea rows={2} maxLength={240} value={business.address} onChange={(event) => setBusiness({ ...business, address: event.target.value })} /></Field>
        <p className="text-xs text-muted-foreground sm:col-span-2">Currency: Pakistani Rupee (Rs) · Time zone: Pakistan (Asia/Karachi)</p>
      </div>
      <div className="mt-5 flex justify-end border-t pt-4"><Button onClick={save}><Save className="size-4" />Save</Button></div>
    </Section>
  );
}

function TeamSettings({ companyId }: { companyId: string }) {
  const settings = useCompanySettings(companyId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Cashier");
  const saveTeam = (team: typeof settings.team) => saveCompanySettings(companyId, { ...settings, team });
  const add = () => {
    if (!name.trim() || !email.trim()) { toast.error("Enter name and email."); return; }
    if (settings.team.some((member) => member.email.toLowerCase() === email.trim().toLowerCase())) { toast.error("That email is already on the team."); return; }
    saveTeam([...settings.team, { id: `team-${Date.now().toString(36)}`, name: name.trim(), email: email.trim().toLowerCase(), role, status: "Active" }]);
    setName(""); setEmail("");
    toast.success("Team member added");
  };
  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p><strong>Demo only.</strong> Sign-in uses the fixed demo accounts. Adding people here doesn’t create logins yet.</p></div>
      <Section title="Team" description="Owner sees everything. Cashiers can sell, take returns and check stock, but not costs, money, purchases or reports.">
        <ul className="divide-y">
          {settings.team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-heading">{member.name}</p><p className="text-sm text-muted-foreground">{member.email}</p></div>
              <div className="flex items-center gap-2">
                <Badge tone={member.role === "Owner" ? "info" : "neutral"}>{member.role}</Badge>
                <Badge tone={member.status === "Active" ? "success" : "neutral"}>{member.status}</Badge>
                {member.role !== "Owner" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => saveTeam(settings.team.map((entry) => (entry.id === member.id ? { ...entry, status: entry.status === "Active" ? "Inactive" : "Active" } : entry)))}>{member.status === "Active" ? "Disable" : "Enable"}</Button>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${member.name}`} onClick={() => saveTeam(settings.team.filter((entry) => entry.id !== member.id))}><Trash2 className="size-4" /></Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
          <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Role"><Select value={role} onChange={(event) => setRole(event.target.value as TeamRole)}>{teamRoles.map((entry) => <option key={entry}>{entry}</option>)}</Select></Field>
          <Button onClick={add}><Plus className="size-4" />Add</Button>
        </div>
      </Section>
    </div>
  );
}

function RulesSettings({ companyId }: { companyId: string }) {
  const settings = useCompanySettings(companyId);
  const [rules, setRules] = useState(settings.rules);
  const [error, setError] = useState("");
  const save = () => {
    if (!/^[A-Za-z0-9]{1,8}$/.test(rules.invoicePrefix.trim())) return setError("Receipt prefix: 1–8 letters or numbers.");
    if (!(rules.taxRate >= 0 && rules.taxRate <= 100)) return setError("Tax rate must be 0–100%.");
    if (!(rules.lowStockThreshold >= 0)) return setError("Low-stock level must be 0 or more.");
    if (!(rules.returnDays >= 0)) return setError("Return window must be 0 or more days.");
    setError("");
    saveCompanySettings(companyId, { ...settings, rules: { ...rules, invoicePrefix: rules.invoicePrefix.trim().toUpperCase() } });
    toast.success("Shop rules saved");
  };
  return (
    <div className="space-y-5">
      <Section title="Selling" description="Used at the POS and on invoices.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Receipt number prefix" hint={`Next receipts look like ${rules.invoicePrefix || "KF"}-10234`}><Input maxLength={8} value={rules.invoicePrefix} onChange={(event) => setRules({ ...rules, invoicePrefix: event.target.value })} /></Field>
          <Field label="Sales tax (%)" hint="Leave 0 if you don’t charge sales tax"><Input type="number" min={0} max={100} step="0.5" value={rules.taxRate} onChange={(event) => setRules({ ...rules, taxRate: Number(event.target.value) })} /></Field>
          <label className="flex items-center gap-3 rounded-md border p-3 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-primary" checked={rules.taxInclusive} onChange={(event) => setRules({ ...rules, taxInclusive: event.target.checked })} /><span><strong className="font-medium text-heading">Shelf prices already include tax</strong><span className="block text-xs text-muted-foreground">Turn off to add tax on top at checkout.</span></span></label>
        </div>
      </Section>
      <Section title="Returns & exchanges" description="Shown on every receipt.">
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <Field label="Return window (days)" hint="Only the owner can accept returns after this"><Input type="number" min={0} value={rules.returnDays} onChange={(event) => setRules({ ...rules, returnDays: Number(event.target.value) })} /></Field>
          <Field label="Receipt footer"><Textarea rows={2} maxLength={200} value={rules.receiptFooter} onChange={(event) => setRules({ ...rules, receiptFooter: event.target.value })} /></Field>
        </div>
      </Section>
      <Section title="Stock & accounts" description="Alerts and reporting period.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Warn when a size has this many pairs or fewer"><Input type="number" min={0} value={rules.lowStockThreshold} onChange={(event) => setRules({ ...rules, lowStockThreshold: Number(event.target.value) })} /></Field>
          <Field label="Financial year starts">
            <Select value={rules.financialYearStart} onChange={(event) => setRules({ ...rules, financialYearStart: event.target.value })}>
              {Array.from({ length: 12 }, (_, index) => { const month = String(index + 1).padStart(2, "0"); return <option key={month} value={`${month}-01`}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))} 1</option>; })}
            </Select>
          </Field>
        </div>
      </Section>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button onClick={save}><Save className="size-4" />Save rules</Button></div>
    </div>
  );
}

function DataSettings({ companyId }: { companyId: string }) {
  const settings = useCompanySettings(companyId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const exportAll = () => {
    const bundle = { format: "dotcode-footwear-backup", version: 1, companyId, exportedAt: new Date().toISOString(), settings, books: readBooks(companyId) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${settings.business.name.replace(/\W+/g, "-").toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const importAll = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const bundle = JSON.parse(await file.text()) as { format?: string; settings?: unknown; books?: Record<string, unknown> };
      if (bundle.format !== "dotcode-footwear-backup" || !isSettingsBundleSettings(bundle.settings) || !bundle.books) throw new Error("This isn’t a backup from this app.");
      const names = Object.keys(stores) as Array<keyof typeof stores>;
      if (!names.every((name) => Array.isArray(bundle.books?.[name]))) throw new Error("The backup file is incomplete.");
      if (!window.confirm("Replace everything in this browser with the backup?")) return;
      saveCompanySettings(companyId, bundle.settings);
      for (const name of names) (stores[name] as { write: (id: string, items: unknown[]) => void }).write(companyId, bundle.books[name] as unknown[]);
      setError("");
      toast.success("Backup restored");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the file.");
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Backup" description="Everything — products, sales, purchases, khata, money and settings — in one file.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportAll}><ArrowDownToLine className="size-4" />Download backup</Button>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={importAll} />
          <Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp className="size-4" />Restore from file</Button>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </Section>
      <Section title="Demo data" description="Data is stored only in this browser while the backend is being built.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => { if (window.confirm("Throw away your changes and reload the Kadam Footwear demo data?")) { resetDemoData(companyId); resetCompanySettings(companyId); toast.success("Demo data restored"); } }}><RotateCcw className="size-4" />Reset to demo data</Button>
          <Button variant="destructive" onClick={() => { if (window.confirm("Delete all products, sales and history and start with an empty shop?")) { startEmptyBooks(companyId); toast.success("Empty shop ready — add your first style under Products"); } }}><Eraser className="size-4" />Start with an empty shop</Button>
        </div>
      </Section>
    </div>
  );
}

const descriptions: Record<string, string> = {
  business: "Your shop’s name, contact details and logo.",
  team: "Who can use the shop and what they can see.",
  rules: "Tax, receipts, returns and stock alerts.",
  data: "Back up, restore or reset your data.",
};

export const SettingsWorkspace = ({ companyId, initialView }: { companyId: string; initialView: string }) => (
  <div className="workspace-enter space-y-5">
    <WorkspaceHeader eyebrow="Settings" title="Settings" description={descriptions[initialView] ?? descriptions.business} />
    <PageTabs tabs={settingViews} active={initialView} hrefFor={(value) => `/c/${encodeURIComponent(companyId)}/settings?view=${value}`} />
    {initialView === "business" ? <BusinessSettings companyId={companyId} /> : null}
    {initialView === "team" ? <TeamSettings companyId={companyId} /> : null}
    {initialView === "rules" ? <RulesSettings companyId={companyId} /> : null}
    {initialView === "data" ? <DataSettings companyId={companyId} /> : null}
  </div>
);
