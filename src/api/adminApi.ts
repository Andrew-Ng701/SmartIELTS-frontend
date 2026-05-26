import type { AdminRecordQuery } from '../contracts/admin';
import type { EmptyResponse, ModuleType, PageResult } from '../contracts/common';
import { apiGet, apiJson } from './client';

export const adminApi = {
  listRecords: <TItem = unknown>(body: AdminRecordQuery) =>
    apiJson<PageResult<TItem>, AdminRecordQuery>('POST', '/admin/records/list', { body }),
  getRecord: <TDetail = unknown>(module: ModuleType, recordId: number) =>
    apiGet<TDetail>(`/admin/records/${module}/${recordId}`),
  deleteRecord: (module: ModuleType, recordId: number) =>
    apiJson<EmptyResponse>('DELETE', `/admin/records/${module}/${recordId}`),
  restoreRecord: (module: ModuleType, recordId: number) =>
    apiJson<EmptyResponse>('PUT', `/admin/records/${module}/${recordId}/restore`),
};
