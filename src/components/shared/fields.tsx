import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-heading shadow-[0_1px_0_rgb(0_0_0/0.03)] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5 text-sm font-medium text-heading", className)}>
      <span className="block">{label}</span>
      {children}
      {error ? <span className="block text-xs font-normal text-destructive">{error}</span> : hint ? <span className="block text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const Select = ({ className, ...props }: ComponentPropsWithRef<"select">) => (
  <select className={cn(controlClass, "pr-8", className)} {...props} />
);

export const Textarea = ({ className, ...props }: ComponentPropsWithRef<"textarea">) => (
  <textarea className={cn(controlClass, "h-auto min-h-20 resize-y py-2", className)} {...props} />
);
