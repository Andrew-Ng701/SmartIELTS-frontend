import type { ModuleType, PageQuery, RecordState } from './common';

export type AdminRecordQuery = PageQuery & {
  recordState?: RecordState;
  module?: ModuleType;
  status?: string;
  userId?: number;
  sort?: string;
  [key: string]: unknown;
};

export type AdminUserScopedRecordQuery = Omit<AdminRecordQuery, 'userId'>;
