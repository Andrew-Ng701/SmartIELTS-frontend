import type { ModuleType, PageResult, RecordState, SortDirection } from '../../../contracts/common';
import type { UnifiedRecordStatus, UserRecordListItemVO } from '../../../contracts/records';

export const RECORDS_PAGE_SIZE = 20;

export type UserRecord = {
  id: number;
  title: string;
  module: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
  status: 'Completed' | 'In progress' | 'Reviewed' | 'Draft';
  score: string;
  numericScore: number | null;
  updatedAt: string;
  sortTime: string;
  isDeleted: 0 | 1;
  deletedAt: string | null;
  action: string;
};

export type RecordScope = 'active' | 'deleted';

export type RecordSortField = 'time' | 'score';

export type AdminRecordRow = UserRecord & {
  userId: number;
  userEmail: string;
};

export function compareRecordsBySort(a: UserRecord, b: UserRecord, sortField: RecordSortField, sortDirection: 'ASC' | 'DESC') {
  const direction = sortDirection === 'ASC' ? 1 : -1;
  if (sortField === 'score') {
    const aScore = a.numericScore ?? -1;
    const bScore = b.numericScore ?? -1;
    return (aScore - bScore) * direction;
  }

  return (new Date(a.sortTime).getTime() - new Date(b.sortTime).getTime()) * direction;
}

export function normalizePageList<T>(value: PageResult<T> | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.list ?? [];
}

export function moduleLabelToApi(module: UserRecord['module']): ModuleType {
  return module.toUpperCase() as ModuleType;
}

export function apiModuleToLabel(module: unknown): UserRecord['module'] {
  const normalized = stringValue(module, 'READING').toUpperCase();
  if (normalized === 'LISTENING') return 'Listening';
  if (normalized === 'WRITING') return 'Writing';
  if (normalized === 'SPEAKING') return 'Speaking';
  return 'Reading';
}

export function apiStatusToUserRecordStatus(status: unknown): UserRecord['status'] {
  const normalized = stringValue(status, '').toUpperCase();
  if (['IN_PROGRESS', 'PROCESSING', 'RECEIVED', 'PENDING', 'STARTED'].includes(normalized)) return 'In progress';
  if (['SCORED', 'SUCCESS', 'REVIEWED'].includes(normalized)) return 'Reviewed';
  if (['DRAFT', 'PAUSED'].includes(normalized)) return 'Draft';
  return 'Completed';
}

export function userStatusToApi(status: 'All' | UserRecord['status']): UnifiedRecordStatus | undefined {
  if (status === 'All') return undefined;
  if (status === 'In progress') return 'PROCESSING';
  if (status === 'Reviewed') return 'SCORED';
  if (status === 'Draft') return 'PENDING';
  return 'COMPLETED';
}

export function recordScopeToApi(scope: RecordScope): RecordState {
  return scope === 'deleted' ? 'DELETED' : 'ACTIVE';
}

export function recordSortToApi(sortField: RecordSortField, sortDirection: SortDirection) {
  if (sortField === 'score') return `SCORE_${sortDirection}` as const;
  return `UPDATED_${sortDirection}` as const;
}

export function mapApiRecordToUserRecord(raw: UserRecordListItemVO | Record<string, any>): UserRecord {
  const source = asRecord(raw);
  const module = apiModuleToLabel(source.module ?? source.moduleType ?? source.module_type);
  const score = nullableNumber(source.score ?? source.aiScore ?? source.overallScore ?? source.bandScore);
  const updatedTime = stringValue(source.updatedTime ?? source.updated_time ?? source.createdTime ?? source.created_time, new Date().toISOString());
  const isDeleted = Number(source.isDeleted ?? source.is_deleted ?? (source.deletedTime || source.deleted_time ? 1 : 0)) as 0 | 1;

  return {
    id: Number(source.recordId ?? source.record_id ?? source.id ?? 0),
    title: stringValue(source.name ?? source.title ?? `${module} record`),
    module,
    status: apiStatusToUserRecordStatus(source.status ?? source.aiStatus ?? source.answerStatus),
    score: score === null ? 'Pending' : module === 'Reading' || module === 'Listening' ? `${Math.round(score)}/40` : score.toFixed(1),
    numericScore: score,
    updatedAt: displayTime(updatedTime),
    sortTime: updatedTime,
    isDeleted,
    deletedAt: isDeleted ? displayTime(source.deletedTime ?? source.deleted_time ?? null) : null,
    action: 'Review answers',
  };
}

export function mapApiRecordToAdminRecord(raw: unknown): AdminRecordRow {
  const source = asRecord(raw);
  const record = mapApiRecordToUserRecord(source);
  const userId = Number(source.userId ?? source.user_id ?? source.ownerId ?? 0);
  return {
    ...record,
    userId,
    userEmail: stringValue(source.userEmail ?? source.user_email ?? source.email, userId ? `user-${userId}` : 'Unknown user'),
  };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringValue(value: unknown, fallback = '') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function displayTime(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

