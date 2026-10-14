"use client";

import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccessView = "sign-in" | "register" | "recover";

export const AccessWorkspace = () => {
  const [view, setView] = useState<AccessView>("sign-in");

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative hidden overflow-hidden bg-[#0c0d0e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex items-center">
          <Image
            src="/dotcode-dark-theme.png"
            alt="Dotcode"
            width={140}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>
        <div className="relative max-w-xl">
          <Badge className="mb-6 bg-white/10 text-white/75">Foundation preview</Badge>
          <h1 className="max-w-[13ch] text-5xl font-semibold leading-[1.02]  tracking-[-0.055em] xl:text-6xl  ">
            Every sale, unit and payment stays connected.
          </h1>
          <p className="mt-6 max-w-[52ch] text-base leading-7 text-white/64">
            Run outlets, purchasing, inventory, warranty and accounts from one traceable workspace.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-5 border-t border-white/12 pt-6 text-sm text-white/66">
          <div><strong className="mb-1 block text-xl text-white">9</strong>Business workspaces</div>
          <div><strong className="mb-1 block text-xl text-white">1</strong>Company ledger</div>
          <div><strong className="mb-1 block text-xl text-white">0</strong>Duplicate posting</div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-card p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center lg:hidden">
            <Image
              src="/logo.png"
              alt="Dotcode"
              width={130}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>

          {view === "sign-in" ? (
            <>
              <KeyRound className="mb-5 size-6 text-muted-foreground" strokeWidth={1.7} />
              <h2 className="text-3xl font-semibold tracking-[-0.045em]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to your approved companies and outlets.</p>
              <form className="mt-8 space-y-5" onSubmit={(event) => event.preventDefault()}>
                <label className="block text-sm font-semibold" htmlFor="email">Email address</label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" />
                <div className="flex items-end justify-between gap-4">
                  <label className="text-sm font-semibold" htmlFor="password">Password</label>
                  <button className="text-xs font-semibold text-muted-foreground hover:text-foreground" type="button" onClick={() => setView("recover")}>Recover access</button>
                </div>
                <Input id="password" type="password" autoComplete="current-password" />
                <Button className="w-full" type="submit" disabled>Sign in <ArrowRight className="size-4" /></Button>
                <p className="text-center text-xs leading-5 text-muted-foreground">Sign-in remains disabled until the Django session contract is verified.</p>
              </form>
              <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />UI preview<span className="h-px flex-1 bg-border" /></div>
              <Button asChild className="w-full" variant="outline"><Link href="/c/demo-company/home">Open demo workspace</Link></Button>
              <p className="mt-7 text-center text-sm text-muted-foreground">New business? <button className="font-semibold text-foreground" type="button" onClick={() => setView("register")}>Request access</button></p>
            </>
          ) : null}

          {view === "register" ? (
            <>
              <ShieldCheck className="mb-5 size-6 text-muted-foreground" strokeWidth={1.7} />
              <h2 className="text-3xl font-semibold tracking-[-0.045em]">Create your business</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Registration and owner approval will follow the verified backend policy.</p>
              <div className="mt-8 space-y-4 rounded-xl border bg-background p-5">
                {["Identity and business details", "Administrator review, when required", "Guided company setup"].map((item) => <p key={item} className="flex gap-3 text-sm"><CheckCircle2 className="size-4 shrink-0 text-success" />{item}</p>)}
              </div>
              <Button className="mt-6 w-full" disabled>Continue registration</Button>
              <button className="mt-6 w-full text-sm font-semibold" type="button" onClick={() => setView("sign-in")}>Back to sign in</button>
            </>
          ) : null}

          {view === "recover" ? (
            <>
              <h2 className="text-3xl font-semibold tracking-[-0.045em]">Recover access</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your email. If it matches an account, recovery instructions will be sent.</p>
              <label className="mt-8 block text-sm font-semibold" htmlFor="recovery-email">Email address</label>
              <Input className="mt-2" id="recovery-email" type="email" autoComplete="email" />
              <Button className="mt-5 w-full" disabled>Send recovery instructions</Button>
              <button className="mt-6 w-full text-sm font-semibold" type="button" onClick={() => setView("sign-in")}>Back to sign in</button>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
};
