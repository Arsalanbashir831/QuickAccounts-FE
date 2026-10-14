import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const groups = ["Bank and Cash", "Customers Owe Us", "Stock and Other Assets", "Amounts We Owe", "Income", "Cost of Products Sold", "Expenses", "Owner Funds", "Taxes"];

export const AccountGroupTree = ({ selected = "Expenses" }: { selected?: string }) => (
  <nav aria-label="Account groups" className="rounded-xl border bg-card p-2">
    <p className="px-3 pb-2 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Account groups</p>
    {groups.map((group) => <button key={group} className={cn("flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium hover:bg-muted", selected === group && "bg-secondary font-semibold")} type="button"><span>{group}</span><ChevronRight className="size-3.5 text-muted-foreground" /></button>)}
  </nav>
);
