import { z } from 'zod';
import { getUnixTime, lightFormat, parseISO } from 'date-fns';
import { utc, UTCDate } from '@date-fns/utc';

/**
 * Zod schema for a date in YYYY-MM-DD format
 */
export const dateYYYYMMDDSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in yyyy-MM-dd format')
  .transform((dateStr) => parseISO(dateStr, { in: utc }));

/**
 * Zod schema for a date range with YYYY-MM-DD strings
 */
export const dateRangeSchema = z
  .object({
    startDate: dateYYYYMMDDSchema,
    endDate: dateYYYYMMDDSchema
      .optional()
      .default(lightFormat(new UTCDate(), 'yyyy-MM-dd')),
  })
  .refine((data) => (data.endDate ? data.startDate <= data.endDate : true), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type DateRange = z.infer<typeof dateRangeSchema>;

/**
 * Transform Date to UNIX timestamp for Strava API requests
 */
export const dateToUnixTimestampSchema = z
  .date()
  .transform((date) => getUnixTime(date));

/**
 * Transform Date to YYYY-MM-DD for our API
 */
export const dateToYYYYMMDDSchema = z
  .date()
  .transform((date) => lightFormat(date, 'yyyy-MM-dd'));
