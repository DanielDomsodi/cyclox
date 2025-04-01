import { FetchOptions, fetchApi } from '@/lib/api/api-client';

export const BASE_STRAVA_API_URL = 'https://www.strava.com/api/v3';

export async function fetchStravaApi<TResponse>(
  endpoint: string,
  token: string,
  options?: FetchOptions
) {
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
