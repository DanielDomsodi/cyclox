/**
 * Converts a UNIX timestamp (seconds since epoch) to a JavaScript Date
 * @param timestamp - UNIX timestamp in seconds
 * @returns JavaScript Date object in UTC
 */
export function fromUnixTimestamp(timestamp: number): Date {
  // Multiply by 1000 to convert seconds to milliseconds
  return new Date(timestamp * 1000);
}

/**
 * Converts a JavaScript Date to a UNIX timestamp (seconds)
 * @param date - JavaScript Date object
 * @returns UNIX timestamp in seconds
 */
export function toUnixTimestamp(date: Date): number {
  // Divide by 1000 to convert milliseconds to seconds
  return Math.floor(date.getTime() / 1000);
}

/**
 * Formats a date as YYYY-MM-DD
 * @param date - JavaScript Date object
 * @returns Formatted date string
 */
export function formatYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a YYYY-MM-DD string to a Date object
 * @param dateString - Date in YYYY-MM-DD format
 * @returns JavaScript Date object (UTC midnight)
 */
export function parseYYYYMMDD(dateString: string): Date {
  // This ensures consistent UTC interpretation
  return new Date(`${dateString}T00:00:00.000Z`);
}

/**
 * Gets a date range relative to the current date
 * @param days - Number of days (negative for past, positive for future)
 * @param anchor - Optional reference date (defaults to current date)
 * @returns Object with startDate and endDate as Date objects
 */
export function getDateRange(
  days: number,
  anchor?: Date
): { startDate: Date; endDate: Date } {
  const referenceDate = anchor || new Date();

  if (days === 0) {
    return {
      startDate: new Date(referenceDate),
      endDate: new Date(referenceDate),
    };
  }

  // For consistency, always return with earlier date as startDate
  if (days < 0) {
    // Past range (e.g., last 7 days)
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() + days); // days is negative
    return { startDate, endDate: new Date(referenceDate) };
  } else {
    // Future range (e.g., next 7 days)
    const endDate = new Date(referenceDate);
    endDate.setDate(referenceDate.getDate() + days);
    return { startDate: new Date(referenceDate), endDate };
  }
}

export function getYesterday(date: Date): Date {
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate() - 1);
  return yesterday;
}
