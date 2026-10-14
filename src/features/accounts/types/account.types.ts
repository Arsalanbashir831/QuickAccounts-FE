export type Account = Readonly<{
  id: string;
  groupId: string;
  name: string;
  purpose: string;
  code?: string;
  active: boolean;
  allowedActions: readonly string[];
}>;

export type AccountPage = Readonly<{
  items: readonly Account[];
  nextCursor: string | null;
}>;
