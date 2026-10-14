"use client";

import { CheckCircle2, ClipboardCheck, History, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StockCountSession {
  id: string;
  sessionRef: string;
  location: string;
  date: string;
  auditor: string;
  expectedUnits: number;
  countedUnits: number;
  variance: number;
  status: "In Progress" | "Completed" | "Adjusted";
}

const mockSessions: StockCountSession[] = [
  {
    id: "cnt-1",
    sessionRef: "CNT-108",
    location: "Main Outlet",
    date: "08 Oct 2026",
    auditor: "Demo Owner",
    expectedUnits: 84,
    countedUnits: 84,
    variance: 0,
    status: "Completed",
  },
  {
    id: "cnt-2",
    sessionRef: "CNT-107",
    location: "Main Warehouse",
    date: "01 Oct 2026",
    auditor: "Staff Operator",
    expectedUnits: 250,
    countedUnits: 248,
    variance: -2,
    status: "Adjusted",
  },
];

export const StockCountsView = () => {
  const [search, setSearch] = useState("");

  const filtered = mockSessions.filter(
    (s) =>
      s.sessionRef.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Physical Stock Counts & Audits</CardTitle>
          <CardDescription>
            Conduct periodic physical inventory checks, verify variances, and record authorized adjustments
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search count session..."
              className="pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm">
            <Plus className="size-4" />
            Start Count Session
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit Session #</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Audit Date</TableHead>
              <TableHead>Counted By</TableHead>
              <TableHead className="text-center">Expected</TableHead>
              <TableHead className="text-center">Counted</TableHead>
              <TableHead className="text-center">Variance</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-mono font-bold text-primary">
                  {session.sessionRef}
                </TableCell>
                <TableCell className="font-semibold text-heading">{session.location}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{session.date}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{session.auditor}</TableCell>
                <TableCell className="text-center font-mono">{session.expectedUnits}</TableCell>
                <TableCell className="text-center font-mono font-bold">
                  {session.countedUnits}
                </TableCell>
                <TableCell className="text-center font-mono font-bold">
                  {session.variance === 0 ? (
                    <span className="text-success">0 (Exact)</span>
                  ) : (
                    <span className="text-destructive">{session.variance} units</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge tone={session.status === "Completed" ? "success" : "warning"}>
                    {session.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
