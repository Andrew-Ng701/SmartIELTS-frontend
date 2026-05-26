import { useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../../api/authApi';
import { getApiErrorMessage } from '../../api/errors';
import { validatePassword, validatePasswordConfirmation } from '../../lib';

export type SettingsPageProps = {
  onPasswordChanged: () => void;
};

export function SettingsPage({ onPasswordChanged }: SettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordSubmit = async () => {
    const validationError =
      validatePassword(currentPassword, 'Current password', 1)
      ?? validatePassword(newPassword, 'New password')
      ?? validatePasswordConfirmation(newPassword, confirmPassword);

    if (validationError) {
      setSettingsMessage(validationError);
      return;
    }

    setIsSaving(true);
    setSettingsMessage('');

    try {
      await authApi.changePassword({
        oldPassword: currentPassword,
        newPassword,
      });
      onPasswordChanged();
    } catch (error) {
      setSettingsMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Settings"
      title="Account settings"
      description="Update your account password from one clean page."
    >
      <div className="max-w-2xl">
        <section className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Change password</h2>
          <div className="mt-5 space-y-4">
            <PasswordField
              label="Current password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <PasswordField
              label="New password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              label="Confirm password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            {settingsMessage && <p className="text-sm font-semibold text-slate-600">{settingsMessage}</p>}
            <button
              className="rounded bg-[#0a1622] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={!currentPassword || !newPassword || !confirmPassword || isSaving}
              onClick={handlePasswordSubmit}
            >
              {isSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

function PasswordField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold tracking-wide text-slate-500">{label}</span>
      <input
        className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
        placeholder={placeholder}
        type="password"
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
