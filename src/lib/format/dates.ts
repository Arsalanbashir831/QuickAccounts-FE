export const formatBusinessDate = (value: string, locale = "en-PK") =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(`${value}T00:00:00+05:00`));
