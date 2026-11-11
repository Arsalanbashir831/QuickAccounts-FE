import type { Metadata } from "next";
import { StyleDetails } from "@/features/catalog/style-details";

export const metadata: Metadata = { title: "Style" };

export default async function StylePage({ params }: { params: Promise<{ companyId: string; styleId: string }> }) {
  const { companyId, styleId } = await params;
  return <StyleDetails companyId={companyId} styleId={decodeURIComponent(styleId)} />;
}
