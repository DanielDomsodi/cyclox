import { serverEnv } from '../env/server-env';

/**
 * Creates a full API URL by combining the base URL with the provided path.
 * @param path - API endpoint path. If starts with '/', appends to 'api', otherwise to 'api/'
 * @returns Complete API URL string
 */
export function getApiUrl(path = '') {
  const baseUrl = serverEnv.BASE_URL;
  const apiPath = path.startsWith('/') ? `api${path}` : `api/${path}`;
  return new URL(apiPath, baseUrl).toString();
}
