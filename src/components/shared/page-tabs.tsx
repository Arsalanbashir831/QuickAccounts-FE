import Link from "next/link";
import { cn } from "@/lib/utils";

/** Link-based tabs so each view has its own URL (`?view=`). */
export function PageTabs({ tabs, active, hrefFor }: { tabs: ReadonlyArray<{ value: string; label: string; count?: number }>; active: string; hrefFor: (value: string) => string }) {
  return (
    <nav aria-label="Views" className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={hrefFor(tab.value)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3.5 text-sm font-semibold transition-colors",
              isActive ? "bg-secondary text-heading shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-heading",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className={cn("rounded-full px-1.5 text-[0.68rem] tabular-nums", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{tab.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Button-based segmented control for in-page filters. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1 rounded-lg border bg-card p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 shrink-0 rounded-md px-3 text-xs font-semibold transition-colors",
            option.value === value ? "bg-heading text-white" : "text-muted-foreground hover:bg-muted hover:text-heading",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
