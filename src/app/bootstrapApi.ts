import { configureApiClient } from '../api/client';
import { clearAuthSession, getAuthToken } from '../features/auth';

export const AUTH_SESSION_EXPIRED_EVENT = 'smartielts:auth-session-expired';

configureApiClient({
  getToken: getAuthToken,
  onUnauthorized: () => {
    clearAuthSession();
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  },
});
