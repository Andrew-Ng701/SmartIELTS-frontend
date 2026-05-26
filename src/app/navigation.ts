export const USER_NAV_ITEMS = [
  { label: 'Home', page: 'home' },
  { label: 'Dashboard', page: 'dashboard' },
  { label: 'Records', page: 'records' },
  { label: 'FAQ', page: 'faq' },
] as const;

export const MODULE_NAV_ITEMS = [
  { label: 'Reading', module: 'READING', page: 'reading' },
  { label: 'Listening', module: 'LISTENING', page: 'listening' },
  { label: 'Writing', module: 'WRITING', page: 'writing' },
  { label: 'Speaking', module: 'SPEAKING', page: 'speaking' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', section: 'overview' },
  { label: 'Users', section: 'users' },
  { label: 'Reading', section: 'reading' },
  { label: 'Listening', section: 'listening' },
  { label: 'Writing', section: 'writing' },
  { label: 'Speaking', section: 'speaking' },
] as const;
