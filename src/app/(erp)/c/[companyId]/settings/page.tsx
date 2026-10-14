import type { Metadata } from "next";
import { SettingsWorkspace } from "@/features/settings/settings-workspace";
import { settingViews } from "@/features/settings/setting-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <SettingsWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, settingViews.map((view) => view.value), "business")} isSetup={query.mode === "setup"} />;
}
