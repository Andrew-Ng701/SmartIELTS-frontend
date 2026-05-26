import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { getApiErrorMessage } from '../../../api/errors';
import { userApi } from '../../../api/userApi';
import defaultAvatar from '../../../assets/default-avatar.jpeg';
import type { UserProfileVO } from '../../../contracts/user';
import { readAuthSession } from '../../auth/authSession';
import { validateBandValue, validateEmail, validateRequired, validateSelectedFiles } from '../../../lib';
import { bandValueToNumber, scoreToBandValue } from './profileModel';
import type { UserGoalBands } from './profileModel';
import { cacheAvatarFile, cacheUserProfile, getProfileDisplayName, readProfileCache, saveProfileCache } from './profileCache';

export type ProfilePageProps = {
  goalBands: UserGoalBands;
  onGoalBandsChange: (goalBands: UserGoalBands) => void;
};

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function ProfilePage({ goalBands, onGoalBandsChange }: ProfilePageProps) {
  const [displayName, setDisplayName] = useState(() => readProfileCache(readAuthSession()?.userId).displayName);
  const [email, setEmail] = useState('student@example.com');
  const [localGoalBands, setLocalGoalBands] = useState<UserGoalBands>(goalBands);
  const [profile, setProfile] = useState<UserProfileVO | null>(null);
  const [cachedAvatarDataUrl, setCachedAvatarDataUrl] = useState(() => readProfileCache(readAuthSession()?.userId).avatarDataUrl ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    userApi.getProfile()
      .then((nextProfile) => {
        if (!isMounted) {
          return;
        }

        const nextGoalBands: UserGoalBands = {
          reading: scoreToBandValue(nextProfile.readingTargetScore, goalBands.reading),
          listening: scoreToBandValue(nextProfile.listeningTargetScore, goalBands.listening),
          writing: scoreToBandValue(nextProfile.writingTargetScore, goalBands.writing),
          speaking: scoreToBandValue(nextProfile.speakingTargetScore, goalBands.speaking),
        };

        const cachedProfile = readProfileCache(nextProfile.id);
        const nextDisplayName = nextProfile.username?.trim()
          ? getProfileDisplayName(nextProfile)
          : cachedProfile.displayName;
        cacheUserProfile({ ...nextProfile, username: nextDisplayName });
        setProfile(nextProfile);
        setDisplayName(nextDisplayName);
        setCachedAvatarDataUrl(cachedProfile.avatarDataUrl ?? nextProfile.profilePictureUrl ?? null);
        setEmail(nextProfile.email);
        setLocalGoalBands(nextGoalBands);
        onGoalBandsChange(nextGoalBands);
        setProfileMessage('');
      })
      .catch((error) => {
        if (isMounted) {
          setProfileMessage(getApiErrorMessage(error));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileError = validateSelectedFiles([file], {
      acceptedTypes: ['image/*'],
      maxBytes: PROFILE_IMAGE_MAX_BYTES,
      maxFiles: 1,
    });

    if (fileError) {
      setProfileMessage(fileError);
      event.target.value = '';
      return;
    }

    setAvatarPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return URL.createObjectURL(file);
    });
    setAvatarFile(file);
  };

  const handleGoalBandChange = (key: keyof UserGoalBands, value: string) => {
    const nextGoalBands = { ...localGoalBands, [key]: value };
    setLocalGoalBands(nextGoalBands);
    onGoalBandsChange(nextGoalBands);
  };

  const handleProfileSubmit = async () => {
    const validationErrors = [
      validateRequired(displayName, 'Display name'),
      validateEmail(email),
      validateBandValue(localGoalBands.reading, 'Reading target'),
      validateBandValue(localGoalBands.listening, 'Listening target'),
      validateBandValue(localGoalBands.writing, 'Writing target'),
      validateBandValue(localGoalBands.speaking, 'Speaking target'),
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      setProfileMessage(validationErrors[0] ?? 'Check your profile details.');
      return;
    }

    setIsSaving(true);
    setProfileMessage('');

    try {
      const nextProfile = await userApi.updateProfile({
        email,
        username: displayName,
        listeningTargetScore: bandValueToNumber(localGoalBands.listening),
        readingTargetScore: bandValueToNumber(localGoalBands.reading),
        writingTargetScore: bandValueToNumber(localGoalBands.writing),
        speakingTargetScore: bandValueToNumber(localGoalBands.speaking),
      });

      const profileWithAvatar = avatarFile
        ? await userApi.updateProfilePicture(avatarFile)
        : nextProfile;
      const savedDisplayName = displayName.trim() || getProfileDisplayName(profileWithAvatar);

      saveProfileCache({
        displayName: savedDisplayName,
        userId: profileWithAvatar.id,
      });
      if (avatarFile) {
        setCachedAvatarDataUrl(await cacheAvatarFile(avatarFile, profileWithAvatar.id));
      }
      setProfile(profileWithAvatar);
      setDisplayName(savedDisplayName);
      setProfileMessage('Profile updated.');
      setAvatarFile(null);
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Profile"
      title={`${displayName}'s learner profile`}
      description="Review your account details, update your name, and choose a learner avatar."
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <img
            alt={displayName}
            className="mx-auto size-40 rounded-full bg-white object-contain shadow-sm"
            src={avatarPreview ?? cachedAvatarDataUrl ?? profile?.profilePictureUrl ?? defaultAvatar}
          />
          <h2 className="mt-5 text-2xl font-bold">{displayName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">IELTS learner</p>
          <label className="profile-avatar-upload mt-6 block rounded border border-dashed border-slate-300 bg-[#f8f6ef] px-4 py-5 text-left transition hover:border-[#f1bd03]">
            <span className="block text-sm font-bold tracking-wide text-slate-500">Avatar image</span>
            <span className="profile-avatar-upload-button mt-3 inline-flex items-center rounded bg-[#f1bd03] px-4 py-2 font-bold text-[#0a1622]">
              Upload profile picture
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              Click the upload button area to choose an image file.
            </span>
            <input
              accept="image/*"
              className="sr-only"
              type="file"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Account details</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold tracking-wide text-slate-500">Display name</span>
              <input
                className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold tracking-wide text-slate-500">Email</span>
              <input
                className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <div>
              <h3 className="text-lg font-bold">IELTS target bands</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Set each module target separately for your study plan.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TargetBandInput
                  label="Reading target"
                  value={localGoalBands.reading}
                  onChange={(reading) => handleGoalBandChange('reading', reading)}
                />
                <TargetBandInput
                  label="Listening target"
                  value={localGoalBands.listening}
                  onChange={(listening) => handleGoalBandChange('listening', listening)}
                />
                <TargetBandInput
                  label="Writing target"
                  value={localGoalBands.writing}
                  onChange={(writing) => handleGoalBandChange('writing', writing)}
                />
                <TargetBandInput
                  label="Speaking target"
                  value={localGoalBands.speaking}
                  onChange={(speaking) => handleGoalBandChange('speaking', speaking)}
                />
              </div>
            </div>
            {profileMessage && <p className="text-sm font-semibold text-slate-600">{profileMessage}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded bg-[#f1bd03] px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isSaving}
                onClick={handleProfileSubmit}
              >
                {isSaving ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function TargetBandInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold tracking-wide text-slate-500">{label}</span>
      <input
        className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
        inputMode="decimal"
        placeholder="7.0"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
