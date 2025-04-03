import { z } from 'zod';

const activityStreamTypeEnum = z.enum([
  'time',
  'distance',
  'latlng',
  'altitude',
  'velocity_smooth',
  'heartrate',
  'cadence',
  'watts',
  'temp',
  'moving',
  'grade_smooth',
]);

export const stravaActivityStreamSchema = z.record(
  activityStreamTypeEnum,
  z.object({
    series_type: z.string(),
    data: z.array(z.number().nullable()),
    original_size: z.number(),
    resolution: z.string(),
  })
);

export type StravaActivityStream = z.infer<typeof stravaActivityStreamSchema>;

export const stravaActivitySchema = z.object({
  id: z.number().describe('Unique Strava activity ID'),
  name: z.string(),
  distance: z.number().describe('Meters'),
  moving_time: z.number().describe('Seconds'),
  elapsed_time: z.number().describe('Seconds'),
  total_elevation_gain: z.number(),
  type: z.string().describe('General type (e.g., Ride, Run)'),
  sport_type: z
    .string()
    .describe('More specific type (e.g., MountainBikeRide)'),
  start_date: z.string().describe('UTC date-time'),
  start_date_local: z.string().describe('Local date-time'),
  timezone: z.string(),
  utc_offset: z.number(),
  average_speed: z.number().describe('m/s'),
  max_speed: z.number().describe('m/s'),
  average_cadence: z.number().optional(),
  average_watts: z.number().optional(),
  weighted_average_watts: z.number().optional(),
  max_watts: z.number().optional(),
  kilojoules: z.number().optional(),
  average_heartrate: z.number().optional(),
  max_heartrate: z.number().optional(),
});

export type StravaActivity = z.infer<typeof stravaActivitySchema>;

export const transformedStravaActivitySchema = stravaActivitySchema.transform(
  (data) => ({
    source: 'strava',
    sourceId: data.id.toString(),
    name: data.name,
    distance: data.distance,
    movingTime: data.moving_time,
    elapsedTime: data.elapsed_time,
    elevationGain: data.total_elevation_gain,
    startDate: new Date(data.start_date),
    averageWatts: data.average_watts ? Math.floor(data.average_watts) : null,
    maxWatts: data.max_watts ? Math.floor(data.max_watts) : null,
    averageHR: data.average_heartrate
      ? Math.floor(data.average_heartrate)
      : null,
    maxHR: data.max_heartrate ? Math.floor(data.max_heartrate) : null,
    averageCadence: data.average_cadence
      ? Math.floor(data.average_cadence)
      : null,
    maxSpeed: data.max_speed ? Math.floor(data.max_speed) : null,
    averageSpeed: data.average_speed,
    kilojoules: data.kilojoules,
  })
);

export type TransformedStravaActivity = z.infer<
  typeof transformedStravaActivitySchema
>;
