import type { CompanyScope } from "@/types/scope";
import type { AccountFilters } from "../queries/account.keys";
import type { AccountPage } from "../types/account.types";

export interface AccountsApi {
  list(scope: CompanyScope, filters: AccountFilters, signal?: AbortSignal): Promise<AccountPage>;
}

// Add the production adapter only after its Django method, path and pagination contract are verified.
