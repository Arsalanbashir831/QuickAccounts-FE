export const formatQuantity = (value: string | number, maximumFractionDigits = 3) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits }).format(Number(value));
