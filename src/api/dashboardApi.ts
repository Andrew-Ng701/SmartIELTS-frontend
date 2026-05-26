import type {
  DashboardAskRequest,
  DashboardAskResponse,
  DashboardExecutiveSummaryVO,
  DashboardPreloadPayload,
} from '../contracts/dashboard';
import type { RequestOptions } from './client';
import { apiGet, apiJson, createDashboardEventStream } from './client';

export const dashboardApi = {
  askUser: (body: DashboardAskRequest) =>
    apiJson<DashboardAskResponse, DashboardAskRequest>('POST', '/smartielts/dashboard/user/ask', { body }),
  askAdmin: (body: DashboardAskRequest) =>
    apiJson<DashboardAskResponse, DashboardAskRequest>('POST', '/smartielts/dashboard/admin/ask', { body }),
  getUserExecutiveSummary: (timeRange = '30d') =>
    apiGet<DashboardExecutiveSummaryVO>('/smartielts/dashboard/user/executive_summary', { query: { timeRange } }),
  getAdminExecutiveSummary: (targetUserId?: number, timeRange = '30d') =>
    apiGet<DashboardExecutiveSummaryVO>('/smartielts/dashboard/admin/executive_summary', { query: { targetUserId, timeRange } }),
  preloadUser: (timeRange = '30d') =>
    apiGet<DashboardPreloadPayload>('/smartielts/dashboard/user/preload', { query: { timeRange } }),
  preloadAdmin: (targetUserId?: number, timeRange = '30d') =>
    apiGet<DashboardPreloadPayload>('/smartielts/dashboard/admin/preload', { query: { targetUserId, timeRange } }),
  askUserSse: (body: DashboardAskRequest, options: RequestOptions = {}) =>
    createDashboardEventStream('/smartielts/dashboard/user/ask-sse', body, options),
  askAdminSse: (body: DashboardAskRequest, options: RequestOptions = {}) =>
    createDashboardEventStream('/smartielts/dashboard/admin/ask-sse', body, options),
};
