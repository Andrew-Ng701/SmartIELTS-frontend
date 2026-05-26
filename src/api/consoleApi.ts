import type { AdminConsoleVO, UserConsoleVO } from '../contracts/console';
import { apiGet } from './client';

export const consoleApi = {
  getUserConsole: () => apiGet<UserConsoleVO>('/user/console'),
  getAdminConsole: () => apiGet<AdminConsoleVO>('/admin/console'),
};
