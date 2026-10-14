import type { ReactNode } from "react";

export const ReportLayout = ({ filters, result }: { filters: ReactNode; result: ReactNode }) => (
  <div className="space-y-4"><div>{filters}</div><div>{result}</div></div>
);
