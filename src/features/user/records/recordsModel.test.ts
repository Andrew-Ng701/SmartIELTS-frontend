import { describe, expect, test } from 'vitest';
import {
  compareRecordsBySort,
  mapApiRecordToUserRecord,
  recordScopeToApi,
  recordSortToApi,
  userStatusToApi,
} from './recordsModel';

describe('records model', () => {
  test('maps UI filters to unified records API fields', () => {
    expect(recordScopeToApi('deleted')).toBe('DELETED');
    expect(userStatusToApi('Reviewed')).toBe('SCORED');
    expect(recordSortToApi('score', 'ASC')).toBe('SCORE_ASC');
    expect(recordSortToApi('time', 'DESC')).toBe('UPDATED_DESC');
  });

  test('maps API record list item to user record view model', () => {
    const record = mapApiRecordToUserRecord({
      recordId: 42,
      name: 'Reading Test 1',
      module: 'READING',
      status: 'SCORED',
      score: 34,
      updatedTime: '2026-05-15T09:00:00',
      createdTime: '2026-05-15T08:00:00',
      isDeleted: 0,
    });

    expect(record).toMatchObject({
      id: 42,
      title: 'Reading Test 1',
      module: 'Reading',
      status: 'Reviewed',
      score: '34/40',
      numericScore: 34,
      isDeleted: 0,
    });
  });

  test('sorts records by score with null scores last for descending order', () => {
    const records = [
      { id: 1, numericScore: null, sortTime: '2026-05-15T08:00:00' },
      { id: 2, numericScore: 5, sortTime: '2026-05-15T09:00:00' },
      { id: 3, numericScore: 7, sortTime: '2026-05-15T07:00:00' },
    ].map((item) => ({
      title: `Record ${item.id}`,
      module: 'Writing' as const,
      status: 'Completed' as const,
      score: item.numericScore === null ? 'Pending' : String(item.numericScore),
      updatedAt: 'Today',
      isDeleted: 0 as const,
      deletedAt: null,
      action: 'Review answers',
      ...item,
    }));

    expect(records.sort((a, b) => compareRecordsBySort(a, b, 'score', 'DESC')).map((record) => record.id))
      .toEqual([3, 2, 1]);
  });
});
