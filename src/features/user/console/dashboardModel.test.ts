import { describe, expect, test } from 'vitest';
import { mapUserConsoleToDashboardSnapshot } from './dashboardModel';

describe('dashboard model mapping', () => {
  test('maps snake_case user console payload into dashboard snapshot fields', () => {
    const snapshot = mapUserConsoleToDashboardSnapshot({
      snapshot_id: 'snap-1',
      snapshot_time: '2026-05-15T10:00:00',
      profile: {
        id: 7,
        email: 'student@example.com',
        username: 'Student',
        last_login_time: '2026-05-14T09:00:00',
        consecutive_login_days: 6,
        reading_target_score: 7,
      },
      kpis: {
        total_active_records: 4,
        total_deleted_records: 1,
        total_records: 5,
        recent_activity_count: 3,
        ai_pending_count: 2,
        ai_failed_count: 1,
      },
      progress_summary: {
        listening_average_score: 6,
        reading_average_score: 7,
        writing_average_score: 6.5,
        speaking_average_score: 6,
        overall_average_score: 6.38,
      },
      module_stats: [
        {
          module: 'READING',
          active_count: 3,
          deleted_count: 1,
          total_count: 4,
          average_score: 7,
        },
      ],
      recent_records: [
        {
          module: 'WRITING',
          record_id: 10,
          title: 'Essay',
          summary: 'AI score: 6.5',
          status: 'SUCCESS',
          created_time: '2026-05-13T08:00:00',
        },
      ],
      insights: {
        best_module: 'READING',
        weakest_module: 'WRITING',
        latest_activity_summary: 'Essay submitted',
        ai_issue_summary: 'pending=2, failed=1',
      },
      charts: [{ code: 'scoreTrend', title: 'Score trend', chart_type: 'line' }],
    });

    expect(snapshot.snapshotId).toBe('snap-1');
    expect(snapshot.overview.userId).toBe(7);
    expect(snapshot.overview.consecutiveLoginDays).toBe(6);
    expect(snapshot.overview.readingTargetScore).toBe(7);
    expect(snapshot.kpis.totalActiveRecords).toBe(4);
    expect(snapshot.progressSummary.overallAverageScore).toBe(6.38);
    expect(snapshot.moduleStats[0]).toMatchObject({ module: 'reading', totalCount: 4 });
    expect(snapshot.recentRecords[0]).toMatchObject({ module: 'writing', status: 'SUCCESS' });
    expect(snapshot.insights.weakestModule).toBe('writing');
    expect(snapshot.charts[0]).toMatchObject({ code: 'scoreTrend', chartType: 'line' });
  });

  test('maps documented kpis and score radar chart when progress summary is absent', () => {
    const snapshot = mapUserConsoleToDashboardSnapshot({
      snapshot_id: 'snap-2',
      snapshot_time: '2026-05-15T10:00:00',
      profile: {
        user_id: 8,
        email: 'student2@example.com',
        consecutive_login_days: 2,
      },
      kpis: {
        total_active_records: 21,
        total_deleted_records: 18,
        total_records: 39,
        overall_average_score: 1.6,
      },
      module_stats: [
        { module: 'LISTENING', active_count: 5, deleted_count: 9, total_count: 14, average_score: 2.3 },
        { module: 'READING', active_count: 7, deleted_count: 9, total_count: 16, average_score: 2.1 },
        { module: 'WRITING', active_count: 9, deleted_count: 0, total_count: 9, average_score: 5.2 },
        { module: 'SPEAKING', active_count: 0, deleted_count: 0, total_count: 0, average_score: null },
      ],
      insights: {},
      charts: {
        scoreRadar: {
          title: 'Score radar',
          chart_type: 'radar',
          indicators: ['Listening', 'Reading', 'Writing', 'Speaking'],
          values: [2.3, 2.1, 5.2, 0],
        },
      },
    });

    expect(snapshot.progressSummary.overallAverageScore).toBe(1.6);
    expect(snapshot.progressSummary.listeningAverageScore).toBe(2.3);
    expect(snapshot.progressSummary.readingAverageScore).toBe(2.1);
    expect(snapshot.progressSummary.writingAverageScore).toBe(5.2);
    expect(snapshot.progressSummary.speakingAverageScore).toBe(0);
    expect(snapshot.charts[0]).toMatchObject({ code: 'scoreRadar', chartType: 'radar' });
  });
});
