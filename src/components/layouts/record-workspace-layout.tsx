import type { ReactNode } from "react";

export const RecordWorkspaceLayout = ({
  navigation,
  children,
  aside,
}: {
  navigation: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) => (
  <div className="space-y-5">
    {navigation}
    <div className={aside ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]" : undefined}>
      <div className="min-w-0">{children}</div>
      {aside ? <aside>{aside}</aside> : null}
    </div>
  </div>
);
