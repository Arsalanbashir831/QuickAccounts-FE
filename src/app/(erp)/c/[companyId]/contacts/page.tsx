import type { Metadata } from "next";
import { ContactsWorkspace } from "@/features/parties/contacts-workspace";
import { contactViews } from "@/features/parties/contact-views";
import { parseAllowedValue, type SearchQuery } from "@/lib/routing/view-state";

export const metadata: Metadata = { title: "Ledger" };

export default async function ContactsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<SearchQuery> }) {
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  return <ContactsWorkspace companyId={companyId} initialView={parseAllowedValue(query.view, contactViews.map((view) => view.value), "customers")} />;
}
