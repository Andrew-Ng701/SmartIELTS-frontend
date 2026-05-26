import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { consoleApi } from '../../../api/consoleApi';
import { getApiErrorMessage } from '../../../api/errors';
import { ExecutiveSummaryBadge } from '../../dashboard-agent/ExecutiveSummaryBadge';
import {
  extractDashboardScore,
  formatDashboardModule,
  formatNullableBand,
  mapUserConsoleToDashboardSnapshot,
} from './dashboardModel';
import type { DashboardModuleKey, DashboardModuleStat, DashboardRecentRecord, DashboardSnapshot } from './dashboardModel';

export function DashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    consoleApi.getUserConsole()
      .then((data) => {
        if (!cancelled) {
          setSnapshot(mapUserConsoleToDashboardSnapshot(data));
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSnapshot(null);
          setErrorMessage(getApiErrorMessage(error, 'Unable to load dashboard data.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMessage) {
    return (
      <PageFrame
        eyebrow="User overview"
        title="Dashboard snapshot"
        description="SmartIELTS could not load your dashboard from the backend."
        action={<ExecutiveSummaryBadge scope="user" />}
      >
        <div className="rounded bg-white p-6 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-100">
          {errorMessage}
        </div>
      </PageFrame>
    );
  }

  if (!snapshot) {
    return (
      <PageFrame
        eyebrow="User overview"
        title="Dashboard snapshot"
        description="Loading your SmartIELTS console data."
        action={<ExecutiveSummaryBadge scope="user" />}
      >
        <div className="rounded bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-black/5">
          Loading dashboard...
        </div>
      </PageFrame>
    );
  }

  const targets = [
    { label: 'Reading', value: formatNullableBand(snapshot.overview.readingTargetScore) },
    { label: 'Listening', value: formatNullableBand(snapshot.overview.listeningTargetScore) },
    { label: 'Writing', value: formatNullableBand(snapshot.overview.writingTargetScore) },
    { label: 'Speaking', value: formatNullableBand(snapshot.overview.speakingTargetScore) },
  ];
  const radarScores = [
    { module: 'listening' as const, score: snapshot.progressSummary.listeningAverageScore },
    { module: 'reading' as const, score: snapshot.progressSummary.readingAverageScore },
    { module: 'writing' as const, score: snapshot.progressSummary.writingAverageScore },
    { module: 'speaking' as const, score: snapshot.progressSummary.speakingAverageScore },
  ];

  return (
    <PageFrame
      eyebrow="User overview"
      title="Dashboard snapshot"
      description=""
      action={<ExecutiveSummaryBadge scope="user" />}
    >
      <div className="dashboard-compact-grid">
        <DashboardKpiCard label="Total records" value={String(snapshot.kpis.totalRecords)} detail={`${snapshot.kpis.totalDeletedRecords} recoverable`} />
        <DashboardKpiCard label="Overall average" value={snapshot.progressSummary.overallAverageScore.toFixed(2)} detail="Across four modules" />
        <DashboardKpiCard label="AI issues" value={String(snapshot.kpis.aiFailedCount)} detail={`${snapshot.kpis.aiPendingCount} pending reviews`} />
        <DashboardKpiCard label="Login streak" value={String(snapshot.overview.consecutiveLoginDays)} detail="Consecutive login days" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <DashboardTargetsCard targets={targets} />
        <DashboardModuleStats stats={snapshot.moduleStats} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <DashboardRadarChart scores={radarScores} />
        <DashboardTrendChart records={snapshot.recentRecords} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <DashboardActivityChart stats={snapshot.moduleStats} />
        <DashboardInsightsCard snapshot={snapshot} />
      </div>
    </PageFrame>
  );
}

function DashboardKpiCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="dashboard-card dashboard-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function DashboardTargetsCard({ targets }: { targets: Array<{ label: string; value: string }> }) {
  return (
    <article className="dashboard-card dashboard-target-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">IELTS targets</span>
        <small>Goal bands</small>
      </div>
      <div className="dashboard-target-list">
        {targets.map((target) => (
          <div key={target.label}>
            <span>{target.label}</span>
            <strong>{target.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function DashboardModuleStats({ stats }: { stats: DashboardModuleStat[] }) {
  const maxCount = Math.max(...stats.map((item) => item.activeCount + item.deletedCount), 1);
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">Module stats</span>
        <small>Active + deleted records</small>
      </div>
      <div className="dashboard-module-stat-list">
        {stats.map((item) => {
          const total = item.activeCount + item.deletedCount;
          return (
            <article key={item.module}>
              <div>
                <strong>{formatDashboardModule(item.module)}</strong>
                <span>{item.activeCount} active · {item.deletedCount} deleted · avg {formatNullableBand(item.averageScore)}</span>
              </div>
              <div className="dashboard-module-bar" aria-hidden="true">
                <i style={{ width: `${(total / maxCount) * 100}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DashboardRadarChart({ scores }: { scores: Array<{ module: DashboardModuleKey; score: number }> }) {
  const center = 95;
  const maxRadius = 70;
  const points = scores.map((item, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / scores.length;
    const radius = (item.score / 9) * maxRadius;
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (maxRadius + 18),
      labelY: center + Math.sin(angle) * (maxRadius + 18),
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <section className="dashboard-card dashboard-chart-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">Score radar</span>
        <small>Average bands</small>
      </div>
      <div className="dashboard-radar-layout">
        <svg className="dashboard-radar" viewBox="0 0 190 190" role="img" aria-label="Average score radar chart">
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <circle key={scale} cx={center} cy={center} r={maxRadius * scale} fill="none" stroke="#e8e1da" />
          ))}
          {points.map((point) => <line key={point.module} x1={center} y1={center} x2={point.labelX} y2={point.labelY} stroke="#e8e1da" />)}
          <polygon points={polygon} fill="rgb(229 106 46 / 22%)" stroke="#e56a2e" strokeWidth="2" />
          {points.map((point) => <circle key={`${point.module}-dot`} cx={point.x} cy={point.y} r="3.5" fill="#e56a2e" />)}
          {points.map((point) => (
            <text key={`${point.module}-label`} x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle">
              {formatDashboardModule(point.module).slice(0, 1)}
            </text>
          ))}
        </svg>
        <div className="dashboard-score-list">
          {scores.map((item) => (
            <div key={item.module}>
              <span>{formatDashboardModule(item.module)}</span>
              <strong>{item.score.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardTrendChart({ records }: { records: DashboardRecentRecord[] }) {
  const scoredRecords = records
    .map((record) => ({ ...record, score: extractDashboardScore(record.summary) }))
    .filter((record): record is DashboardRecentRecord & { score: number } => record.score !== null)
    .slice()
    .reverse();
  const maxScore = 9;

  return (
    <section className="dashboard-card dashboard-chart-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">Score trend</span>
        <small>{scoredRecords.length} scored records</small>
      </div>
      <div className="dashboard-trend-bars">
        {scoredRecords.map((record) => (
          <div key={`${record.module}-${record.recordId}`}>
            <span>{record.score.toFixed(1)}</span>
            <i style={{ height: `${Math.max(8, (record.score / maxScore) * 100)}%` }} />
            <small>{formatDashboardModule(record.module).slice(0, 1)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardActivityChart({ stats }: { stats: DashboardModuleStat[] }) {
  const maxCount = Math.max(...stats.map((item) => item.totalCount), 1);

  return (
    <section className="dashboard-card dashboard-chart-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">Module activity</span>
        <small>Active and deleted records</small>
      </div>
      <div className="dashboard-stacked-bars">
        {stats.map((item) => (
          <article key={item.module}>
            <div>
              <strong>{formatDashboardModule(item.module)}</strong>
              <span>{item.totalCount} total</span>
            </div>
            <div className="dashboard-stacked-bar" aria-label={`${formatDashboardModule(item.module)} ${item.activeCount} active and ${item.deletedCount} deleted records`}>
              <i className="dashboard-stacked-active" style={{ width: `${(item.activeCount / maxCount) * 100}%` }} />
              <i className="dashboard-stacked-deleted" style={{ width: `${(item.deletedCount / maxCount) * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardInsightsCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const items = [
    ['Best module', formatDashboardModule(snapshot.insights.bestModule)],
    ['Weakest module', formatDashboardModule(snapshot.insights.weakestModule)],
    ['Latest activity', snapshot.insights.latestActivitySummary],
    ['AI summary', snapshot.insights.aiIssueSummary],
  ];

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-head">
        <span className="dashboard-chip">Insights</span>
        <small>{snapshot.kpis.recentActivityCount} recent activities</small>
      </div>
      <div className="dashboard-insight-list">
        {items.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageFrame({
  action,
  eyebrow,
  title,
  description,
  children,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="dashboard-title-row">
        <div className="max-w-3xl">
          <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
          {description && <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>}
        </div>
      </div>
      {action}
      {children}
    </section>
  );
}
