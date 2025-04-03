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

/**
 * Serializes an object into URL query parameters
 * @param params - Object containing key-value pairs to serialize
 * @returns URLSearchParams object with the serialized parameters
 */
export function serializeQueryParams(params: any): URLSearchParams {
  // TODO: Improve query parameter serialization to handle nested objects and arrays
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      const filteredValues = value.filter((item) => item != null);
      if (filteredValues.length > 0) {
        searchParams.append(key, filteredValues.map(String).join(','));
      }
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

// TODO: Create an url constructor to handle query parameters
