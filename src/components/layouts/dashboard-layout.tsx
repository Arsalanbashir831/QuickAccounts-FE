import type { ReactNode } from "react";

export const DashboardLayout = ({ summary, main, aside }: { summary: ReactNode; main: ReactNode; aside: ReactNode }) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{summary}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
      <div className="space-y-6">{main}</div>
      <aside className="space-y-6">{aside}</aside>
    </div>
  </div>
);
