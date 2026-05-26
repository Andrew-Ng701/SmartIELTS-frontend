import { describe, expect, it } from 'vitest';
import { getAdminUserDisplayName, getAdminUserModuleSummary, mapAdminUserRecordToRow } from './adminUserDetailModel';

describe('adminUserDetailModel', () => {
  const user = {
    id: 42,
    email: 'student@example.com',
    consecutiveLoginDays: 6,
    readingActiveRecordCount: 3,
    listeningActiveRecordCount: 2,
    writingActiveRecordCount: 1,
    speakingActiveRecordCount: 4,
    totalActiveRecordCount: 10,
    totalDeletedRecordCount: 5,
  };

  it('maps admin scoped user record rows with user fallback fields', () => {
    const record = mapAdminUserRecordToRow({
      recordId: 99,
      name: 'Essay record',
      module: 'WRITING',
      status: 'SUCCESS',
      score: 6.5,
      updatedTime: '2026-05-15T10:00:00',
      createdTime: '2026-05-15T09:00:00',
      isDeleted: 0,
    }, user);

    expect(record).toMatchObject({
      id: 99,
      userId: 42,
      userEmail: 'student@example.com',
      module: 'Writing',
      status: 'Reviewed',
      score: '6.5',
    });
  });

  it('derives display name and module summaries from backend user counts', () => {
    expect(getAdminUserDisplayName({ id: 1, email: 'learner@example.com', username: 'Learner One' })).toBe('Learner One');
    expect(getAdminUserDisplayName({ id: 1, email: 'learner@example.com' })).toBe('learner');
    expect(getAdminUserModuleSummary(user, 'Speaking')).toMatchObject({
      active: 4,
      completed: 6,
      deleted: 2,
      target: '6.5',
    });
  });
});
