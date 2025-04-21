import { Prisma } from '@prisma/client';
import { z } from 'zod';

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
