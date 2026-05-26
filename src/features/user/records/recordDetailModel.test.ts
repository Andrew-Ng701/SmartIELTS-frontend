import { describe, expect, it } from 'vitest';
import { mapApiRecordDetailToView } from './recordDetailModel';

describe('record detail model', () => {
  it('maps writing review payload into a writing detail view model', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'WRITING',
      recordId: 9101,
      detailType: 'WRITING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'WRITING',
        recordId: 9101,
        layoutType: 'WRITING_REVIEW',
        title: 'Education Essay',
        score: 6.5,
        scoreText: '6.5',
        status: 'SUCCESS',
        writingReview: {
          questionTitle: 'Education Essay',
          questionDescription: 'Discuss both views.',
          questionImages: [{ fileUrl: '/writing-chart.png', objectKey: 'writing-chart' }],
          taskType: 'TASK_1',
          chartType: 'Mixed charts',
          inputType: 'PDF',
          textContent: 'Typed answer text.',
          extractedText: 'OCR answer text.',
          aiFeedback: 'Improve cohesion.',
          previewAssets: [
            { sourceType: 'QUESTION_IMAGE', fileType: 'IMAGE', fileUrl: '/writing-chart.png', label: 'Task chart', sortOrder: 1 },
            { sourceType: 'ANSWER_ATTACHMENT', fileType: 'PDF', fileUrl: '/uploads/essay.pdf', label: 'Essay PDF', sortOrder: 2 },
          ],
          attachments: [
            { fileName: 'essay.pdf', fileUrl: '/uploads/essay.pdf', contentType: 'application/pdf', size: 2048 },
            { fileName: 'answer.png', fileUrl: '/uploads/answer.png', contentType: 'image/png', size: 1024 },
          ],
        },
      },
    });

    expect(detail).toMatchObject({
      moduleLabel: 'Writing',
      layoutType: 'WRITING_REVIEW',
      title: 'Education Essay',
      scoreText: '6.5',
      writing: {
        questionTitle: 'Education Essay',
        questionImages: [{ url: 'http://localhost/writing-chart.png', objectKey: 'writing-chart', sortOrder: 1 }],
        chartType: 'Mixed charts',
        answerText: 'OCR answer text.',
        aiFeedback: 'Improve cohesion.',
        previewAssets: [
          expect.objectContaining({
            sourceType: 'QUESTION_IMAGE',
            fileType: 'IMAGE',
            fileUrl: 'http://localhost/writing-chart.png',
            label: 'Task chart',
          }),
          expect.objectContaining({
            sourceType: 'ANSWER_ATTACHMENT',
            fileType: 'PDF',
            fileUrl: 'http://localhost/uploads/essay.pdf',
            label: 'Essay PDF',
          }),
        ],
        attachments: [
          {
            fileName: 'essay.pdf',
            fileUrl: 'http://localhost/uploads/essay.pdf',
            contentType: 'application/pdf',
            fileType: 'PDF',
            size: 2048,
          },
          {
            fileName: 'answer.png',
            fileUrl: 'http://localhost/uploads/answer.png',
            contentType: 'image/png',
            fileType: 'IMAGE',
            size: 1024,
          },
        ],
        attachmentNames: ['essay.pdf', 'answer.png'],
      },
    });
  });

  it('maps nested reading record passages for exam-page replay', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'READING',
      recordId: 32,
      detailType: 'READING_RECORD_DETAIL',
      detail: {
        title: 'Reading Paper 2',
        parts: [
          {
            partNumber: 1,
            groups: [
              {
                partGroupId: 100,
                passages: [
                  {
                    id: 501,
                    passageNo: 1,
                    title: 'The history of maps',
                    content: 'Paragraph one.\n\nParagraph two.',
                    materialType: 'TEXT',
                    displayOrder: 1,
                    questions: [
                      { questionId: 8, questionNumber: 1, questionText: 'Choose A.', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      review: {
        moduleType: 'READING',
        recordId: 32,
        layoutType: 'EXAM_PAGE',
        title: 'Reading Paper 2',
        examPageReview: {
          parts: [
            {
              partNumber: 1,
              groups: [
                {
                  partGroupId: 100,
                  passages: [
                    {
                      id: 501,
                      passageNo: 1,
                      title: 'The history of maps',
                      content: 'Paragraph one.\n\nParagraph two.',
                      materialType: 'TEXT',
                      displayOrder: 1,
                      questions: [
                        { questionId: 8, questionNumber: 1, questionText: 'Choose A.', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.parts[0]).toMatchObject({
      partNumber: 1,
      partGroupId: 100,
      passageTitle: 'The history of maps',
      passageContent: 'Paragraph one.\n\nParagraph two.',
    });
    expect(detail.exam?.questions[0]).toMatchObject({ id: 8, questionNumber: 1, questionText: 'Choose A.' });
  });

  it('keeps reading review tabs to real passages when nested groups contain more question blocks', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'READING',
      recordId: 88,
      detailType: 'READING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'READING',
        recordId: 88,
        layoutType: 'EXAM_PAGE',
        title: 'Reading Paper 3',
        examPageReview: {
          parts: [
            {
              partNumber: 1,
              groups: [
                {
                  partGroupId: 101,
                  passages: [{ passageNo: 1, title: 'Passage A', content: 'A content.' }],
                  questions: [
                    { questionId: 1, questionNumber: 1, questionText: 'Q1', instructionText: 'Choose one.', groupRequirementText: 'Question prompt', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                  ],
                },
                {
                  partGroupId: 102,
                  questions: [
                    { questionId: 2, questionNumber: 8, questionText: 'Q8', userAnswer: 'x', correctAnswer: 'y', isCorrect: false },
                  ],
                },
              ],
            },
            {
              partNumber: 2,
              groups: [
                {
                  partGroupId: 201,
                  passages: [{ passageNo: 2, title: 'Passage B', content: 'B content.' }],
                  questions: [{ questionId: 3, questionNumber: 14, questionText: 'Q14', userAnswer: 'B', correctAnswer: 'B', isCorrect: true }],
                },
                {
                  partGroupId: 202,
                  questions: [{ questionId: 4, questionNumber: 20, questionText: 'Q20', userAnswer: 'C', correctAnswer: 'D', isCorrect: false }],
                },
              ],
            },
            {
              partNumber: 3,
              groups: [
                {
                  partGroupId: 301,
                  passages: [{ passageNo: 3, title: 'Passage C', content: 'C content.' }],
                  questions: [{ questionId: 5, questionNumber: 27, questionText: 'Q27', userAnswer: 'E', correctAnswer: 'E', isCorrect: true }],
                },
                {
                  partGroupId: 302,
                  questions: [{ questionId: 6, questionNumber: 36, questionText: 'Q36', userAnswer: 'F', correctAnswer: 'G', isCorrect: false }],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.parts).toHaveLength(3);
    expect(detail.exam?.parts.map((part) => part.passageTitle)).toEqual(['Passage A', 'Passage B', 'Passage C']);
    expect(detail.exam?.questions).toEqual([
      expect.objectContaining({ id: 1, partNumber: 1, partGroupId: 101, groupGuideText: 'Choose one.', groupRequirementText: 'Question prompt' }),
      expect.objectContaining({ id: 2, partNumber: 1, partGroupId: 102 }),
      expect.objectContaining({ id: 3, partNumber: 2, partGroupId: 201 }),
      expect.objectContaining({ id: 4, partNumber: 2, partGroupId: 202 }),
      expect.objectContaining({ id: 5, partNumber: 3, partGroupId: 301 }),
      expect.objectContaining({ id: 6, partNumber: 3, partGroupId: 302 }),
    ]);
  });

  it('uses nested group instructions for exam replay question groups', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'READING',
      recordId: 89,
      detailType: 'READING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'READING',
        recordId: 89,
        layoutType: 'EXAM_PAGE',
        examPageReview: {
          parts: [
            {
              partNumber: 1,
              groups: [
                {
                  partGroupId: 700,
                  instructionText: 'Do the following statements agree with the information given in the text?',
                  prompt: 'Choose TRUE, FALSE or NOT GIVEN.',
                  questions: [
                    { questionId: 1, questionNumber: 1, questionText: 'Many doctors work as volunteers.', prompt: 'Many doctors work as volunteers.', userAnswer: 'FALSE', correctAnswer: 'TRUE', isCorrect: false },
                    { questionId: 2, questionNumber: 2, questionText: 'Dentists visit every month.', prompt: 'Dentists visit every month.', userAnswer: 'TRUE', correctAnswer: 'TRUE', isCorrect: true },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.questions).toEqual([
      expect.objectContaining({
        id: 1,
        groupGuideText: 'Do the following statements agree with the information given in the text?',
        groupRequirementText: 'Choose TRUE, FALSE or NOT GIVEN.',
        questionText: 'Many doctors work as volunteers.',
      }),
      expect.objectContaining({
        id: 2,
        groupGuideText: 'Do the following statements agree with the information given in the text?',
        groupRequirementText: 'Choose TRUE, FALSE or NOT GIVEN.',
        questionText: 'Dentists visit every month.',
      }),
    ]);
  });

  it('does not copy group range metadata onto multi-child completion questions', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'READING',
      recordId: 90,
      detailType: 'READING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'READING',
        recordId: 90,
        layoutType: 'EXAM_PAGE',
        examPageReview: {
          parts: [
            {
              partNumber: 3,
              groups: [
                {
                  partGroupId: 900,
                  questionNoStart: 36,
                  questionNoEnd: 40,
                  questionType: 'TABLE_COMPLETION',
                  questions: [
                    { questionId: 36, questionNumber: 36, questionText: 'Complete the sentence {}.', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                    { questionId: 37, questionNumber: 37, questionText: 'Complete the sentence {}.', userAnswer: 'B', correctAnswer: 'C', isCorrect: false },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.questions).toEqual([
      expect.objectContaining({ id: 36, questionNumber: 36, questionNoEnd: undefined, questionType: 'TABLE_COMPLETION' }),
      expect.objectContaining({ id: 37, questionNumber: 37, questionNoEnd: undefined, questionType: 'TABLE_COMPLETION' }),
    ]);
  });

  it('keeps ranged metadata and score units on single multiple-scored choice questions', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'LISTENING',
      recordId: 91,
      detailType: 'LISTENING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'LISTENING',
        recordId: 91,
        layoutType: 'EXAM_PAGE',
        examPageReview: {
          parts: [
            {
              partNumber: 3,
              groups: [
                {
                  partGroupId: 901,
                  questionNoStart: 28,
                  questionNoEnd: 30,
                  questions: [
                    {
                      questionId: 28,
                      questionNumber: 28,
                      questionType: 'MULTIPLE_CHOICE_MULTI',
                      questionText: 'Choose three answers.',
                      correctAnswer: 'A,B,C',
                      acceptedAnswersJson: JSON.stringify(['A', 'B', 'C']),
                      score: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.questions[0]).toMatchObject({
      answerMode: 'MULTIPLE',
      questionNoEnd: 30,
      score: 3,
    });
  });

  it('maps exam page review question reviews into part groups', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'READING',
      recordId: 31,
      detailType: 'READING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'READING',
        recordId: 31,
        layoutType: 'EXAM_PAGE',
        title: 'Reading Paper 1',
        score: 34,
        scoreText: '34/40',
        status: 'SCORED',
        examPageReview: {
          parts: [{ partNumber: 1, title: 'Passage 1' }],
          questionReviews: [
            { questionId: 1, questionNumber: 1, questionText: 'Question 1', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
            { questionId: 2, questionNumber: 2, questionText: 'Question 2', userAnswer: 'B', correctAnswer: 'C', isCorrect: false },
          ],
        },
      },
    });

    expect(detail.exam?.parts[0]).toMatchObject({
      partNumber: 1,
      title: 'Passage 1',
    });
    expect(detail.exam?.questions).toHaveLength(2);
    expect(detail.exam?.questions[1]).toMatchObject({ isCorrect: false, correctAnswer: 'C' });
  });

  it('maps listening replay audio fields from top-level and nested groups', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'LISTENING',
      recordId: 41,
      detailType: 'LISTENING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'LISTENING',
        recordId: 41,
        layoutType: 'EXAM_PAGE',
        title: 'Listening Test 1',
        examPageReview: {
          allowAudioSeek: false,
          testAudio: { id: 1, title: 'Full tape', audioUrl: '/audio/full.mp3', durationSeconds: 1800 },
          partGroupAudios: [{ id: 2, partGroupId: 10, title: 'Section 1 tape', audioUrl: '/audio/section-1.mp3' }],
          parts: [
            {
              partNumber: 1,
              groups: [
                {
                  partGroupId: 10,
                  title: 'Section 1',
                  audios: [{ id: 3, partGroupId: 10, title: 'Nested section tape', audioUrl: '/audio/nested-1.mp3' }],
                  questions: [
                    { questionId: 11, questionNumber: 1, questionText: 'Write one word.', userAnswer: 'station', correctAnswer: 'station', isCorrect: true },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam).toMatchObject({
      testAudioUrl: 'http://localhost/audio/full.mp3',
      testAudioTitle: 'Full tape',
      allowAudioSeek: false,
    });
    expect(detail.exam?.partGroupAudios).toEqual([
      expect.objectContaining({ id: 2, partGroupId: 10, audioUrl: 'http://localhost/audio/section-1.mp3' }),
      expect.objectContaining({ id: 3, partGroupId: 10, audioUrl: 'http://localhost/audio/nested-1.mp3' }),
    ]);
    expect(detail.exam?.parts[0].audios[0]).toMatchObject({ id: 3, audioUrl: 'http://localhost/audio/nested-1.mp3' });
    expect(detail.exam?.questions[0]).toMatchObject({ id: 11, questionText: 'Write one word.' });
  });

  it('restores listening table completion metadata from optionsJson for record review', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'LISTENING',
      recordId: 42,
      detailType: 'LISTENING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'LISTENING',
        recordId: 42,
        layoutType: 'EXAM_PAGE',
        examPageReview: {
          parts: [
            {
              partNumber: 2,
              groups: [
                {
                  partGroupId: 20,
                  questions: [
                    {
                      questionId: 21,
                      questionNumber: 11,
                      questionType: 'TABLE_COMPLETION',
                      questionText: 'Complete the table.',
                      optionsJson: JSON.stringify({
                        prompt: 'Complete the table below.',
                        tableRows: [
                          ['Course', 'Time', 'Room'],
                          ['Biology', '(1)', '204'],
                        ],
                        tableHeaderDark: false,
                      }),
                      userAnswer: '9 am',
                      correctAnswer: '9 am',
                      isCorrect: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(detail.exam?.questions[0]).toMatchObject({
      questionType: 'TABLE_COMPLETION',
      groupRequirementText: 'Complete the table below.',
      tableHeaderDark: false,
      tableRows: [
        ['Course', 'Time', 'Room'],
        ['Biology', '(1)', '204'],
      ],
    });
  });

  it('maps speaking conversation review rows', () => {
    const detail = mapApiRecordDetailToView({
      moduleType: 'SPEAKING',
      recordId: 500,
      detailType: 'SPEAKING_RECORD_DETAIL',
      detail: {},
      review: {
        moduleType: 'SPEAKING',
        recordId: 500,
        layoutType: 'SPEAKING_SESSION_REVIEW',
        title: 'Speaking session',
        score: 6.5,
        speakingSessionReview: {
          overallScore: 6.5,
          feedback: 'Clear but short.',
          conversations: [
            { recordId: 1, part: 'PART_1', questionText: 'Do you study?', overallScore: 6, audioUrl: '/a.mp3' },
          ],
        },
      },
    });

    expect(detail.speaking?.overallScore).toBe(6.5);
    expect(detail.speaking?.conversations[0]).toMatchObject({ part: 'PART_1', questionText: 'Do you study?' });
  });
});
