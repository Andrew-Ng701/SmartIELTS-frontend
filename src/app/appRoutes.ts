import type { AppPageId } from './appTypes';

const PAGE_PATHS: Record<AppPageId, string> = {
  landing: '/',
  auth: '/login',
  dashboard: '/dashboard',
  reading: '/reading',
  listening: '/listening',
  writing: '/writing',
  speaking: '/speaking',
  records: '/records',
  admin: '/admin',
  profile: '/profile',
  settings: '/settings',
  faq: '/faq',
  error: '/error',
};

const PATH_PAGES = new Map<string, AppPageId>(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page as AppPageId]),
);

export function getPathForPage(page: AppPageId) {
  return PAGE_PATHS[page];
}

export function getPageFromPath(pathname: string): AppPageId {
  const normalizedPath = normalizePath(pathname);
  return PATH_PAGES.get(normalizedPath) ?? 'error';
}

export function getInitialPageFromLocation(location: Pick<Location, 'pathname'> = window.location) {
  return getPageFromPath(location.pathname);
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}
