import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="max-w-md text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">That record is not here</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-muted-foreground">
          It may have moved, or you may not have access to it in this company.
        </p>
        <Button asChild className="mt-6">
          <Link href="/access">Return to Access</Link>
        </Button>
      </section>
    </main>
  );
}
