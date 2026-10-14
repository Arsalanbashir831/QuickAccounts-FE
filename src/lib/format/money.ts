export const formatMoney = (
  amount: string | number,
  currency = "PKR",
  locale = "en-PK",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
