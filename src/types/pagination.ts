export type CursorPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
}>;
