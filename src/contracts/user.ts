import type { LocalDateTimeString, ModuleType, PageQuery, PageResult, UserRole } from './common';

export type UserProfileVO = {
  id?: number;
  email: string;
  username?: string | null;
  role?: UserRole;
  profilePictureUrl?: string | null;
  profilePictureObjectKey?: string | null;
  listeningTargetScore?: number | null;
  readingTargetScore?: number | null;
  writingTargetScore?: number | null;
  speakingTargetScore?: number | null;
  createdTime?: LocalDateTimeString | null;
  lastLoginTime?: LocalDateTimeString | null;
};

export type UserProfileUpdateDTO = {
  email?: string;
  username?: string;
  profilePictureUrl?: string;
  listeningTargetScore?: number;
  readingTargetScore?: number;
  writingTargetScore?: number;
  speakingTargetScore?: number;
};

export type AdminUserPageQuery = PageQuery & {
  keyword?: string;
};

export type AdminDeletedUserPageQuery = PageQuery & {
  keyword?: string;
};

export type UserAdminVO = UserProfileVO & {
  id: number;
  isDeleted: 0 | 1;
  consecutiveLoginDays?: number | null;
  deletedTime?: LocalDateTimeString | null;
};

export type AdminUserListVO = {
  users: PageResult<UserAdminVO>;
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
};

export type UserAdminDetailVO = UserAdminVO & {
  totalRecords?: number;
  activeRecords?: number;
  deletedRecords?: number;
  moduleStats?: Record<string, unknown>;
};

export type AdminUserRecordListItemVO = {
  recordId: number;
  userId: number;
  name: string;
  module: ModuleType;
  status: string;
  score?: number | null;
  scoreText?: string | null;
  updatedTime?: LocalDateTimeString | null;
  createdTime?: LocalDateTimeString | null;
  isDeleted: 0 | 1;
  deletedTime?: LocalDateTimeString | null;
};
