import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, note, icon: Icon, tone = "neutral", href }: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "danger" | "info" | "neutral";
  href?: string;
}) {
  const accent = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/12 text-info",
    neutral: "bg-muted text-muted-foreground",
  }[tone];
  const content = (
    <Card className={cn("h-full p-4 sm:p-5", href && "transition-colors hover:border-primary/40")}>
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", accent)}><Icon className="size-4" aria-hidden="true" /></span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="numeric mt-3 text-2xl font-semibold tracking-tight text-heading">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">{content}</Link> : content;
}
