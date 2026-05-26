import type {
  AdminUserScopedRecordQuery,
} from '../contracts/admin';
import type {
  AdminDeletedUserPageQuery,
  AdminUserListVO,
  AdminUserPageQuery,
  AdminUserRecordListItemVO,
  UserAdminDetailVO,
  UserAdminVO,
} from '../contracts/user';
import type { EmptyResponse, ModuleType, PageResult } from '../contracts/common';
import { apiGet, apiJson } from './client';

export const adminUsersApi = {
  listUsers: (query: AdminUserPageQuery = {}) => apiGet<AdminUserListVO>('/admin/users/list', { query }),
  listDeletedUsers: (body: AdminDeletedUserPageQuery = {}) =>
    apiJson<PageResult<UserAdminVO>, AdminDeletedUserPageQuery>('POST', '/admin/users/deleted/overview', { body }),
  getUser: (userId: number) => apiGet<UserAdminDetailVO>(`/admin/users/${userId}`),
  listUserRecords: (userId: number, body: AdminUserScopedRecordQuery = {}) =>
    apiJson<PageResult<AdminUserRecordListItemVO>, AdminUserScopedRecordQuery>('POST', `/admin/users/${userId}/records`, {
      body,
    }),
  getUserRecordDetail: <TDetail = unknown>(userId: number, moduleType: ModuleType, recordId: number) =>
    apiGet<TDetail>(`/admin/users/${userId}/records/${moduleType}/${recordId}`),
  deleteUser: (userId: number) => apiJson<EmptyResponse>('DELETE', `/admin/users/${userId}`),
  restoreUser: (userId: number) => apiJson<EmptyResponse>('PUT', `/admin/users/${userId}/restore`),
};
