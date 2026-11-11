"use client";

import { partyViews, type PartyView } from "@/config/views";
import { ArrowDownLeft, ArrowUpRight, Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Textarea } from "@/components/shared/fields";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageTabs } from "@/components/shared/page-tabs";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { partyBalances } from "@/domain/ledger";
import { newId, saveParty, useBooks } from "@/domain/store";
import type { Party, PartyKind } from "@/domain/types";
import { MoneyEntryDialog } from "@/features/money/money-dialogs";
import { useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";


export function PartiesWorkspace({ companyId, view }: { companyId: string; view: PartyView }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const kind: PartyKind = view === "customers" ? "customer" : "supplier";
  const balances = useMemo(() => partyBalances(books), [books]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Party | "new" | null>(null);
  const [paying, setPaying] = useState(false);

  const lastActivity = useMemo(() => {
    const last = new Map<string, string>();
    const bump = (id: string | undefined, date: string) => { if (id && (!last.has(id) || last.get(id)! < date)) last.set(id, date); };
    for (const sale of books.sales) bump(sale.customerId, sale.date);
    for (const purchase of books.purchases) bump(purchase.supplierId, purchase.date);
    for (const entry of books.moneyEntries) bump(entry.partyId, entry.date);
    return last;
  }, [books]);

  const rows = books.parties
    .filter((party) => party.kind === kind && (!query.trim() || `${party.name} ${party.phone ?? ""} ${party.city ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0));
  const outstanding = rows.reduce((sum, party) => sum + Math.max(0, balances.get(party.id) ?? 0), 0);

  return (
    <div className="workspace-enter space-y-5">
      <WorkspaceHeader
        eyebrow="Khata"
        title="Customers & suppliers"
        description="Who owes you and who you owe. Credit sales and unpaid purchases add to the balance; payments reduce it."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPaying(true)}>{kind === "customer" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}{kind === "customer" ? "Receive payment" : "Pay supplier"}</Button>
            <Button onClick={() => setEditing("new")}><Plus className="size-4" />Add {kind}</Button>
          </div>
        }
      />
      <PageTabs tabs={partyViews} active={view} hrefFor={(value) => `${base}/parties?view=${value}`} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search" className="pl-9" placeholder="Name, phone or city" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">{kind === "customer" ? "Customers owe you" : "You owe suppliers"} <strong className="tabular-nums text-heading">{money(outstanding)}</strong></p>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="text-right">{kind === "customer" ? "Owes you" : "You owe"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((party) => {
              const balance = balances.get(party.id) ?? 0;
              return (
                <TableRow key={party.id}>
                  <TableCell>
                    <Link href={`${base}/parties/${party.id}`} className="font-semibold text-heading hover:text-primary">{party.name}</Link>
                    {party.kind === "customer" && party.creditAllowed ? <Badge tone="info" className="ml-2 px-1.5 py-0 text-[0.6rem]">Khata</Badge> : null}
                  </TableCell>
                  <TableCell className="text-sm">{party.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{party.city ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{lastActivity.get(party.id) ? formatDate(lastActivity.get(party.id)!) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {balance > 0 ? <span className="text-destructive">{money(balance)}</span> : balance < 0 ? <span className="text-success">{money(-balance)} advance</span> : <span className="text-muted-foreground">Settled</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length ? <div className="p-8 text-center text-sm text-muted-foreground"><UsersRound className="mx-auto mb-2 size-6" />No {kind}s yet.</div> : null}
      </Card>
      {editing ? <PartyDialog companyId={companyId} kind={kind} party={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {paying ? <MoneyEntryDialog companyId={companyId} kind={kind === "customer" ? "customer-receipt" : "supplier-payment"} onClose={() => setPaying(false)} /> : null}
    </div>
  );
}

export function PartyDialog({ companyId, kind, party, onClose }: { companyId: string; kind: PartyKind; party?: Party; onClose: () => void }) {
  const [name, setName] = useState(party?.name ?? "");
  const [phone, setPhone] = useState(party?.phone ?? "");
  const [city, setCity] = useState(party?.city ?? "");
  const [opening, setOpening] = useState(party ? String(party.openingBalance) : "");
  const [credit, setCredit] = useState(party?.creditAllowed ?? kind === "customer");
  const [notes, setNotes] = useState(party?.notes ?? "");
  const [error, setError] = useState("");
  const save = () => {
    if (!name.trim()) return setError("Enter a name.");
    saveParty(companyId, {
      id: party?.id ?? newId(kind === "customer" ? "cus" : "sup"), kind, name: name.trim(), phone: phone.trim() || undefined, city: city.trim() || undefined,
      openingBalance: Math.round(Number(opening) || 0), creditAllowed: kind === "customer" ? credit : undefined, notes: notes.trim() || undefined,
    });
    toast.success(party ? "Saved" : `${name} added`);
    onClose();
  };
  return (
    <FormDialog title={party ? `Edit ${party.name}` : `Add ${kind}`} icon={UsersRound} onClose={onClose} onSubmit={save}
      footer={<><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={error} className="sm:col-span-2"><Input data-dialog-autofocus value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Mobile"><Input inputMode="tel" placeholder="03xx-xxxxxxx" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
        <Field label="Opening balance" hint={kind === "customer" ? "What they already owed you before" : "What you already owed them before"} className="sm:col-span-2"><Input type="number" value={opening} placeholder="0" onChange={(event) => setOpening(event.target.value)} /></Field>
        {kind === "customer" ? <label className="flex items-center gap-2 text-sm text-heading sm:col-span-2"><input type="checkbox" className="size-4 accent-primary" checked={credit} onChange={(event) => setCredit(event.target.checked)} />Allow khata (buy now, pay later)</label> : null}
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      </div>
    </FormDialog>
  );
}
