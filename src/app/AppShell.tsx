import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { userApi } from '../api/userApi';
import brandIcon from '../assets/brand-icon-cropped.png';
import defaultAvatar from '../assets/default-avatar.jpeg';
import {
  cacheUserProfile,
  DEFAULT_LEARNER_NAME,
  PROFILE_CACHE_UPDATED_EVENT,
  readProfileCache,
  type UserProfileCache,
} from '../features/user/profile/profileCache';
import { readAuthSession } from '../features/auth/authSession';
import type { AppPageId, AppSectionId, AuthRole } from './appTypes';

export type AppShellModule = {
  id: AppPageId;
  name: string;
};

type AppShellProps = {
  authRole: AuthRole | null;
  children: ReactNode;
  currentPage: AppPageId;
  isAdminPage: boolean;
  isLoggedIn: boolean;
  modules: AppShellModule[];
  onLogout: () => void;
  onNavigate: (page: AppPageId) => void;
  onSectionNavigate: (sectionId: AppSectionId) => void;
};

export function AppShell({
  authRole,
  children,
  currentPage,
  isAdminPage,
  isLoggedIn,
  modules,
  onLogout,
  onNavigate,
  onSectionNavigate,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#fffdf7] text-[#0a1622]">
      {!isAdminPage && (
        <Header
          authRole={authRole}
          currentPage={currentPage}
          isLoggedIn={isLoggedIn}
          modules={modules}
          onLogout={onLogout}
          onNavigate={onNavigate}
          onSectionNavigate={onSectionNavigate}
        />
      )}
      {children}
      {!isAdminPage && <MobileNav currentPage={currentPage} onNavigate={onNavigate} />}
    </main>
  );
}

function Header({
  authRole,
  currentPage,
  isLoggedIn,
  modules,
  onLogout,
  onNavigate,
  onSectionNavigate,
}: {
  authRole: AuthRole | null;
  currentPage: AppPageId;
  isLoggedIn: boolean;
  modules: AppShellModule[];
  onLogout: () => void;
  onNavigate: (page: AppPageId) => void;
  onSectionNavigate: (sectionId: AppSectionId) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E1DA] bg-[#FCFBF8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button
          className="flex items-center gap-3 text-left"
          type="button"
          onClick={() => onSectionNavigate('home')}
        >
          <img
            alt="SmartIELTS"
            className="size-12 rounded bg-white object-contain shadow-sm ring-1 ring-orange-100"
            src={brandIcon}
          />
          <span>
            <span className="block text-xl font-bold leading-none">SmartIELTS</span>
            <span className="block text-xs font-bold tracking-[0.18em] text-[#666666]">
              AI Learning Hub
            </span>
          </span>
        </button>

        <nav className="site-nav-scroll">
          <button
            className={`nav-link ${currentPage === 'landing' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onSectionNavigate('home')}
          >
            Home
          </button>
          <ModuleDropdownNav currentPage={currentPage} modules={modules} onNavigate={onNavigate} />
          <button
            className={`nav-link ${currentPage === 'dashboard' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${currentPage === 'records' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('records')}
          >
            Records
          </button>
          <button
            className={`nav-link ${currentPage === 'faq' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('faq')}
          >
            FAQ
          </button>
        </nav>

        {isLoggedIn ? (
          <UserAvatarMenu authRole={authRole} onLogout={onLogout} onNavigate={onNavigate} />
        ) : (
          <button
            className="btn-arrow rounded bg-[#f1bd03] px-5 py-2.5 text-sm font-bold tracking-wide text-[#0a1622]"
            type="button"
            onClick={() => onNavigate('auth')}
          >
            Login or register
            <span aria-hidden="true">-&gt;</span>
          </button>
        )}
      </div>
    </header>
  );
}

function ModuleDropdownNav({
  currentPage,
  modules,
  onNavigate,
}: {
  currentPage: AppPageId;
  modules: AppShellModule[];
  onNavigate: (page: AppPageId) => void;
}) {
  const isActive = modules.some((module) => module.id === currentPage);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`dropdown-nav ${isOpen ? 'dropdown-nav-open' : ''}`} onMouseLeave={() => setIsOpen(false)}>
      <button
        className={`nav-link dropdown-trigger ${isActive ? 'nav-link-active' : ''}`}
        aria-expanded={isOpen}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        Modules
        <span aria-hidden="true" className="dropdown-arrow">▼</span>
      </button>
      <div className="dropdown-menu-panel">
        {modules.map((module) => (
          <button
            key={module.name}
            className="dropdown-menu-item"
            type="button"
            onClick={() => {
              setIsOpen(false);
              onNavigate(module.id);
            }}
          >
            <span className="font-bold">{module.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserAvatarMenu({
  authRole,
  onLogout,
  onNavigate,
}: {
  authRole: AuthRole | null;
  onLogout: () => void;
  onNavigate: (page: AppPageId) => void;
}) {
  const isAdmin = authRole === 'ADMIN';
  const [profileCache, setProfileCache] = useState<UserProfileCache>(() => readProfileCache(readAuthSession()?.userId));

  useEffect(() => {
    if (isAdmin) {
      return undefined;
    }

    const syncProfileCache = () => setProfileCache(readProfileCache(readAuthSession()?.userId));
    const handleProfileCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfileCache>;
      const currentUserId = readAuthSession()?.userId;
      setProfileCache(
        customEvent.detail?.userId === currentUserId
          ? customEvent.detail
          : readProfileCache(currentUserId),
      );
    };

    syncProfileCache();
    const currentUserId = readAuthSession()?.userId;
    userApi.getProfile()
      .then((profile) => {
        cacheUserProfile(profile, currentUserId);
      })
      .catch(() => {
        syncProfileCache();
      });
    window.addEventListener('storage', syncProfileCache);
    window.addEventListener(PROFILE_CACHE_UPDATED_EVENT, handleProfileCacheUpdate);

    return () => {
      window.removeEventListener('storage', syncProfileCache);
      window.removeEventListener(PROFILE_CACHE_UPDATED_EVENT, handleProfileCacheUpdate);
    };
  }, [isAdmin]);

  const learnerName = profileCache.displayName || DEFAULT_LEARNER_NAME;
  const avatarSrc = profileCache.avatarDataUrl || defaultAvatar;

  return (
    <div className="avatar-menu">
      <button className="avatar-trigger" type="button">
        <img alt={isAdmin ? 'Admin account' : learnerName} src={isAdmin ? defaultAvatar : avatarSrc} />
      </button>
      <div className="avatar-dropdown">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="font-bold">{isAdmin ? 'Admin Console' : learnerName}</p>
          <p className="text-xs font-semibold text-[#666666]">
            {isAdmin ? 'Authoring manager' : 'Learner account'}
          </p>
        </div>
        {isAdmin ? (
          <button type="button" onClick={() => onNavigate('admin')}>
            Admin Console
          </button>
        ) : (
          <>
            <button type="button" onClick={() => onNavigate('profile')}>
              View Profile
            </button>
            <button type="button" onClick={() => onNavigate('settings')}>
              Settings
            </button>
          </>
        )}
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

function MobileNav({
  currentPage,
  onNavigate,
}: {
  currentPage: AppPageId;
  onNavigate: (page: AppPageId) => void;
}) {
  const items: Array<[AppPageId, string]> = [
    ['dashboard', 'Home'],
    ['reading', 'Read'],
    ['writing', 'Write'],
    ['speaking', 'Speak'],
    ['records', 'Records'],
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white px-2 py-2 shadow-lg md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map(([id, label]) => (
          <button
            key={id}
            className={`rounded px-2 py-2 text-xs font-bold ${
              currentPage === id ? 'text-[#a55407]' : 'text-slate-700'
            }`}
            type="button"
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
