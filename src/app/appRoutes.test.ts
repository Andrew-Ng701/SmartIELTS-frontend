import { describe, expect, it } from 'vitest';
import { getPageFromPath, getPathForPage } from './appRoutes';

describe('appRoutes', () => {
  it('maps app pages to browser paths', () => {
    expect(getPathForPage('landing')).toBe('/');
    expect(getPathForPage('dashboard')).toBe('/dashboard');
    expect(getPathForPage('speaking')).toBe('/speaking');
    expect(getPathForPage('admin')).toBe('/admin');
  });

  it('maps browser paths back to app pages', () => {
    expect(getPageFromPath('/')).toBe('landing');
    expect(getPageFromPath('/records')).toBe('records');
    expect(getPageFromPath('/records/')).toBe('records');
    expect(getPageFromPath('/missing')).toBe('error');
  });
});
