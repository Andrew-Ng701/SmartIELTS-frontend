import type { UserConsoleVO } from '../../../contracts/console';

export type DashboardModuleKey = 'listening' | 'reading' | 'writing' | 'speaking';

export type DashboardRecordStatus = 'ACTIVE' | 'FAILED' | 'SUCCESS';
export type DashboardChartType = 'bar' | 'donut' | 'line' | 'radar';

export type DashboardRecentRecord = {
  module: DashboardModuleKey;
  recordId: number;
  title: string;
  summary: string;
  status: DashboardRecordStatus;
  createdTime: string;
};

export type DashboardModuleStat = {
  module: DashboardModuleKey;
  activeCount: number;
  deletedCount: number;
  totalCount: number;
  averageScore: number | null;
  targetScore: number | null;
  targetGap: number | null;
};

export type DashboardSnapshot = {
  snapshotId: string;
  snapshotTime: string;
  overview: {
    userId: number;
    email: string;
    username: string | null;
    lastLoginTime: string;
    consecutiveLoginDays: number;
    listeningTargetScore: number | null;
    readingTargetScore: number | null;
    writingTargetScore: number | null;
    speakingTargetScore: number | null;
  };
  kpis: {
    totalActiveRecords: number;
    totalDeletedRecords: number;
    totalRecords: number;
    recentActivityCount: number;
    targetAverageScore: number | null;
    overallTargetGap: number | null;
    aiPendingCount: number;
    aiFailedCount: number;
  };
  progressSummary: {
    listeningAverageScore: number;
    readingAverageScore: number;
    writingAverageScore: number;
    speakingAverageScore: number;
    overallAverageScore: number;
  };
  recentRecords: DashboardRecentRecord[];
  moduleStats: DashboardModuleStat[];
  insights: {
    bestModule: DashboardModuleKey;
    weakestModule: DashboardModuleKey;
    latestActivitySummary: string;
    aiIssueSummary: string;
  };
  charts: Array<{
    code: string;
    title: string;
    chartType: DashboardChartType;
  }>;
};

export function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

export function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function numberValue(value: unknown, fallback = 0) {
  const nextValue = nullableNumber(value);
  return nextValue ?? fallback;
}

export function stringValue(value: unknown, fallback = '') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

export function normalizeUnknownCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const source = asRecord(value);
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.data)) return source.data;
  if (Object.keys(source).length) return Object.values(source);
  return [];
}

function normalizeChartEntries(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((chart, index) => ({ key: `chart-${index + 1}`, chart: asRecord(chart) }));
  }

  const source = asRecord(value);
  return Object.entries(source).map(([key, chart]) => ({ key, chart: asRecord(chart) }));
}

function getChartCode(chart: Record<string, any>, fallback: string) {
  return stringValue(chart.code ?? chart.chartCode ?? chart.chart_code ?? chart.name ?? chart.id, fallback);
}

function findConsoleChart(value: unknown, code: string) {
  const normalizeCode = (item: string) => item.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetCode = normalizeCode(code);
  return normalizeChartEntries(value).find(({ key, chart }) => {
    const chartCode = normalizeCode(getChartCode(chart, key));
    const title = normalizeCode(stringValue(chart.title));
    return normalizeCode(key) === targetCode || chartCode === targetCode || title.includes(targetCode);
  })?.chart ?? {};
}

export function dashboardModuleKey(value: unknown): DashboardModuleKey {
  const normalized = stringValue(value, 'reading').toLowerCase();
  if (normalized.includes('listen')) return 'listening';
  if (normalized.includes('writ')) return 'writing';
  if (normalized.includes('speak')) return 'speaking';
  return 'reading';
}

export function formatNullableBand(value: number | null) {
  return value === null ? 'Not set' : value.toFixed(1);
}

export function formatDashboardModule(module: DashboardModuleKey) {
  return module.charAt(0).toUpperCase() + module.slice(1);
}

export function formatDashboardDate(value: string) {
  return value.slice(5, 10).replace('-', '/');
}

export function extractDashboardScore(summary: string) {
  const match = summary.match(/(?:Score|AI score|Overall score):\s*([0-9.]+)/i);
  return match ? Number(match[1]) : null;
}

function getRadarScores(chart: Record<string, any>) {
  const scores = new Map<DashboardModuleKey, number>();
  const indicators = normalizeUnknownCollection(chart.indicators);
  const values = normalizeUnknownCollection(chart.values);

  indicators.forEach((indicator, index) => {
    const indicatorRecord = asRecord(indicator);
    const module = dashboardModuleKey(indicatorRecord.module ?? indicatorRecord.label ?? indicatorRecord.name ?? indicator);
    const valueRecord = asRecord(values[index]);
    const score = nullableNumber(
      valueRecord.averageScore
      ?? valueRecord.average_score
      ?? valueRecord.value
      ?? valueRecord.score
      ?? values[index],
    );
    if (score !== null) scores.set(module, score);
  });

  const dimensionKey = stringValue(chart.dimensionKey ?? chart.dimension_key, 'module');
  const yKey = stringValue(chart.yKey ?? chart.y_key, 'average_score');

  normalizeUnknownCollection(chart.rows).forEach((row) => {
    const item = asRecord(row);
    const score = nullableNumber(item[yKey] ?? item.averageScore ?? item.average_score ?? item.value ?? item.score);
    if (score !== null) scores.set(dashboardModuleKey(item[dimensionKey] ?? item.module ?? item.moduleType ?? item.module_type), score);
  });

  normalizeUnknownCollection(chart.series).forEach((series) => {
    const item = asRecord(series);
    const score = nullableNumber(item[yKey] ?? item.averageScore ?? item.average_score ?? item.value ?? item.score);
    if (score !== null) scores.set(dashboardModuleKey(item[dimensionKey] ?? item.module ?? item.moduleType ?? item.module_type ?? item.name ?? item.label), score);
  });

  return scores;
}

function getModuleAverage(
  module: DashboardModuleKey,
  progress: Record<string, any>,
  radarScores: Map<DashboardModuleKey, number>,
  moduleStats: DashboardModuleStat[],
) {
  const progressScore = nullableNumber(progress[`${module}AverageScore`] ?? progress[`${module}_average_score`]);
  if (progressScore !== null) return progressScore;

  const radarScore = radarScores.get(module);
  if (radarScore !== undefined) return radarScore;

  return moduleStats.find((item) => item.module === module)?.averageScore ?? 0;
}

export function mapUserConsoleToDashboardSnapshot(raw: UserConsoleVO): DashboardSnapshot {
  const source = asRecord(raw);
  const profile = asRecord(source.profile ?? source.overview);
  const kpis = asRecord(source.kpis);
  const progress = asRecord(source.progressSummary ?? source.progress_summary);
  const moduleStats = normalizeUnknownCollection(source.moduleStats ?? source.module_stats).map((item) => {
    const stat = asRecord(item);
    return {
      module: dashboardModuleKey(stat.module ?? stat.moduleType ?? stat.module_type),
      activeCount: numberValue(stat.activeCount ?? stat.active_count),
      deletedCount: numberValue(stat.deletedCount ?? stat.deleted_count),
      totalCount: numberValue(stat.totalCount ?? stat.total_count),
      averageScore: nullableNumber(stat.averageScore ?? stat.average_score),
      targetScore: nullableNumber(stat.targetScore ?? stat.target_score),
      targetGap: nullableNumber(stat.targetGap ?? stat.target_gap),
    };
  });
  const radarScores = getRadarScores(findConsoleChart(source.charts, 'scoreRadar'));
  const recentRecords = normalizeUnknownCollection(source.recentRecords ?? source.recent_records).map((item, index) => {
    const record = asRecord(item);
    return {
      module: dashboardModuleKey(record.module ?? record.moduleType ?? record.module_type),
      recordId: Number(record.recordId ?? record.record_id ?? record.id ?? index + 1),
      title: stringValue(record.title ?? record.name, 'Practice record'),
      summary: stringValue(record.summary ?? record.status, 'Submitted'),
      status: ['FAILED', 'SUCCESS'].includes(stringValue(record.status).toUpperCase())
        ? stringValue(record.status).toUpperCase() as DashboardRecordStatus
        : 'ACTIVE',
      createdTime: stringValue(record.createdTime ?? record.created_time ?? record.updatedTime ?? record.updated_time, source.snapshotTime),
    };
  });
  const insights = asRecord(source.insights);

  return {
    snapshotId: stringValue(source.snapshotId ?? source.snapshot_id, 'user-console'),
    snapshotTime: stringValue(source.snapshotTime ?? source.snapshot_time, new Date().toISOString()),
    overview: {
      userId: Number(profile.userId ?? profile.user_id ?? profile.id ?? 0),
      email: stringValue(profile.email, 'student@example.com'),
      username: profile.username === undefined ? null : String(profile.username),
      lastLoginTime: stringValue(profile.lastLoginTime ?? profile.last_login_time, source.snapshotTime),
      consecutiveLoginDays: numberValue(profile.consecutiveLoginDays ?? profile.consecutive_login_days),
      listeningTargetScore: nullableNumber(profile.listeningTargetScore ?? profile.listening_target_score),
      readingTargetScore: nullableNumber(profile.readingTargetScore ?? profile.reading_target_score),
      writingTargetScore: nullableNumber(profile.writingTargetScore ?? profile.writing_target_score),
      speakingTargetScore: nullableNumber(profile.speakingTargetScore ?? profile.speaking_target_score),
    },
    kpis: {
      totalActiveRecords: numberValue(kpis.totalActiveRecords ?? kpis.total_active_records),
      totalDeletedRecords: numberValue(kpis.totalDeletedRecords ?? kpis.total_deleted_records),
      totalRecords: numberValue(kpis.totalRecords ?? kpis.total_records),
      recentActivityCount: numberValue(kpis.recentActivityCount ?? kpis.recent_activity_count),
      targetAverageScore: nullableNumber(kpis.targetAverageScore ?? kpis.target_average_score),
      overallTargetGap: nullableNumber(kpis.overallTargetGap ?? kpis.overall_target_gap),
      aiPendingCount: numberValue(kpis.aiPendingCount ?? kpis.ai_pending_count),
      aiFailedCount: numberValue(kpis.aiFailedCount ?? kpis.ai_failed_count),
    },
    progressSummary: {
      listeningAverageScore: getModuleAverage('listening', progress, radarScores, moduleStats),
      readingAverageScore: getModuleAverage('reading', progress, radarScores, moduleStats),
      writingAverageScore: getModuleAverage('writing', progress, radarScores, moduleStats),
      speakingAverageScore: getModuleAverage('speaking', progress, radarScores, moduleStats),
      overallAverageScore: numberValue(progress.overallAverageScore ?? progress.overall_average_score ?? kpis.overallAverageScore ?? kpis.overall_average_score ?? kpis.overallAverage ?? kpis.overall_average),
    },
    recentRecords,
    moduleStats,
    insights: {
      bestModule: dashboardModuleKey(insights.bestModule ?? insights.best_module),
      weakestModule: dashboardModuleKey(insights.weakestModule ?? insights.weakest_module),
      latestActivitySummary: stringValue(insights.latestActivitySummary ?? insights.latest_activity_summary, 'No recent activity'),
      aiIssueSummary: stringValue(insights.aiIssueSummary ?? insights.ai_issue_summary, 'No AI issues'),
    },
    charts: normalizeChartEntries(source.charts).map(({ key, chart }, index) => {
      const item = asRecord(chart);
      return {
        code: getChartCode(item, key || `chart-${index + 1}`),
        title: stringValue(item.title, 'Console chart'),
        chartType: stringValue(item.chartType ?? item.chart_type, 'bar') as DashboardChartType,
      };
    }),
  };
}
