"use client";

import { ArrowDownLeft, ArrowLeft, ArrowUpRight, MessageCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { partyLedger } from "@/domain/ledger";
import { useBooks } from "@/domain/store";
import { MoneyEntryDialog } from "@/features/money/money-dialogs";
import { useCompanySettings, useDateFormatter } from "@/features/settings/settings-store";
import { useMoney } from "@/lib/format/money";
import { PartyDialog } from "./parties-workspace";

export function PartyDetails({ companyId, partyId }: { companyId: string; partyId: string }) {
  const money = useMoney();
  const formatDate = useDateFormatter(companyId);
  const books = useBooks(companyId);
  const settings = useCompanySettings(companyId);
  const base = `/c/${encodeURIComponent(companyId)}`;
  const party = books.parties.find((entry) => entry.id === partyId);
  const rows = useMemo(() => partyLedger(books, partyId), [books, partyId]);
  const [dialog, setDialog] = useState<"edit" | "pay" | null>(null);

  if (!party) return <Card className="mx-auto max-w-md p-8 text-center"><p className="font-semibold text-heading">Not found</p><Button asChild className="mt-4" variant="outline"><Link href={`${base}/parties`}>Back</Link></Button></Card>;

  const balance = rows.at(-1)?.balance ?? party.openingBalance;
  const isCustomer = party.kind === "customer";
  const phone = party.phone?.replace(/\D/g, "").replace(/^0/, "92");
  const reminder = `Assalam o Alaikum ${party.name}, this is a reminder from ${settings.business.name} that ${money(balance)} is due on your account. Thank you!`;

  return (
    <div className="workspace-enter space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`${base}/parties?view=${isCustomer ? "customers" : "suppliers"}`}><ArrowLeft className="size-4" />{isCustomer ? "Customers" : "Suppliers"}</Link></Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{isCustomer ? "Customer" : "Supplier"}{party.city ? ` · ${party.city}` : ""}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-heading sm:text-4xl">{party.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{party.phone ?? "No phone"}{party.notes ? ` · ${party.notes}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog("edit")}><Pencil className="size-4" />Edit</Button>
          {isCustomer && balance > 0 && phone ? <Button asChild variant="outline"><a href={`https://wa.me/${phone}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp reminder</a></Button> : null}
          <Button onClick={() => setDialog("pay")}>{isCustomer ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}{isCustomer ? "Receive payment" : "Pay supplier"}</Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{balance > 0 ? (isCustomer ? "Owes you" : "You owe") : balance < 0 ? "Advance" : "Balance"}</p>
          <p className={`numeric text-3xl font-semibold ${balance > 0 ? "text-destructive" : balance < 0 ? "text-success" : "text-heading"}`}>{money(Math.abs(balance))}</p>
        </div>
        {isCustomer ? <Badge tone={party.creditAllowed ? "info" : "neutral"}>{party.creditAllowed ? "Khata allowed" : "Cash only"}</Badge> : null}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Khata ledger</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">{isCustomer ? "Sale (+)" : "Goods (+)"}</TableHead>
              <TableHead className="text-right">Paid / returned (−)</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...rows].reverse().map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.date ? formatDate(row.date) : "—"}</TableCell>
                <TableCell className="text-sm">{row.href ? <Link href={`${base}/${row.href}`} className="hover:text-primary">{row.description}</Link> : row.description}</TableCell>
                <TableCell className="text-right tabular-nums">{row.charge ? money(row.charge) : ""}</TableCell>
                <TableCell className="text-right tabular-nums text-success">{row.payment ? money(row.payment) : ""}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(row.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p> : null}
      </Card>

      {dialog === "edit" ? <PartyDialog companyId={companyId} kind={party.kind} party={party} onClose={() => setDialog(null)} /> : null}
      {dialog === "pay" ? <MoneyEntryDialog companyId={companyId} kind={isCustomer ? "customer-receipt" : "supplier-payment"} partyId={party.id} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
