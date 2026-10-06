const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === 'string') return payload.detail;
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const validation = item as { loc?: unknown; msg?: unknown };
        if (typeof validation.msg !== 'string') return [];
        const field = Array.isArray(validation.loc)
          ? validation.loc.filter((part) => part !== 'body').join('.')
          : '';
        return field ? `${field}: ${validation.msg}` : validation.msg;
      });
      if (messages.length > 0) return messages.join(' ');
    }
  } catch {
    // The response was not JSON; use the HTTP status below.
  }
  return `Request failed with status ${response.status}`;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> => {
  if (!apiBaseUrl) {
    throw new Error('FastAPI is not configured. Set VITE_API_BASE_URL.');
  }

  const { accessToken, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const apiBlob = async (
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<Blob> => {
  if (!apiBaseUrl) {
    throw new Error('FastAPI is not configured. Set VITE_API_BASE_URL.');
  }

  const { accessToken, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'image/jpeg, image/png, image/webp');
  if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return response.blob();
};
