import { describe, expect, it } from 'vitest';
import type { AdminConsoleVO } from '../../../contracts/console';
import { mapAdminConsoleToSnapshot } from './adminOverviewModel';

describe('mapAdminConsoleToSnapshot', () => {
  it('maps backend admin console payload into overview snapshot', () => {
    const payload = {
      snapshot_id: 'snapshot-1',
      snapshot_time: '2026-05-16T09:30:00',
      kpis: {
        total_users: 10,
        active_users: 8,
        deleted_users: 2,
        total_active_records: 30,
        total_deleted_records: 4,
        total_records: 34,
        ai_failure_count: 3,
      },
      module_stats: [
        { module: 'WRITING', active_count: 12, deleted_count: 1, total_count: 13, ai_failure_count: 2 },
      ],
      recent_issues: [
        { module_type: 'WRITING', record_id: 9, ai_status: 'FAILED', ai_provider: 'ALIYUN', ai_model: 'qwen', message: 'OCR failed', created_time: '2026-05-16T09:00:00' },
      ],
      quick_links: [
        { code: 'records', title: 'Records' },
      ],
      leaderboards: [
        { user_id: 7, email: 'user@example.com', active_record_count: 5, deleted_record_count: 1, total_record_count: 6, last_activity_time: '2026-05-16T08:00:00' },
      ],
    } as unknown as AdminConsoleVO;
    const snapshot = mapAdminConsoleToSnapshot(payload);

    expect(snapshot.snapshotId).toBe('snapshot-1');
    expect(snapshot.kpis.totalRecords).toBe(34);
    expect(snapshot.moduleStats).toEqual([
      { module: 'writing', activeCount: 12, deletedCount: 1, totalCount: 13, aiFailureCount: 2 },
    ]);
    expect(snapshot.recentIssues[0]).toMatchObject({
      module: 'writing',
      recordId: 9,
      aiStatus: 'FAILED',
      message: 'OCR failed',
    });
    expect(snapshot.quickLinks).toEqual([{ code: 'records', title: 'Records' }]);
    expect(snapshot.leaderboards[0]).toMatchObject({ userId: 7, totalRecordCount: 6 });
  });
});
