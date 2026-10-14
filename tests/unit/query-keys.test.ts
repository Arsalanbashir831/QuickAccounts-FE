import { describe, expect, it } from "vitest";
import { accountKeys, type AccountFilters } from "@/features/accounts/queries/account.keys";
import type { CompanyScope } from "@/types/scope";

describe("account query keys", () => {
  it("keeps tenant, company, location and filters in the cache identity", () => {
    const scope: CompanyScope = { userId: "user-1", tenantId: "tenant-1", companyId: "company-1" };
    const filters: AccountFilters = { location: { kind: "site", siteId: "outlet-1" }, groupId: "expenses", search: " rent ", archived: false, cursor: null };

    expect(accountKeys.list(scope, filters)).toEqual([
      "erp", "user-1", "tenant-1", "company-1", "accounts", "list", "outlet-1", "expenses", "rent", false, null,
    ]);
  });
});
