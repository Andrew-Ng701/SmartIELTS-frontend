import type { AdminConsoleVO } from '../../../contracts/console';
import {
  asRecord,
  dashboardModuleKey,
  normalizeUnknownCollection,
  numberValue,
  stringValue,
} from '../../user/console';
import type { DashboardModuleKey } from '../../user/console';

export type AdminOverviewView = 'overview' | 'users' | 'records' | 'reading' | 'listening' | 'writing' | 'speaking';

export type AdminDashboardModuleStat = {
  module: DashboardModuleKey;
  activeCount: number;
  deletedCount: number;
  totalCount: number;
  aiFailureCount: number;
};

export type AdminDashboardIssue = {
  module: DashboardModuleKey;
  type: string;
  recordId: number;
  questionId: number | null;
  aiStatus: string;
  aiProvider: string;
  aiModel: string;
  message: string;
  createdTime: string;
};

export type AdminDashboardLeaderboard = {
  userId: number;
  email: string;
  username: string | null;
  activeRecordCount: number;
  deletedRecordCount: number;
  totalRecordCount: number;
  lastActivityTime: string;
};

export type AdminDashboardSnapshot = {
  snapshotId: string;
  snapshotTime: string;
  kpis: {
    totalUsers: number;
    activeUsers: number;
    deletedUsers: number;
    totalActiveRecords: number;
    totalDeletedRecords: number;
    totalRecords: number;
    aiFailureCount: number;
  };
  moduleStats: AdminDashboardModuleStat[];
  recentIssues: AdminDashboardIssue[];
  quickLinks: Array<{
    code: AdminOverviewView;
    title: string;
  }>;
  leaderboards: AdminDashboardLeaderboard[];
};

export function mapAdminConsoleToSnapshot(raw: AdminConsoleVO): AdminDashboardSnapshot {
  const source = asRecord(raw);
  const kpis = asRecord(source.kpis);
  const moduleStats = normalizeUnknownCollection(source.moduleStats ?? source.module_stats).map((item) => {
    const stat = asRecord(item);
    return {
      module: dashboardModuleKey(stat.module ?? stat.moduleType ?? stat.module_type),
      activeCount: numberValue(stat.activeCount ?? stat.active_count),
      deletedCount: numberValue(stat.deletedCount ?? stat.deleted_count),
      totalCount: numberValue(stat.totalCount ?? stat.total_count),
      aiFailureCount: numberValue(stat.aiFailureCount ?? stat.ai_failure_count),
    };
  });

  return {
    snapshotId: stringValue(source.snapshotId ?? source.snapshot_id, 'admin-console'),
    snapshotTime: stringValue(source.snapshotTime ?? source.snapshot_time, new Date().toISOString()),
    kpis: {
      totalUsers: numberValue(kpis.totalUsers ?? kpis.total_users),
      activeUsers: numberValue(kpis.activeUsers ?? kpis.active_users),
      deletedUsers: numberValue(kpis.deletedUsers ?? kpis.deleted_users),
      totalActiveRecords: numberValue(kpis.totalActiveRecords ?? kpis.total_active_records),
      totalDeletedRecords: numberValue(kpis.totalDeletedRecords ?? kpis.total_deleted_records),
      totalRecords: numberValue(kpis.totalRecords ?? kpis.total_records),
      aiFailureCount: numberValue(kpis.aiFailureCount ?? kpis.ai_failure_count),
    },
    moduleStats,
    recentIssues: normalizeUnknownCollection(source.recentIssues ?? source.recent_issues).map((item, index) => {
      const issue = asRecord(item);
      return {
        module: dashboardModuleKey(issue.module ?? issue.moduleType ?? issue.module_type),
        type: stringValue(issue.type, 'AI'),
        recordId: Number(issue.recordId ?? issue.record_id ?? issue.id ?? index + 1),
        questionId: issue.questionId ?? issue.question_id ?? null,
        aiStatus: stringValue(issue.aiStatus ?? issue.ai_status ?? issue.status, 'FAILED'),
        aiProvider: stringValue(issue.aiProvider ?? issue.ai_provider, 'AI'),
        aiModel: stringValue(issue.aiModel ?? issue.ai_model, 'model'),
        message: stringValue(issue.message ?? issue.title, 'Issue requires review'),
        createdTime: stringValue(issue.createdTime ?? issue.created_time, source.snapshotTime),
      };
    }),
    quickLinks: normalizeUnknownCollection(source.quickLinks ?? source.quick_links).map((item) => {
      const link = asRecord(item);
      return {
        code: stringValue(link.code ?? link.target, 'records') as AdminOverviewView,
        title: stringValue(link.title ?? link.label, 'Open'),
      };
    }),
    leaderboards: normalizeUnknownCollection(source.leaderboards).map((item, index) => {
      const user = asRecord(item);
      return {
        userId: Number(user.userId ?? user.user_id ?? user.id ?? index + 1),
        email: stringValue(user.email, 'student@example.com'),
        username: user.username === undefined ? null : String(user.username),
        activeRecordCount: numberValue(user.activeRecordCount ?? user.active_record_count),
        deletedRecordCount: numberValue(user.deletedRecordCount ?? user.deleted_record_count),
        totalRecordCount: numberValue(user.totalRecordCount ?? user.total_record_count),
        lastActivityTime: stringValue(user.lastActivityTime ?? user.last_activity_time, source.snapshotTime),
      };
    }),
  };
}
