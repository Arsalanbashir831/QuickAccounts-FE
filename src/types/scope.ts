export type CompanyScope = Readonly<{
  userId: string;
  tenantId: string;
  companyId: string;
}>;

export type LocationFilter =
  | Readonly<{ kind: "all" }>
  | Readonly<{ kind: "site"; siteId: string }>;

export type TransactionSite = Readonly<{ siteId: string }>;
