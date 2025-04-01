import { serverEnv } from '@/lib/env/server-env';
import { prisma } from '@/lib/db/prisma';
import { getApiUrl } from '@/lib/utils/urls';
import { ServiceConnection } from '@prisma/client';
import {
  StravaAuthToken,
  stravaAuthTokenSchema,
  StravaRefreshToken,
  stravaRefreshTokenSchema,
} from './schemas';
import { api } from '@/lib/api/api-client';
import { BASE_STRAVA_API_URL, fetchStravaApi } from './api';

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
      return stravaRefreshTokenSchema.parse(data) as any;
    }

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

async function getStravaAthlete(userId: string) {
  const token = await getToken(userId);
  return await fetchStravaApi('/athlete', token);
}

export const stravaService = {
  createAuthUrl,
  connect,
  revoke,
  getStravaAthlete,
};
