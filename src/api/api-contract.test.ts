import { beforeEach, describe, expect, test, vi } from 'vitest';
import { adminApi } from './adminApi';
import { adminUsersApi } from './adminUsersApi';
import { apiGet, configureApiClient } from './client';
import { dashboardApi } from './dashboardApi';
import { ApiError } from './errors';
import { listeningApi } from './listeningApi';
import { readingApi } from './readingApi';
import { recordsApi } from './recordsApi';
import { speakingApi } from './speakingApi';
import { writingApi } from './writingApi';

const installLocation = () => {
  vi.stubGlobal('window', {
    location: {
      origin: 'http://localhost:5173',
    },
  });
};

const installFetch = () => {
  const fetchSpy = vi.fn(async (_input: string, _init?: RequestInit) =>
    Response.json({ code: 1, msg: null, data: {} }),
  );
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
};

const requestPath = (fetchSpy: ReturnType<typeof installFetch>) => {
  const request = fetchSpy.mock.calls[0]?.[0];
  if (typeof request !== 'string') {
    throw new Error('Expected fetch to be called with a URL string.');
  }

  return new URL(request).pathname;
};

const calledUrl = (fetchSpy: ReturnType<typeof installFetch>, index: number) => {
  const request = fetchSpy.mock.calls[index]?.[0];
  if (typeof request !== 'string') {
    throw new Error(`Expected fetch call ${index} to include a URL string.`);
  }

  return request;
};

const calledOptions = (fetchSpy: ReturnType<typeof installFetch>, index: number) => {
  const options = fetchSpy.mock.calls[index]?.[1];
  if (!options) {
    throw new Error(`Expected fetch call ${index} to include request options.`);
  }

  return options;
};

describe('frontend API contract wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocation();
    configureApiClient({
      baseUrl: '/api',
      getToken: () => 'jwt-token',
      onUnauthorized: () => undefined,
    });
  });

  test('does not expose removed user test detail endpoints for reading/listening', () => {
    expect('getUserTest' in readingApi).toBe(false);
    expect('getUserTest' in listeningApi).toBe(false);
  });

  test('does not expose removed single-question endpoints for user writing', () => {
    expect('getQuestion' in writingApi).toBe(false);
  });

  test('user writing question list supports task type filtering', async () => {
    const fetchSpy = installFetch();

    await writingApi.listQuestions({ taskType: 'TASK_1' });

    const url = new URL(calledUrl(fetchSpy, 0));
    expect(url.pathname).toBe('/api/user/writing/questions');
    expect(url.searchParams.get('taskType')).toBe('TASK_1');
  });

  test('admin writing image wrapper uses multipart image replacement endpoint', async () => {
    const fetchSpy = installFetch();
    const image = new File(['image'], 'chart.png', { type: 'image/png' });

    await writingApi.replaceAdminQuestionImages(42, [image]);

    const options = calledOptions(fetchSpy, 0);
    expect(requestPath(fetchSpy)).toBe('/api/admin/writing/questions/42/images');
    expect(options.body).toBeInstanceOf(FormData);
    expect(new Headers(options.headers).has('Content-Type')).toBe(false);
  });

  test('user speaking exam wrappers use documented lifecycle endpoints and multipart forms', async () => {
    const fetchSpy = installFetch();
    const audio = new File(['audio'], 'answer.webm', { type: 'audio/webm' });

    await speakingApi.listQuestions();
    expect(requestPath(fetchSpy)).toBe('/api/user/speaking/questions');

    await speakingApi.startExam({ examType: 'FULL' });
    expect(new URL(calledUrl(fetchSpy, 1)).pathname).toBe('/api/user/speaking/start-exam');

    await speakingApi.nextQuestion({ sessionId: 'sess-1' });
    expect(new URL(calledUrl(fetchSpy, 2)).pathname).toBe('/api/user/speaking/next-question');

    await speakingApi.submitAnswer({ sessionId: 'sess-1', questionId: 9, file: audio });
    const submitOptions = calledOptions(fetchSpy, 3);
    expect(new URL(calledUrl(fetchSpy, 3)).pathname).toBe('/api/user/speaking/submit-answer');
    expect(submitOptions.body).toBeInstanceOf(FormData);
    expect(new Headers(submitOptions.headers).has('Content-Type')).toBe(false);

    await speakingApi.getSessionSummary('sess-1');
    expect(new URL(calledUrl(fetchSpy, 4)).pathname).toBe('/api/user/speaking/sessions/sess-1/summary');

    await speakingApi.getTalkStatus('talk-1');
    expect(new URL(calledUrl(fetchSpy, 5)).pathname).toBe('/api/user/speaking/talks/talk-1');

    await speakingApi.uploadAudio({ file: audio, sessionId: 'sess-1', questionId: 9 });
    const uploadOptions = calledOptions(fetchSpy, 6);
    expect(new URL(calledUrl(fetchSpy, 6)).pathname).toBe('/api/user/speaking/upload-audio');
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    expect(new Headers(uploadOptions.headers).has('Content-Type')).toBe(false);
  });

  test('does not expose unsupported generic admin exams endpoints', () => {
    expect('listExams' in adminApi).toBe(false);
    expect('createExam' in adminApi).toBe(false);
    expect('getExam' in adminApi).toBe(false);
    expect('updateExam' in adminApi).toBe(false);
    expect('deleteExam' in adminApi).toBe(false);
    expect('restoreExam' in adminApi).toBe(false);
  });

  test('admin user scoped record wrappers use contract paths', async () => {
    const fetchSpy = installFetch();

    await adminUsersApi.listUserRecords(7, { pageNum: 2, pageSize: 20, module: 'READING' });
    expect(requestPath(fetchSpy)).toBe('/api/admin/users/7/records');

    await adminUsersApi.getUserRecordDetail(7, 'READING', 99);
    expect(new URL(calledUrl(fetchSpy, 1)).pathname).toBe('/api/admin/users/7/records/READING/99');
  });

  test('user listening record script wrapper uses the section script endpoint', async () => {
    const fetchSpy = installFetch();

    await recordsApi.getListeningSectionScript(88, 2);

    expect(requestPath(fetchSpy)).toBe('/api/user/records/listening/88/sections/2/script');
  });

  test('listening audio wrappers use contract paths and multipart form data', async () => {
    const fetchSpy = installFetch();
    const file = new File(['audio'], 'section.mp3', { type: 'audio/mpeg' });

    await listeningApi.getTestAudio(3);
    expect(requestPath(fetchSpy)).toBe('/api/admin/listening/tests/3/audio');

    await listeningApi.deleteTestAudio(3, 4);
    expect(new URL(calledUrl(fetchSpy, 1)).pathname).toBe('/api/admin/listening/tests/3/audio/4');

    await listeningApi.getPartGroupAudio(5);
    expect(new URL(calledUrl(fetchSpy, 2)).pathname).toBe('/api/admin/listening/part-groups/5/audio');

    await listeningApi.replacePartGroupAudio(3, 5, 8, file, 'Task 1');
    const replaceOptions = calledOptions(fetchSpy, 3);
    expect(new URL(calledUrl(fetchSpy, 3)).pathname).toBe('/api/admin/listening/tests/3/part-groups/5/audio/8');
    expect(replaceOptions.body).toBeInstanceOf(FormData);
    expect(new Headers(replaceOptions.headers).has('Content-Type')).toBe(false);

    await listeningApi.deletePartGroupAudio(3, 5, 8);
    expect(new URL(calledUrl(fetchSpy, 4)).pathname).toBe('/api/admin/listening/tests/3/part-groups/5/audio/8');
  });

  test('dashboard wrappers only expose documented dashboard endpoints', async () => {
    const fetchSpy = installFetch();

    expect('getUserOverviewVisual' in dashboardApi).toBe(false);
    expect('getAdminOverviewVisual' in dashboardApi).toBe(false);

    await dashboardApi.getUserExecutiveSummary('30d');
    expect(requestPath(fetchSpy)).toBe('/api/smartielts/dashboard/user/executive_summary');

    await dashboardApi.preloadAdmin(12, '7d');
    expect(new URL(calledUrl(fetchSpy, 1)).pathname).toBe('/api/smartielts/dashboard/admin/preload');
  });

  test('forbidden responses keep the auth session and surface an API error', async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ code: 0, msg: 'Forbidden', data: null }, { status: 403 })),
    );
    configureApiClient({
      baseUrl: '/api',
      getToken: () => 'jwt-token',
      onUnauthorized,
    });

    await expect(apiGet('/user/console')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    } satisfies Partial<ApiError>);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
