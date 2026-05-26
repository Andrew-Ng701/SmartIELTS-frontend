import { useState } from 'react';
import { authApi } from '../../api/authApi';
import { getApiErrorMessage } from '../../api/errors';
import registerImage from '../../assets/template/register-img.png';
import type { AuthTokenVO } from '../../contracts/auth';
import type { AuthRole } from '../../app/appTypes';
import { ENABLE_PREVIEW_AUTH } from '../../app/runtimeConfig';
import { validateEmail, validatePassword, validateRequired } from '../../lib';

export type AuthMode = 'login' | 'register';

export function AuthPage({
  authMode,
  onAuthModeChange,
  onComplete,
}: {
  authMode: AuthMode;
  onAuthModeChange: (mode: AuthMode) => void;
  onComplete: (role: AuthRole, token?: AuthTokenVO) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    setAuthMessage('');

    if (ENABLE_PREVIEW_AUTH && normalizedEmail === 'admin') {
      onComplete('ADMIN');
      return;
    }

    if (ENABLE_PREVIEW_AUTH && normalizedEmail === 'user') {
      onComplete('USER');
      return;
    }

    const emailError = validateEmail(normalizedEmail);
    const passwordError = authMode === 'register'
      ? validatePassword(password)
      : validateRequired(password, 'Password');

    if (emailError || passwordError) {
      setAuthMessage(emailError ?? passwordError ?? 'Enter your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = { email: email.trim(), password };
      const authToken =
        authMode === 'login'
          ? await authApi.login(payload)
          : await authApi.register(payload);

      onComplete(authToken.role, authToken);
    } catch (error) {
      setAuthMessage(
        error instanceof TypeError
          ? 'Unable to reach SmartIELTS auth service. Check that the backend is running and try again.'
          : getApiErrorMessage(error, 'Authentication failed. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">
          Account access
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
          Enter the student learning center
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Log in with a SmartIELTS account to access the learning center, records, profile, and admin console.
        </p>
      </div>

      <div className="grid overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#f8f6ef] p-8">
          <img
            alt="Student registering for SmartIELTS"
            className="mx-auto max-h-[430px] w-full object-contain"
            src={registerImage}
          />
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                className={`rounded px-4 py-3 font-bold tracking-wide ${
                  authMode === mode
                    ? 'bg-[#f1bd03] text-[#0a1622]'
                    : 'bg-slate-100 text-slate-600'
                }`}
                type="button"
                onClick={() => onAuthModeChange(mode)}
              >
                {mode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAuthContinue();
            }}
          >
            <label className="block">
              <span className="text-sm font-bold tracking-wide text-slate-500">
                Email address
              </span>
              <input
                className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
                placeholder={ENABLE_PREVIEW_AUTH ? 'Email address or preview role' : 'Email address'}
                type={ENABLE_PREVIEW_AUTH ? 'text' : 'email'}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setAuthMessage('');
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold tracking-wide text-slate-500">
                Password
              </span>
              <input
                className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
                placeholder="Enter password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setAuthMessage('');
                }}
              />
            </label>
            {authMessage && (
              <div className="rounded bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">
                {authMessage}
              </div>
            )}
            {authMode === 'register' && (
              <div className="rounded bg-[#eef1f3] p-4 text-sm leading-6 text-slate-600">
                Registration creates a SmartIELTS account through the backend auth service.
              </div>
            )}
            {ENABLE_PREVIEW_AUTH && (
              <div className="rounded bg-[#eef1f3] p-4 text-sm leading-6 text-slate-600">
                Preview access is enabled for this environment.
              </div>
            )}
            <button
              className="btn-arrow w-full rounded bg-[#0a1622] px-5 py-3 font-bold tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Connecting...' : 'Continue'}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
