import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { AppShell } from './app/AppShell';
import { AUTH_SESSION_EXPIRED_EVENT } from './app/bootstrapApi';
import { getInitialPageFromLocation, getPageFromPath, getPathForPage } from './app/appRoutes';
import type { AppPageId, AppSectionId, AuthRole } from './app/appTypes';
import item1 from './assets/template/item1.jpg';
import item2 from './assets/template/item2.jpg';
import item3 from './assets/template/item3.jpg';
import item4 from './assets/template/item4.jpg';
import type { AuthTokenVO } from './contracts/auth';
import { AdminConsolePage } from './features/admin/console';
import {
  AuthPage,
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  SettingsPage,
  toAuthSession,
  type AuthMode,
} from './features/auth';
import { DashboardAgent } from './features/dashboard-agent';
import { ErrorPage, FaqPage, LandingPage, LoginRequiredPage } from './features/public';
import { DashboardPage } from './features/user/console';
import { PracticePage } from './features/user/practice';
import { ProfilePage } from './features/user/profile';
import type { UserGoalBands } from './features/user/profile';
import { RecordsPage } from './features/user/records';
import { SpeakingPage } from './features/user/speaking';
import { WritingPage } from './features/user/writing';

type PageId = AppPageId;
type SectionId = AppSectionId;

type ModuleCard = {
  id: PageId;
  name: string;
  label: string;
  description: string;
  metric: string;
  level: string;
  duration: string;
  image: string;
  accent: string;
};

const modules: ModuleCard[] = [
  {
    id: 'reading',
    name: 'Reading',
    label: 'Timed Practice',
    description:
      'Build speed and accuracy with passage previews, question groups, and clean review cards.',
    metric: '32/40',
    level: 'Academic',
    duration: '60 min',
    image: item1,
    accent: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'listening',
    name: 'Listening',
    label: 'Audio Session',
    description:
      'Train with audio-first practice screens, simple answer panels, and clear progress cues.',
    metric: '29/40',
    level: 'Exam Mode',
    duration: '30 min',
    image: item2,
    accent: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'writing',
    name: 'Writing',
    label: 'AI Revision',
    description:
      'Draft, upload, and review essays with score highlights and revision priorities.',
    metric: '6.5',
    level: 'Task 1 & 2',
    duration: 'AI review',
    image: item3,
    accent: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'speaking',
    name: 'Speaking',
    label: 'AI Examiner',
    description:
      'Practice cue cards, recording rhythm, and score breakdowns in a guided exam flow.',
    metric: '6.0',
    level: 'Full Exam',
    duration: '12 prompts',
    image: item4,
    accent: 'bg-emerald-100 text-emerald-700',
  },
];

const PROTECTED_USER_PAGES: PageId[] = [
  'dashboard',
  'reading',
  'listening',
  'writing',
  'speaking',
  'records',
  'profile',
  'settings',
];

export default function App() {
  const [page, setPage] = useState<PageId>(() => getInitialPageFromLocation());
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authRole, setAuthRole] = useState<AuthRole | null>(null);
  const [userGoalBands, setUserGoalBands] = useState<UserGoalBands>({
    reading: '7.0',
    listening: '7.0',
    writing: '7.0',
    speaking: '7.0',
  });
  useEffect(() => {
    const savedSession = readAuthSession();

    if (!savedSession) {
      return;
    }

    setIsLoggedIn(true);
    setAuthRole(savedSession.role);
    setPage((currentPage) => {
      if (currentPage !== 'landing' && currentPage !== 'auth') {
        return currentPage;
      }

      const nextPage = savedSession.role === 'ADMIN' ? 'admin' : 'dashboard';
      window.history.replaceState(null, '', getPathForPage(nextPage));
      return nextPage;
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPath(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const goTo = (nextPage: PageId, replace = false) => {
    const nextPath = getPathForPage(nextPage);
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentPath !== nextPath) {
      if (replace) {
        window.history.replaceState(null, '', nextPath);
      } else {
        window.history.pushState(null, '', nextPath);
      }
    }

    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSection = (sectionId: SectionId) => {
    if (page !== 'landing') {
      setPage('landing');
      window.setTimeout(() => scrollToSection(sectionId), 50);
      return;
    }

    scrollToSection(sectionId);
  };

  const handleLoginComplete = (role: AuthRole, token?: AuthTokenVO) => {
    if (token) {
      saveAuthSession(toAuthSession(token));
    } else {
      clearAuthSession();
    }

    setIsLoggedIn(true);
    setAuthRole(role);
    goTo(role === 'ADMIN' ? 'admin' : 'dashboard');
  };

  const handleLogout = async () => {
    if (readAuthSession()) {
      try {
        await authApi.logout();
      } catch {
        // Logout must clear client state even if the backend is unavailable.
      }
    }

    clearAuthSession();
    setIsLoggedIn(false);
    setAuthRole(null);
    goTo('landing', true);
  };

  const handlePasswordChanged = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setAuthRole(null);
    setAuthMode('login');
    goTo('auth', true);
  };

  useEffect(() => {
    const handleAuthSessionExpired = () => {
      setIsLoggedIn(false);
      setAuthRole(null);
      setAuthMode('login');
      goTo('landing', true);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);

    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);
  }, []);

  const isAdminPage = page === 'admin' && authRole === 'ADMIN';
  const isProtectedUserPage = PROTECTED_USER_PAGES.includes(page);
  const showLoginRequired = isProtectedUserPage && !isLoggedIn;
  const showAdminLoginRequired = page === 'admin' && !isLoggedIn;

  return (
    <AppShell
      authRole={authRole}
      currentPage={page}
      isAdminPage={isAdminPage}
      isLoggedIn={isLoggedIn}
      modules={modules}
      onLogout={handleLogout}
      onNavigate={goTo}
      onSectionNavigate={goToSection}
    >
      {page === 'landing' && (
        <LandingPage modules={modules} onNavigate={goTo} onSectionNavigate={goToSection} />
      )}
      {page === 'auth' && (
        <AuthPage
          authMode={authMode}
          onAuthModeChange={setAuthMode}
          onComplete={handleLoginComplete}
        />
      )}
      {(showLoginRequired || showAdminLoginRequired) && (
        <LoginRequiredPage
          modules={modules}
          requestedPage={page}
          onExploreModules={() => goToSection('modules')}
          onLogin={() => {
            setAuthMode('login');
            goTo('auth');
          }}
        />
      )}
      {!showLoginRequired && page === 'dashboard' && <DashboardPage />}
      {!showLoginRequired && page === 'reading' && <PracticePage module={modules[0]} />}
      {!showLoginRequired && page === 'listening' && <PracticePage module={modules[1]} />}
      {!showLoginRequired && page === 'writing' && <WritingPage />}
      {!showLoginRequired && page === 'speaking' && <SpeakingPage />}
      {!showLoginRequired && page === 'records' && <RecordsPage />}
      {page === 'admin' && authRole === 'ADMIN' && <AdminConsolePage onLogout={handleLogout} />}
      {page === 'admin' && isLoggedIn && authRole !== 'ADMIN' && <ErrorPage onNavigate={goTo} />}
      {!showLoginRequired && page === 'profile' && (
        <ProfilePage goalBands={userGoalBands} onGoalBandsChange={setUserGoalBands} />
      )}
      {!showLoginRequired && page === 'settings' && <SettingsPage onPasswordChanged={handlePasswordChanged} />}
      {page === 'faq' && <FaqPage />}
      {page === 'error' && <ErrorPage onNavigate={goTo} />}
      <DashboardAgent />
    </AppShell>
  );
}

function scrollToSection(sectionId: SectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
