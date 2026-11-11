"use client";

import { X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "lg" | "xl";
  /** When set, the body is a form and Enter submits it. */
  onSubmit?: () => void;
}

/** Modal dialog built on the native <dialog> element (focus trap and Esc handled by the browser). */
export function FormDialog({ eyebrow, title, description, icon: Icon, onClose, children, footer, size = "md", onSubmit }: FormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  const body = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t bg-muted/25 px-5 py-4 sm:px-7">{footer}</footer>
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-heading/65 backdrop:backdrop-blur-sm",
        size === "md" ? "max-w-xl" : size === "lg" ? "max-w-3xl" : "max-w-5xl",
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start gap-4 border-b bg-muted/35 px-5 py-5 sm:px-7">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            {eyebrow ? <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-primary">{eyebrow}</p> : null}
            <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight text-heading">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 max-w-lg text-sm leading-5 text-muted-foreground">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X className="size-5" /></Button>
        </header>
        {onSubmit ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(); }} noValidate>
            {body}
          </form>
        ) : body}
      </div>
    </dialog>
  );
}
