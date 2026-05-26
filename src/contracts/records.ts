import type { LocalDateTimeString, ModuleType, PageQuery, RecordState } from './common';

export type UnifiedRecordStatus =
  | 'COMPLETED'
  | 'DELETED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RECEIVED'
  | 'PROCESSING'
  | 'SCORED';

export type UserRecordSort =
  | 'UPDATED_DESC'
  | 'UPDATED_ASC'
  | 'SCORE_DESC'
  | 'SCORE_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'MODULE_ASC'
  | 'STATUS_ASC';

export type UserRecordListQuery = {
  recordState?: RecordState;
  module?: ModuleType;
  status?: UnifiedRecordStatus;
  sort?: UserRecordSort;
  pageNum?: number;
  pageSize?: number;
};

export type UserRecordListItemVO = {
  recordId: number;
  name: string;
  module: ModuleType;
  status: string;
  updatedTime: LocalDateTimeString;
  createdTime: LocalDateTimeString;
  isDeleted: 0 | 1;
  deletedTime?: LocalDateTimeString | null;
};

export type UserRecordPageQuery = PageQuery & {
  moduleType: ModuleType;
  recordState?: RecordState;
  testId?: number;
  questionId?: number;
  sessionId?: string;
  part?: string;
  inputType?: 'TEXT' | 'IMAGE' | 'PDF';
  aiStatus?: string;
  answerStatus?: string;
  minScore?: number;
  maxScore?: number;
  minOverallScore?: number;
  maxOverallScore?: number;
  targetScore?: number;
};

export type UserRecordItemVO = UserRecordListItemVO & {
  raw?: unknown;
};

export type UserRecordDetailType =
  | 'READING_RECORD_DETAIL'
  | 'LISTENING_RECORD_DETAIL'
  | 'WRITING_RECORD_DETAIL'
  | 'SPEAKING_RECORD_DETAIL';

export type UserRecordDetailVO<TDetail = unknown> = {
  detailType: UserRecordDetailType;
  moduleType: ModuleType;
  recordId: number;
  detail: TDetail;
  review?: RecordReviewVO | null;
};

export type RecordExamAudioVO = {
  id?: number;
  testId?: number;
  test_id?: number;
  partGroupId?: number | null;
  part_group_id?: number | null;
  title?: string | null;
  audioUrl?: string | null;
  audio_url?: string | null;
  url?: string | null;
  durationSeconds?: number | null;
  duration_seconds?: number | null;
};

export type RecordExamPassageVO = {
  id?: number;
  passageNo?: number;
  passage_no?: number;
  title?: string | null;
  content?: string | null;
  materialType?: string | null;
  material_type?: string | null;
  displayOrder?: number | null;
  display_order?: number | null;
  questions?: unknown[];
};

export type RecordExamGroupVO = {
  id?: number;
  partGroupId?: number;
  part_group_id?: number;
  title?: string | null;
  passages?: RecordExamPassageVO[];
  questions?: unknown[];
  audios?: RecordExamAudioVO[];
};

export type RecordExamPartVO = {
  partNumber?: number;
  part_number?: number;
  title?: string | null;
  groups?: RecordExamGroupVO[];
  passages?: RecordExamPassageVO[];
  questions?: unknown[];
  audios?: RecordExamAudioVO[];
};

export type ExamPageReviewVO = {
  testTitle?: string | null;
  test_title?: string | null;
  title?: string | null;
  totalScore?: number | null;
  total_score?: number | null;
  allowAudioSeek?: boolean | null;
  allow_audio_seek?: boolean | null;
  testAudio?: RecordExamAudioVO | null;
  test_audio?: RecordExamAudioVO | null;
  partGroupAudios?: RecordExamAudioVO[];
  part_group_audios?: RecordExamAudioVO[];
  parts?: RecordExamPartVO[];
  passages?: RecordExamPassageVO[];
  questionReviews?: unknown[];
  question_reviews?: unknown[];
  questions?: unknown[];
};

export type WritingRecordAttachmentVO = {
  fileName?: string | null;
  file_name?: string | null;
  name?: string | null;
  fileUrl?: string | null;
  file_url?: string | null;
  url?: string | null;
  contentType?: string | null;
  content_type?: string | null;
  size?: number | null;
};

export type WritingPreviewAssetVO = {
  sourceType?: 'QUESTION_IMAGE' | 'ANSWER_ATTACHMENT' | string | null;
  source_type?: 'QUESTION_IMAGE' | 'ANSWER_ATTACHMENT' | string | null;
  fileType?: 'IMAGE' | 'PDF' | string | null;
  file_type?: 'IMAGE' | 'PDF' | string | null;
  fileName?: string | null;
  file_name?: string | null;
  label?: string | null;
  fileUrl?: string | null;
  file_url?: string | null;
  url?: string | null;
  objectKey?: string | null;
  object_key?: string | null;
  sortOrder?: number | null;
  sort_order?: number | null;
  contentType?: string | null;
  content_type?: string | null;
};

export type WritingReviewVO = {
  questionTitle?: string | null;
  questionDescription?: string | null;
  questionImageUrl?: string | null;
  questionImages?: unknown[];
  previewAssets?: WritingPreviewAssetVO[];
  taskType?: string | null;
  chartType?: string | null;
  inputType?: string | null;
  textContent?: string | null;
  extractedText?: string | null;
  answerText?: string | null;
  answerSource?: string | null;
  attachments?: WritingRecordAttachmentVO[];
  aiScore?: number | null;
  aiFeedback?: string | null;
  aiStatus?: string | null;
};

export type SpeakingSessionSummaryVO = Record<string, unknown>;

export type ListeningRecordScriptAudioVO = {
  id?: number;
  testId?: number;
  test_id?: number;
  partGroupId?: number | null;
  part_group_id?: number | null;
  title?: string | null;
  audioUrl?: string | null;
  audio_url?: string | null;
  url?: string | null;
};

export type ListeningSectionScriptVO = {
  recordId: number;
  testId: number;
  sectionNumber: number;
  sectionTitle?: string | null;
  transcriptText: string;
  audios?: ListeningRecordScriptAudioVO[];
};

export type RecordReviewLayoutType = 'EXAM_PAGE' | 'WRITING_REVIEW' | 'SPEAKING_SESSION_REVIEW';

export type RecordReviewVO = {
  moduleType: ModuleType;
  recordId: number;
  userId?: number | null;
  layoutType: RecordReviewLayoutType | string;
  title?: string | null;
  score?: number | null;
  scoreText?: string | null;
  status?: string | null;
  createdTime?: LocalDateTimeString | null;
  examPageReview?: ExamPageReviewVO | Record<string, unknown> | null;
  writingReview?: WritingReviewVO | Record<string, unknown> | null;
  speakingSessionReview?: Record<string, unknown> | null;
};
