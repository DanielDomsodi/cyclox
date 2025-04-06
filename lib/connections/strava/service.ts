import { serverEnv } from '@/lib/env/server-env';
import { prisma } from '@/lib/db/prisma';
import { getApiUrl, serializeQueryParams } from '@/lib/utils/urls';
import { ServiceConnection } from '@prisma/client';
import {
  StravaAuthToken,
  stravaAuthTokenSchema,
  StravaRefreshToken,
  stravaRefreshTokenSchema,
} from './schemas/auth';
import { api } from '@/lib/api/api-client';
import { BASE_STRAVA_API_URL, fetchStravaApi, STRAVA_RATE_LIMIT } from './api';
import {
  StravaActivitiesParams,
  StravaActivityStreamParams,
} from './types/activities';
import {
  StravaActivity,
  stravaActivitySchema,
  StravaActivityStream,
  stravaActivityStreamSchema,
} from './schemas/activities';
import { z } from 'zod';

function createAuthUrl() {
  const redirectUri = getApiUrl('/connections/strava/callback');
  const scope = 'read_all,activity:read_all,profile:read_all';

  const url = new URL(`${BASE_STRAVA_API_URL}/oauth/authorize`);
  url.searchParams.set('client_id', serverEnv.STRAVA_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', scope);

  return url.toString();
}

async function getToken(userId: string) {
  const connection = await prisma.serviceConnection.findFirst({
    where: { userId, provider: 'strava' },
  });

  if (!connection) {
    throw new Error('No Strava connection found.');
  }

  // Add a 5-minute buffer to token expiration to avoid latency issues
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);

  if (
    !connection.access_token ||
    expiresAt.getTime() - now.getTime() <= bufferTime
  ) {
    const updatedConnection = await refreshToken(connection);
    return updatedConnection.access_token;
  }

  return connection.access_token;
}

async function refreshToken(connection: ServiceConnection) {
  const refreshToken = connection.refresh_token;

  if (!refreshToken) {
    throw new Error('No refresh token found for Strava connection.');
  }

  const data = await exchangeStravaToken('refresh_token', {
    refresh_token: refreshToken,
  });

  const updatedConnection = await prisma.serviceConnection.update({
    where: {
      provider_providerAccountId: {
        provider: connection.provider,
        providerAccountId: connection.providerAccountId,
      },
    },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(data.expires_at * 1000),
    },
  });

  return updatedConnection;
}

async function connect(userId: string, code: string) {
  const response = await exchangeStravaToken('authorization_code', { code });
  const createdConnection = await saveStravaConnection(response, userId);

  return createdConnection;
}

async function revoke(userId: string) {
  const connection = await prisma.serviceConnection.findFirst({
    where: { userId, provider: 'strava' },
  });

  if (!connection) {
    throw new Error('No Strava connection found.');
  }

  const accessToken = connection.access_token;

  if (!accessToken) {
    throw new Error('No access token found for Strava connection.');
  }

  const url = `${BASE_STRAVA_API_URL}/oauth/deauthorize`;
  await api.post(
    url,
    { access_token: accessToken },
    { contentType: 'urlencoded' }
  );

  const deletedConnection = await prisma.serviceConnection.delete({
    where: {
      provider_providerAccountId: {
        provider: connection.provider,
        providerAccountId: connection.providerAccountId,
      },
    },
  });

  return deletedConnection;
}

async function exchangeStravaToken<
  T extends 'authorization_code' | 'refresh_token'
>(
  grantType: T,
  additionalPayload: Record<string, unknown>
): Promise<
  T extends 'authorization_code' ? StravaAuthToken : StravaRefreshToken
> {
  const url = `${BASE_STRAVA_API_URL}/oauth/token`;

  try {
    const response = await api.post(
      url,
      {
        client_id: serverEnv.STRAVA_CLIENT_ID,
        client_secret: serverEnv.STRAVA_CLIENT_SECRET,
        grant_type: grantType,
        ...additionalPayload,
      },
      { contentType: 'urlencoded' }
    );

    if (!response.success) {
      throw new Error(`Strava OAuth request failed: ${response.error}`);
    }

    const data = await response.data;

    if (grantType === 'refresh_token') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return stravaRefreshTokenSchema.parse(data) as any;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stravaAuthTokenSchema.parse(data) as any;
  } catch (error) {
    console.error('Error sending Strava OAuth request:', error);
    throw new Error('Failed to send Strava OAuth request');
  }
}

async function saveStravaConnection(data: StravaAuthToken, userId: string) {
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresAt = new Date(data.expires_at * 1000);

  return prisma.serviceConnection.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'strava',
        providerAccountId: data.athlete.id.toString(),
      },
    },
    update: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    },
    create: {
      provider: 'strava',
      providerAccountId: data.athlete.id.toString(),
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

async function getAthlete(userId: string) {
  const token = await getToken(userId);
  return await fetchStravaApi('/athlete', token);
}

async function getActivityStream(
  userId: string,
  activityId: number,
  params: StravaActivityStreamParams = {
    keys: ['watts', 'heartrate'],
    key_by_type: true,
  }
) {
  const token = await getToken(userId);
  const query = serializeQueryParams(params);
  const url = `/activities/${activityId}/streams?${query.toString()}`;

  const response = await fetchStravaApi<StravaActivityStream>(url, token);

  return stravaActivityStreamSchema.parse(response);
}

async function getActivities(userId: string, params: StravaActivitiesParams) {
  const token = await getToken(userId);
  const query = serializeQueryParams(params);
  const url = `/athlete/activities?${query.toString()}`;

  const response = await fetchStravaApi<StravaActivity[]>(url, token).then(
    (activities) =>
      activities.filter(
        (activity) =>
          activity.type === 'Ride' || activity.type === 'VirtualRide'
      )
  );

  return z.array(stravaActivitySchema).parse(response);
}

async function getActivity(userId: string, id: string) {
  const token = await getToken(userId);
  const url = `/activities/${id}?include_all_efforts=false`;

  const response = await fetchStravaApi<StravaActivity>(url, token);

  return stravaActivitySchema.parse(response);
}

// TODO: Extend this to support query params
async function getActivityStreams(userId: string, activityIds: number[]) {
  const results: Record<string, StravaActivityStream | null> = {};
  const failedIds: number[] = [];

  // Process in batches to respect rate limits
  for (
    let i = 0;
    i < activityIds.length;
    i += STRAVA_RATE_LIMIT.requestsPerBatch
  ) {
    const batchIds = activityIds.slice(
      i,
      i + STRAVA_RATE_LIMIT.requestsPerBatch
    );

    // Use Promise.allSettled to handle individual request failures
    const batchPromises = batchIds.map((id) =>
      getActivityStream(userId, id).catch((error) => {
        // TODO: Handle properly the 'Resource not found' error
        /**
         * Returns null for 'Resource Not Found' errors as this is valid in our app
         * (activity may have been deleted on Strava).
         * Other errors are logged and rethrown.
         */
        if (error instanceof Error) {
          if (error.message.includes('Resource Not Found')) {
            console.warn(
              `Activity stream not found on Strava for activity ${id}: ${error.message}`
            );
            return null;
          }
        }

        throw error;
      })
    );
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results from this batch
    batchResults.forEach((result, index) => {
      const activityId = batchIds[index];
      if (result.status === 'fulfilled') {
        results[activityId] = result.value;
      } else {
        failedIds.push(activityId);
        console.error(
          `Failed to fetch stream for activity ${activityId}:`,
          result.reason
        );
      }
    });

    // If there are more batches to process, wait before the next batch
    if (i + STRAVA_RATE_LIMIT.requestsPerBatch < activityIds.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, STRAVA_RATE_LIMIT.delayBetweenBatches)
      );
    }
  }

  return {
    successCount: Object.keys(results).length,
    failedCount: failedIds.length,
    failedIds,
    data: results,
  };
}

export const stravaService = {
  createAuthUrl,
  connect,
  revoke,
  getAthlete,
  getActivityStream,
  getActivityStreams,
  getActivities,
  getActivity,
};
