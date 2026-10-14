"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <section className="max-w-md text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Dotcode needs a fresh start</h1>
            <p className="mt-3 text-muted-foreground">Your work was not intentionally submitted. Try loading this view again.</p>
            <Button className="mt-6" onClick={reset}>Try again</Button>
          </section>
        </main>
      </body>
    </html>
  );
}
