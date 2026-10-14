export const companyRoute = (companyId: string, workspace: string) =>
  `/c/${encodeURIComponent(companyId)}/${workspace}`;

export const workspaceRoute = (
  companyId: string,
  workspace: string,
  view?: string,
) => {
  const path = companyRoute(companyId, workspace);
  return view ? `${path}?view=${encodeURIComponent(view)}` : path;
};
