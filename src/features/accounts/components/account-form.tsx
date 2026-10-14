"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountFormSchema, type AccountFormValues } from "../schemas/account.schema";

type AccountFormProps = {
  groupId: string;
  groupLabel: string;
  purposeId: string;
  submitLabel: string;
};

export const AccountForm = ({ groupId, groupLabel, purposeId, submitLabel }: AccountFormProps) => {
  const inputId = useId();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", groupId, purposeId },
  });
  const nameError = form.formState.errors.name;

  const submit = form.handleSubmit(() => {
    toast.info("Account saving is waiting for a verified Django contract.");
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div><p className="text-xs font-bold uppercase tracking-[0.09em] text-muted-foreground">Selected group</p><p className="mt-1 text-sm font-semibold">{groupLabel}</p></div>
      <input type="hidden" {...form.register("groupId")} />
      <input type="hidden" {...form.register("purposeId")} />
      <div>
        <label className="text-sm font-semibold" htmlFor={inputId}>Account name</label>
        <Input className="mt-2" id={inputId} autoComplete="off" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${inputId}-error` : undefined} placeholder="e.g. Shop Cleaning" {...form.register("name")} />
        {nameError ? <p className="mt-1.5 text-xs text-destructive" id={`${inputId}-error`} role="alert">{nameError.message}</p> : null}
      </div>
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Saving…</> : submitLabel}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">This preview validates locally but never pretends a financial record was saved.</p>
    </form>
  );
};
