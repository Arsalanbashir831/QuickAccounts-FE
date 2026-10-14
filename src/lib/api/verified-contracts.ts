import type { IntegrationStatus } from "./contract-types";

export const verifiedContracts = {
  sessionBootstrap: "needs-clarification",
  accountList: "needs-clarification",
  completeSale: "missing",
} satisfies Record<string, IntegrationStatus>;
