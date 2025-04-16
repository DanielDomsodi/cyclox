import { z } from 'zod';
import { Prisma } from '@prisma/client';

type ActivityType = Prisma.ActivityGetPayload<Record<string, unknown>>;

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

export const transformedActivityForFitnessCalculationSchema =
  activitySchema.transform((activity) => ({}));

type FitnessType = Prisma.FitnessGetPayload<Record<string, unknown>>;

export const fitnessSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  date: z.date(),
  fitness: z.number().int().nullable(),
  fatigue: z.number().int().nullable(),
  form: z.number().int().nullable(),
  acwr: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<FitnessType>;

export const fitnessProcessSchema = fitnessSchema.partial().required({
  date: true,
  fitness: true,
  fatigue: true,
  form: true,
  acwr: true,
});

export type FitnessProcess = z.infer<typeof fitnessProcessSchema>;
