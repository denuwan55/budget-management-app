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

/**
 * Returns "YYYY-MM" of the cycle that contains `date`, given an anchor day.
 * Cycles are labeled by their start month (e.g., anchor=25, date=2026-05-10
 * → cycle started 2026-04-25 → returns "2026-04").
 */
export function cycleYearMonth(date: Date, anchorDay: number): string {
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth(); // 0-indexed
  if (day < anchorDay) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Returns the start Date of the cycle identified by yearMonth + anchorDay.
 */
export function cycleStartDate(yearMonth: string, anchorDay: number): Date {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, anchorDay);
}

/**
 * Returns the last Date (inclusive) of the cycle — the day before the next anchor.
 */
export function cycleEndDate(yearMonth: string, anchorDay: number): Date {
  const [year, month] = yearMonth.split('-').map(Number);
  // anchorDay - 1 of the next calendar month
  return new Date(year, month, anchorDay - 1);
}

/**
 * Days remaining in a cycle (inclusive of `date`). Minimum 1 to avoid division by zero.
 */
export function daysRemainingInCycle(date: Date, yearMonth: string, anchorDay: number): number {
  const end = cycleEndDate(yearMonth, anchorDay);
  const startOfDate = startOfDay(date);
  const startOfEnd = startOfDay(end);
  const diff = Math.round((startOfEnd.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 1);
}
