import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RecordTable, type RecordRow } from "@/components/shared/records/record-table";
import { cn } from "@/lib/utils";

export type WorkspaceView = Readonly<{ value: string; label: string }>;

type WorkspaceScaffoldProps = {
  companyId: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  views: readonly WorkspaceView[];
  activeView: string;
  actionLabel: string;
  records: readonly RecordRow[];
  metricLabels?: readonly [string, string, string];
};

export const WorkspaceScaffold = ({ companyId, slug, title, eyebrow, description, views, activeView, actionLabel, records, metricLabels = ["Open work", "Needs attention", "Completed today"] }: WorkspaceScaffoldProps) => (
  <div className="workspace-enter">
    <WorkspaceHeader eyebrow={eyebrow} title={title} description={description} action={<Button><Plus className="size-4" />{actionLabel}</Button>} />
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label={`${title} views`}>
      {views.map((view) => (
        <Button key={view.value} asChild size="sm" variant={activeView === view.value ? "secondary" : "ghost"} className={cn("shrink-0", activeView === view.value && "shadow-sm")}>
          <Link href={`/c/${companyId}/${slug}?view=${view.value}`} role="tab" aria-selected={activeView === view.value}>{view.label}</Link>
        </Button>
      ))}
    </div>
    <div className="mb-5 grid gap-4 md:grid-cols-3">
      {metricLabels.map((label, index) => (
        <Card key={label}>
          <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><div className="flex items-end justify-between gap-3"><CardTitle className="numeric text-3xl tracking-[-0.045em]">{["24", "5", "18"][index]}</CardTitle>{index === 1 ? <Badge tone="warning">Review</Badge> : <span className="text-xs text-muted-foreground">Current scope</span>}</div></CardHeader>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>{views.find((view) => view.value === activeView)?.label ?? title}</CardTitle><CardDescription>Records for Main Outlet · demo fixtures</CardDescription></div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" aria-label="Search records" placeholder="Search reference or party" /></div>
      </CardHeader>
      <CardContent className="p-0"><RecordTable rows={records} /></CardContent>
      <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground"><span>Showing {records.length} fixture records</span><Button size="sm" variant="ghost">View all <ArrowRight className="size-3.5" /></Button></div>
    </Card>
  </div>
);
