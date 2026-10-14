import { scopeKey, siteKey } from "@/lib/query/keys";
import type { CompanyScope, LocationFilter } from "@/types/scope";

export type AccountFilters = Readonly<{
  location: LocationFilter;
  groupId: string | null;
  search: string;
  archived: boolean;
  cursor: string | null;
}>;

export const accountKeys = {
  root: (scope: CompanyScope) => [...scopeKey(scope), "accounts"] as const,
  list: (scope: CompanyScope, filters: AccountFilters) => [
    ...scopeKey(scope), "accounts", "list", siteKey(filters.location), filters.groupId,
    filters.search.trim(), filters.archived, filters.cursor,
  ] as const,
};
