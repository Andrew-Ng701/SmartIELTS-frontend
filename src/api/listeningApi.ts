import type { EmptyResponse, PageResult } from '../contracts/common';
import type {
  AdminListeningTestUpsertDTO,
  ListeningSessionVO,
  ListeningSubmitDTO,
  ListeningTestDetailVO,
  ListeningTestQuery,
  ListeningTestSummaryVO,
} from '../contracts/listening';
import { apiGet, apiJson, apiMultipart } from './client';

const createAudioFormData = (file: File, title?: string, transcriptText?: string) => {
  const formData = new FormData();
  formData.set('file', file);

  if (title) {
    formData.set('title', title);
  }
  if (transcriptText?.trim()) {
    formData.set('transcriptText', transcriptText.trim());
  }

  return formData;
};

const createImagesFormData = (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return formData;
};

export const listeningApi = {
  listUserTests: (query: ListeningTestQuery = {}) => apiGet<PageResult<ListeningTestSummaryVO> | ListeningTestSummaryVO[]>('/user/listening/tests', { query }),
  startSession: (testId: number) => apiJson<ListeningSessionVO>('POST', `/user/listening/tests/${testId}/start`),
  getSession: (sessionId: string) => apiGet<ListeningSessionVO>(`/user/listening/sessions/${sessionId}`),
  pauseSession: (sessionId: string) => apiJson<ListeningSessionVO>('POST', `/user/listening/sessions/${sessionId}/pause`),
  resumeSession: (sessionId: string) => apiJson<ListeningSessionVO>('POST', `/user/listening/sessions/${sessionId}/resume`),
  submit: (testId: number, body: ListeningSubmitDTO) =>
    apiJson<unknown, ListeningSubmitDTO>('POST', `/user/listening/tests/${testId}/submit`, { body }),
  listAdminTests: (query: ListeningTestQuery = {}) => apiGet<PageResult<ListeningTestSummaryVO> | ListeningTestSummaryVO[]>('/admin/listening/tests', { query }),
  createAdminTest: (body: AdminListeningTestUpsertDTO) =>
    apiJson<ListeningTestDetailVO, AdminListeningTestUpsertDTO>('POST', '/admin/listening/tests', { body }),
  getAdminTest: (testId: number) => apiGet<ListeningTestDetailVO>(`/admin/listening/tests/${testId}`),
  updateAdminTest: (testId: number, body: AdminListeningTestUpsertDTO) =>
    apiJson<ListeningTestDetailVO, AdminListeningTestUpsertDTO>('PUT', `/admin/listening/tests/${testId}`, { body }),
  saveAdminFullTest: (testId: number, body: Record<string, unknown>) =>
    apiJson<ListeningTestDetailVO, Record<string, unknown>>('PUT', `/admin/listening/tests/${testId}/full`, { body }),
  deleteAdminTest: (testId: number) => apiJson<EmptyResponse>('DELETE', `/admin/listening/tests/${testId}`),
  restoreAdminTest: (testId: number) => apiJson<EmptyResponse>('PUT', `/admin/listening/tests/${testId}/restore`),
  uploadTestAudio: (testId: number, file: File, title?: string, transcriptText?: string) =>
    apiMultipart<unknown>('POST', `/admin/listening/tests/${testId}/audio`, createAudioFormData(file, title, transcriptText)),
  getTestAudio: (testId: number) => apiGet<unknown>(`/admin/listening/tests/${testId}/audio`),
  replaceTestAudio: (testId: number, audioId: number, file: File, title?: string, transcriptText?: string) =>
    apiMultipart<unknown>('PUT', `/admin/listening/tests/${testId}/audio/${audioId}`, createAudioFormData(file, title, transcriptText)),
  deleteTestAudio: (testId: number, audioId: number) =>
    apiJson<EmptyResponse>('DELETE', `/admin/listening/tests/${testId}/audio/${audioId}`),
  uploadPartGroupAudio: (testId: number, partGroupId: number, file: File, title?: string, transcriptText?: string) =>
    apiMultipart<unknown>('POST', `/admin/listening/tests/${testId}/part-groups/${partGroupId}/audio`, createAudioFormData(file, title, transcriptText)),
  getPartGroupAudio: (partGroupId: number) => apiGet<unknown>(`/admin/listening/part-groups/${partGroupId}/audio`),
  replacePartGroupAudio: (testId: number, partGroupId: number, audioId: number, file: File, title?: string, transcriptText?: string) =>
    apiMultipart<unknown>(
      'PUT',
      `/admin/listening/tests/${testId}/part-groups/${partGroupId}/audio/${audioId}`,
      createAudioFormData(file, title, transcriptText),
    ),
  deletePartGroupAudio: (testId: number, partGroupId: number, audioId: number) =>
    apiJson<EmptyResponse>('DELETE', `/admin/listening/tests/${testId}/part-groups/${partGroupId}/audio/${audioId}`),
  uploadPartGroupImage: (partGroupId: number, file: File) => {
    return apiMultipart<unknown>('POST', `/admin/listening/part-groups/${partGroupId}/images`, createImagesFormData([file]));
  },
  uploadQuestionImage: (questionId: number, file: File) =>
    apiMultipart<unknown>('POST', `/admin/listening/questions/${questionId}/images`, createImagesFormData([file])),
};
