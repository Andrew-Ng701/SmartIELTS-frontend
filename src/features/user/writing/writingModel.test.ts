import { describe, expect, it } from 'vitest';
import { getLatestWritingRecord, getWritingStatusLabel, mapApiWritingQuestion, splitWritingFiles, wordCount } from './writingModel';

describe('writingModel', () => {
  it('maps backend writing question fields into the UI model', () => {
    const question = mapApiWritingQuestion({
      id: 12,
      task_type: 'TASK_1',
      chart_type: 'Line graph',
      title: 'Chart summary',
      question_text: 'Summarise the chart.',
      expected_words: 180,
      total_minutes: 20,
      prep_seconds: 90,
      allow_pause: 1,
      image_url: '/chart.png',
      images: [
        { file_url: '/chart-a.png', object_key: 'chart-a', sort_order: 2 },
      ],
      created_time: '2026-05-15T10:00:00',
    });

    expect(question).toMatchObject({
      id: 12,
      taskType: 'TASK_1',
      chartType: 'Line graph',
      title: 'Chart summary',
      description: 'Summarise the chart.',
      expectedWords: 180,
      totalSeconds: 1200,
      prepSeconds: 90,
      allowPause: true,
      imageUrl: 'http://localhost/chart.png',
      createdTime: '2026-05-15T10:00:00',
    });
    expect(question.images).toEqual([{ url: 'http://localhost/chart-a.png', objectKey: 'chart-a', sortOrder: 2 }]);
  });

  it('uses IELTS default expected words when the backend omits expectedWords', () => {
    expect(mapApiWritingQuestion({ id: 14, taskType: 'TASK_1', title: 'Chart' }).expectedWords).toBe(150);
    expect(mapApiWritingQuestion({ id: 15, taskType: 'TASK_2', title: 'Essay' }).expectedWords).toBe(250);
  });

  it('uses backend writing time units without falling back over zero preparation seconds', () => {
    const question = mapApiWritingQuestion({
      id: 16,
      taskType: 'TASK_1',
      title: 'Timed chart',
      totalSeconds: 999,
      totalMinutes: 20,
      prepSeconds: 0,
      prepMinutes: 5,
    });

    expect(question.totalSeconds).toBe(1200);
    expect(question.prepSeconds).toBe(0);
  });

  it('uses the legacy single image URL when the images list is absent', () => {
    const question = mapApiWritingQuestion({
      id: 13,
      taskType: 'TASK_1',
      title: 'Single chart',
      imageUrl: '/single-chart.png',
      imageObjectKey: 'single-chart',
    });

    expect(question.images).toEqual([{ url: 'http://localhost/single-chart.png', objectKey: 'single-chart', sortOrder: 1 }]);
  });

  it('selects one pdf and keeps the remaining files as image uploads', () => {
    const image = new File(['image'], 'answer.png', { type: 'image/png' });
    const pdf = new File(['pdf'], 'answer.pdf', { type: 'application/pdf' });
    const extraImage = new File(['image'], 'extra.jpg', { type: 'image/jpeg' });

    expect(splitWritingFiles([image, pdf, extraImage])).toEqual({
      images: [image, extraImage],
      pdf,
    });
  });

  it('derives writing record labels and word counts', () => {
    expect(getLatestWritingRecord(1, [{ id: 3, questionId: 1, aiStatus: 'PENDING' }])).toMatchObject({ id: 3 });
    expect(getWritingStatusLabel(null)).toBe('Not started');
    expect(getWritingStatusLabel({ id: 1, questionId: 1, aiStatus: 'SUCCESS' })).toBe('Completed');
    expect(getWritingStatusLabel({ id: 1, questionId: 1, aiStatus: 'PENDING' })).toBe('Scoring');
    expect(getWritingStatusLabel({ id: 1, questionId: 1, aiStatus: 'FAILED' })).toBe('Review failed');
    expect(wordCount('  IELTS writing\nneeds clear examples.  ')).toBe(5);
  });
});
