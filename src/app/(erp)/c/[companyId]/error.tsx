"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="grid min-h-[65vh] place-items-center">
      <div className="max-w-md text-center">
        <CircleAlert className="mx-auto size-7 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">This workspace could not load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">No command was automatically retried. Try loading the company context again.</p>
        <Button className="mt-5" onClick={reset}>Try again</Button>
      </div>
    </section>
  );
}
