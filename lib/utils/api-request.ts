import { NextRequest } from 'next/server';
import { serverEnv } from '../env/server-env';
import { dateRangeSchema } from '../schemas/date';
import { formatYYYYMMDD } from './date';

/**
 * Extracts and validates date range parameters from a request
 * @param req Next.js request object
 * @returns Validated DateRange object
 */
export function parseDateRangeFromRequest(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const afterDate = searchParams.get('after_date');
  const beforeDate =
    searchParams.get('before_date') || formatYYYYMMDD(new Date());

  const dateRange = dateRangeSchema.parse({
    startDate: afterDate,
    endDate: beforeDate,
  });

  // Set the end date to the end of the day
  dateRange.endDate.setHours(23, 59, 59, 999);

  return dateRange;
}

/**
 * Validates if the request is authorized for cron operations
 * @param req Next.js request object
 * @returns Boolean indicating if request is authorized
 */
export function isAuthorizedCron(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  return (
    !!serverEnv.CRON_SECRET && authHeader === `Bearer ${serverEnv.CRON_SECRET}`
  );
}

/**
 * Checks if the request is for a dry run operation
 * @param req Next.js request object
 * @returns Boolean indicating if this is a dry run
 */
export function isDryRun(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  return searchParams.get('dry_run') === 'true';
}
