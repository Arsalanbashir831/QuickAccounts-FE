"use client";

import { CheckCircle2, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  balanceDue: number;
  creditTerm: string;
  status: "Active" | "Credit Hold";
}

const mockCustomers: CustomerRecord[] = [
  {
    id: "cust-1",
    name: "Apex Mobiles (Kashif)",
    phone: "0300-8492019",
    email: "kashif@apexmobiles.pk",
    city: "Lahore",
    totalOrders: 28,
    totalSpent: 3840000,
    balanceDue: 184500,
    creditTerm: "Net 30 days",
    status: "Active",
  },
  {
    id: "cust-2",
    name: "Hamza Electronics",
    phone: "0321-4458921",
    email: "hamza.elec@gmail.com",
    city: "Rawalpindi",
    totalOrders: 14,
    totalSpent: 1920000,
    balanceDue: 46750,
    creditTerm: "Net 15 days",
    status: "Active",
  },
  {
    id: "cust-3",
    name: "City Devices",
    phone: "0333-5591028",
    email: "citydevices@outlook.com",
    city: "Islamabad",
    totalOrders: 9,
    totalSpent: 780000,
    balanceDue: 28900,
    creditTerm: "Net 30 days",
    status: "Credit Hold",
  },
  {
    id: "cust-4",
    name: "Tariq Telecom",
    phone: "0345-9821034",
    email: "tariqtelecom@gmail.com",
    city: "Lahore",
    totalOrders: 42,
    totalSpent: 5610000,
    balanceDue: 0,
    creditTerm: "Due on receipt",
    status: "Active",
  },
];

export const CustomersView = ({ companyId }: { companyId: string }) => {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>(mockCustomers);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New customer form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("Lahore");
  const [newCreditTerm, setNewCreditTerm] = useState("Net 30 days");

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.city.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddCustomer = () => {
    if (!newName.trim()) return;
    const newCust: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: newName,
      phone: newPhone || "0300-0000000",
      email: `${newName.toLowerCase().replace(/\s+/g, "")}@example.com`,
      city: newCity,
      totalOrders: 0,
      totalSpent: 0,
      balanceDue: 0,
      creditTerm: newCreditTerm,
      status: "Active",
    };
    setCustomers([newCust, ...customers]);
    setShowAddModal(false);
    setNewName("");
    setNewPhone("");
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customer Directory & Accounts</CardTitle>
            <CardDescription>
              Maintain wholesale accounts, walk-in profiles, credit terms, and outstanding balances
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, or city..."
                className="pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Credit Terms</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" tabIndex={0} onClick={() => router.push(`/c/${encodeURIComponent(companyId)}/contacts/customers/${encodeURIComponent(c.id)}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/c/${encodeURIComponent(companyId)}/contacts/customers/${encodeURIComponent(c.id)}`); }}>
                  <TableCell className="font-semibold text-heading">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.city}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{c.totalOrders}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    PKR {c.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-heading">
                    {c.balanceDue > 0 ? (
                      <span className="text-success-foreground">+ PKR {c.balanceDue.toLocaleString()}</span>
                    ) : (
                      <span className="text-success">PKR 0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.creditTerm}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge tone={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex-row items-center justify-between border-b pb-3">
              <CardTitle>Register New Customer</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setShowAddModal(false)}
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-heading">Customer / Business Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Al-Madina Telecom"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-heading">Phone Number</label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-heading">City</label>
                  <Input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-heading">Credit Terms</label>
                <Input
                  value={newCreditTerm}
                  onChange={(e) => setNewCreditTerm(e.target.value)}
                  placeholder="e.g. Net 30 days"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddCustomer}>
                  <CheckCircle2 className="size-3.5" />
                  Save Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
