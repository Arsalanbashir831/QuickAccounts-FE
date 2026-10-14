import "server-only";

export const getDjangoOrigin = () => {
  const value = process.env.DJANGO_API_ORIGIN;
  if (!value) throw new Error("DJANGO_API_ORIGIN is not configured.");
  return new URL(value).origin;
};
