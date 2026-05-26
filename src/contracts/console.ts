import type { LocalDateTimeString, ModuleType } from './common';

export type ConsoleChartPoint = {
  label: string;
  value: number;
  [key: string]: unknown;
};

export type ConsoleQuickLink = {
  label: string;
  target: string;
  module?: ModuleType | string;
};

export type ConsoleRecentIssue = {
  id?: string | number;
  title?: string;
  module?: ModuleType | string;
  status?: string;
  createdTime?: LocalDateTimeString | null;
  [key: string]: unknown;
};

export type UserConsoleVO = {
  snapshotId?: string;
  snapshot_id?: string;
  snapshotTime?: LocalDateTimeString;
  snapshot_time?: LocalDateTimeString;
  profile: Record<string, unknown>;
  kpis: Record<string, unknown>;
  moduleStats?: Record<string, unknown> | unknown[];
  module_stats?: Record<string, unknown> | unknown[];
  recentRecords?: unknown[];
  recent_records?: unknown[];
  insights: Record<string, unknown>;
  charts?: Record<string, ConsoleChartPoint[] | unknown> | unknown[];
  [key: string]: unknown;
};

export type AdminConsoleVO = {
  snapshotId: string;
  snapshotTime: LocalDateTimeString;
  kpis: Record<string, unknown>;
  moduleStats: Record<string, unknown>;
  userStats: Record<string, unknown>;
  recentIssues: ConsoleRecentIssue[];
  quickLinks: ConsoleQuickLink[];
  leaderboards: unknown[];
  charts: Record<string, ConsoleChartPoint[] | unknown>;
};
