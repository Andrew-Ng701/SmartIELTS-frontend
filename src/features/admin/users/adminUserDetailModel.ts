import type { AdminUserRecordListItemVO } from '../../../contracts/user';
import { mapApiRecordToAdminRecord } from '../../user/records';
import type { AdminRecordRow, UserRecord } from '../../user/records';

export type AdminUserDetailUser = {
  id: number;
  email: string;
  username?: string | null;
  role?: 'USER' | 'ADMIN';
  isDeleted?: 0 | 1;
  deletedTime?: string | null;
  createdTime?: string | null;
  lastLoginTime?: string | null;
  consecutiveLoginDays: number;
  readingActiveRecordCount: number;
  listeningActiveRecordCount: number;
  writingActiveRecordCount: number;
  speakingActiveRecordCount: number;
  totalActiveRecordCount: number;
  totalDeletedRecordCount: number;
};

export type AdminUserModuleSummary = {
  active: number;
  completed: number;
  deleted: number;
  target: string;
};

export function mapAdminUserRecordToRow(raw: AdminUserRecordListItemVO | Record<string, any>, user: Pick<AdminUserDetailUser, 'id' | 'email'>): AdminRecordRow {
  return mapApiRecordToAdminRecord({
    ...raw,
    userId: (raw as Record<string, any>).userId ?? (raw as Record<string, any>).user_id ?? user.id,
    userEmail: (raw as Record<string, any>).userEmail ?? (raw as Record<string, any>).user_email ?? user.email,
  });
}

export function getAdminUserDisplayName(user: Pick<AdminUserDetailUser, 'email' | 'id'> & { username?: string | null }) {
  return user.username?.trim() || user.email.split('@')[0] || `User ${user.id}`;
}

export function getAdminUserModuleSummary(user: AdminUserDetailUser, module: UserRecord['module']): AdminUserModuleSummary {
  const activeMap: Record<UserRecord['module'], number> = {
    Reading: numberValue(user.readingActiveRecordCount),
    Listening: numberValue(user.listeningActiveRecordCount),
    Writing: numberValue(user.writingActiveRecordCount),
    Speaking: numberValue(user.speakingActiveRecordCount),
  };
  const targetMap: Record<UserRecord['module'], string> = {
    Reading: '7.0',
    Listening: '7.0',
    Writing: '6.5',
    Speaking: '6.5',
  };
  const active = activeMap[module];
  const activeTotal = user.readingActiveRecordCount + user.listeningActiveRecordCount + user.writingActiveRecordCount + user.speakingActiveRecordCount;
  const deleted = activeTotal > 0 ? Math.round((active / activeTotal) * user.totalDeletedRecordCount) : 0;

  return {
    active,
    completed: active + deleted,
    deleted,
    target: targetMap[module],
  };
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

