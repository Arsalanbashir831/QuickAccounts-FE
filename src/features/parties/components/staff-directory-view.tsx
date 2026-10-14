"use client";

import { CheckCircle2, Phone, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  outlet: string;
  phone: string;
  email: string;
  status: "Active" | "On Leave";
}

const mockStaff: StaffMember[] = [
  {
    id: "stf-1",
    name: "Demo Owner",
    role: "Company Owner / Admin",
    outlet: "All Locations",
    phone: "0300-1112233",
    email: "owner@dotcode.demo",
    status: "Active",
  },
  {
    id: "stf-2",
    name: "Muhammad Usman",
    role: "Sales Associate / Cashier",
    outlet: "Main Outlet",
    phone: "0321-9876543",
    email: "usman@dotcode.demo",
    status: "Active",
  },
  {
    id: "stf-3",
    name: "Bilal Ahmed",
    role: "Warehouse In-charge",
    outlet: "Main Warehouse",
    phone: "0333-4445566",
    email: "bilal@dotcode.demo",
    status: "Active",
  },
  {
    id: "stf-4",
    name: "Ali Hassan",
    role: "Hardware Technician",
    outlet: "Main Outlet",
    phone: "0345-2233445",
    email: "ali@dotcode.demo",
    status: "Active",
  },
];

export const StaffDirectoryView = () => {
  const [search, setSearch] = useState("");

  const filtered = mockStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.outlet.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Staff & Personnel Directory</CardTitle>
          <CardDescription>
            Assigned roles, store locations, and identity records for company personnel
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff or role..."
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
              <TableHead>Staff Name</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Assigned Outlet / Site</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold text-heading">{s.name}</TableCell>
                <TableCell className="text-xs font-medium text-heading">{s.role}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.outlet}</TableCell>
                <TableCell className="font-mono text-xs">{s.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                <TableCell className="text-center">
                  <Badge tone={s.status === "Active" ? "success" : "warning"}>{s.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
