import type { AuthTokenVO } from '../../contracts/auth';
import type { UserRole } from '../../contracts/common';

const AUTH_SESSION_STORAGE_KEY = 'SMARTIELTS_AUTH_SESSION';

export type AuthSession = {
  token: string;
  userId: number;
  role: UserRole;
  tokenExpiresIn: number;
  refreshAfterSeconds: number;
  tokenType: string;
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const toAuthSession = (token: AuthTokenVO): AuthSession => ({
  token: token.token,
  userId: token.userId,
  role: token.role,
  tokenExpiresIn: token.tokenExpiresIn,
  refreshAfterSeconds: token.refreshAfterSeconds,
  tokenType: token.tokenType,
});

export const readAuthSession = (): AuthSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
};

export const saveAuthSession = (session: AuthSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

export const getAuthToken = () => readAuthSession()?.token ?? null;
