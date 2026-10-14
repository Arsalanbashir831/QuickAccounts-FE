"use client";

import { useQuery } from "@tanstack/react-query";
import type { CompanyScope } from "@/types/scope";
import type { AccountsApi } from "../api/accounts.api";
import { accountKeys, type AccountFilters } from "../queries/account.keys";

export const useAccounts = (api: AccountsApi, scope: CompanyScope, filters: AccountFilters) =>
  useQuery({ queryKey: accountKeys.list(scope, filters), queryFn: ({ signal }) => api.list(scope, filters, signal) });
