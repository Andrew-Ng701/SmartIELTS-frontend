import type { ApiMessageResponse } from '../contracts/common';
import type { AuthCredentialsDTO, AuthTokenVO, ChangePasswordDTO, LogoutVO } from '../contracts/auth';
import { apiJson } from './client';

export const authApi = {
  register: (payload: AuthCredentialsDTO) => apiJson<AuthTokenVO, AuthCredentialsDTO>('POST', '/auth/register', { body: payload }),
  login: (payload: AuthCredentialsDTO) => apiJson<AuthTokenVO, AuthCredentialsDTO>('POST', '/auth/login', { body: payload }),
  refresh: () => apiJson<AuthTokenVO>('POST', '/auth/refresh'),
  changePassword: (payload: ChangePasswordDTO) =>
    apiJson<ApiMessageResponse, ChangePasswordDTO>('PUT', '/auth/password', { body: payload }),
  logout: () => apiJson<LogoutVO>('POST', '/auth/logout'),
};
