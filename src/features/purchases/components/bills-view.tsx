"use client";

import { ArrowUpRight, CheckCircle2, DollarSign, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SupplierBill {
  id: string;
  billNumber: string;
  supplier: string;
  matchedGRN: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: "Paid" | "Partial" | "Unpaid";
}

const mockBills: SupplierBill[] = [
  {
    id: "b-1",
    billNumber: "BILL-0941",
    supplier: "Mumtaz Distributors",
    matchedGRN: "GRN-0192",
    date: "08 Oct 2026",
    dueDate: "22 Oct 2026",
    amount: 1420000,
    paid: 0,
    balance: 1420000,
    status: "Unpaid",
  },
  {
    id: "b-2",
    billNumber: "BILL-0940",
    supplier: "TechWorld Distribution",
    matchedGRN: "GRN-0191",
    date: "05 Oct 2026",
    dueDate: "19 Oct 2026",
    amount: 2150000,
    paid: 2150000,
    balance: 0,
    status: "Paid",
  },
  {
    id: "b-3",
    billNumber: "BILL-0939",
    supplier: "Apex Importers",
    matchedGRN: "GRN-0190",
    date: "02 Oct 2026",
    dueDate: "16 Oct 2026",
    amount: 590000,
    paid: 300000,
    balance: 290000,
    status: "Partial",
  },
];

export const BillsView = () => {
  const [search, setSearch] = useState("");

  const filtered = mockBills.filter(
    (b) =>
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.supplier.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Supplier Bills (Payables)</CardTitle>
          <CardDescription>
            Audit supplier invoices matched against confirmed goods receipts
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bill or supplier..."
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
              <TableHead>Bill Reference</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Matched GRN</TableHead>
              <TableHead>Bill Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total Owed</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-mono font-bold text-primary">
                  {bill.billNumber}
                </TableCell>
                <TableCell className="font-semibold text-heading">{bill.supplier}</TableCell>
                <TableCell className="font-mono text-xs">{bill.matchedGRN}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{bill.date}</TableCell>
                <TableCell className="text-xs font-semibold text-heading">{bill.dueDate}</TableCell>
                <TableCell className="text-right font-mono font-bold text-heading">
                  ${bill.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {bill.balance > 0 ? (
                    <span className="font-bold text-destructive">
                      ${bill.balance.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">$0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    tone={
                      bill.status === "Paid"
                        ? "success"
                        : bill.status === "Partial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {bill.balance > 0 ? (
                    <Button size="sm" className="text-xs font-semibold">
                      <ArrowUpRight className="size-3" />
                      Pay Bill
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Settled</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
