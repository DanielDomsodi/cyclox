import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

async function findMany(filter: Prisma.ServiceConnectionWhereInput) {
  return prisma.serviceConnection.findMany({
    where: filter,
  });
}

async function findUnique(filter: Prisma.ServiceConnectionWhereUniqueInput) {
  return prisma.serviceConnection.findUnique({
    where: filter,
  });
}

export const connectionsRepository = {
  findMany,
  findUnique,
};
