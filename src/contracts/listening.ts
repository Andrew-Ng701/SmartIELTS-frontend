import type { LocalDateTimeString, PageQuery } from './common';

export type ListeningRecordStatus = 'in_progress' | 'paused' | 'submitted';

export type ListeningTestSummaryVO = {
  id: number;
  title: string;
  tasks?: number;
  questions?: number;
  totalScore?: number;
  allowAudioSeek?: boolean;
  prepMinutes?: number;
  totalMinutes?: number;
  prepSeconds?: number;
  totalSeconds?: number;
  createdTime?: LocalDateTimeString;
  [key: string]: unknown;
};

export type ListeningTestDetailVO = ListeningTestSummaryVO & {
  partGroups?: unknown[];
  audio?: unknown;
};

export type ListeningSessionVO = {
  sessionId: string;
  testId: number;
  status: ListeningRecordStatus;
  allowAudioSeek?: boolean;
  [key: string]: unknown;
};

export type ListeningAnswerDTO = {
  questionId: number;
  answer?: string;
  answers?: string[];
};

export type ListeningSubmitDTO = {
  sessionId: string;
  answers: ListeningAnswerDTO[];
};

export type AdminListeningTestUpsertDTO = {
  title: string;
  prepSeconds: number;
  totalMinutes: number;
  prepMinutes?: number;
  allowAudioSeek?: boolean;
  [key: string]: unknown;
};

export type ListeningTestQuery = PageQuery & {
  keyword?: string;
};
