import type { ApiMessageResponse, UserRole } from './common';

export type AuthCredentialsDTO = {
  email: string;
  password: string;
};

export type ChangePasswordDTO = {
  oldPassword: string;
  newPassword: string;
};

export type AuthTokenVO = {
  token: string;
  tokenExpiresIn: number;
  refreshAfterSeconds: number;
  tokenType: 'Bearer' | string;
  userId: number;
  role: UserRole;
};

export type LogoutVO = ApiMessageResponse;
