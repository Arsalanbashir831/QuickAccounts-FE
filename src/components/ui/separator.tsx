import { cn } from "@/lib/utils";

export const Separator = ({ className }: { className?: string }) => (
  <div aria-hidden="true" className={cn("h-px w-full bg-border", className)} />
);
