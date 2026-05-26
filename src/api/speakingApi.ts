import type { EmptyResponse, PageResult } from '../contracts/common';
import type {
  NextQuestionVO,
  NextSpeakingQuestionDTO,
  SpeakingQuestionQuery,
  SpeakingQuestionUpsertDTO,
  SpeakingQuestionVO,
  SpeakingTalkStatusVO,
  StartExamRequestDTO,
  StartExamVO,
  SubmitAnswerVO,
  SubmitSpeakingAnswerPayload,
  UploadSpeakingAudioPayload,
  UploadSpeakingAudioVO,
  UserSpeakingSessionSummaryVO,
} from '../contracts/speaking';
import { apiGet, apiJson, apiMultipart } from './client';

const createSubmitAnswerFormData = (payload: SubmitSpeakingAnswerPayload) => {
  const formData = new FormData();
  formData.set('sessionId', payload.sessionId);
  formData.set('questionId', String(payload.questionId));
  formData.set('file', payload.file);
  return formData;
};

const createUploadAudioFormData = (payload: UploadSpeakingAudioPayload) => {
  const formData = new FormData();
  formData.set('file', payload.file);

  if (payload.sessionId) {
    formData.set('sessionId', payload.sessionId);
  }

  if (payload.questionId !== undefined) {
    formData.set('questionId', String(payload.questionId));
  }

  return formData;
};

export const speakingApi = {
  listQuestions: () => apiGet<SpeakingQuestionVO[]>('/user/speaking/questions'),
  startExam: (body: StartExamRequestDTO = { examType: 'FULL' }) =>
    apiJson<StartExamVO, StartExamRequestDTO>('POST', '/user/speaking/start-exam', { body }),
  nextQuestion: (body: NextSpeakingQuestionDTO) =>
    apiJson<NextQuestionVO, NextSpeakingQuestionDTO>('POST', '/user/speaking/next-question', { body }),
  submitAnswer: (payload: SubmitSpeakingAnswerPayload) =>
    apiMultipart<SubmitAnswerVO>('POST', '/user/speaking/submit-answer', createSubmitAnswerFormData(payload)),
  getSessionSummary: (sessionId: string) =>
    apiGet<UserSpeakingSessionSummaryVO>(`/user/speaking/sessions/${sessionId}/summary`),
  getTalkStatus: (talkId: string) => apiGet<SpeakingTalkStatusVO>(`/user/speaking/talks/${talkId}`),
  uploadAudio: (payload: UploadSpeakingAudioPayload) =>
    apiMultipart<UploadSpeakingAudioVO>('POST', '/user/speaking/upload-audio', createUploadAudioFormData(payload)),
  listAdminQuestions: (query: SpeakingQuestionQuery = {}) =>
    apiGet<PageResult<SpeakingQuestionVO> | SpeakingQuestionVO[]>('/admin/speaking/questions', { query }),
  createAdminQuestion: (body: SpeakingQuestionUpsertDTO) =>
    apiJson<SpeakingQuestionVO, SpeakingQuestionUpsertDTO>('POST', '/admin/speaking/questions', { body }),
  getAdminQuestion: (questionId: number) => apiGet<SpeakingQuestionVO>(`/admin/speaking/questions/${questionId}`),
  updateAdminQuestion: (questionId: number, body: SpeakingQuestionUpsertDTO) =>
    apiJson<SpeakingQuestionVO, SpeakingQuestionUpsertDTO>('PUT', `/admin/speaking/questions/${questionId}`, { body }),
  deleteAdminQuestion: (questionId: number) => apiJson<EmptyResponse>('DELETE', `/admin/speaking/questions/${questionId}`),
  restoreAdminQuestion: (questionId: number) => apiJson<EmptyResponse>('PUT', `/admin/speaking/questions/${questionId}/restore`),
};
