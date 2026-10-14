import { Badge } from "@/components/ui/badge";

const statusTone = {
  confirmed: "success",
  complete: "success",
  paid: "success",
  pending: "warning",
  partial: "warning",
  draft: "neutral",
  review: "info",
} as const;

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={statusTone[status.toLowerCase() as keyof typeof statusTone] ?? "neutral"}>{status}</Badge>
);
