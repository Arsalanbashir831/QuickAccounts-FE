import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";

export type RecordRow = Readonly<{ id: string; reference: string; party: string; context: string; amount: string; status: string }>;

export const RecordTable = ({ rows }: { rows: readonly RecordRow[] }) => (
  <Table>
    <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Party</TableHead><TableHead>Context</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell className="font-semibold">{row.reference}</TableCell>
          <TableCell>{row.party}</TableCell>
          <TableCell className="text-muted-foreground">{row.context}</TableCell>
          <TableCell className="numeric text-right font-semibold">{row.amount}</TableCell>
          <TableCell><StatusBadge status={row.status} /></TableCell>
          <TableCell><Button aria-label={`Actions for ${row.reference}`} size="icon" variant="ghost"><MoreHorizontal className="size-4" /></Button></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
