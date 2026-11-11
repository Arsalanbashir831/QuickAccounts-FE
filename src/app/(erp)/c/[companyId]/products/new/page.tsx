import type { Metadata } from "next";
import { StyleEditor } from "@/features/catalog/style-editor";

export const metadata: Metadata = { title: "Add style" };

export default async function NewStylePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <StyleEditor companyId={companyId} />;
}
