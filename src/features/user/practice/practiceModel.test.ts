import { describe, expect, test } from 'vitest';
import { buildPracticeSubmitBody, formatPracticePassageParagraphs, getLatestPracticeRecord, mapApiPracticeRecord, mapApiPracticeTest } from './practiceModel';

describe('practice model', () => {
  test('maps overview records into completed practice records with scores', () => {
    expect(mapApiPracticeRecord({
      recordId: 701,
      title: 'Reading Test',
      score: 32,
      status: 'COMPLETED',
      updatedTime: '2026-05-20T10:00:00',
      raw: {
        testId: 251204,
      },
    })).toMatchObject({
      recordId: 701,
      testId: 251204,
      testTitle: 'Reading Test',
      totalScore: 32,
      status: 'submitted',
      submittedTime: '2026-05-20T10:00:00',
    });
  });

  test('prefers completed practice records over later draft attempts for the same test', () => {
    expect(getLatestPracticeRecord(251204, [
      {
        recordId: 702,
        testId: 251204,
        testTitle: 'Reading Test',
        totalScore: 0,
        status: 'in_progress',
        createdTime: '2026-05-20T11:00:00',
        submittedTime: null,
        timeSpentSeconds: 0,
        remainingSeconds: 3600,
      },
      {
        recordId: 701,
        testId: 251204,
        testTitle: 'Reading Test',
        totalScore: 32,
        status: 'submitted',
        createdTime: '2026-05-20T10:00:00',
        submittedTime: '2026-05-20T10:40:00',
        timeSpentSeconds: 2400,
        remainingSeconds: 0,
      },
    ])).toMatchObject({
      recordId: 701,
      status: 'submitted',
      totalScore: 32,
    });
  });

  test('maps API reading/listening detail into a timed practice test', () => {
    const test = mapApiPracticeTest({
      id: 11,
      title: 'Reading Paper A',
      totalMinutes: 60,
      prepMinutes: 2,
      allow_audio_seek: 0,
      partGroups: [
        {
          id: 101,
          partNumber: 1,
          groupNumber: 1,
          title: 'Passage 1',
          questionNoStart: 1,
          questionNoEnd: 13,
        },
      ],
      questions: [
        {
          id: 1001,
          partGroupId: 101,
          questionNumber: 1,
          questionType: 'TRUE_FALSE_NOT_GIVEN',
          questionText: 'The passage describes flexible classrooms.',
        },
      ],
    });

    expect(test.id).toBe(11);
    expect(test.totalSeconds).toBe(3600);
    expect(test.prepSeconds).toBe(120);
    expect(test.allowAudioSeek).toBe(0);
    expect(test.parts[0]).toMatchObject({ partNumber: 1, groups: ['Passage 1'] });
    expect(test.questions[0]).toMatchObject({ id: 1001, questionType: 'TRUE_FALSE_NOT_GIVEN' });
  });

  test('maps IELTS question UI data for options blanks matching and images', () => {
    const test = mapApiPracticeTest({
      id: 12,
      title: 'Reading Paper B',
      partGroups: [{ id: 101, partNumber: 1, title: 'Passage 1' }],
      questions: [
        {
          id: 2001,
          partGroupId: 101,
          questionNumber: 1,
          questionType: 'MULTIPLE_CHOICE_MULTI',
          questionText: 'Choose two answers.',
          questionNoEnd: 3,
          optionsJson: JSON.stringify([{ label: 'A', text: 'Alpha' }, { label: 'B', text: 'Beta' }]),
          images: [{ fileUrl: '/question-a.png' }],
        },
        {
          id: 2002,
          partGroupId: 101,
          questionNumber: 2,
          questionType: 'COMPLETION',
          questionText: 'I am (2).',
          acceptedAnswersJson: JSON.stringify(['ready']),
        },
        {
          id: 2003,
          partGroupId: 101,
          questionNumber: 3,
          questionType: 'MATCHING',
          questionText: 'Match this statement.',
          answerBank: ['A. Paragraph A', 'B. Paragraph B'],
          pairs: JSON.stringify([{ left: 'A statement', answer: 'A' }]),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'MULTIPLE_CHOICE',
      answerMode: 'MULTIPLE',
      questionNoEnd: 3,
      imageUrls: ['/question-a.png'],
      options: [{ label: 'A', text: 'Alpha' }, { label: 'B', text: 'Beta' }],
    });
    expect(test.questions[1]).toMatchObject({
      questionType: 'FILL_BLANK',
      template: 'I am (2).',
    });
    expect(test.questions[1].blanks[0]).toMatchObject({ questionId: 2002, questionNumber: 2 });
    expect(test.questions[2]).toMatchObject({
      questionType: 'MATCHING',
      bank: ['A. Paragraph A', 'B. Paragraph B'],
      pairs: [{ left: 'A statement', answer: 'A' }],
    });
  });

  test('maps table completion structure from backend detail', () => {
    const test = mapApiPracticeTest({
      id: 13,
      title: 'Listening Paper C',
      partGroups: [{ id: 101, partNumber: 1, title: 'Section 1' }],
      questions: [
        {
          id: 3001,
          partGroupId: 101,
          questionNumber: 1,
          questionType: 'TABLE_COMPLETION',
          questionText: 'Complete the form.',
          tableRowsJson: JSON.stringify([
            ['First name', '(1)'],
            ['Course', '(2)'],
          ]),
          tableHeaderDark: false,
          acceptedAnswersJson: JSON.stringify(['Yui']),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'FILL_BLANK',
      tableRows: [
        ['First name', '(1)'],
        ['Course', '(2)'],
      ],
      tableHeaderDark: false,
    });
  });

  test('maps reading table completion structure from backend detail', () => {
    const test = mapApiPracticeTest({
      id: 23,
      title: 'Reading Paper C',
      partGroups: [{ id: 111, partNumber: 1, title: 'Passage 1' }],
      questions: [
        {
          id: 3101,
          partGroupId: 111,
          questionNumber: 6,
          questionType: 'TABLE_COMPLETION',
          questionText: 'Complete the table below.',
          optionsJson: JSON.stringify({
            instruction: 'Complete the table using words from the passage.',
            prompt: 'Choose no more than two words.',
            tableRows: [
              ['Feature', 'Evidence'],
              ['Harbour', '(6)'],
              ['Market', '(7)'],
            ],
            tableHeaderDark: true,
          }),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'FILL_BLANK',
      groupGuideText: 'Complete the table using words from the passage.',
      groupRequirementText: 'Choose no more than two words.',
      tableRows: [
        ['Feature', 'Evidence'],
        ['Harbour', '(6)'],
        ['Market', '(7)'],
      ],
      tableHeaderDark: true,
    });
  });

  test('maps listening audio duration metadata', () => {
    const test = mapApiPracticeTest({
      id: 17,
      title: 'Listening Paper With Audio',
      partGroups: [{ id: 101, partNumber: 1, title: 'Section 1' }],
      audio: {
        id: 91,
        title: 'Full tape',
        audioUrl: '/media/listening/full.mp3',
        durationSeconds: 185,
      },
      partGroupAudios: [
        {
          id: 92,
          partGroupId: 101,
          title: 'Section tape',
          audio_url: '/media/listening/section-1.mp3',
          duration_seconds: 62,
        },
      ],
    });

    expect(test.testAudio).toMatchObject({
      audioUrl: '/media/listening/full.mp3',
      durationSeconds: 185,
    });
    expect(test.partGroupAudios?.[0]).toMatchObject({
      audioUrl: '/media/listening/section-1.mp3',
      durationSeconds: 62,
    });
  });

  test('maps user listening audio from backend audios resources', () => {
    const test = mapApiPracticeTest({
      id: 18,
      title: 'Listening Paper With Resource Audio',
      parts: [
        {
          partNumber: 1,
          title: 'Part 1',
          groups: [{ id: 101, partNumber: 1, title: 'Section 1' }],
        },
      ],
      audios: [
        {
          id: 93,
          testId: 18,
          audioScope: 'test',
          partGroupId: null,
          title: 'Full tape',
          fileUrl: '/media/listening/full-resource.mp3',
          duration: 123,
        },
        {
          id: 94,
          test_id: 18,
          audio_scope: 'part_group',
          part_group_id: 101,
          originalName: 'Section 1 tape',
          file_url: '/media/listening/section-resource.mp3',
        },
      ],
    });

    expect(test.testAudio).toMatchObject({
      audioUrl: '/media/listening/full-resource.mp3',
      durationSeconds: 123,
    });
    expect(test.partGroupAudios?.[0]).toMatchObject({
      partGroupId: 101,
      title: 'Section 1 tape',
      audioUrl: '/media/listening/section-resource.mp3',
    });
  });

  test('maps listening questions to their section when backend omits partGroupId', () => {
    const test = mapApiPracticeTest({
      id: 20,
      title: 'Listening Paper Sections',
      parts: [
        {
          partNumber: 1,
          title: 'Section 1',
          groups: [{ id: 501, partNumber: 1, title: 'Section 1', questionNoStart: 1, questionNoEnd: 10 }],
        },
        {
          partNumber: 2,
          title: 'Section 2',
          groups: [{ id: 502, partNumber: 2, title: 'Section 2', questionNoStart: 11, questionNoEnd: 20 }],
        },
      ],
      questions: [
        {
          id: 7001,
          sectionNumber: 1,
          questionNumber: 1,
          questionType: 'NOTE_COMPLETION',
          questionText: 'Name (1)',
        },
        {
          id: 7011,
          sectionNumber: 2,
          questionNumber: 11,
          questionType: 'MULTIPLE_CHOICE_SINGLE',
          questionText: 'Choose one.',
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({ id: 7001, partGroupId: 501 });
    expect(test.questions[1]).toMatchObject({ id: 7011, partGroupId: 502 });
  });

  test('preserves nested listening session audio resources', () => {
    const test = mapApiPracticeTest({
      sessionId: 'listening-session-1',
      testId: 19,
      detail: {
        title: 'Listening Session Detail',
        parts: [
          {
            partNumber: 1,
            title: 'Part 1',
            groups: [{ id: 201, partNumber: 1, title: 'Section 1' }],
          },
        ],
        audios: [
          {
            id: 95,
            audio_scope: 'part_group',
            part_group_id: '201',
            file_url: '/media/listening/session-section.mp3',
          },
        ],
      },
    });

    expect(test.id).toBe(19);
    expect(test.partGroupAudios?.[0]).toMatchObject({
      partGroupId: 201,
      audioUrl: '/media/listening/session-section.mp3',
    });
  });

  test('maps multiple choice options from metadata optionsJson', () => {
    const test = mapApiPracticeTest({
      id: 14,
      title: 'Listening Paper A',
      partGroups: [{ id: 201, partNumber: 1, title: 'Section 1' }],
      questions: [
        {
          id: 3002,
          partGroupId: 201,
          questionNumber: 6,
          questionType: 'MULTIPLE_CHOICE_SINGLE',
          questionText: 'Which kind of family does the girls prefer?',
          optionsJson: JSON.stringify({
            instruction: 'Listen and choose the correct answer.',
            prompt: 'Which kind of family does the girls prefer?',
            options: [
              { label: 'A', text: 'A big family' },
              { label: 'B', text: 'A small family' },
            ],
          }),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'MULTIPLE_CHOICE',
      groupGuideText: 'Listen and choose the correct answer.',
      groupRequirementText: 'Which kind of family does the girls prefer?',
      options: [
        { label: 'A', text: 'A big family' },
        { label: 'B', text: 'A small family' },
      ],
    });
  });

  test('uses checkboxes for single-scored multiple choice when more than one answer is required', () => {
    const test = mapApiPracticeTest({
      id: 24,
      title: 'Listening Single Scored Multi Answer',
      partGroups: [{ id: 601, partNumber: 1, title: 'Section 1', questionNoStart: 1, questionNoEnd: 10 }],
      questions: [
        {
          id: 7601,
          partGroupId: 601,
          questionNumber: 6,
          questionNoEnd: 6,
          questionType: 'MULTIPLE_CHOICE_SINGLE',
          answerMode: 'SINGLE',
          questionText: 'Mark TWO letters.',
          optionsJson: JSON.stringify({
            options: [
              { label: 'A', text: 'A big family' },
              { label: 'B', text: 'No smokers' },
              { label: 'C', text: 'No pets' },
              { label: 'D', text: 'Animals or pets' },
            ],
          }),
          acceptedAnswersJson: JSON.stringify(['A', 'D']),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      answerMode: 'MULTIPLE',
      questionNumber: 6,
      questionNoEnd: 6,
    });
  });

  test('derives multiple-scored choice range from the number of required answers when end number is missing', () => {
    const test = mapApiPracticeTest({
      id: 25,
      title: 'Listening Multiple Scored Choice',
      partGroups: [{ id: 602, partNumber: 3, title: 'Section 3', questionNoStart: 21, questionNoEnd: 30 }],
      questions: [
        {
          id: 7628,
          partGroupId: 602,
          questionNumber: 28,
          questionType: 'MULTIPLE_CHOICE_MULTI',
          answerMode: 'MULTI',
          questionText: 'Mark THREE letters.',
          optionsJson: JSON.stringify({
            options: [
              { label: 'A', text: 'Books' },
              { label: 'B', text: 'Study materials' },
              { label: 'C', text: 'Foods' },
              { label: 'D', text: 'Trousers' },
            ],
          }),
          acceptedAnswersJson: JSON.stringify(['A', 'B', 'C']),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      answerMode: 'MULTIPLE',
      questionNumber: 28,
      questionNoEnd: 30,
    });
  });

  test('maps IELTS completion aliases and table rows from metadata', () => {
    const test = mapApiPracticeTest({
      id: 15,
      title: 'Listening Paper B',
      partGroups: [{ id: 301, partNumber: 1, title: 'Section 1' }],
      questions: [
        {
          id: 4001,
          partGroupId: 301,
          questionNumber: 1,
          questionNoEnd: 5,
          questionType: 'FORM_COMPLETION',
          questionText: 'Complete the form.',
          optionsJson: JSON.stringify({
            rows: [
              ['Name', '(1)'],
              ['Course', '(2)'],
            ],
          }),
        },
        {
          id: 4002,
          partGroupId: 301,
          questionNumber: 7,
          questionType: 'NOTE_COMPLETION',
          questionText: 'Favourite food is (1). Sport is (2).',
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'FILL_BLANK',
      tableRows: [
        ['Name', '(1)'],
        ['Course', '(2)'],
      ],
    });
    expect(test.questions[1]).toMatchObject({
      questionType: 'FILL_BLANK',
      template: 'Favourite food is (1). Sport is (2).',
    });
  });

  test('infers multi-answer multiple choice from accepted answers and question range', () => {
    const test = mapApiPracticeTest({
      id: 16,
      title: 'Listening Paper D',
      partGroups: [{ id: 401, partNumber: 1, title: 'Section 2' }],
      questions: [
        {
          id: 5001,
          partGroupId: 401,
          questionNumber: 11,
          questionNoEnd: 12,
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Choose two answers.',
          optionsJson: JSON.stringify([{ label: 'A', text: 'Alpha' }, { label: 'B', text: 'Beta' }]),
          acceptedAnswersJson: JSON.stringify(['A', 'B']),
        },
      ],
    });

    expect(test.questions[0]).toMatchObject({
      questionType: 'MULTIPLE_CHOICE',
      answerMode: 'MULTIPLE',
    });
  });

  test('buildPracticeSubmitBody sends numeric question ids with session id', () => {
    expect(buildPracticeSubmitBody(
      { '1001': 'TRUE', '1002': 'A' },
      [
        { id: 1001, answerMode: 'SINGLE' },
        { id: 1002, answerMode: 'SINGLE' },
      ],
      'session-1',
    )).toEqual({
      sessionId: 'session-1',
      answers: [
        { questionId: 1001, answer: 'TRUE' },
        { questionId: 1002, answer: 'A' },
      ],
    });
  });

  test('buildPracticeSubmitBody sends multiple answers for multiple-answer questions', () => {
    expect(buildPracticeSubmitBody(
      { '1001': ['A', 'C'], '1002': 'river' },
      [
        { id: 1001, answerMode: 'MULTIPLE' },
        { id: 1002, answerMode: 'TEXT' },
      ],
      'session-1',
    )).toEqual({
      sessionId: 'session-1',
      answers: [
        { questionId: 1001, answers: ['A', 'C'] },
        { questionId: 1002, answer: 'river' },
      ],
    });
  });

  test('formats reading passage content using author-created blank lines as paragraph breaks', () => {
    expect(formatPracticePassageParagraphs('Paragraph one line one.\nParagraph one line two.\n\nParagraph two.')).toEqual([
      'Paragraph one line one.\nParagraph one line two.',
      'Paragraph two.',
    ]);
  });

  test('maps nested reading session detail without object labels or missing passage content', () => {
    const test = mapApiPracticeTest({
      sessionId: 'session-1',
      testId: 2033,
      detail: {
        title: 'Reading detail',
        totalSeconds: 3600,
        parts: [
          {
            partNumber: 1,
            title: 'Part 1',
            groups: [{ id: 2132, title: 'Passage 1' }],
          },
        ],
        partGroups: [
          {
            id: 2132,
            partNumber: 1,
            title: 'Passage 1',
          },
        ],
        passages: [
          {
            id: 2232,
            partGroupId: 2132,
            title: 'Memory Research',
            content: 'Memory passage content.',
          },
        ],
        questions: [
          {
            id: 2344,
            partGroupId: 2132,
            questionNumber: 1,
            questionText: 'Memory is shaped by ____.',
          },
        ],
      },
    });

    expect(test.id).toBe(2033);
    expect(test.parts[0].groups).toEqual(['Passage 1']);
    expect(test.partGroups[0].passageTitle).toBe('Memory Research');
    expect(test.partGroups[0].passageContent).toBe('Memory passage content.');
    expect(test.questions[0]).toMatchObject({ id: 2344, partGroupId: 2132 });
  });

  test('maps latest user reading test detail from nested parts groups', () => {
    const test = mapApiPracticeTest({
      id: 2033,
      title: 'Codex Reading API Smoke Updated',
      totalScore: 40,
      timeLimitSeconds: 3600,
      parts: [
        {
          partNumber: 1,
          title: 'Part 1',
          groups: [
            {
              id: 2132,
              partNumber: 1,
              groupNumber: 1,
              title: 'Passage 1',
              instructionText: 'Read the passage.',
              passages: [
                {
                  id: 2232,
                  partGroupId: 2132,
                  passageNo: 1,
                  title: 'Memory Research',
                  content: 'Nested passage content.',
                  questions: [
                    {
                      id: 2344,
                      passageId: 2232,
                      partGroupId: 2132,
                      questionNumber: 1,
                      questionText: 'Memory is shaped by ____.',
                    },
                  ],
                },
              ],
              questions: [
                {
                  id: 2344,
                  passageId: 2232,
                  partGroupId: 2132,
                  questionNumber: 1,
                  questionText: 'Memory is shaped by ____.',
                },
              ],
            },
          ],
        },
      ],
    });

    expect(test.parts[0].groups).toEqual(['Passage 1']);
    expect(test.partGroups).toHaveLength(1);
    expect(test.partGroups[0]).toMatchObject({
      id: 2132,
      passageTitle: 'Memory Research',
      passageContent: 'Nested passage content.',
    });
    expect(test.questions).toHaveLength(1);
    expect(test.questions[0]).toMatchObject({ id: 2344, questionText: 'Memory is shaped by ____.' });
  });
});
