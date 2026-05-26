import type { UserProfileUpdateDTO, UserProfileVO } from '../contracts/user';
import { apiGet, apiJson, apiMultipart } from './client';

export const userApi = {
  getProfile: () => apiGet<UserProfileVO>('/user/profile'),
  updateProfile: (payload: UserProfileUpdateDTO) =>
    apiJson<UserProfileVO, UserProfileUpdateDTO>('PUT', '/user/profile', { body: payload }),
  getProfilePicture: () => apiGet<UserProfileVO>('/user/profile-picture'),
  updateProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.set('file', file);

    return apiMultipart<UserProfileVO>('PUT', '/user/profile-picture', formData);
  },
};
