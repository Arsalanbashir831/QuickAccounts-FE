import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export const WorkspaceHeader = ({ eyebrow, title, description, action }: WorkspaceHeaderProps) => (
  <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold tracking-[-0.045em] text-heading sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
);
