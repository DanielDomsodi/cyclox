import { prisma } from '@lib/db/prisma';

async function getActiveConnections() {
  const connections = await prisma.serviceConnection.findMany();

  return connections.map((c) => c.provider);
}

export const connectionsService = {
  getActiveConnections,
};
