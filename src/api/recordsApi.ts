import type { EmptyResponse, ModuleType, PageResult } from '../contracts/common';
import type {
  ListeningSectionScriptVO,
  SpeakingSessionSummaryVO,
  UserRecordDetailVO,
  UserRecordItemVO,
  UserRecordListItemVO,
  UserRecordListQuery,
  UserRecordPageQuery,
} from '../contracts/records';
import { apiGet, apiJson } from './client';

export const recordsApi = {
  listRecords: (query: UserRecordListQuery = {}) =>
    apiGet<PageResult<UserRecordListItemVO>>('/user/records', { query }),
  listRecordsOverview: (body: UserRecordPageQuery) =>
    apiJson<PageResult<UserRecordItemVO>, UserRecordPageQuery>('POST', '/user/records/overview', { body }),
  getRecordDetail: <TDetail = unknown>(moduleType: ModuleType, recordId: number) =>
    apiGet<UserRecordDetailVO<TDetail>>(`/user/records/${moduleType}/${recordId}`),
  deleteRecord: (moduleType: ModuleType, recordId: number) =>
    apiJson<EmptyResponse>('DELETE', `/user/records/${moduleType}/${recordId}`),
  restoreRecord: (moduleType: ModuleType, recordId: number) =>
    apiJson<EmptyResponse>('PUT', `/user/records/${moduleType}/${recordId}/restore`),
  getListeningSectionScript: (recordId: number, sectionNumber: number) =>
    apiGet<ListeningSectionScriptVO>(`/user/records/listening/${recordId}/sections/${sectionNumber}/script`),
  getSpeakingSessionSummary: (sessionId: string) =>
    apiGet<SpeakingSessionSummaryVO>(`/user/records/speaking/sessions/${sessionId}`),
};
