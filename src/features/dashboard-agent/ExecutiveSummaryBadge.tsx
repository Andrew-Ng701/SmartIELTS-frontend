import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/dashboardApi';
import { getApiErrorMessage } from '../../api/errors';
import type { DashboardExecutiveSummaryVO } from '../../contracts/dashboard';

type ExecutiveSummaryScope = 'user' | 'admin';

type ExecutiveSummaryBadgeProps = {
  scope: ExecutiveSummaryScope;
  timeRange?: string;
  targetUserId?: number;
};

type ExecutiveSummaryState = {
  status: 'loading' | 'ready' | 'error';
  message: string;
};

const SUMMARY_FALLBACK = 'Executive summary is available from the dashboard controller.';
const LOADING_MESSAGE = 'Loading executive summary';

export function ExecutiveSummaryBadge({ scope, targetUserId, timeRange = '30d' }: ExecutiveSummaryBadgeProps) {
  const [summaryState, setSummaryState] = useState<ExecutiveSummaryState>({
    status: 'loading',
    message: LOADING_MESSAGE,
  });

  useEffect(() => {
    let cancelled = false;
    setSummaryState({ status: 'loading', message: LOADING_MESSAGE });

    const request = scope === 'admin'
      ? dashboardApi.getAdminExecutiveSummary(targetUserId, timeRange)
      : dashboardApi.getUserExecutiveSummary(timeRange);

    request
      .then((summary) => {
        if (!cancelled) {
          setSummaryState({
            status: 'ready',
            message: normalizeExecutiveSummary(summary),
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSummaryState({
            status: 'error',
            message: getApiErrorMessage(error, 'Executive summary unavailable.'),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scope, targetUserId, timeRange]);

  const isLoading = summaryState.status === 'loading';
  const label = scope === 'admin' ? 'Admin executive summary' : 'User executive summary';

  return (
    <aside className={`executive-summary-badge executive-summary-badge-${scope} executive-summary-badge-${summaryState.status}`} aria-live="polite">
      <div className="executive-summary-head">
        <span className="executive-summary-live-dot" aria-hidden="true" />
        <strong>{label}</strong>
        {isLoading && <span className="executive-summary-spinner" aria-label="Loading executive summary" />}
      </div>
      <div className={`executive-summary-body ${isLoading ? 'executive-summary-loading-text' : ''}`}>
        {summaryState.message}
      </div>
    </aside>
  );
}

function normalizeExecutiveSummary(summary: DashboardExecutiveSummaryVO): string {
  if (typeof summary === 'string') return summary.trim() || SUMMARY_FALLBACK;
  if (!summary || typeof summary !== 'object') return SUMMARY_FALLBACK;

  const source = summary as Record<string, unknown>;
  const directValue = [
    source.summary,
    source.summaryText,
    source.summary_text,
    source.executiveSummary,
    source.executive_summary,
    source.answer,
    source.content,
    source.text,
    source.message,
  ].find((value) => typeof value === 'string' && value.trim());

  if (typeof directValue === 'string') return directValue.trim();

  const directSentences = source.summarySentences ?? source.summary_sentences;
  if (Array.isArray(directSentences)) {
    const sentenceText = directSentences
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map((value) => value.trim())
      .join(' ');
    if (sentenceText) return sentenceText;
  }

  const data = source.data;
  if (data && typeof data === 'object') {
    const dataSource = data as Record<string, unknown>;
    const dataValue = [
      dataSource.summary,
      dataSource.summaryText,
      dataSource.summary_text,
      dataSource.executiveSummary,
      dataSource.executive_summary,
      dataSource.answer,
      dataSource.content,
      dataSource.text,
      dataSource.message,
    ].find((value) => typeof value === 'string' && value.trim());
    if (typeof dataValue === 'string') return dataValue.trim();

    const dataSentences = dataSource.summarySentences ?? dataSource.summary_sentences;
    if (Array.isArray(dataSentences)) {
      const sentenceText = dataSentences
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .map((value) => value.trim())
        .join(' ');
      if (sentenceText) return sentenceText;
    }
  }

  return SUMMARY_FALLBACK;
}
