import type { WritingQuestionVO } from '../../../contracts/writing';
import { resolveApiAssetUrl } from '../../../lib/apiAssetUrl';

export type AdminWritingMedia = {
  id: string;
  name: string;
  kind: 'IMAGE' | 'PDF';
  size: string;
  file?: File;
  preview: string | null;
  objectKey?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
};

export type AdminWritingTaskType = 'TASK_1' | 'TASK_2';

export type AdminWritingQuestion = {
  id: string;
  taskType: AdminWritingTaskType;
  title: string;
  chartType?: string;
  expectedWords: number;
  totalSeconds: number;
  prepSeconds: number;
  description: string;
  media: AdminWritingMedia[];
  createdTime: string;
  updatedTime?: string;
  deletedTime: string | null;
};

export function createAdminWritingDraft(taskType: AdminWritingTaskType): AdminWritingQuestion {
  return {
    id: adminWritingId('w'),
    taskType,
    title: taskType === 'TASK_1' ? 'Academic Task 1 - New chart question' : 'Academic Task 2 - New essay question',
    chartType: taskType === 'TASK_1' ? 'Line graph' : undefined,
    expectedWords: taskType === 'TASK_1' ? 150 : 250,
    totalSeconds: taskType === 'TASK_1' ? 1200 : 2400,
    prepSeconds: 0,
    description: '',
    media: [],
    createdTime: adminWritingNow(),
    deletedTime: null,
  };
}

export function mapApiAdminWritingQuestion(raw: WritingQuestionVO | Record<string, unknown>): AdminWritingQuestion {
  const source = asRecord(raw);
  const taskType = normalizeWritingTaskType(
    source.taskType
      ?? source.task_type
      ?? source.questionType
      ?? source.question_type
      ?? source.type
      ?? source.task,
  );

  return {
    id: stringValue(source.id ?? source.questionId ?? source.question_id, adminWritingId('w')),
    taskType,
    title: stringValue(source.title ?? source.name, 'Writing question'),
    chartType: nullableString(source.chartType ?? source.chart_type),
    expectedWords: numberValue(source.expectedWords ?? source.expected_words, taskType === 'TASK_1' ? 150 : 250),
    totalSeconds: numberValue(
      source.totalSeconds ?? source.total_seconds,
      numberValue(source.totalMinutes ?? source.total_minutes, taskType === 'TASK_1' ? 20 : 40) * 60,
    ),
    prepSeconds: numberValue(
      source.prepSeconds ?? source.prep_seconds,
      numberValue(source.prepMinutes ?? source.prep_minutes, 0) * 60,
    ),
    description: stringValue(source.description ?? source.questionText ?? source.question_text),
    media: mapWritingMedia(source),
    createdTime: stringValue(source.createdTime ?? source.created_time, adminWritingNow()),
    updatedTime: stringValue(source.updatedTime ?? source.updated_time, ''),
    deletedTime: (source.deletedTime ?? source.deleted_time ?? null) as string | null,
  };
}

function normalizeWritingTaskType(value: unknown): AdminWritingTaskType {
  const normalized = stringValue(value, 'TASK_2').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'TASK_1' || normalized === 'TASK1' || normalized === 'PART_1' || normalized === '1') {
    return 'TASK_1';
  }

  return 'TASK_2';
}

export function buildWritingQuestionPayload(question: AdminWritingQuestion) {
  const description = question.description.trim();

  return {
    title: question.title,
    ...(description ? { description } : {}),
    taskType: question.taskType,
    chartType: question.taskType === 'TASK_1' ? question.chartType ?? null : null,
    totalMinutes: Math.round(question.totalSeconds / 60),
    prepSeconds: question.prepSeconds,
    images: question.media.filter((media) => !media.file).map((media) => ({
      objectKey: media.objectKey,
      fileUrl: media.preview,
      originalName: media.name,
      contentType: media.contentType,
      fileSize: media.fileSize,
      width: media.width,
      height: media.height,
      sortOrder: media.sortOrder,
    })),
  };
}

export function adminWritingNow() {
  return new Date().toISOString();
}

function adminWritingId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback = '') {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function mapWritingMedia(source: Record<string, any>): AdminWritingMedia[] {
  const images = normalizeUnknownCollection(source.images ?? source.questionImages ?? source.question_images);
  const mapped = images.map((image, index) => {
    const item = asRecord(image);
    const preview = resolveApiAssetUrl(item.fileUrl ?? item.file_url ?? item.url ?? item.imageUrl ?? item.image_url) ?? '';
    const name = stringValue(item.originalName ?? item.original_name ?? item.name, `Image ${index + 1}`);
    return {
      id: stringValue(item.objectKey ?? item.object_key ?? item.id, `image-${index + 1}`),
      name,
      kind: 'IMAGE' as const,
      size: item.fileSize || item.file_size ? formatBytes(Number(item.fileSize ?? item.file_size)) : '',
      preview,
      objectKey: stringValue(item.objectKey ?? item.object_key),
      contentType: stringValue(item.contentType ?? item.content_type),
      fileSize: Number(item.fileSize ?? item.file_size ?? 0) || undefined,
      width: Number(item.width ?? 0) || undefined,
      height: Number(item.height ?? 0) || undefined,
      sortOrder: Number(item.sortOrder ?? item.sort_order ?? index + 1),
    };
  });
  const fallbackImageUrl = resolveApiAssetUrl(source.imageUrl ?? source.image_url);
  if (!mapped.length && fallbackImageUrl) {
    mapped.push({
      id: stringValue(source.imageObjectKey ?? source.image_object_key, 'image-1'),
      name: 'Question image',
      kind: 'IMAGE',
      size: '',
      preview: fallbackImageUrl,
      objectKey: stringValue(source.imageObjectKey ?? source.image_object_key),
      contentType: '',
      fileSize: undefined,
      width: undefined,
      height: undefined,
      sortOrder: 1,
    });
  }
  return mapped;
}

function normalizeUnknownCollection(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const source = asRecord(value);
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.data)) return source.data;
  return [];
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

