import type { ReactNode } from "react";

export const TransactionEditorLayout = ({ form, summary }: { form: ReactNode; summary: ReactNode }) => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div>{form}</div><aside>{summary}</aside>
  </div>
);
