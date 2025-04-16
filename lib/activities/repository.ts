import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ActivityProcess } from './schemas';

async function findMany(
  filter: Prisma.ActivityFindManyArgs,
  select: Prisma.ActivitySelect
) {
  return prisma.activity.findMany({
    ...filter,
    select,
  });
}

async function findExistingActivityIdsBySource(
  sourceIds: string[],
  source?: string
) {
  return prisma.activity.findMany({
    where: {
      sourceId: { in: sourceIds },
      source,
    },
    select: { sourceId: true },
  });
}

async function createMany(activities: ActivityProcess[]) {
  return prisma.activity.createMany({
    data: activities,
    skipDuplicates: true,
  });
}

async function create(activity: ActivityProcess) {
  return prisma.activity.create({
    data: activity,
  });
}

async function deleteBySourceId(sourceId: string) {
  return prisma.activity.delete({
    where: { sourceId },
  });
}

async function updateActivityBySource(
  activity: ActivityProcess,
  source?: string
) {
  return prisma.activity.update({
    where: { sourceId: activity.sourceId, source },
    data: activity,
  });
}

export const activitiesRepository = {
  findMany,
  createMany,
  create,
  deleteBySourceId,
  findExistingActivityIdsBySource,
  updateActivityBySource,
};
