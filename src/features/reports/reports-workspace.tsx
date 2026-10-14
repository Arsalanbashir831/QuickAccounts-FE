import { ProfitLossWorkspace } from "./profit-loss-workspace";
export { reportViews } from "./report-views";

export const ReportsWorkspace = (props: { companyId: string; initialView: string }) => {
  return <ProfitLossWorkspace companyId={props.companyId} />;
};
