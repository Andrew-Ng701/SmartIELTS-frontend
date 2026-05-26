import type { LocalDateTimeString, PageQuery } from './common';

export type SpeakingSessionStatus =
  | 'PENDING'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_FINAL_EVALUATION'
  | 'COMPLETED'
  | 'FAILED';

export type SpeakingRecordStatus = 'RECEIVED' | 'PROCESSING' | 'SCORED' | 'FAILED';

export type SpeakingExamType = 'FULL';

export type SpeakingQuestionVO = {
  id: number;
  title: string;
  part?: string;
  createdTime?: LocalDateTimeString;
  [key: string]: unknown;
};

export type SpeakingQuestionUpsertDTO = {
  title: string;
  part?: string;
  prompts?: string[];
  [key: string]: unknown;
};

export type SpeakingQuestionQuery = PageQuery & {
  keyword?: string;
  part?: string;
};

export type StartExamRequestDTO = {
  examType?: SpeakingExamType;
  totalQuestions?: number;
};

export type StartExamVO = {
  sessionId: string;
  examStatus: SpeakingSessionStatus;
  totalQuestions: number;
  openingCount?: number;
  part1Count?: number;
  part3Count?: number;
  topicKeyForPart2And3?: string | null;
  message?: string | null;
};

export type NextSpeakingQuestionDTO = {
  sessionId: string;
};

export type NextQuestionVO = {
  sessionId: string;
  questionId: number;
  part: string;
  stepType: string;
  topicKey?: string | null;
  questionText: string;
  cueCard?: string | null;
  displayScript?: string | null;
  spokenScript?: string | null;
  prepSeconds?: number | null;
  answerSeconds?: number | null;
  currentIndex: number;
  hasNext: boolean;
  talkId?: string | null;
  examStatus: SpeakingSessionStatus;
};

export type SubmitSpeakingAnswerPayload = {
  sessionId: string;
  questionId: number;
  file: File;
};

export type SubmitAnswerVO = {
  recordId: number;
  sessionId: string;
  questionId: number;
  audioUrl?: string | null;
  answerStatus: SpeakingRecordStatus;
  status: SpeakingRecordStatus;
  aiStatus?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  message?: string | null;
};

export type UploadSpeakingAudioPayload = {
  file: File;
  sessionId?: string;
  questionId?: number;
};

export type UploadSpeakingAudioVO = Record<string, unknown>;
export type UserSpeakingSessionSummaryVO = Record<string, unknown>;
export type SpeakingTalkStatusVO = Record<string, unknown>;
export type SpeakingRecordVO = Record<string, unknown>;
