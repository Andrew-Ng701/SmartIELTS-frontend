import { describe, expect, it } from 'vitest';
import {
  buildAdminExamPayload,
  buildAdminReadingCreatePayload,
  getAdminExamListQuestionCount,
  getAdminExamListTaskCount,
  getAdminExamModuleName,
  getAdminExamScore,
  getAdminQuestionTypes,
  mapApiAdminExam,
  parseAcceptedAnswersInput,
  toStoredAdminExamDraft,
} from './adminExamModel';

describe('adminExamModel', () => {
  it('keeps commas and full-width punctuation inside accepted answers', () => {
    expect(parseAcceptedAnswersInput('答案（A，B）\nanswer, with comma')).toEqual([
      '答案（A，B）',
      'answer, with comma',
    ]);
  });

  it('maps backend reading test payload into an admin exam view model', () => {
    const exam = mapApiAdminExam({
      id: 12,
      title: 'Reading Test A',
      total_minutes: 60,
      prep_seconds: 0,
      part_groups: [
        {
          id: 5,
          title: 'Passage 1',
          passage_title: 'Urban design',
          passage_content: 'A passage.',
          questions: [
            { id: 9, question_type: 'MULTIPLE_CHOICE_SINGLE', question_text: 'Choose one', score: 2 },
          ],
        },
      ],
    }, 'reading');

    expect(exam).toMatchObject({
      id: '12',
      module: 'Reading',
      title: 'Reading Test A',
      totalSeconds: 3600,
      prepSeconds: 0,
    });
    expect(exam.tasks[0].questions[0]).toMatchObject({ id: '9', type: 'multiple_choice', score: 2 });
    expect(getAdminExamScore(exam)).toBe(1);
  });

  it('maps admin reading list summary counts without treating numeric tasks as task rows', () => {
    const exam = mapApiAdminExam({
      id: 15,
      title: 'Reading List Item',
      totalScore: 40,
      tasks: 3,
      questions: 40,
      totalMinutes: 60,
      prepMinutes: 0,
    }, 'reading');

    expect(exam.tasks).toHaveLength(0);
    expect(getAdminExamListTaskCount(exam)).toBe(3);
    expect(getAdminExamListQuestionCount(exam)).toBe(40);
    expect(getAdminExamScore(exam)).toBe(40);
  });

  it('sums system score across expanded question units in every task', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Full Test',
      partGroups: [
        {
          title: 'Passage 1',
          questions: [
            {
              questionType: 'MATCHING',
              score: 1,
              pairs: [
                { left: 'Statement 1', answer: 'A' },
                { left: 'Statement 2', answer: 'B' },
              ],
            },
          ],
        },
        {
          title: 'Passage 2',
          questions: [
            {
              questionType: 'SUMMARY_COMPLETION',
              score: 1,
              blanks: [
                { no: 1, answer: 'one' },
                { no: 2, answer: 'two' },
                { no: 3, answer: 'three' },
              ],
            },
          ],
        },
        {
          title: 'Passage 3',
          questions: [
            { questionType: 'MULTIPLE_CHOICE_SINGLE', score: 2 },
          ],
        },
      ],
    }, 'reading');

    expect(getAdminExamScore(exam)).toBe(6);
  });

  it('counts multiple-answer choices by correct labels and builds a ranged payload', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Multi Choice',
      partGroups: [
        {
          questions: [
            {
              questionType: 'MULTIPLE_CHOICE_MULTI',
              questionText: 'Choose three answers.',
              answerMode: 'MULTI',
              options: [
                { label: 'A', text: 'Books', correct: true },
                { label: 'B', text: 'Study materials', correct: false },
                { label: 'D', text: 'Trousers', correct: true },
                { label: 'E', text: 'Shoes', correct: true },
              ],
            },
          ],
        },
      ],
    }, 'reading');
    const question = exam.tasks[0].questions[0];
    const payload = buildAdminExamPayload(exam);

    expect(question.selectionMode).toBe('multiple');
    expect(getAdminExamScore(exam)).toBe(3);
    expect(getAdminExamListQuestionCount(exam)).toBe(3);
    expect(payload.questions?.[0]).toMatchObject({
      questionType: 'MULTIPLE_CHOICE_MULTI',
      answerMode: 'MULTI',
      correctAnswer: 'A,D,E',
      acceptedAnswersJson: JSON.stringify(['A', 'D', 'E']),
      questionNoStart: 1,
      questionNoEnd: 3,
      score: 1,
    });
  });

  it('keeps single scored multiple choice as one question even when several options are correct', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Single Scored Multi Select',
      partGroups: [
        {
          questions: [
            {
              questionType: 'MULTIPLE_CHOICE_SINGLE',
              questionText: 'Choose two answers.',
              answerMode: 'MULTI',
              acceptedAnswersJson: JSON.stringify(['B', 'D']),
              questionNoStart: 6,
              questionNoEnd: 6,
              options: [
                { label: 'A', text: 'Option A' },
                { label: 'B', text: 'Option B' },
                { label: 'C', text: 'Option C' },
                { label: 'D', text: 'Option D' },
              ],
            },
          ],
        },
      ],
    }, 'reading');
    const question = exam.tasks[0].questions[0];
    const payload = buildAdminExamPayload(exam);

    expect(question.selectionMode).toBe('single');
    expect(question.options?.filter((option) => option.correct).map((option) => option.label)).toEqual(['B', 'D']);
    expect(getAdminExamScore(exam)).toBe(1);
    expect(getAdminExamListQuestionCount(exam)).toBe(1);
    expect(payload.questions?.[0]).toMatchObject({
      questionType: 'MULTIPLE_CHOICE_SINGLE',
      answerMode: 'MULTI',
      correctAnswer: 'B,D',
      acceptedAnswersJson: JSON.stringify(['B', 'D']),
      questionNoStart: 1,
      questionNoEnd: 1,
      score: 1,
    });
  });

  it('builds an upsert payload with part groups and question display order', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Test A',
      partGroups: [
        {
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(payload.test.title).toBe('Listening Test A');
    expect(payload.test.allowAudioSeek).toBe(0);
    expect(payload.partGroups[0]).toMatchObject({
      displayOrder: 1,
      questionType: 'NOTE_COMPLETION',
      answerMode: 'TEXT',
    });
    expect(payload.questions?.[0]).toMatchObject({
      displayOrder: 1,
      questionType: 'NOTE_COMPLETION',
      answerMode: 'TEXT',
    });
  });

  it('builds whole-test listening transcript audio payloads', () => {
    const exam = mapApiAdminExam({
      id: 80,
      title: 'Listening Transcript',
      partGroups: [
        {
          title: 'Section 1',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'listening');
    exam.audioMode = 'FULL_TEST';
    exam.fullAudio = {
      id: '700',
      name: 'whole-test.mp3',
      size: '3 MB',
      preview: '/audio/whole-test.mp3',
      transcriptText: 'Whole test transcript.',
    };

    const payload = buildAdminExamPayload(exam);

    expect(payload.audios).toEqual([
      expect.objectContaining({
        id: 700,
        testId: 80,
        partGroupId: null,
        audioScope: 'test',
        title: 'whole-test.mp3',
        transcriptText: 'Whole test transcript.',
      }),
    ]);
  });

  it('builds task-level listening transcript audio payloads', () => {
    const exam = mapApiAdminExam({
      id: 81,
      title: 'Listening Task Transcripts',
      partGroups: [
        {
          id: 501,
          title: 'Section 1',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
        {
          id: 502,
          title: 'Section 2',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'listening');
    exam.audioMode = 'TASK_AUDIO';
    exam.tasks[1].audio = {
      id: '702',
      name: 'section-2.mp3',
      size: '2 MB',
      preview: '/audio/section-2.mp3',
      transcriptText: 'Section two transcript.',
    };

    const payload = buildAdminExamPayload(exam);

    expect(payload.audios).toContainEqual(expect.objectContaining({
      id: 702,
      testId: 81,
      partGroupId: 502,
      audioScope: 'part_group',
      title: 'section-2.mp3',
      transcriptText: 'Section two transcript.',
    }));
  });

  it('omits blank transcript text from listening audio payloads', () => {
    const exam = mapApiAdminExam({
      id: 82,
      title: 'Listening Blank Transcript',
      partGroups: [
        {
          id: 601,
          title: 'Section 1',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'listening');
    exam.audioMode = 'FULL_TEST';
    exam.fullAudio = {
      id: '800',
      name: 'whole-test.mp3',
      size: '3 MB',
      preview: '/audio/whole-test.mp3',
      transcriptText: '   ',
    };

    const payload = buildAdminExamPayload(exam);

    expect(payload.audios?.[0]).not.toHaveProperty('transcriptText');
  });

  it('keeps transcript text but removes files from stored admin exam drafts', () => {
    const exam = mapApiAdminExam({
      title: 'Stored Listening Draft',
      partGroups: [
        {
          title: 'Section 1',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'listening');
    exam.fullAudio = {
      id: 'local-audio',
      name: 'whole-test.mp3',
      size: '3 MB',
      preview: 'blob:whole-test',
      transcriptText: 'Stored transcript.',
      file: { name: 'whole-test.mp3' } as File,
    };

    const stored = toStoredAdminExamDraft(exam);

    expect(stored.fullAudio).toMatchObject({
      id: 'local-audio',
      transcriptText: 'Stored transcript.',
    });
    expect(stored.fullAudio).not.toHaveProperty('file');
  });

  it('maps nested listening parts and groups from backend detail responses', () => {
    const exam = mapApiAdminExam({
      id: 45,
      title: 'Listening Nested Detail',
      tasks: 1,
      questions: 2,
      parts: [
        {
          partNumber: 1,
          groups: [
            {
              id: 501,
              title: 'Section 1',
              displayOrder: 1,
              questions: [
                {
                  id: 9001,
                  partGroupId: 501,
                  questionType: 'MULTIPLE_CHOICE_SINGLE',
                  questionText: 'Choose one.',
                  correctAnswer: 'A',
                  optionsJson: JSON.stringify([{ label: 'A', text: 'Alpha' }]),
                  displayOrder: 1,
                },
              ],
            },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(exam.tasks).toHaveLength(1);
    expect(exam.tasks[0].id).toBe('501');
    expect(exam.tasks[0].questions[0].id).toBe('9001');
    expect(payload.questions?.[0]).toMatchObject({
      testId: 45,
      partGroupId: 501,
      questionType: 'MULTIPLE_CHOICE_SINGLE',
    });
    expect(payload.partGroups[0]).toMatchObject({
      id: 501,
      testId: 45,
    });
  });

  it('omits empty new listening tasks from full-save payloads', () => {
    const exam = mapApiAdminExam({
      id: 77,
      title: 'Listening Partial Draft',
      partGroups: [
        {
          title: 'Section 1',
          questions: [
            { questionType: 'MULTIPLE_CHOICE_SINGLE', questionText: 'Choose one.', correctAnswer: 'A' },
          ],
        },
        { title: 'Section 2', questions: [] },
        { title: 'Section 3', questions: [] },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(payload.partGroups).toHaveLength(1);
    expect(payload.questions).toHaveLength(1);
    expect(payload.partGroups[0]).toMatchObject({
      title: 'Section 1',
      questionNoStart: 1,
      questionNoEnd: 1,
    });
  });

  it('does not persist audio-only new listening task placeholders', () => {
    const exam = mapApiAdminExam({
      id: 78,
      title: 'Listening Audio Only Placeholder',
      partGroups: [
        {
          title: 'Section 1',
          questions: [
            { questionType: 'MULTIPLE_CHOICE_SINGLE', questionText: 'Choose one.', correctAnswer: 'A' },
          ],
        },
        { title: 'Section 2', questions: [] },
      ],
    }, 'listening');
    exam.tasks[1].audio = {
      id: 'local-audio',
      name: 'section-2.mp3',
      size: '2 MB',
      preview: 'blob:section-2',
    };

    const payload = buildAdminExamPayload(exam);

    expect(payload.partGroups).toHaveLength(1);
    expect(payload.partGroups[0].title).toBe('Section 1');
  });

  it('preserves table completion structure in admin payloads', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Table',
      partGroups: [
        {
          questions: [
            {
              questionType: 'TABLE_COMPLETION',
              questionText: 'Complete the table.',
              tableRowsJson: JSON.stringify([
                ['Name', '(1)'],
                ['Course', '(2)'],
              ]),
              tableHeaderDark: false,
              blanks: [
                { no: 1, answer: 'Yui' },
                { no: 2, answer: 'Design' },
              ],
            },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'table_completion',
      tableRows: [
        ['Name', '(1)'],
        ['Course', '(2)'],
      ],
      tableHeaderDark: false,
    });
    expect(payload.questions).toHaveLength(2);
    expect(payload.questions?.[0]).toMatchObject({
      questionType: 'TABLE_COMPLETION',
      tableRows: [
        ['Name', '(1)'],
        ['Course', '(2)'],
      ],
      tableRowsJson: JSON.stringify([
        ['Name', '(1)'],
        ['Course', '(2)'],
      ]),
      tableHeaderDark: false,
    });
    expect(JSON.parse(String(payload.questions?.[0].optionsJson))).toMatchObject({
      tableRows: [
        ['Name', '(1)'],
        ['Course', '(2)'],
      ],
      tableHeaderDark: false,
    });
    expect(payload.questions?.map((question) => question.correctAnswer)).toEqual(['Yui', 'Design']);
  });

  it('preserves reading table completion structure in admin payloads', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Table',
      partGroups: [
        {
          title: 'Passage 1',
          questions: [
            {
              questionType: 'TABLE_COMPLETION',
              questionText: 'Complete the table.',
              tableRowsJson: JSON.stringify([
                ['Feature', 'Description'],
                ['Location', '(1)'],
                ['Purpose', '(2)'],
              ]),
              blanks: [
                { no: 1, answer: 'harbour' },
                { no: 2, answer: 'trade' },
              ],
            },
          ],
        },
      ],
    }, 'reading');
    const payload = buildAdminExamPayload(exam);

    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'table_completion',
      tableRows: [
        ['Feature', 'Description'],
        ['Location', '(1)'],
        ['Purpose', '(2)'],
      ],
    });
    expect(payload.partGroups[0]).toMatchObject({
      questionType: 'TABLE_COMPLETION',
      answerMode: 'TEXT',
    });
    expect(payload.questions).toHaveLength(2);
    expect(payload.questions?.map((question) => question.questionType)).toEqual(['TABLE_COMPLETION', 'TABLE_COMPLETION']);
    expect(payload.questions?.map((question) => question.correctAnswer)).toEqual(['harbour', 'trade']);
  });

  it('restores listening table metadata from optionsJson', () => {
    const optionsJson = JSON.stringify({
      instruction: 'Complete the table below.',
      prompt: 'Write no more than two words.',
      tableRows: [
        ['Name', '(1)', 'Time'],
        ['Course', '(2)', 'Morning'],
        ['Fee', '(3)', '$20'],
      ],
      tableHeaderDark: false,
    });
    const exam = mapApiAdminExam({
      title: 'Listening Table Metadata',
      partGroups: [
        {
          questions: [
            {
              questionType: 'TABLE_COMPLETION',
              questionText: 'Complete the table.',
              optionsJson,
              acceptedAnswersJson: JSON.stringify(['Yui']),
            },
          ],
        },
      ],
    }, 'listening');

    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'table_completion',
      instruction: 'Complete the table below.',
      prompt: 'Write no more than two words.',
      tableRows: [
        ['Name', '(1)', 'Time'],
        ['Course', '(2)', 'Morning'],
        ['Fee', '(3)', '$20'],
      ],
      tableHeaderDark: false,
    });
  });

  it('maps completion prompt and template into separate authoring fields', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Completion',
      partGroups: [
        {
          questions: [
            {
              questionType: 'COMPLETION',
              groupGuideText: 'Listen and complete the notes.',
              groupRequirementText: 'Complete the notes below.',
              questionText: 'The lecture starts at (1).',
              acceptedAnswersJson: JSON.stringify(['nine']),
            },
          ],
        },
      ],
    }, 'listening');

    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'completion',
      instruction: 'Listen and complete the notes.',
      prompt: 'Complete the notes below.',
      template: 'The lecture starts at (1).',
    });
  });

  it('maps multiple choice instruction from group guide text without options metadata', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Multiple Choice',
      partGroups: [
        {
          questions: [
            {
              questionType: 'MULTIPLE_CHOICE_SINGLE',
              questionText: 'Which kind of family does the girls prefer?',
              groupGuideText: 'Listen and choose the correct answer.',
              groupRequirementText: 'Which kind of family does the girls prefer?',
              optionsJson: JSON.stringify([
                { label: 'A', text: 'A big family', correct: true },
                { label: 'B', text: 'A small family' },
              ]),
            },
          ],
        },
      ],
    }, 'listening');

    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'multiple_choice',
      instruction: 'Listen and choose the correct answer.',
      prompt: 'Which kind of family does the girls prefer?',
      options: [
        { label: 'A', text: 'A big family', correct: true },
        { label: 'B', text: 'A small family', correct: false },
      ],
    });
  });

  it('persists listening multiple choice instruction metadata through optionsJson', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Multiple Choice Metadata',
      partGroups: [
        {
          questions: [
            {
              questionType: 'MULTIPLE_CHOICE_SINGLE',
              questionText: 'Which kind of family does the girls prefer?',
              optionsJson: JSON.stringify([
                { label: 'A', text: 'A big family', correct: true },
                { label: 'B', text: 'A small family' },
              ]),
            },
          ],
        },
      ],
    }, 'listening');
    exam.tasks[0].questions[0].instruction = 'Listen and choose the correct answer.';
    exam.tasks[0].questions[0].prompt = 'Which kind of family does the girls prefer?';

    const payload = buildAdminExamPayload(exam);
    const storedOptions = JSON.parse(String(payload.questions?.[0].optionsJson));
    const remapped = mapApiAdminExam({
      title: 'Listening Multiple Choice Metadata',
      partGroups: [{ questions: [payload.questions?.[0]] }],
    }, 'listening');

    expect(storedOptions).toMatchObject({
      instruction: 'Listen and choose the correct answer.',
      prompt: 'Which kind of family does the girls prefer?',
      options: [
        { label: 'A', text: 'A big family', correct: true },
        { label: 'B', text: 'A small family', correct: false },
      ],
    });
    expect(remapped.tasks[0].questions[0]).toMatchObject({
      instruction: 'Listen and choose the correct answer.',
      prompt: 'Which kind of family does the girls prefer?',
      options: [
        { label: 'A', text: 'A big family', correct: true },
        { label: 'B', text: 'A small family', correct: false },
      ],
    });
  });

  it('persists listening prompt and instruction metadata through optionsJson and part group fields', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Prompt Metadata',
      partGroups: [
        {
          questions: [
            {
              questionType: 'COMPLETION',
              questionText: 'The lecture starts at (1).',
              blanks: [{ no: 1, answer: 'nine' }],
            },
          ],
        },
      ],
    }, 'listening');
    exam.tasks[0].questions[0].instruction = 'Listen and complete the notes.';
    exam.tasks[0].questions[0].prompt = 'Write one word only.';
    const payload = buildAdminExamPayload(exam);

    expect(payload.partGroups[0]).toMatchObject({
      instructionText: 'Listen and complete the notes.',
      groupGuideText: 'Listen and complete the notes.',
      groupRequirementText: 'Write one word only.',
    });
    expect(JSON.parse(String(payload.questions?.[0].optionsJson))).toMatchObject({
      instruction: 'Listen and complete the notes.',
      prompt: 'Write one word only.',
    });
  });

  it('merges table completion rows when backend expands one table row per answer row', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Expanded Table',
      partGroups: [
        {
          questions: [
            {
              id: 101,
              questionType: 'TABLE_COMPLETION',
              groupRequirementText: 'Complete the table.',
              questionText: 'Complete the table.',
              tableRowsJson: JSON.stringify([['Name', '(1)']]),
              questionNumber: 1,
              correctAnswer: 'Yui',
            },
            {
              id: 102,
              questionType: 'TABLE_COMPLETION',
              groupRequirementText: 'Complete the table.',
              questionText: 'Complete the table.',
              tableRowsJson: JSON.stringify([['Course', '(2)']]),
              questionNumber: 2,
              correctAnswer: 'Design',
            },
          ],
        },
      ],
    }, 'listening');

    expect(exam.tasks[0].questions).toHaveLength(1);
    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'table_completion',
      tableRows: [
        ['Name', '(1)'],
        ['Course', '(2)'],
      ],
      blanks: [
        { no: 1, answer: 'Yui' },
        { no: 2, answer: 'Design' },
      ],
    });
  });

  it('parses comma and newline separated accepted answers for blank questions', () => {
    const acceptedAnswers = parseAcceptedAnswersInput('About 4 months, 4 months, 4\naround four months');
    const exam = mapApiAdminExam({
      title: 'Listening Accepted Answers',
      partGroups: [
        {
          questions: [
            {
              questionType: 'TABLE_COMPLETION',
              questionText: 'Complete the table.',
              blanks: [
                { no: 1, acceptedAnswers },
              ],
            },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(acceptedAnswers).toEqual(['About 4 months, 4 months, 4', 'around four months']);
    expect(payload.questions?.[0]).toMatchObject({
      correctAnswer: 'About 4 months, 4 months, 4',
      acceptedAnswersJson: JSON.stringify(['About 4 months, 4 months, 4', 'around four months']),
    });
  });

  it('builds reading create payload with required part groups', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Test A',
      totalMinutes: 60,
      prepSeconds: 0,
      partGroups: [
        {
          title: 'Passage 1',
          questions: [
            { questionType: 'COMPLETION', questionText: 'Complete the note.' },
          ],
        },
      ],
    }, 'reading');
    const payload = buildAdminReadingCreatePayload(exam);

    expect(payload.title).toBe('Reading Test A');
    expect(payload.partGroups).toHaveLength(1);
    expect(payload.partGroups[0]).toMatchObject({
      partNumber: 1,
      groupNumber: 1,
      title: 'Passage 1',
      questionType: 'SUMMARY_COMPLETION',
      answerMode: 'TEXT',
    });
  });

  it('builds backend-supported enum values for visual and choice question types', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Visuals',
      partGroups: [
        {
          questions: [
            {
              questionType: 'multiple_choice',
              questionText: 'Choose one',
              options: [{ label: 'A', text: 'A', correct: true }],
            },
            {
              questionType: 'diagram_label',
              questionText: 'Label the map.',
              hotspots: [{ no: 1, answer: 'gate' }],
            },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(payload.partGroups[0].questionType).toBe('MULTIPLE_CHOICE_SINGLE');
    expect(payload.questions?.map((question) => question.questionType)).toEqual([
      'MULTIPLE_CHOICE_SINGLE',
      'DIAGRAM_LABEL_COMPLETION',
    ]);
  });

  it('keeps a single image per part group and question', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Test A',
      partGroups: [
        {
          title: 'Passage 1',
          images: [
            { objectKey: 'group-a', fileUrl: '/group-a.png' },
            { objectKey: 'group-b', fileUrl: '/group-b.png' },
          ],
          questions: [
            {
              id: 9,
              questionType: 'COMPLETION',
              questionText: 'Complete the note.',
              images: [
                { objectKey: 'question-a', fileUrl: '/question-a.png' },
                { objectKey: 'question-b', fileUrl: '/question-b.png' },
              ],
            },
          ],
        },
      ],
    }, 'reading');

    expect(exam.tasks[0].media).toHaveLength(1);
    expect(exam.tasks[0].media?.[0].objectKey).toBe('group-a');
    expect(exam.tasks[0].questions[0].media).toHaveLength(1);
    expect(exam.tasks[0].questions[0].media[0].objectKey).toBe('question-a');
  });

  it('merges backend-expanded reading question rows back into one admin question block', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Expanded Rows',
      partGroups: [
        {
          id: 5,
          questions: [
            {
              id: 102,
              partGroupId: 5,
              questionType: 'MATCHING',
              questionText: 'Paragraph B',
              correctAnswer: 'ii',
              groupGuideText: 'Match each paragraph.',
              groupRequirementText: 'Choose from the list.',
              questionNumber: 2,
              displayOrder: 2,
            },
            {
              id: 101,
              partGroupId: 5,
              questionType: 'MATCHING',
              questionText: 'Paragraph A',
              correctAnswer: 'i',
              groupGuideText: 'Match each paragraph.',
              groupRequirementText: 'Choose from the list.',
              questionNumber: 1,
              displayOrder: 1,
            },
          ],
        },
      ],
    }, 'reading');

    expect(exam.tasks[0].questions).toHaveLength(1);
    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'matching',
      pairs: [
        { left: 'Paragraph A', answer: 'i' },
        { left: 'Paragraph B', answer: 'ii' },
      ],
    });
  });

  it('uses absolute question order when expanding multi-row question blocks', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Display Order',
      partGroups: [
        {
          questions: [
            {
              questionType: 'TRUE_FALSE_NOT_GIVEN',
              groupGuideText: 'Decide if the statements agree.',
              statements: [
                { text: 'Statement 1', answer: 'TRUE' },
                { text: 'Statement 2', answer: 'FALSE' },
              ],
            },
            {
              questionType: 'SUMMARY_COMPLETION',
              questionText: 'Complete the summary.',
              template: 'Complete (3).',
              blanks: [{ no: 3, answer: 'garden' }],
            },
          ],
        },
      ],
    }, 'reading');
    const payload = buildAdminExamPayload(exam);

    expect(payload.questions?.map((question) => question.displayOrder)).toEqual([1, 2, 3]);
    expect(payload.questions?.map((question) => question.questionNoStart)).toEqual([1, 2, 3]);
  });

  it('returns the display module name', () => {
    expect(getAdminExamModuleName('reading')).toBe('Reading');
    expect(getAdminExamModuleName('listening')).toBe('Listening');
  });

  it('offers a single reading matching type and listening true false not given', () => {
    expect(getAdminQuestionTypes('reading')).toEqual([
      'multiple_choice',
      'true_false_not_given',
      'matching',
      'summary_completion',
      'table_completion',
    ]);
    expect(getAdminQuestionTypes('listening')).toEqual(expect.arrayContaining([
      'true_false_not_given',
    ]));
    expect(getAdminQuestionTypes('listening')).not.toContain('diagram_label');
  });

  it('normalizes legacy reading matching values into a single matching payload', () => {
    const exam = mapApiAdminExam({
      title: 'Reading Matching',
      partGroups: [
        {
          title: 'Passage 1',
          questions: [
            {
              id: 91,
              questionType: 'MATCHING_HEADINGS',
              questionText: 'Paragraph A',
              bank: ['i. First heading', 'ii. Second heading'],
              pairs: [{ left: 'Paragraph A', answer: 'i' }],
            },
          ],
        },
      ],
    }, 'reading');
    const payload = buildAdminExamPayload(exam);

    expect(exam.tasks[0].questions[0].type).toBe('matching');
    expect(payload.questions?.[0]).toMatchObject({
      questionType: 'MATCHING',
      questionText: 'Paragraph A',
      correctAnswer: 'i',
    });
  });

  it('persists listening matching answer bank through optionsJson', () => {
    const exam = mapApiAdminExam({
      title: 'Listening Matching',
      partGroups: [
        {
          questions: [
            {
              questionType: 'MATCHING',
              groupRequirementText: 'Choose the correct speaker.',
              bank: ['Speaker A', 'Speaker B', 'Speaker C'],
              pairs: [
                { left: 'Prefers online lessons', answer: 'Speaker B' },
                { left: 'Needs weekend classes', answer: 'Speaker C' },
              ],
            },
          ],
        },
      ],
    }, 'listening');
    const payload = buildAdminExamPayload(exam);

    expect(payload.questions).toHaveLength(2);
    expect(payload.questions?.[0]).toMatchObject({
      questionType: 'MATCHING',
      questionText: 'Prefers online lessons',
      correctAnswer: 'Speaker B',
    });
    expect(JSON.parse(String(payload.questions?.[0].optionsJson))).toEqual([
      { label: 'A', text: 'Speaker A' },
      { label: 'B', text: 'Speaker B' },
      { label: 'C', text: 'Speaker C' },
    ]);
    expect(payload.questions?.[1]).toMatchObject({
      questionText: 'Needs weekend classes',
      correctAnswer: 'Speaker C',
    });
    expect(JSON.parse(String(payload.questions?.[1].optionsJson))).toEqual([
      { label: 'A', text: 'Speaker A' },
      { label: 'B', text: 'Speaker B' },
      { label: 'C', text: 'Speaker C' },
    ]);
  });

  it('restores listening matching answer bank and pairs from backend rows', () => {
    const optionsJson = JSON.stringify({
      bank: ['Speaker A', 'Speaker B', 'Speaker C'],
      instruction: 'Match each statement.',
      prompt: 'Choose from the list.',
    });
    const exam = mapApiAdminExam({
      title: 'Listening Matching Detail',
      partGroups: [
        {
          id: 7,
          questions: [
            {
              id: 201,
              partGroupId: 7,
              questionType: 'MATCHING',
              questionText: 'Prefers online lessons',
              correctAnswer: 'Speaker B',
              optionsJson,
              displayOrder: 1,
            },
            {
              id: 202,
              partGroupId: 7,
              questionType: 'MATCHING',
              questionText: 'Needs weekend classes',
              correctAnswer: 'Speaker C',
              optionsJson,
              displayOrder: 2,
            },
          ],
        },
      ],
    }, 'listening');

    expect(exam.tasks[0].questions).toHaveLength(1);
    expect(exam.tasks[0].questions[0]).toMatchObject({
      type: 'matching',
      instruction: 'Match each statement.',
      prompt: 'Choose from the list.',
      bank: ['Speaker A', 'Speaker B', 'Speaker C'],
      pairs: [
        { id: '201', left: 'Prefers online lessons', answer: 'Speaker B' },
        { id: '202', left: 'Needs weekend classes', answer: 'Speaker C' },
      ],
    });
  });

  it('uses row ids when updating existing listening matching pairs', () => {
    const exam = mapApiAdminExam({
      id: 90,
      title: 'Listening Existing Matching',
      partGroups: [
        {
          id: 11,
          questions: [
            {
              id: 301,
              partGroupId: 11,
              questionType: 'MATCHING',
              questionText: 'Existing prompt',
              correctAnswer: 'Speaker A',
              optionsJson: JSON.stringify(['Speaker A', 'Speaker B']),
              displayOrder: 1,
            },
          ],
        },
      ],
    }, 'listening');
    exam.tasks[0].questions[0].pairs = [
      { id: '301', left: 'Updated prompt', answer: 'Speaker B' },
      { left: 'New prompt', answer: 'Speaker A' },
    ];
    const payload = buildAdminExamPayload(exam);

    expect(payload.questions?.[0]).toMatchObject({
      id: 301,
      questionText: 'Updated prompt',
      correctAnswer: 'Speaker B',
    });
    expect(payload.questions?.[1]).toMatchObject({
      id: undefined,
      questionText: 'New prompt',
      correctAnswer: 'Speaker A',
    });
  });

  it('uses row ids when updating existing accepted answers', () => {
    const exam = mapApiAdminExam({
      id: 91,
      title: 'Listening Existing Completion',
      partGroups: [
        {
          id: 12,
          questions: [
            {
              id: 401,
              partGroupId: 12,
              questionType: 'COMPLETION',
              questionText: 'The answer is (1).',
              correctAnswer: 'old',
              acceptedAnswersJson: JSON.stringify(['old']),
              displayOrder: 1,
            },
          ],
        },
      ],
    }, 'listening');
    exam.tasks[0].questions[0].blanks = [
      { id: '401', no: 1, answer: 'new', acceptedAnswers: ['new', 'newer'] },
      { no: 2, answer: 'extra', acceptedAnswers: ['extra'] },
    ];
    const payload = buildAdminExamPayload(exam);

    expect(payload.questions?.[0]).toMatchObject({
      id: 401,
      correctAnswer: 'new',
      acceptedAnswersJson: JSON.stringify(['new', 'newer']),
    });
    expect(payload.questions?.[1]).toMatchObject({
      id: undefined,
      correctAnswer: 'extra',
      acceptedAnswersJson: JSON.stringify(['extra']),
    });
  });
});
