export class ApiError<TData = unknown> extends Error {
  readonly status: number;
  readonly code?: number;
  readonly data?: TData;

  constructor(message: string, options: { status: number; code?: number; data?: TData }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
  }
}

export class AuthRequiredError extends ApiError {
  constructor(statusOrMessage: number | string = 401, message = 'Authentication is required.') {
    const status = typeof statusOrMessage === 'number' ? statusOrMessage : 401;
    const resolvedMessage = typeof statusOrMessage === 'string' ? statusOrMessage : message;

    super(resolvedMessage, { status });
    this.name = 'AuthRequiredError';
  }
}

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed.') => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
