import type { LocalDateTimeString, PageQuery } from './common';

export type WritingInputType = 'TEXT' | 'IMAGE' | 'PDF';
export type WritingAiStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type WritingTaskType = 'TASK_1' | 'TASK_2';

export type WritingQuestionVO = {
  id: number;
  title: string;
  description?: string;
  taskType?: WritingTaskType;
  chartType?: string | null;
  inputType?: WritingInputType;
  expectedWords?: number;
  prepMinutes?: number;
  totalMinutes?: number;
  prepSeconds?: number;
  totalSeconds?: number;
  allowPause?: 0 | 1 | boolean;
  allow_pause?: 0 | 1 | boolean;
  createdTime?: LocalDateTimeString;
  [key: string]: unknown;
};

export type WritingQuestionUpsertDTO = {
  title: string;
  description?: string;
  taskType: WritingTaskType;
  chartType?: string | null;
  prepSeconds: number;
  totalMinutes: number;
  prepMinutes?: number;
  totalSeconds?: number;
  expectedWords?: number;
  [key: string]: unknown;
};

export type WritingQuestionQuery = PageQuery & {
  keyword?: string;
  taskType?: WritingTaskType;
};

export type WritingSubmitPayload = {
  targetScore?: number;
  textContent?: string;
  images?: File[];
  pdf?: File;
};

export type WritingRecordVO = {
  id: number;
  questionId: number;
  taskType?: WritingTaskType;
  chartType?: string | null;
  inputType: WritingInputType;
  aiStatus: WritingAiStatus;
  score?: number | null;
  feedback?: string | null;
  [key: string]: unknown;
};

export type WritingRecordDetailVO = WritingRecordVO & {
  questionTitle?: string;
  questionDescription?: string;
  answerText?: string;
  answerSource?: string;
  targetScore?: number | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
};
