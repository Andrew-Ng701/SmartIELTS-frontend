import { describe, expect, it } from 'vitest';
import type { AdminRecordRow } from '../../user/records';
import { getAdminRecordModuleSummaries } from './adminRecordsModel';

const baseRecord: AdminRecordRow = {
  id: 1,
  title: 'Record',
  module: 'Reading',
  status: 'Completed',
  score: '32/40',
  numericScore: 32,
  updatedAt: 'May 15',
  sortTime: '2026-05-15T10:00:00',
  isDeleted: 0,
  deletedAt: null,
  action: 'Review answers',
  userId: 7,
  userEmail: 'user@example.com',
};

describe('getAdminRecordModuleSummaries', () => {
  it('counts active and deleted records for each IELTS module', () => {
    const summaries = getAdminRecordModuleSummaries([
      baseRecord,
      { ...baseRecord, id: 2, module: 'Reading', isDeleted: 1 },
      { ...baseRecord, id: 3, module: 'Writing', isDeleted: 0 },
      { ...baseRecord, id: 4, module: 'Speaking', isDeleted: 1 },
    ]);

    expect(summaries).toEqual([
      { module: 'Reading', activeCount: 1, deletedCount: 1 },
      { module: 'Listening', activeCount: 0, deletedCount: 0 },
      { module: 'Writing', activeCount: 1, deletedCount: 0 },
      { module: 'Speaking', activeCount: 0, deletedCount: 1 },
    ]);
  });
});
