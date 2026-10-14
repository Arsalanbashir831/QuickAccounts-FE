import { RmaClaimsView } from "./rma-claims-view";

export const SupplierClaimsView = ({ companyId }: { companyId: string }) => <RmaClaimsView kind="supplier" companyId={companyId} />;
