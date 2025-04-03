import { FtpHistory } from '@prisma/client';

/**
 * Retrieves the effective FTP (Functional Threshold Power) value for a specific date
 * from a collection of FTP history entries.
 *
 * @param date - The date for which to find the applicable FTP value
 * @param ftpHistories - Array of FTP history entries
 * @returns The FTP value effective on the specified date, or null if no applicable value exists
 */
function getFtpForDate(date: Date, ftpHistories: FtpHistory[]): number | null {
  // Handle empty history
  if (ftpHistories.length === 0) {
    return null;
  }

  // Sort history by date (newest to oldest)
  const sortedHistory = [...ftpHistories].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
  );

  // Find the most recent FTP value that's less than or equal to the activity date
  for (const entry of sortedHistory) {
    if (entry.effectiveFrom <= date) {
      return entry.ftp;
    }
  }

  // If we get here, all FTP entries are newer than the activity date
  return null;
}

export const ftpHistoriesService = {
  getFtpForDate,
};
