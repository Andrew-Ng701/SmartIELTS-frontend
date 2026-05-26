import type { ReactNode } from 'react';
import { useState } from 'react';
import { ExecutiveSummaryBadge } from '../../dashboard-agent/ExecutiveSummaryBadge';
import { formatDashboardModule } from '../../user/console';
import type { AdminDashboardModuleStat, AdminDashboardSnapshot } from './adminOverviewModel';

type AdminOverviewContentExam = {
  module: string;
  deletedTime?: string | null;
};

type AdminOverviewContentItem = {
  deletedTime?: string | null;
};

export function AdminOverviewPage({
  exams,
  snapshot,
  speakingTopics,
  writingQuestions,
}: {
  exams: AdminOverviewContentExam[];
  snapshot: AdminDashboardSnapshot | null;
  speakingTopics: AdminOverviewContentItem[];
  writingQuestions: AdminOverviewContentItem[];
}) {
  const liveContentStats = [
    { label: 'Reading papers', value: String(exams.filter((exam) => !exam.deletedTime && exam.module === 'Reading').length) },
    { label: 'Listening papers', value: String(exams.filter((exam) => !exam.deletedTime && exam.module === 'Listening').length) },
    { label: 'Writing prompts', value: String(writingQuestions.filter((question) => !question.deletedTime).length) },
    { label: 'Speaking topics', value: String(speakingTopics.filter((topic) => !topic.deletedTime).length) },
  ];
  const currentTimeLabel = formatHongKongSnapshotTime(new Date());

  return (
    <div className="admin-grid">
      <AdminOverviewSectionHeader
        title="Admin Dashboard"
        description={snapshot ? `Snapshot ${currentTimeLabel}` : 'Loading current admin snapshot.'}
        action={<ExecutiveSummaryBadge scope="admin" />}
      />
      {!snapshot && <div className="admin-card">Loading admin console...</div>}
      {snapshot && (
        <>
          <section className="admin-grid admin-grid-5">
            <AdminOverviewKpi label="Total users" value={String(snapshot.kpis.totalUsers)} detail={`${snapshot.kpis.activeUsers} active, ${snapshot.kpis.deletedUsers} deleted`} />
            <AdminOverviewKpi label="Active records" value={String(snapshot.kpis.totalActiveRecords)} detail="Visible practice records" />
            <AdminOverviewKpi label="Deleted records" value={String(snapshot.kpis.totalDeletedRecords)} detail="Recoverable record count" />
            <AdminOverviewKpi label="Total records" value={String(snapshot.kpis.totalRecords)} detail="All modules combined" />
            <AdminOverviewKpi label="AI failures" value={String(snapshot.kpis.aiFailureCount)} detail="Recent scoring/OCR issues" />
          </section>

          <section className="admin-card">
            <div className="admin-toolbar">
              <div>
                <h2 className="text-2xl font-bold">Module records</h2>
                <div className="admin-sub">Active and deleted practice records across each IELTS module.</div>
              </div>
              <span className="admin-pill admin-pill-primary">Records</span>
            </div>
            <div className="admin-divider" />
            <AdminDashboardModuleBars stats={snapshot.moduleStats} />
          </section>

          <section className="admin-grid admin-grid-2">
            <div className="admin-card">
              <div className="admin-toolbar">
                <div>
                  <h2 className="text-2xl font-bold">Module total records</h2>
                  <div className="admin-sub">Share of total records by module.</div>
                </div>
                <span className="admin-pill admin-pill-primary">Totals</span>
              </div>
              <div className="admin-divider" />
              <AdminDashboardDonut stats={snapshot.moduleStats} />
            </div>
            <div className="admin-card">
              <div className="admin-toolbar">
                <div>
                  <h2 className="text-2xl font-bold">AI failures by module</h2>
                  <div className="admin-sub">Modules that need scoring or OCR attention.</div>
                </div>
                <span className="admin-pill admin-pill-danger">Issues</span>
              </div>
              <div className="admin-divider" />
              <AdminDashboardFailureBars stats={snapshot.moduleStats} />
            </div>
          </section>

          <section className="admin-grid admin-grid-2">
            <div className="admin-card">
              <div className="admin-toolbar">
                <div>
                  <h2 className="text-2xl font-bold">Recent issues</h2>
                  <div className="admin-sub">Latest AI failure records with provider and model context.</div>
                </div>
                <span className="admin-pill admin-pill-danger">{snapshot.recentIssues.length} issues</span>
              </div>
              <div className="admin-divider" />
              <div className="admin-issue-list">
                {snapshot.recentIssues.map((issue) => <AdminIssueRow key={`${issue.module}-${issue.recordId}`} issue={issue} />)}
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-toolbar">
                <div>
                  <h2 className="text-2xl font-bold">Leaderboard</h2>
                  <div className="admin-sub">Top users by total practice records.</div>
                </div>
                <span className="admin-pill admin-pill-blue">Top {snapshot.leaderboards.length}</span>
              </div>
              <div className="admin-divider" />
              <div className="admin-leaderboard-list">
                {snapshot.leaderboards.map((user, index) => (
                  <article key={user.userId} className="admin-leaderboard-row">
                    <span>{index + 1}</span>
                    <div className="admin-leaderboard-user">
                      <strong>{user.username ?? user.email}</strong>
                      <small className="admin-leaderboard-meta">ID {user.userId}  Active {user.activeRecordCount}  Deleted {user.deletedRecordCount}</small>
                    </div>
                    <b>{user.totalRecordCount}</b>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="admin-grid">
        <div className="admin-card admin-content-health-card">
          <h2 className="text-2xl font-bold">Content library health</h2>
          <div className="admin-sub">Current content volume available for learner practice.</div>
          <div className="admin-divider" />
          <div className="admin-grid admin-grid-4">
            {liveContentStats.map((item) => (
              <AdminOverviewMiniMetric key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminOverviewSectionHeader({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <div className="admin-section-header">
      <div>
        <h1>{title}</h1>
        <p className="admin-section-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

function AdminOverviewKpi({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="admin-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function AdminIssueRow({ issue }: { issue: AdminDashboardSnapshot['recentIssues'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const detail = {
    module: formatDashboardModule(issue.module),
    recordId: issue.recordId,
    questionId: issue.questionId,
    status: issue.aiStatus,
    provider: issue.aiProvider,
    model: issue.aiModel,
    createdTime: adminOverviewDisplayTime(issue.createdTime),
    message: issue.message,
  };

  return (
    <article className="admin-issue-row">
      <div>
        <strong>{formatDashboardModule(issue.module)} record #{issue.recordId}</strong>
        <pre className={`admin-json-preview ${expanded ? 'admin-json-preview-expanded' : ''}`}>
          {JSON.stringify(detail, null, 2)}
        </pre>
        <button className="admin-link-button" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show fewer details' : 'Show more details'}
        </button>
      </div>
      <span className="admin-pill admin-pill-danger">{issue.aiStatus}</span>
    </article>
  );
}

function AdminOverviewMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminDashboardModuleBars({ stats }: { stats: AdminDashboardModuleStat[] }) {
  const maxCount = Math.max(...stats.map((item) => item.totalCount), 1);
  return (
    <div className="admin-dashboard-bars">
      {stats.map((item) => (
        <article key={item.module}>
          <div>
            <strong>{formatDashboardModule(item.module)}</strong>
            <span>{item.activeCount} active · {item.deletedCount} deleted · {item.totalCount} total</span>
          </div>
          <div className="admin-dashboard-bar">
            <i className="admin-dashboard-bar-active" style={{ width: `${(item.activeCount / maxCount) * 100}%` }} />
            <i className="admin-dashboard-bar-deleted" style={{ width: `${(item.deletedCount / maxCount) * 100}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminDashboardDonut({ stats }: { stats: AdminDashboardModuleStat[] }) {
  const total = Math.max(stats.reduce((sum, item) => sum + item.totalCount, 0), 1);
  let cursor = 0;
  const colors = ['#e56a2e', '#6995b1', '#f1bd03', '#74c987'];
  const gradient = stats.map((item, index) => {
    const start = cursor;
    cursor += (item.totalCount / total) * 100;
    return `${colors[index]} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="admin-donut-layout">
      <div className="admin-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <span>{total}</span>
      </div>
      <div className="admin-donut-legend">
        {stats.map((item, index) => (
          <div key={item.module}>
            <i style={{ background: colors[index] }} />
            <span>{formatDashboardModule(item.module)}</span>
            <strong>{item.totalCount}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboardFailureBars({ stats }: { stats: AdminDashboardModuleStat[] }) {
  const maxFailure = Math.max(...stats.map((item) => item.aiFailureCount), 1);
  return (
    <div className="admin-failure-bars">
      {stats.map((item) => (
        <article key={item.module}>
          <span>{formatDashboardModule(item.module)}</span>
          <div className="admin-failure-track">
            <i style={{ width: `${(item.aiFailureCount / maxFailure) * 100}%` }} />
          </div>
          <strong>{item.aiFailureCount}</strong>
        </article>
      ))}
    </div>
  );
}

function adminOverviewDisplayTime(value?: string | null) {
  if (!value) return 'N/A';
  return value.replace('T', ' ').slice(0, 16);
}

function formatHongKongSnapshotTime(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}`;
}

