export function defaultContractEndDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  const year = value("year") + 2;
  const month = value("month");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(value("day"), lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
