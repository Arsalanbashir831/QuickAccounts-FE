import { RmaClaimsView } from "./rma-claims-view";

export const CustomerReturnsView = ({ companyId }: { companyId: string }) => <RmaClaimsView kind="customer" companyId={companyId} />;
