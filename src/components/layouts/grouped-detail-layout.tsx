import type { ReactNode } from "react";

export const GroupedDetailLayout = ({ groups, list, detail }: { groups: ReactNode; list: ReactNode; detail?: ReactNode }) => (
  <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_20rem]">
    <aside>{groups}</aside><div>{list}</div>{detail ? <aside>{detail}</aside> : null}
  </div>
);
