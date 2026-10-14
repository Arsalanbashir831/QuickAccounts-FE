import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const tones = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success-foreground",
  warning: "bg-warning/14 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/12 text-info-foreground",
};

export const Badge = ({ className, tone = "neutral", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em]",
      tones[tone],
      className,
    )}
    {...props}
  />
);
