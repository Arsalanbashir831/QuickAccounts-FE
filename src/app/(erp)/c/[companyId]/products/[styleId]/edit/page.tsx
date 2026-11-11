import type { Metadata } from "next";
import { StyleEditor } from "@/features/catalog/style-editor";

export const metadata: Metadata = { title: "Edit style" };

export default async function EditStylePage({ params }: { params: Promise<{ companyId: string; styleId: string }> }) {
  const { companyId, styleId } = await params;
  return <StyleEditor key={styleId} companyId={companyId} styleId={decodeURIComponent(styleId)} />;
}
