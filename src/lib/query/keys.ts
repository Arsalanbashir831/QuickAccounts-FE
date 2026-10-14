import type { CompanyScope, LocationFilter } from "@/types/scope";

export const scopeKey = (scope: CompanyScope) =>
  ["erp", scope.userId, scope.tenantId, scope.companyId] as const;

export const siteKey = (location: LocationFilter) =>
  location.kind === "all" ? "all" : location.siteId;
