import { describe, expect, test } from 'vitest';
import {
  buildWritingQuestionPayload,
  createAdminWritingDraft,
  mapApiAdminWritingQuestion,
} from './adminWritingModel';

describe('adminWritingModel', () => {
  test('creates task-specific writing drafts', () => {
    expect(createAdminWritingDraft('TASK_1')).toMatchObject({
      taskType: 'TASK_1',
      chartType: 'Line graph',
      expectedWords: 150,
      totalSeconds: 1200,
    });

    expect(createAdminWritingDraft('TASK_2')).toMatchObject({
      taskType: 'TASK_2',
      chartType: undefined,
      expectedWords: 250,
      totalSeconds: 2400,
    });
  });

  test('maps backend writing question fields and builds admin payload', () => {
    const question = mapApiAdminWritingQuestion({
      id: 88,
      taskType: 'TASK_1',
      chart_type: 'Bar chart',
      title: 'Chart prompt',
      description: 'Describe the chart.',
      totalMinutes: 20,
      prepSeconds: 0,
      expectedWords: 150,
      images: [{ file_url: '/uploads/chart.png', object_key: 'chart-image' }],
    });

    expect(question).toMatchObject({
      id: '88',
      taskType: 'TASK_1',
      chartType: 'Bar chart',
      title: 'Chart prompt',
      totalSeconds: 1200,
      prepSeconds: 0,
      media: [{ preview: 'http://localhost/uploads/chart.png', objectKey: 'chart-image' }],
    });

    expect(buildWritingQuestionPayload(question)).toMatchObject({
      title: 'Chart prompt',
      description: 'Describe the chart.',
      taskType: 'TASK_1',
      chartType: 'Bar chart',
      totalMinutes: 20,
      prepSeconds: 0,
      images: [{ fileUrl: 'http://localhost/uploads/chart.png', objectKey: 'chart-image' }],
    });
  });

  test('omits blank writing prompt when building admin payload', () => {
    const draft = createAdminWritingDraft('TASK_2');
    const payload = buildWritingQuestionPayload({
      ...draft,
      description: '   ',
      title: 'Essay prompt without description',
    });

    expect(payload).toMatchObject({
      title: 'Essay prompt without description',
      taskType: 'TASK_2',
      chartType: null,
    });
    expect(payload).not.toHaveProperty('description');
  });
});
