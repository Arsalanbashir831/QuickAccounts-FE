import type { Metadata } from "next";
import { HomeWorkspace } from "@/features/home/home-workspace";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <HomeWorkspace companyId={companyId} />;
}
