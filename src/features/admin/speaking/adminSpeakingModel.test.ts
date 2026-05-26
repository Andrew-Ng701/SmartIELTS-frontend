import { describe, expect, test } from 'vitest';
import {
  buildSpeakingQuestionPayload,
  buildSpeakingQuestionRows,
  createAdminSpeakingDraft,
  mapApiAdminSpeakingTopics,
  mapApiAdminSpeakingTopic,
} from './adminSpeakingModel';

describe('adminSpeakingModel', () => {
  test('creates topic-specific speaking drafts', () => {
    expect(createAdminSpeakingDraft('TOPIC_1')).toMatchObject({
      mode: 'TOPIC_1',
      topic: 'New Topic 1',
      questions: [''],
      followUps: [],
    });

    expect(createAdminSpeakingDraft('TOPIC_2_3')).toMatchObject({
      mode: 'TOPIC_2_3',
      topic: 'New Topic 2',
      prepSeconds: 0,
      answerSeconds: 120,
    });
  });

  test('maps backend speaking question fields and builds admin payload', () => {
    const topic = mapApiAdminSpeakingTopic({
      id: 99,
      part: 'PART2',
      topicKey: 'Learning',
      questionText: 'Learning',
      cueCard: 'Describe a skill.',
      followUpQuestionsJson: '["Why do people learn new skills?"]',
      prepSeconds: 60,
      answerSeconds: 120,
    });

    expect(topic).toMatchObject({
      id: '99',
      mode: 'TOPIC_2_3',
      topic: 'Learning',
      cueCard: 'Describe a skill.',
      followUps: ['Why do people learn new skills?'],
    });

    expect(buildSpeakingQuestionPayload(topic)).toEqual({
      id: 99,
      title: 'Learning',
      part: 'PART2',
      subType: 'CUECARD',
      sub_type: 'CUECARD',
      topicKey: 'Learning',
      topic_key: 'Learning',
      questionText: 'Learning',
      question_text: 'Learning',
      cueCard: 'Describe a skill.',
      cue_card: 'Describe a skill.',
      followUpQuestionsJson: '["Why do people learn new skills?"]',
      follow_up_questions_json: '["Why do people learn new skills?"]',
      prepSeconds: 60,
      prep_seconds: 60,
      answerSeconds: 120,
      answer_seconds: 120,
      displayOrder: 1,
      display_order: 1,
      active: 1,
    });
  });

  test('sends a non-null question text for topic 1 rows', () => {
    const payload = buildSpeakingQuestionRows({
      id: 's-1',
      mode: 'TOPIC_1',
      topic: 'Daily life',
      questions: ['', 'What do you usually do after work?'],
      followUps: [],
      createdTime: '2026-05-17T10:00:00',
      deletedTime: null,
    });

    expect(payload[0].questionText).toBe('What do you usually do after work?');
    expect(payload[0].question_text).toBe('What do you usually do after work?');
  });

  test('groups part 2 cue cards and part 3 follow-ups by topic key', () => {
    const topics = mapApiAdminSpeakingTopics([
      { id: 1, part: 'PART2', subType: 'CUECARD', topicKey: 'Travel', questionText: 'Travel', cueCard: 'Describe a trip.' },
      { id: 2, part: 'PART3', subType: 'FOLLOWUP', topicKey: 'Travel', questionText: 'Why do people travel?' },
    ]);

    expect(topics[0]).toMatchObject({
      mode: 'TOPIC_2_3',
      topic: 'Travel',
      cueCard: 'Describe a trip.',
      followUps: ['Why do people travel?'],
    });
  });
});
