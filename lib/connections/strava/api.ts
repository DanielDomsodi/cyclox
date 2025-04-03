import { FetchOptions, fetchApi } from '@/lib/api/api-client';

export const BASE_STRAVA_API_URL = 'https://www.strava.com/api/v3';

// Strava API rate limits: 100 requests per 15 minutes (roughly 6-7 per minute)
export const STRAVA_RATE_LIMIT = {
  requestsPerBatch: 10,
  delayBetweenBatches: 3000, // 3 seconds between batches
};

export async function fetchStravaApi<TResponse>(
  endpoint: string,
  token: string,
  options?: FetchOptions
) {
  // TODO: Improve url construction to handle query parameters
  const url = `${BASE_STRAVA_API_URL}${endpoint}`;
  const response = await fetchApi(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${token}` },
  });

  if (!response.success) {
    throw new Error(`Strava API error: ${response.error}`);
  }

  return response.data as TResponse;
}
