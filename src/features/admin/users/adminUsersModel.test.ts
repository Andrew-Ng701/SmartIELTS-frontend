import { describe, expect, it } from 'vitest';
import type { AdminUserDetailUser } from './adminUserDetailModel';
import { getAdminUsersPageState } from './adminUsersModel';

const baseUser: AdminUserDetailUser = {
  id: 1,
  email: 'user@example.com',
  role: 'USER',
  isDeleted: 0,
  deletedTime: null,
  createdTime: '2026-05-15T10:00:00',
  lastLoginTime: '2026-05-15T11:00:00',
  consecutiveLoginDays: 6,
  readingActiveRecordCount: 1,
  listeningActiveRecordCount: 2,
  writingActiveRecordCount: 3,
  speakingActiveRecordCount: 4,
  totalActiveRecordCount: 10,
  totalDeletedRecordCount: 0,
};

describe('getAdminUsersPageState', () => {
  it('returns active users by default with deleted count retained', () => {
    const deletedUser = { ...baseUser, id: 2, email: 'deleted@example.com', isDeleted: 1 as const, deletedTime: '2026-05-14T10:00:00' };

    expect(getAdminUsersPageState([baseUser, deletedUser], false)).toEqual({
      activeCount: 1,
      deletedCount: 1,
      displayedUsers: [baseUser],
      isDeletedView: false,
      totalCount: 2,
    });
  });

  it('returns deleted users for the deleted view', () => {
    const deletedUser = { ...baseUser, id: 2, email: 'deleted@example.com', isDeleted: 1 as const, deletedTime: '2026-05-14T10:00:00' };

    expect(getAdminUsersPageState([baseUser, deletedUser], true)).toEqual({
      activeCount: 1,
      deletedCount: 1,
      displayedUsers: [deletedUser],
      isDeletedView: true,
      totalCount: 2,
    });
  });
});
