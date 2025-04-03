import { z } from 'zod';
import { Prisma } from '@prisma/client';

type ActivityType = Prisma.ActivityGetPayload<{}>;

export const activitySchema = z.object({
  id: z.number().int().positive(),
  sourceId: z.string().max(30),
  source: z.string().max(100),
  name: z.string(),
  startDate: z.date(),
  elapsedTime: z.number().int(),
  movingTime: z.number().int(),
  distance: z.number().nullable(),
  elevationGain: z.number().nullable(),
  calories: z.number().int().nullable(),
  averageWatts: z.number().int().nullable(),
  maxWatts: z.number().int().nullable(),
  normalizedPower: z.number().int().nullable(),
  trainingLoad: z.number().int().nullable(),
  averageHR: z.number().int().nullable(),
  maxHR: z.number().int().nullable(),
  hrLoad: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  averageSpeed: z.number().nullable(),
  maxSpeed: z.number().nullable(),
  kilojoules: z.number().nullable(),
  averageCadence: z.number().nullable(),
  userId: z.string().nullable(),
}) satisfies z.ZodType<ActivityType>;

export const activityProcessSchema = activitySchema.partial().required({
  sourceId: true,
  source: true,
  name: true,
  elapsedTime: true,
  movingTime: true,
  startDate: true,
});

export type ActivityProcess = z.infer<typeof activityProcessSchema>;
