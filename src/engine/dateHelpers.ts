/**
 * Returns the number of days remaining in the month for the given date (including today).
 * Minimum return value is 1 to avoid division by zero.
 */
export function daysRemainingInMonth(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  return Math.max(lastDay - currentDay + 1, 1);
}

/**
 * Returns the last day of the month as a Date.
 */
export function lastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns "YYYY-MM" string for a given date.
 */
export function yearMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Days between two dates (absolute).
 */
export function daysBetween(from: Date, to: Date): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diff = Math.abs(startOfTo.getTime() - startOfFrom.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Returns the start of day (midnight) for a given date.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parse an ISO date string "YYYY-MM-DD" to a Date object (local time).
 */
export function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as "YYYY-MM-DD".
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
