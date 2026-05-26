const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function resolveApiAssetUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const rawUrl = value.trim();
  if (!rawUrl) return null;
  if (/^(https?:|blob:|data:)/i.test(rawUrl)) return rawUrl;

  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const apiBase = new URL(API_BASE_URL, origin);
  const backendOrigin = apiBase.origin;

  if (rawUrl.startsWith('/api/')) {
    return new URL(rawUrl, backendOrigin).toString();
  }

  if (rawUrl.startsWith('/')) {
    return new URL(rawUrl, backendOrigin).toString();
  }

  return new URL(`/${rawUrl}`, backendOrigin).toString();
}
