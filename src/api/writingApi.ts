import type { EmptyResponse, PageResult } from '../contracts/common';
import type {
  WritingQuestionQuery,
  WritingQuestionUpsertDTO,
  WritingQuestionVO,
  WritingRecordVO,
  WritingSubmitPayload,
} from '../contracts/writing';
import { apiGet, apiJson, apiMultipart } from './client';

const createWritingSubmitFormData = (payload: WritingSubmitPayload) => {
  const formData = new FormData();

  if (payload.targetScore !== undefined) {
    formData.set('targetScore', String(payload.targetScore));
  }

  if (payload.textContent) {
    formData.set('textContent', payload.textContent);
  }

  payload.images?.forEach((image) => {
    formData.append('images', image);
  });

  if (payload.pdf) {
    formData.set('pdf', payload.pdf);
  }

  return formData;
};

const createWritingImagesFormData = (images: File[]) => {
  const formData = new FormData();

  images.forEach((image) => {
    formData.append('images', image);
  });

  return formData;
};

export const writingApi = {
  listQuestions: (query: WritingQuestionQuery = {}) => apiGet<PageResult<WritingQuestionVO> | WritingQuestionVO[]>('/user/writing/questions', { query }),
  submit: (questionId: number, payload: WritingSubmitPayload) =>
    apiMultipart<WritingRecordVO>('POST', `/user/writing/questions/${questionId}/submit`, createWritingSubmitFormData(payload)),
  listAdminQuestions: (query: WritingQuestionQuery = {}) =>
    apiGet<PageResult<WritingQuestionVO> | WritingQuestionVO[]>('/admin/writing/questions', { query }),
  createAdminQuestion: (body: WritingQuestionUpsertDTO) =>
    apiJson<WritingQuestionVO, WritingQuestionUpsertDTO>('POST', '/admin/writing/questions', { body }),
  getAdminQuestion: (questionId: number) => apiGet<WritingQuestionVO>(`/admin/writing/questions/${questionId}`),
  updateAdminQuestion: (questionId: number, body: WritingQuestionUpsertDTO) =>
    apiJson<WritingQuestionVO, WritingQuestionUpsertDTO>('PUT', `/admin/writing/questions/${questionId}`, { body }),
  replaceAdminQuestionImages: (questionId: number, images: File[]) =>
    apiMultipart<unknown>('POST', `/admin/writing/questions/${questionId}/images`, createWritingImagesFormData(images)),
  deleteAdminQuestion: (questionId: number) => apiJson<EmptyResponse>('DELETE', `/admin/writing/questions/${questionId}`),
  restoreAdminQuestion: (questionId: number) => apiJson<EmptyResponse>('PUT', `/admin/writing/questions/${questionId}/restore`),
};
