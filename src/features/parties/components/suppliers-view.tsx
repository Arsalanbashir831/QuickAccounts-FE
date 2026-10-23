"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SupplierRecord {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  city: string;
  paymentTerms: string;
  balanceOwed: number;
  activeOrders: number;
}

const mockSuppliers: SupplierRecord[] = [
  {
    id: "sup-1",
    name: "Mumtaz Distributors",
    contactPerson: "Mr. Mumtaz Qureshi",
    phone: "0300-4820192",
    city: "Karachi",
    paymentTerms: "Net 15 Days",
    balanceOwed: 1420000,
    activeOrders: 1,
  },
  {
    id: "sup-2",
    name: "Apex Importers",
    contactPerson: "Sohail Butt",
    phone: "0322-9182049",
    city: "Lahore",
    paymentTerms: "Net 30 Days",
    balanceOwed: 290000,
    activeOrders: 1,
  },
  {
    id: "sup-3",
    name: "TechWorld Distribution",
    contactPerson: "Haris Farooq",
    phone: "0345-1029384",
    city: "Dubai / Karachi",
    paymentTerms: "Advance / Immediate",
    balanceOwed: 0,
    activeOrders: 0,
  },
];

export const SuppliersView = ({ companyId }: { companyId: string }) => {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = mockSuppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Supplier Directory & Procurement Accounts</CardTitle>
          <CardDescription>
            Manage wholesale distributors, credit terms, and accounts payable
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search supplier..."
            className="pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Company</TableHead>
              <TableHead>Key Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Origin City</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Balance Owed (AP)</TableHead>
              <TableHead className="text-center">Active Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" tabIndex={0} onClick={() => router.push(`/c/${encodeURIComponent(companyId)}/contacts/suppliers/${encodeURIComponent(s.id)}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/c/${encodeURIComponent(companyId)}/contacts/suppliers/${encodeURIComponent(s.id)}`); }}>
                <TableCell className="font-semibold text-heading">{s.name}</TableCell>
                <TableCell className="text-xs">{s.contactPerson}</TableCell>
                <TableCell className="font-mono text-xs">{s.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.city}</TableCell>
                <TableCell className="text-xs font-semibold text-heading">{s.paymentTerms}</TableCell>
                <TableCell className="text-right font-mono font-bold text-heading">
                  {s.balanceOwed > 0 ? (
                    <span className="text-destructive">- ${s.balanceOwed.toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground">$0</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono font-bold">{s.activeOrders}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
