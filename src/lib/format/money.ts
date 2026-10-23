export const formatMoney = (
  amount: string | number,
  currency = "USD",
  locale = "en-US",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
