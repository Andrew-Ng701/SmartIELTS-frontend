import type { LocalDateTimeString, PageQuery } from './common';

export type ReadingRecordStatus = 'in_progress' | 'paused' | 'submitted' | 'auto_submitted';

export type ReadingTestSummaryVO = {
  id: number;
  title: string;
  tasks?: number;
  questions?: number;
  totalScore?: number;
  prepMinutes?: number;
  totalMinutes?: number;
  prepSeconds?: number;
  totalSeconds?: number;
  createdTime?: LocalDateTimeString;
  [key: string]: unknown;
};

export type ReadingTestDetailVO = ReadingTestSummaryVO & {
  passages?: unknown[];
  partGroups?: unknown[];
};

export type ReadingSessionVO = {
  sessionId: string;
  testId: number;
  status: ReadingRecordStatus;
  prepSeconds?: number;
  totalSeconds?: number;
  [key: string]: unknown;
};

export type ReadingAnswerDTO = {
  questionId: number;
  answer?: string;
  answers?: string[];
};

export type ReadingSubmitDTO = {
  sessionId: string;
  answers: ReadingAnswerDTO[];
};

export type AdminReadingTestUpsertDTO = {
  title: string;
  prepSeconds: number;
  totalMinutes: number;
  prepMinutes?: number;
  [key: string]: unknown;
};

export type ReadingTestQuery = PageQuery & {
  keyword?: string;
};
