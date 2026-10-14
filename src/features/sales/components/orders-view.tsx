"use client";

import { ArrowRight, CheckCircle2, Clock, FileCheck, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderRecord {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  type: "Quotation" | "Sales Order";
  itemsCount: number;
  total: number;
  status: "Draft" | "Confirmed" | "Partially Delivered" | "Fulfilled";
}

const mockOrders: OrderRecord[] = [
  {
    id: "ord-1",
    orderNumber: "SO-0419",
    date: "08 Oct 2026",
    customer: "Apex Mobiles",
    type: "Sales Order",
    itemsCount: 5,
    total: 312000,
    status: "Partially Delivered",
  },
  {
    id: "ord-2",
    orderNumber: "QT-0112",
    date: "07 Oct 2026",
    customer: "Prime Traders",
    type: "Quotation",
    itemsCount: 12,
    total: 840000,
    status: "Confirmed",
  },
  {
    id: "ord-3",
    orderNumber: "SO-0418",
    date: "06 Oct 2026",
    customer: "City Devices",
    type: "Sales Order",
    itemsCount: 3,
    total: 145000,
    status: "Draft",
  },
  {
    id: "ord-4",
    orderNumber: "QT-0111",
    date: "04 Oct 2026",
    customer: "Hamza Electronics",
    type: "Quotation",
    itemsCount: 8,
    total: 490000,
    status: "Fulfilled",
  },
];

export const OrdersView = () => {
  const [search, setSearch] = useState("");

  const filtered = mockOrders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Quotes & Sales Orders</CardTitle>
          <CardDescription>
            Manage quotations, customer commitments, and staged deliveries
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order or party..."
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
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-center">Fulfillment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono font-bold text-primary">
                  {order.orderNumber}
                </TableCell>
                <TableCell className="font-semibold text-heading">{order.customer}</TableCell>
                <TableCell>
                  <Badge tone={order.type === "Sales Order" ? "neutral" : "info"} className="text-[10px]">
                    {order.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{order.date}</TableCell>
                <TableCell className="text-xs font-semibold">{order.itemsCount} units</TableCell>
                <TableCell className="text-right font-mono font-bold text-heading">
                  PKR {order.total.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    tone={
                      order.status === "Fulfilled"
                        ? "success"
                        : order.status === "Partially Delivered"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="text-xs">
                    {order.type === "Quotation" ? "Convert" : "Fulfill"}
                    <ArrowRight className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
