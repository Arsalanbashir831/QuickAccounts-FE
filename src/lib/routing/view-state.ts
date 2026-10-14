export type SearchQuery = Record<string, string | string[] | undefined>;

export const parseAllowedValue = <TValue extends string>(
  value: SearchQuery[string],
  allowed: readonly TValue[],
  fallback: TValue,
): TValue => {
  if (typeof value !== "string") return fallback;
  return allowed.includes(value as TValue) ? (value as TValue) : fallback;
};
