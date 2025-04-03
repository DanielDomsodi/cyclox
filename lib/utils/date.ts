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
 * Gets a date range for the last N days
 * @param days - Number of days to look back
 * @returns Object with startDate and endDate as Date objects
 */
export function getLastNDaysRange(days: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate,
    endDate,
  };
}
