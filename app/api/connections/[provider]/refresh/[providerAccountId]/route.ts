import { stravaService } from '@/lib/connections/strava/service';
import { prisma } from '@/lib/db/prisma';
import { isAuthorizedDev } from '@/lib/utils/api-request';
import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SUPPORTED_PROVIDERS = ['strava'] as const;
const providerSchema = z.enum(SUPPORTED_PROVIDERS);

const paramsSchema = z.object({
  provider: providerSchema,
  providerAccountId: z.string().min(1),
});

type Params = z.infer<typeof paramsSchema>;

export const POST = withBetterStack(
  async (req: BetterStackRequest, { params }: { params: Promise<Params> }) => {
    const LOG_PREFIX = '[DevConnectionsTokenRefresh]';

    if (!isAuthorizedDev(req)) {
      req.log.warn(`${LOG_PREFIX} Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validatedParams = paramsSchema.safeParse(await params);

    try {
      if (!validatedParams.success) {
        req.log.warn(
          `${LOG_PREFIX} Invalid parameters: ${validatedParams.error.message}`
        );
        return NextResponse.json(
          { error: 'Invalid parameters' },
          { status: 400 }
        );
      }

      const { provider, providerAccountId } = validatedParams.data;

      const connection = await prisma.serviceConnection.findFirst({
        where: { providerAccountId, provider },
      });

      if (!connection) {
        return NextResponse.json(
          { error: `No ${provider} connection found` },
          { status: 404 }
        );
      }

      let updatedConnection;

      switch (provider) {
        case 'strava':
          updatedConnection = await stravaService.refreshToken(connection);
          break;
        default:
          return NextResponse.json(
            { error: `Token refresh not implemented for ${provider}` },
            { status: 501 }
          );
      }

      req.log.info(
        `${LOG_PREFIX} Successfully refreshed token for provider account ${updatedConnection.providerAccountId}`
      );

      return NextResponse.json({
        message: 'Token refreshed successfully',
        access_token: updatedConnection.access_token,
        expires_at: updatedConnection.expires_at,
        provider_account_id: updatedConnection.providerAccountId,
      });
    } catch (error) {
      req.log.error(`${LOG_PREFIX} Error refreshing token:`, { error });

      return NextResponse.json(
        {
          error: 'Failed to refresh token',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
