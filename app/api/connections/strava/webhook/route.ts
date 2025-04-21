import { activitiesSyncService } from '@/lib/activities/services';
import { prisma } from '@/lib/db/prisma';
import { serverEnv } from '@/lib/env/server-env';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectionsRepository } from '../../services';
import { activitiesRepository } from '@/lib/activities/repository';
import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { stravaActivityUpdateSchema } from '@/lib/connections/strava/schemas/activities';

/**
 * Strava webhook example:
 * https://developers.strava.com/docs/webhookexample/
 */

const stravaWebhookSchema = z.object({
  object_type: z.enum(['activity', 'athlete']),
  object_id: z.number().int().positive(), // For activity events, the activity's ID. For athlete events, the athlete's ID.
  aspect_type: z.enum(['create', 'update', 'delete']),
  updates: z.record(z.string()).optional(),
  owner_id: z.number().int().positive(),
  subscription_id: z.number().int().positive(),
  event_time: z.number().int().positive(),
});

const subscriptionValidationRequestSchema = z.object({
  'hub.mode': z.enum(['subscribe']),
  'hub.challenge': z.string().nonempty(),
  'hub.verify_token': z.string().nonempty(),
});

export const GET = withBetterStack(async (request: BetterStackRequest) => {
  request.log.info('Received Strava webhook validation request');
  const searchParams = request.nextUrl.searchParams;

  const validatedParams = subscriptionValidationRequestSchema.safeParse(
    Object.fromEntries(searchParams)
  );

  if (!validatedParams.success) {
    request.log.error(
      'Invalid subscription validation request',
      validatedParams.error
    );
    return NextResponse.json(
      { error: 'Invalid subscription validation request' },
      { status: 400 }
    );
  }

  const mode = validatedParams.data['hub.mode'];
  const token = validatedParams.data['hub.verify_token'];
  const challenge = validatedParams.data['hub.challenge'];

  request.log.info(
    `Processing validation: mode=${mode}, challenge=${challenge}`
  );

  const isVerified =
    mode === 'subscribe' && token === serverEnv.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (isVerified) {
    request.log.info('Strava webhook validation successful');
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  } else {
    request.log.error(
      'Strava webhook validation failed: token verification error'
    );
    return NextResponse.json({ error: '403 Forbidden' }, { status: 403 });
  }
});

/* TODO: Implement the missing event types
 - Improve error handling
 - Add logging for all events
*/

export const POST = withBetterStack(async (request: BetterStackRequest) => {
  request.log.info('Received Strava webhook event');

  try {
    const response = await request.json();
    request.log.info('Raw webhook payload:', {
      data: JSON.stringify(response, null, 2),
    });

    const validatedResponse = stravaWebhookSchema.safeParse(response);

    if (!validatedResponse.success) {
      request.log.error('Invalid Strava webhook event', {
        message: JSON.stringify(validatedResponse.error.format(), null, 2),
      });
      return NextResponse.json(
        { error: 'Invalid Strava webhook event' },
        { status: 400 }
      );
    }

    const { object_type, object_id, aspect_type, updates, owner_id } =
      validatedResponse.data;
    request.log.info(
      `Strava webhook event: type=${object_type}, id=${object_id}, action=${aspect_type}, owner=${owner_id}`
    );

    if (updates) {
      request.log.info('Event updates:', {
        data: JSON.stringify(updates, null, 2),
      });
    }

    if (updates?.['authorized'] === 'false') {
      request.log.info(
        `Deauthorization detected for Strava account ${object_id}, removing connection`
      );
      try {
        await prisma.serviceConnection.delete({
          where: {
            provider_providerAccountId: {
              provider: 'strava',
              providerAccountId: object_id.toString(),
            },
          },
        });
        request.log.info(
          `Successfully removed Strava connection for account ${object_id}`
        );
      } catch (error) {
        request.log.error(
          `Failed to remove Strava connection: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (aspect_type === 'create' && object_type === 'activity') {
      const connection = await connectionsRepository.findUnique({
        provider_providerAccountId: {
          provider: 'strava',
          providerAccountId: owner_id.toString(),
        },
      });

      if (!connection) {
        request.log.error(
          `No Strava connection found for account ${owner_id}, skipping sync`
        );
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 400 }
        );
      }

      try {
        const userId = connection?.userId;

        if (!userId) {
          request.log.error(
            `No user ID found for Strava account ${object_id}, skipping sync`
          );

          return NextResponse.json(
            { error: 'User ID not found' },
            { status: 400 }
          );
        }

        await activitiesSyncService.syncActivity(userId, String(object_id));
        request.log.info(
          `Successfully processed Strava activity creation for user ${userId}`
        );
      } catch (error) {
        request.log.error(
          `Error processing Strava activity creation: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (aspect_type === 'delete' && object_type === 'activity') {
      try {
        const deletedActivity = await activitiesRepository.deleteBySourceId(
          String(object_id)
        );

        if (deletedActivity) {
          request.log.info(
            `Successfully deleted Strava activity with ID ${object_id}`
          );
        } else {
          request.log.warn(
            `No activity found with source ID ${object_id}, nothing to delete`
          );
        }
      } catch (error) {
        request.log.error(
          `Error processing Strava activity deletion: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (aspect_type === 'update' && object_type === 'activity') {
      const validatedUpdates = stravaActivityUpdateSchema.parse(updates);
      try {
        const updatedActivity = await activitiesRepository.updateBySourceId(
          String(object_id),
          { name: validatedUpdates.title }
        );

        if (updatedActivity) {
          request.log.info(
            `Successfully updated Strava activity with ID ${object_id}`
          );
        } else {
          request.log.warn(
            `No activity found with source ID ${object_id}, nothing to update`
          );
        }
      } catch (error) {
        request.log.error(
          `Error processing Strava activity update: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return NextResponse.json('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    request.log.error(
      `Error processing Strava webhook: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
