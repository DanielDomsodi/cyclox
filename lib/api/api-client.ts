import { serializeQueryParams } from '../utils/urls';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  status: number;
}

type ContentType = 'json' | 'urlencoded' | 'multipart';

export interface FetchOptions extends RequestInit {
  contentType?: ContentType;
  data?: any;
}

/**
 * Fetches data from an API endpoint with configurable request options.
 *
 * @template Response - The expected response data type
 * @param {string} url - The URL to fetch from
 * @param {FetchOptions} [options] - Optional configuration for the fetch request
 * @param {string} [options.contentType='json'] - Content type of the request ('json', 'urlencoded', or 'multipart')
 * @param {object} [options.data] - Data to send with the request
 * @returns {Promise<ApiResponse<Response>>} A promise that resolves to a standardized API response
 * @throws {Error} Errors during fetch are caught and transformed into an ApiResponse with success: false
 */
export async function fetchApi<Response>(
  url: string,
  options?: FetchOptions
): Promise<ApiResponse<Response>> {
  try {
    const { contentType = 'json', data, ...fetchOptions } = options || {};
    const headers = new Headers(fetchOptions?.headers);

    let body: string | FormData | undefined = undefined;

    if (data) {
      switch (contentType) {
        case 'json':
          headers.set('Content-Type', 'application/json');
          body = JSON.stringify(data);
          break;

        case 'urlencoded':
          headers.set('Content-Type', 'application/x-www-form-urlencoded');
          body = Object.entries(data)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return value
                  .map(
                    (v) =>
                      `${encodeURIComponent(key)}=${encodeURIComponent(
                        String(v)
                      )}`
                  )
                  .join('&');
              }
              return `${encodeURIComponent(key)}=${encodeURIComponent(
                String(value)
              )}`;
            })
            .join('&');
          break;
        case 'multipart':
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((v) => formData.append(key, String(v)));
            } else {
              formData.append(key, String(value));
            }
          });
          body = formData;
          break;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body,
    });

    // Handle JSON and non-JSON responses
    let responseData: any;
    const contentTypeHeader = response.headers.get('Content-Type');

    if (contentTypeHeader?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: response.ok,
      data: response.ok ? responseData : null,
      error: response.ok
        ? null
        : typeof responseData === 'object'
        ? responseData.message
        : 'An error occurred',
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

export const api = {
  get: <Response>(
    url: string,
    params?: Record<string, any>,
    options?: RequestInit
  ) => {
    const query = serializeQueryParams(params);
    const queryUrl = query ? `${url}?${query.toString()}` : url;

    return fetchApi<Response>(queryUrl, {
      method: 'GET',
      ...options,
    });
  },

  post: <Response>(url: string, data?: any, options?: FetchOptions) => {
    return fetchApi<Response>(url, {
      method: 'POST',
      contentType: options?.contentType || 'json',
      data,
      ...options,
    });
  },
};
