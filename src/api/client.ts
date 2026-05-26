import type { Result } from '../contracts/common';
import { ApiError, AuthRequiredError } from './errors';

export type ApiClientConfig = {
  baseUrl?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
};

export type RequestOptions = {
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export type JsonRequestOptions<TBody> = RequestOptions & {
  body?: TBody;
};

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let apiClientConfig: Required<ApiClientConfig> = {
  baseUrl: DEFAULT_API_BASE_URL,
  getToken: () => null,
  onUnauthorized: () => undefined,
};

export const configureApiClient = (config: ApiClientConfig) => {
  apiClientConfig = {
    ...apiClientConfig,
    ...config,
  };
};

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const baseUrl = apiClientConfig.baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const createHeaders = (headers?: HeadersInit, hasJsonBody = false) => {
  const nextHeaders = new Headers(headers);
  const token = apiClientConfig.getToken();

  if (hasJsonBody && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    apiClientConfig.onUnauthorized();
    throw new AuthRequiredError(response.status);
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.msg ?? response.statusText, {
      status: response.status,
      data: payload,
    });
  }

  const result = payload as Result<T>;

  if (result.code !== 1) {
    throw new ApiError(result.msg ?? 'Business request failed.', {
      status: response.status,
      code: result.code,
      data: result.data,
    });
  }

  return result.data;
};

export const apiGet = async <T>(path: string, options: RequestOptions = {}) => {
  const response = await fetch(buildUrl(path, options.query), {
    method: 'GET',
    headers: createHeaders(options.headers),
    signal: options.signal,
  });

  return parseResponse<T>(response);
};

export const apiJson = async <TResponse, TBody = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: JsonRequestOptions<TBody> = {},
) => {
  const hasBody = options.body !== undefined;
  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers: createHeaders(options.headers, hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  return parseResponse<TResponse>(response);
};

export const apiMultipart = async <TResponse>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  formData: FormData,
  options: RequestOptions = {},
) => {
  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers: createHeaders(options.headers),
    body: formData,
    signal: options.signal,
  });

  return parseResponse<TResponse>(response);
};

export const createDashboardEventStream = async (
  path: string,
  body: unknown,
  options: RequestOptions = {},
) => {
  const response = await fetch(buildUrl(path, options.query), {
    method: 'POST',
    headers: createHeaders(options.headers, true),
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (response.status === 401) {
    apiClientConfig.onUnauthorized();
    throw new AuthRequiredError(response.status);
  }

  if (!response.ok || !response.body) {
    throw new ApiError(response.statusText || 'SSE request failed.', { status: response.status });
  }

  return response.body.getReader();
};
