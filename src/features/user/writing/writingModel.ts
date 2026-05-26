import type { WritingAiStatus, WritingInputType, WritingQuestionVO } from '../../../contracts/writing';
import { resolveApiAssetUrl } from '../../../lib/apiAssetUrl';

export type WritingTaskType = 'TASK_1' | 'TASK_2';

export type WritingImage = {
  url: string;
  objectKey: string;
  sortOrder: number;
};

export type WritingQuestion = {
  id: number;
  taskType: WritingTaskType;
  chartType?: string;
  title: string;
  description: string;
  expectedWords: number;
  totalSeconds: number;
  prepSeconds: number;
  allowPause: boolean;
  imageUrl: string | null;
  imageObjectKey: string | null;
  images: WritingImage[];
  createdTime: string;
};

export type WritingAttachment = {
  fileName: string;
  fileUrl: string;
  contentType: string;
  size: number;
};

export type WritingRecord = {
  id: number;
  questionId: number;
  questionTitle?: string;
  questionDescription?: string;
  questionImages?: WritingImage[];
  taskType?: WritingTaskType;
  chartType?: string | null;
  inputType?: WritingInputType;
  answerPreview?: string;
  attachmentCount?: number;
  targetScore?: number | null;
  aiScore?: number | null;
  aiStatus: WritingAiStatus;
  aiFeedback?: string | null;
  isDeleted?: 0 | 1;
  deletedTime?: string | null;
  createdTime?: string;
  attachments?: WritingAttachment[];
};

export function mapApiWritingQuestion(raw: WritingQuestionVO): WritingQuestion {
  const source = raw as Record<string, any>;
  const imageUrl = resolveApiAssetUrl(source.imageUrl ?? source.image_url);
  const imageObjectKey = nullableString(source.imageObjectKey ?? source.image_object_key) ?? null;
  const images = mapWritingImages(source.images ?? source.questionImages ?? source.question_images, {
    imageObjectKey,
    imageUrl,
  });
  const taskType = source.taskType === 'TASK_1' || source.task_type === 'TASK_1' ? 'TASK_1' : 'TASK_2';

  return {
    id: Number(source.id ?? source.questionId ?? source.question_id),
    taskType,
    chartType: nullableString(source.chartType ?? source.chart_type),
    title: String(source.title ?? source.name ?? 'Writing question'),
    description: String(source.description ?? source.questionText ?? source.question_text ?? ''),
    expectedWords: Number(source.expectedWords ?? source.expected_words ?? (taskType === 'TASK_1' ? 150 : 250)),
    totalSeconds: resolveWritingTotalSeconds(source, taskType),
    prepSeconds: resolveWritingPrepSeconds(source),
    allowPause: booleanFlag(source.allowPause ?? source.allow_pause, false),
    imageUrl,
    imageObjectKey,
    images,
    createdTime: String(source.createdTime ?? source.created_time ?? ''),
  };
}

export function splitWritingFiles(files: File[]) {
  const pdf = files.find((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  return {
    images: files.filter((file) => file !== pdf),
    pdf,
  };
}

export function getLatestWritingRecord(questionId: number, records: WritingRecord[]) {
  return records.find((record) => record.questionId === questionId) ?? null;
}

export function getWritingStatusLabel(record: WritingRecord | null) {
  if (!record) return 'Not started';
  if (record.aiStatus === 'SUCCESS') return 'Completed';
  if (record.aiStatus === 'PENDING') return 'Scoring';
  return 'Review failed';
}

export function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeUnknownArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const source = value as Record<string, any> | null;
  if (Array.isArray(source?.list)) return source.list;
  if (Array.isArray(source?.data)) return source.data;
  return [];
}

function mapWritingImages(
  value: unknown,
  fallback: { imageUrl: string | null; imageObjectKey: string | null },
): WritingImage[] {
  const images = normalizeUnknownArray(value)
    .map((image, index) => {
      const item = image as Record<string, any>;
      const url = resolveApiAssetUrl(item.fileUrl ?? item.file_url ?? item.url ?? item.imageUrl ?? item.image_url);
      if (!url) return null;

      return {
        url,
        objectKey: String(item.objectKey ?? item.object_key ?? item.id ?? url ?? `image-${index}`),
        sortOrder: Number(item.sortOrder ?? item.sort_order ?? index + 1),
      };
    })
    .filter((image): image is WritingImage => Boolean(image));

  if (!images.length && fallback.imageUrl) {
    images.push({
      url: fallback.imageUrl,
      objectKey: fallback.imageObjectKey ?? fallback.imageUrl,
      sortOrder: 1,
    });
  }

  return images;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveWritingTotalSeconds(source: Record<string, any>, taskType: WritingTaskType) {
  const totalMinutes = finiteNumber(source.totalMinutes ?? source.total_minutes);
  if (totalMinutes !== undefined) return Math.max(0, totalMinutes * 60);

  const totalSeconds = finiteNumber(source.totalSeconds ?? source.total_seconds);
  if (totalSeconds !== undefined) return Math.max(0, totalSeconds);

  return taskType === 'TASK_1' ? 1200 : 2400;
}

function resolveWritingPrepSeconds(source: Record<string, any>) {
  const prepSeconds = finiteNumber(source.prepSeconds ?? source.prep_seconds);
  if (prepSeconds !== undefined) return Math.max(0, prepSeconds);

  const prepMinutes = finiteNumber(source.prepMinutes ?? source.prep_minutes);
  if (prepMinutes !== undefined) return Math.max(0, prepMinutes * 60);

  return 0;
}

function booleanFlag(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  }

  return fallback;
}
