import { prisma } from '@/lib/db/prisma';
import { serverEnv } from '@/lib/env/server-env';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

export async function GET(request: NextRequest) {
  console.log('Received Strava webhook validation request');
  const searchParams = request.nextUrl.searchParams;

  const validatedParams = subscriptionValidationRequestSchema.safeParse(
    Object.fromEntries(searchParams)
  );

  if (!validatedParams.success) {
    console.error(
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

  console.log(`Processing validation: mode=${mode}, challenge=${challenge}`);

  const isVerified =
    mode === 'subscribe' && token === serverEnv.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (isVerified) {
    console.log('Strava webhook validation successful');
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  } else {
    console.error('Strava webhook validation failed: token verification error');
    return NextResponse.json({ error: '403 Forbidden' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  console.log('Received Strava webhook event');

  try {
    const response = await request.json();
    console.log('Raw webhook payload:', JSON.stringify(response, null, 2));

    const validatedResponse = stravaWebhookSchema.safeParse(response);

    if (!validatedResponse.success) {
      console.error(
        'Invalid Strava webhook event',
        JSON.stringify(validatedResponse.error.format(), null, 2)
      );
      return NextResponse.json(
        { error: 'Invalid Strava webhook event' },
        { status: 400 }
      );
    }

    const { object_type, object_id, aspect_type, updates, owner_id } =
      validatedResponse.data;
    console.log(
      `Strava webhook event: type=${object_type}, id=${object_id}, action=${aspect_type}, owner=${owner_id}`
    );

    if (updates) {
      console.log('Event updates:', JSON.stringify(updates, null, 2));
    }

    if (updates?.['authorized'] === 'false') {
      console.log(
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
        console.log(
          `Successfully removed Strava connection for account ${object_id}`
        );
      } catch (error) {
        console.error(
          `Failed to remove Strava connection: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return NextResponse.json('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error(
      `Error processing Strava webhook: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
