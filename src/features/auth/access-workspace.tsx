"use client";

import { ArrowRight, Check, CheckCircle2, Copy, KeyRound, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoAccounts, signInDemo } from "./demo-session";

type AccessView = "sign-in" | "register" | "recover";

export const AccessWorkspace = () => {
  const router = useRouter();
  const [view, setView] = useState<AccessView>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedEmail(address);
    } catch {
      toast.error("Could not copy the email address.");
    }
  };

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = signInDemo(email, password);
    if (!account) {
      setError("Use one of the demo accounts and the password shown below.");
      return;
    }
    setError("");
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next?.startsWith("/c/demo-company/") ? next : "/c/demo-company/home");
  };

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
          <h1 className="max-w-[13ch] text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white xl:text-6xl">
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
              <form className="mt-8 space-y-5" onSubmit={handleSignIn}>
                <label className="block text-sm font-semibold" htmlFor="email">Email address</label>
                <Input id="email" type="email" autoComplete="email" placeholder="owner@dotcode.demo" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <div className="flex items-end justify-between gap-4">
                  <label className="text-sm font-semibold" htmlFor="password">Password</label>
                  <button className="text-xs font-semibold text-muted-foreground hover:text-foreground" type="button" onClick={() => setView("recover")}>Recover access</button>
                </div>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
                <Button className="w-full" type="submit">Sign in <ArrowRight className="size-4" /></Button>
              </form>
              <div className="mt-7 rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-heading">Demo credentials</p>
                <p className="mt-1 text-xs text-muted-foreground">Password for every account: <strong>Demo123!</strong></p>
                <div className="mt-3 space-y-2">
                  {demoAccounts.map((account) => <div key={account.email} className="flex items-center gap-1 rounded-lg border bg-white p-1 transition-colors hover:border-primary">
                    <button type="button" aria-label={`Use ${account.email}`} onClick={() => { setEmail(account.email); setPassword("Demo123!"); setError(""); }} className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary"><span className="truncate font-semibold text-heading">{account.email}</span><span className="shrink-0 text-muted-foreground">{account.role === "Outlet Manager" ? account.locationId === "main-outlet" ? "Main Outlet" : "North Outlet" : account.role}</span></button>
                    <button type="button" aria-label={`Copy ${account.email}`} title={`Copy ${account.email}`} onClick={() => void handleCopyEmail(account.email)} className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-heading focus-visible:outline-2 focus-visible:outline-primary">{copiedEmail === account.email ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}</button>
                  </div>)}
                </div>
                <p className="sr-only" role="status">{copiedEmail ? `${copiedEmail} copied` : ""}</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Demo access is stored in this browser. It does not protect backend data.</p>
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
