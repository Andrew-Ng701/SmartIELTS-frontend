import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DID_SCRIPT_SRC,
  DID_TARGET_ID,
  buildDidSpeakingFrameUrl,
  mapNextQuestionToStep,
  mapStartExamToOverview,
} from './speakingModel';

describe('speakingModel', () => {
  it('builds a same-origin D-ID frame URL with a reload key', () => {
    const url = new URL(buildDidSpeakingFrameUrl(7, 'http://localhost:5173'));

    expect(url.origin).toBe('http://localhost:5173');
    expect(url.pathname).toBe('/did-speaking-frame.html');
    expect(url.searchParams.get('reload')).toBe('7');
    expect(url.searchParams.get('scriptSrc')).toBe(DID_SCRIPT_SRC);
    expect(url.searchParams.get('targetId')).toBe(DID_TARGET_ID);
  });

  it('keeps the public D-ID iframe host aligned with runtime script attributes', () => {
    const frameHtml = readFileSync(resolve(process.cwd(), 'public/did-speaking-frame.html'), 'utf8');

    expect(frameHtml).toContain(`<div id="${DID_TARGET_ID}"></div>`);
    expect(frameHtml).toContain('params.get("scriptSrc")');
    expect(frameHtml).toContain('params.get("clientKey")');
    expect(frameHtml).toContain('params.get("agentId")');
    expect(frameHtml).toContain('script.dataset.mode = "full"');
    expect(frameHtml).toContain('script.dataset.clientKey = clientKey');
    expect(frameHtml).toContain('script.dataset.agentId = agentId');
    expect(frameHtml).toContain('script.dataset.name = "did-agent"');
    expect(frameHtml).toContain('script.dataset.monitor = "true"');
    expect(frameHtml).toContain('script.dataset.targetId = targetId');
  });

  it('maps speaking exam lifecycle payloads into the page view model', () => {
    expect(mapStartExamToOverview({
      sessionId: 'sess-1',
      examStatus: 'STARTED',
      totalQuestions: 12,
      openingCount: 1,
      part1Count: 4,
      part3Count: 5,
      topicKeyForPart2And3: 'education',
      message: 'Started',
    })).toMatchObject({
      sessionId: 'sess-1',
      status: 'STARTED',
      totalQuestions: 12,
      topicKey: 'education',
    });

    expect(mapNextQuestionToStep({
      sessionId: 'sess-1',
      questionId: 501,
      part: 'PART_2',
      stepType: 'CUE_CARD',
      topicKey: 'education',
      questionText: 'Describe a teacher.',
      cueCard: 'You should say who they were.',
      prepSeconds: 60,
      answerSeconds: 120,
      currentIndex: 6,
      hasNext: true,
      talkId: 'talk-1',
      examStatus: 'IN_PROGRESS',
    })).toMatchObject({
      questionId: 501,
      part: 'PART_2',
      currentIndex: 6,
      hasNext: true,
    });
  });
});
