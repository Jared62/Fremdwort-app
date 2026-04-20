/**
 * Returns today's date string (YYYY-MM-DD) in the given timezone.
 */
export function getTodayInTz(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns the date string for N days before today in the given timezone.
 */
export function subtractDays(timezone: string, n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns the current hour (0–23) in the given timezone.
 */
export function getCurrentHourInTz(timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(new Date()),
    10
  );
}

/**
 * Adds N days to a date string (YYYY-MM-DD) and returns the new date string.
 */
export function addDaysToDate(dateStr: string, n: number): string {
  const date = new Date(dateStr + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
