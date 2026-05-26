import type { UserProfileVO } from '../../../contracts/user';

const PROFILE_CACHE_STORAGE_KEY = 'SMARTIELTS_USER_PROFILE_CACHE';
export const PROFILE_CACHE_UPDATED_EVENT = 'smartielts:user-profile-cache-updated';
export const DEFAULT_LEARNER_NAME = 'IELTS learner';

export type UserProfileCache = {
  avatarDataUrl?: string;
  displayName: string;
  userId?: number;
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export function getProfileDisplayName(profile?: Pick<UserProfileVO, 'username'> | null) {
  return profile?.username?.trim() || DEFAULT_LEARNER_NAME;
}

export function readProfileCache(userId?: number | null): UserProfileCache {
  if (!canUseStorage()) {
    return { displayName: DEFAULT_LEARNER_NAME };
  }

  const rawCache = window.localStorage.getItem(PROFILE_CACHE_STORAGE_KEY);
  if (!rawCache) {
    return { displayName: DEFAULT_LEARNER_NAME };
  }

  try {
    const cache = JSON.parse(rawCache) as Partial<UserProfileCache>;
    if (userId !== null && userId !== undefined && cache.userId !== userId) {
      return { displayName: DEFAULT_LEARNER_NAME, userId };
    }

    return {
      avatarDataUrl: cache.avatarDataUrl,
      displayName: cache.displayName?.trim() || DEFAULT_LEARNER_NAME,
      userId: cache.userId,
    };
  } catch {
    window.localStorage.removeItem(PROFILE_CACHE_STORAGE_KEY);
    return { displayName: DEFAULT_LEARNER_NAME };
  }
}

export function saveProfileCache(cache: Partial<UserProfileCache>) {
  if (!canUseStorage()) {
    return;
  }

  const currentCache = readProfileCache(cache.userId);
  const nextCache: UserProfileCache = {
    ...currentCache,
    ...cache,
    displayName: cache.displayName?.trim() || currentCache.displayName || DEFAULT_LEARNER_NAME,
  };

  window.localStorage.setItem(PROFILE_CACHE_STORAGE_KEY, JSON.stringify(nextCache));
  window.dispatchEvent(new CustomEvent(PROFILE_CACHE_UPDATED_EVENT, { detail: nextCache }));
}

export function cacheUserProfile(profile: UserProfileVO, fallbackUserId?: number) {
  saveProfileCache({
    avatarDataUrl: profile.profilePictureUrl ?? undefined,
    displayName: getProfileDisplayName(profile),
    userId: profile.id ?? fallbackUserId,
  });
}

export function cacheAvatarFile(file: File, userId?: number) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        saveProfileCache({ avatarDataUrl: reader.result, userId });
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to cache avatar image.'));
    });
    reader.addEventListener('error', () => reject(new Error('Unable to cache avatar image.')));
    reader.readAsDataURL(file);
  });
}
