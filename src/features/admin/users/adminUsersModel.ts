import type { AdminUserDetailUser } from './adminUserDetailModel';

export type AdminUsersPageState = {
  activeCount: number;
  deletedCount: number;
  displayedUsers: AdminUserDetailUser[];
  isDeletedView: boolean;
  totalCount: number;
};

export function getAdminUsersPageState(users: AdminUserDetailUser[], showDeleted: boolean): AdminUsersPageState {
  const learnerUsers = users.filter((user) => user.role === 'USER');

  return {
    activeCount: learnerUsers.filter((user) => user.isDeleted !== 1).length,
    deletedCount: learnerUsers.filter((user) => user.isDeleted === 1).length,
    displayedUsers: learnerUsers.filter((user) => (showDeleted ? user.isDeleted === 1 : user.isDeleted !== 1)),
    isDeletedView: showDeleted,
    totalCount: learnerUsers.length,
  };
}
