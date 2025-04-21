import { prisma } from '@/lib/db/prisma';

function findUsersWithFitness() {
  return prisma.user.findMany({
    where: {
      fitness: {
        some: {},
      },
    },
  });
}

export const usersRepository = {
  findUsersWithFitness,
};
