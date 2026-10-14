import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export const Input = ({ className, ...props }: ComponentPropsWithRef<"input">) => (
  <input
    className={cn(
      "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-[0_1px_0_rgb(0_0_0/0.03)] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);
