import { z } from 'zod';
import {
  formatYYYYMMDD,
  fromUnixTimestamp,
  parseYYYYMMDD,
  toUnixTimestamp,
} from '../utils/date';

/**
 * Zod schema for a date in YYYY-MM-DD format
 */
export const dateYYYYMMDDSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .transform((dateStr) => parseYYYYMMDD(dateStr));

/**
 * Zod schema for a date range with YYYY-MM-DD strings
 */
export const dateRangeSchema = z
  .object({
    startDate: dateYYYYMMDDSchema,
    endDate: dateYYYYMMDDSchema.optional().nullable(),
  })
  .refine((data) => (data.endDate ? data.startDate <= data.endDate : true), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type DateRange = z.infer<typeof dateRangeSchema>;

/**
 * Zod schema for UNIX timestamp (as used by Strava API)
 */
export const unixTimestampSchema = z
  .number()
  .int()
  .transform((timestamp) => fromUnixTimestamp(timestamp));

/**
 * Transform Date to UNIX timestamp for Strava API requests
 */
export const dateToUnixTimestampSchema = z
  .date()
  .transform((date) => toUnixTimestamp(date));

/**
 * Transform Date to YYYY-MM-DD for our API
 */
export const dateToYYYYMMDDSchema = z
  .date()
  .transform((date) => formatYYYYMMDD(date));
