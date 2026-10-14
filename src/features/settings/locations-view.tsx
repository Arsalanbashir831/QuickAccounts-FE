"use client";

import { LocationsWorkspace } from "@/features/locations/locations-workspace";

export function LocationsView({ companyId }: { companyId: string }) {
  return <LocationsWorkspace companyId={companyId} />;
}
