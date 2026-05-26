import type { EmptyResponse, PageResult } from '../contracts/common';
import type {
  AdminReadingTestUpsertDTO,
  ReadingSessionVO,
  ReadingSubmitDTO,
  ReadingTestDetailVO,
  ReadingTestQuery,
  ReadingTestSummaryVO,
} from '../contracts/reading';
import { apiGet, apiJson, apiMultipart } from './client';

const createImagesFormData = (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return formData;
};

export const readingApi = {
  listUserTests: (query: ReadingTestQuery = {}) => apiGet<PageResult<ReadingTestSummaryVO> | ReadingTestSummaryVO[]>('/user/reading/tests', { query }),
  startSession: (testId: number) => apiJson<ReadingSessionVO>('POST', `/user/reading/tests/${testId}/start`),
  getSession: (sessionId: string) => apiGet<ReadingSessionVO>(`/user/reading/sessions/${sessionId}`),
  pauseSession: (sessionId: string) => apiJson<ReadingSessionVO>('POST', `/user/reading/sessions/${sessionId}/pause`),
  resumeSession: (sessionId: string) => apiJson<ReadingSessionVO>('POST', `/user/reading/sessions/${sessionId}/resume`),
  submit: (testId: number, body: ReadingSubmitDTO) =>
    apiJson<unknown, ReadingSubmitDTO>('POST', `/user/reading/tests/${testId}/submit`, { body }),
  listAdminTests: (query: ReadingTestQuery = {}) => apiGet<PageResult<ReadingTestSummaryVO> | ReadingTestSummaryVO[]>('/admin/reading/tests', { query }),
  createAdminTest: (body: AdminReadingTestUpsertDTO) =>
    apiJson<ReadingTestDetailVO, AdminReadingTestUpsertDTO>('POST', '/admin/reading/tests', { body }),
  getAdminTest: (testId: number) => apiGet<ReadingTestDetailVO>(`/admin/reading/tests/${testId}`),
  updateAdminTest: (testId: number, body: AdminReadingTestUpsertDTO) =>
    apiJson<ReadingTestDetailVO, AdminReadingTestUpsertDTO>('PUT', `/admin/reading/tests/${testId}`, { body }),
  saveAdminFullTest: (testId: number, body: Record<string, unknown>) =>
    apiJson<ReadingTestDetailVO, Record<string, unknown>>('PUT', `/admin/reading/tests/${testId}/full`, { body }),
  deleteAdminTest: (testId: number) => apiJson<EmptyResponse>('DELETE', `/admin/reading/tests/${testId}`),
  restoreAdminTest: (testId: number) => apiJson<EmptyResponse>('PUT', `/admin/reading/tests/${testId}/restore`),
  uploadPartGroupImage: (partGroupId: number, file: File) => {
    return apiMultipart<unknown>('POST', `/admin/reading/part-groups/${partGroupId}/images`, createImagesFormData([file]));
  },
  uploadQuestionImage: (questionId: number, file: File) =>
    apiMultipart<unknown>('POST', `/admin/reading/questions/${questionId}/images`, createImagesFormData([file])),
};
