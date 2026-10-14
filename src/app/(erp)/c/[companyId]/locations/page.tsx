import type { Metadata } from "next";
import { LocationsWorkspace } from "@/features/locations/locations-workspace";

export const metadata: Metadata = {
  title: "Stores & Warehouses",
  description: "Manage retail outlets and central warehouses.",
};

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <LocationsWorkspace companyId={companyId} />;
}
