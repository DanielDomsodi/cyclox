import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

async function findMany(filter: Prisma.FtpHistoryWhereInput) {
  return prisma.ftpHistory.findMany({
    where: filter,
    orderBy: { createdAt: 'asc' },
  });
}

export const ftpHistoriesRepository = {
  findMany,
};
