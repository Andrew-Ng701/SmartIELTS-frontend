import { asRecord, normalizeUnknownCollection, numberValue, stringValue } from '../../user/console';

export type AdminExamModuleId = 'reading' | 'listening';
export type AdminExamQuestionType =
  | 'multiple_choice'
  | 'true_false_not_given'
  | 'matching_headings'
  | 'matching_information'
  | 'summary_completion'
  | 'diagram_label'
  | 'completion'
  | 'matching'
  | 'table_completion';

export type AdminExamMedia = {
  id: string;
  name: string;
  kind: 'IMAGE';
  size: string;
  preview: string | null;
  file?: File;
  objectKey?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
};

export type AdminExamAudioAsset = {
  id: string;
  name: string;
  size: string;
  preview: string;
  durationLabel?: string;
  transcriptText?: string;
  file?: File;
};

export type AdminExamOption = {
  label: string;
  text: string;
  correct?: boolean;
};

export type AdminExamStatement = {
  id?: string;
  text: string;
  answer: string;
};

export type AdminExamHeading = {
  label: string;
  text: string;
};

export type AdminExamPair = {
  id?: string;
  left: string;
  answer: string;
};

export type AdminExamBlank = {
  id?: string;
  no: number;
  answer: string;
  acceptedAnswers: string[];
};

export function parseAcceptedAnswersInput(value: string) {
  return value.split(/\r?\n/).map((answer) => answer.trim()).filter(Boolean);
}

export type AdminExamHotspot = {
  id?: string;
  no: number;
  x: number;
  y: number;
  answer: string;
};

export type AdminExamQuestion = {
  id: string;
  type: AdminExamQuestionType;
  title: string;
  instruction: string;
  prompt?: string;
  score: number;
  media: AdminExamMedia[];
  selectionMode?: 'single' | 'multiple';
  options?: AdminExamOption[];
  statements?: AdminExamStatement[];
  headings?: AdminExamHeading[];
  pairs?: AdminExamPair[];
  bank?: string[];
  labels?: string[];
  template?: string;
  blanks?: AdminExamBlank[];
  tableRows?: string[][];
  tableHeaderDark?: boolean;
  diagramTitle?: string;
  hotspots?: AdminExamHotspot[];
};

export type AdminExamTask = {
  id: string;
  passageId?: string;
  title: string;
  passageTitle: string;
  passageContent: string;
  audio?: AdminExamAudioAsset | null;
  media?: AdminExamMedia[];
  questions: AdminExamQuestion[];
};

export type AdminExam = {
  id: string;
  module: 'Reading' | 'Listening';
  title: string;
  summaryTaskCount?: number;
  summaryQuestionCount?: number;
  summaryScore?: number;
  timerMode: 'COUNTDOWN' | 'NONE';
  totalSeconds: number;
  prepSeconds: number;
  autoSubmit: 0 | 1;
  allowPause: 0 | 1;
  allowAudioSeek?: 0 | 1;
  audioMode?: 'FULL_TEST' | 'TASK_AUDIO';
  fullAudio?: AdminExamAudioAsset | null;
  difficulty: string;
  createdTime: string;
  updatedTime: string;
  deletedTime: string | null;
  tasks: AdminExamTask[];
};

export function adminExamId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function adminExamNow() {
  return new Date().toISOString();
}

export function getAdminExamModuleName(moduleId: AdminExamModuleId) {
  return moduleId === 'reading' ? 'Reading' : 'Listening';
}

export function mapApiAdminExam(raw: unknown, moduleId: AdminExamModuleId): AdminExam {
  const source = asRecord(raw);
  const moduleName = getAdminExamModuleName(moduleId);
  const sourcePassages = normalizeUnknownCollection(source.passages);
  const explicitTaskCount = numericSummaryValue(source.tasks ?? source.taskCount ?? source.task_count);
  const explicitQuestionCount = numericSummaryValue(source.questions ?? source.questionCount ?? source.question_count);
  const explicitScore = numericSummaryValue(source.totalScore ?? source.total_score);
  const nestedPartGroups = flattenNestedPartGroups(source.parts);
  const sourceGroupValue = collectionLikeValue(source.partGroups)
    ?? collectionLikeValue(source.part_groups)
    ?? collectionLikeValue(source.tasks)
    ?? collectionLikeValue(nestedPartGroups)
    ?? sourcePassages;
  const sourceGroups = sortAdminExamRows(normalizeUnknownCollection(sourceGroupValue), [
    ['displayOrder', 'display_order'],
    ['partNumber', 'part_number'],
    ['groupNumber', 'group_number'],
    ['id'],
  ]);
  const sourceQuestionValue = collectionLikeValue(source.questions);
  const sourceQuestions = normalizeUnknownCollection(sourceQuestionValue);
  const tasks = sourceGroups.map((task, index) => {
    const item = asRecord(task);
    const itemId = stringValue(item.partGroupId ?? item.part_group_id ?? item.id, adminExamId('task'));
    const itemQuestions = normalizeUnknownCollection(item.questions).length
      ? normalizeUnknownCollection(item.questions)
      : sourceQuestions.filter((question) => String(asRecord(question).partGroupId ?? asRecord(question).part_group_id) === itemId);
    const groupedQuestions = groupAdminQuestionRows(sortAdminExamQuestionRows(itemQuestions), moduleId);
    const passage = sourcePassages.find((entry) => {
      const entrySource = asRecord(entry);
      return String(entrySource.partGroupId ?? entrySource.part_group_id) === itemId
        || String(entrySource.id ?? entrySource.passageId ?? entrySource.passage_id) === String(item.id);
    });
    const passageSource = asRecord(passage);
    const questions = groupedQuestions.map((question) => {
      const rawQuestion = asRecord(question);
      const questionType = normalizeAdminQuestionType(stringValue(rawQuestion.questionType ?? rawQuestion.question_type, moduleId === 'reading' ? 'multiple_choice' : 'completion'));
      const acceptedAnswerValues = parseJsonArray(rawQuestion.acceptedAnswersJson ?? rawQuestion.accepted_answers_json);
      const rawBlanks = normalizeUnknownCollection(rawQuestion.blanks ?? rawQuestion.answers);
      const blanks = (usesBlankAnswers(questionType)
        ? (rawBlanks.length ? rawBlanks : acceptedAnswerValues.map((answer, answerIndex) => ({ no: answerIndex + 1, answer })))
        : []).map((blank, blankIndex) => {
        const sourceBlank = asRecord(blank);
        const acceptedAnswers = normalizeUnknownCollection(sourceBlank.acceptedAnswers ?? sourceBlank.accepted_answers)
          .map((answer) => stringValue(answer))
          .filter(Boolean);
        const fallbackAnswer = stringValue(sourceBlank.answer ?? sourceBlank.correctAnswer ?? sourceBlank.correct_answer);

        return {
          id: stringValue(sourceBlank.id ?? sourceBlank.questionId ?? sourceBlank.question_id),
          no: numberValue(sourceBlank.no ?? sourceBlank.questionNo ?? sourceBlank.question_no, blankIndex + 1),
          answer: acceptedAnswers[0] ?? fallbackAnswer,
          acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : (fallbackAnswer ? [fallbackAnswer] : []),
        };
      });
      const options = normalizeUnknownCollection(rawQuestion.options).length
        ? normalizeUnknownCollection(rawQuestion.options)
        : parseQuestionOptions(rawQuestion.optionsJson ?? rawQuestion.options_json);
      const correctLabels = getCorrectOptionLabels(rawQuestion);
      const questionMetadata = parseQuestionOptionsMetadata(rawQuestion.optionsJson ?? rawQuestion.options_json);
      const matchingBank = getMatchingBankFromQuestion(rawQuestion, questionType, options);
      const matchingPairs = getMatchingPairsFromQuestion(rawQuestion, questionType);
      const statements = normalizeUnknownCollection(rawQuestion.statements).length
        ? normalizeUnknownCollection(rawQuestion.statements)
        : (stringValue(rawQuestion.questionType ?? rawQuestion.question_type).toUpperCase() === 'TRUE_FALSE_NOT_GIVEN'
          ? [{
            id: rawQuestion.id ?? rawQuestion.questionId ?? rawQuestion.question_id,
            text: rawQuestion.questionText ?? rawQuestion.question_text,
            answer: rawQuestion.correctAnswer ?? rawQuestion.correct_answer,
          }]
          : []);

      return {
        id: stringValue(rawQuestion.id ?? rawQuestion.questionId ?? rawQuestion.question_id, adminExamId('q')),
        type: questionType,
        title: getAdminQuestionTypeLabel(moduleId, questionType),
        instruction: questionMetadata.instruction ?? getAdminQuestionInstruction(rawQuestion),
        prompt: questionMetadata.prompt ?? getAdminQuestionPrompt(rawQuestion, questionType),
        score: numberValue(rawQuestion.score, 1),
        media: mapApiImages(rawQuestion.images).slice(0, 1),
        selectionMode: resolveSelectionMode(rawQuestion, correctLabels),
        options: options.map((option, optionIndex) => {
          const sourceOption = asRecord(option);
          if (!Object.keys(sourceOption).length && typeof option !== 'object') {
            const parsedOption = splitLabelText(String(option), String.fromCharCode(65 + optionIndex));
            return {
              label: parsedOption.label,
              text: parsedOption.text,
              correct: correctLabels.includes(parsedOption.label),
            };
          }

          const label = stringValue(sourceOption.label, String.fromCharCode(65 + optionIndex));
          return {
            label,
            text: stringValue(sourceOption.text ?? sourceOption.content),
            correct: sourceOption.correct !== undefined || sourceOption.isCorrect !== undefined || sourceOption.is_correct !== undefined
              ? Boolean(sourceOption.correct ?? sourceOption.isCorrect ?? sourceOption.is_correct)
              : correctLabels.includes(label),
          };
        }),
        statements: statements.map((statement) => {
          const sourceStatement = asRecord(statement);
          return {
            id: stringValue(sourceStatement.id ?? sourceStatement.questionId ?? sourceStatement.question_id),
            text: stringValue(sourceStatement.text ?? sourceStatement.statement),
            answer: stringValue(sourceStatement.answer, 'TRUE'),
          };
        }),
        headings: normalizeUnknownCollection(rawQuestion.headings).map((heading, headingIndex) => {
          const sourceHeading = asRecord(heading);
          return {
            label: stringValue(sourceHeading.label, String(headingIndex + 1)),
            text: stringValue(sourceHeading.text ?? sourceHeading.heading),
          };
        }),
        pairs: matchingPairs.map((pair) => {
          const sourcePair = asRecord(pair);
          return {
            id: stringValue(sourcePair.id ?? sourcePair.questionId ?? sourcePair.question_id),
            left: stringValue(sourcePair.left ?? sourcePair.prompt),
            answer: stringValue(sourcePair.answer),
          };
        }),
        bank: matchingBank,
        labels: normalizeUnknownCollection(rawQuestion.labels).map((value) => stringValue(value)).filter(Boolean),
        template: questionMetadata.template ?? getAdminQuestionTemplate(rawQuestion, questionType),
        blanks,
        tableRows: questionMetadata.tableRows?.length
          ? questionMetadata.tableRows
          : mapStringTable(rawQuestion.tableRows ?? rawQuestion.table_rows ?? rawQuestion.tableRowsJson ?? rawQuestion.table_rows_json),
        tableHeaderDark: questionMetadata.tableHeaderDark ?? booleanValue(rawQuestion.tableHeaderDark ?? rawQuestion.table_header_dark, true),
        diagramTitle: stringValue(rawQuestion.diagramTitle ?? rawQuestion.diagram_title),
        hotspots: normalizeUnknownCollection(rawQuestion.hotspots).map((hotspot, hotspotIndex) => {
          const sourceHotspot = asRecord(hotspot);
          return {
            id: stringValue(sourceHotspot.id ?? sourceHotspot.questionId ?? sourceHotspot.question_id),
            no: numberValue(sourceHotspot.no, hotspotIndex + 1),
            x: numberValue(sourceHotspot.x, 30),
            y: numberValue(sourceHotspot.y, 40),
            answer: stringValue(sourceHotspot.answer),
          };
        }),
      };
    });

    const taskAudio = mapApiListeningAudio(
      item.audio
        ?? item.audios
        ?? normalizeUnknownCollection(source.audios).find((audio) => String(asRecord(audio).partGroupId ?? asRecord(audio).part_group_id) === itemId),
    );

    return {
      id: itemId,
      passageId: stringValue(passageSource.id ?? passageSource.passageId ?? passageSource.passage_id ?? (sourcePassages === sourceGroups ? item.id : '')),
      title: stringValue(item.title ?? item.passageTitle ?? item.passage_title, `Task ${index + 1}`),
      passageTitle: stringValue(passageSource.title ?? item.passageTitle ?? item.passage_title ?? item.title),
      passageContent: stringValue(passageSource.content ?? item.passageContent ?? item.passage_content ?? item.content),
      audio: taskAudio,
      media: mapApiImages(item.images).slice(0, 1),
      questions,
    };
  });
  const fullAudio = mapApiListeningAudio(
    source.audio
      ?? source.testAudio
      ?? source.test_audio
      ?? normalizeUnknownCollection(source.audios).find((audio) => {
        const audioSource = asRecord(audio);
        const scope = stringValue(audioSource.audioScope ?? audioSource.audio_scope).toLowerCase();
        return scope === 'test' || (!audioSource.partGroupId && !audioSource.part_group_id);
      }),
  );

  return {
    id: stringValue(source.id ?? source.testId ?? source.test_id, adminExamId('exam')),
    module: moduleName,
    title: stringValue(source.title ?? source.name, `${moduleName} test`),
    summaryTaskCount: explicitTaskCount,
    summaryQuestionCount: explicitQuestionCount,
    summaryScore: explicitScore,
    timerMode: stringValue(source.timerMode ?? source.timer_mode, 'COUNTDOWN') as 'COUNTDOWN' | 'NONE',
    totalSeconds: numberValue(source.totalSeconds ?? source.total_seconds, numberValue(source.totalMinutes ?? source.total_minutes, moduleId === 'reading' ? 60 : 30) * 60),
    prepSeconds: numberValue(source.prepSeconds ?? source.prep_seconds, numberValue(source.prepMinutes ?? source.prep_minutes, 0) * 60),
    autoSubmit: Number(source.autoSubmit ?? source.auto_submit ?? 1) as 0 | 1,
    allowPause: Number(source.allowPause ?? source.allow_pause ?? (moduleId === 'reading' ? 0 : 1)) as 0 | 1,
    allowAudioSeek: Number(source.allowAudioSeek ?? source.allow_audio_seek ?? 0) as 0 | 1,
    audioMode: stringValue(source.audioMode ?? source.audio_mode, 'FULL_TEST') as 'FULL_TEST' | 'TASK_AUDIO',
    fullAudio,
    difficulty: stringValue(source.difficulty, 'Academic'),
    createdTime: stringValue(source.createdTime ?? source.created_time, adminExamNow()),
    updatedTime: stringValue(source.updatedTime ?? source.updated_time ?? source.createdTime ?? source.created_time, adminExamNow()),
    deletedTime: source.deletedTime ?? source.deleted_time ?? null,
    tasks: tasks.length || explicitTaskCount !== undefined || explicitQuestionCount !== undefined
      ? tasks
      : createAdminExamDraft(moduleId, stringValue(source.title, `Untitled ${moduleName} Test`)).tasks,
  };
}

export function createAdminExamDraft(moduleId: AdminExamModuleId, title: string): AdminExam {
  const moduleName = getAdminExamModuleName(moduleId);
  const taskCount = moduleId === 'listening' ? 3 : 1;
  return {
    id: adminExamId('exam'),
    module: moduleName,
    title,
    timerMode: 'COUNTDOWN',
    totalSeconds: moduleId === 'reading' ? 3600 : 1800,
    prepSeconds: 0,
    autoSubmit: 1,
    allowPause: moduleId === 'reading' ? 0 : 1,
    allowAudioSeek: moduleId === 'reading' ? 0 : 1,
    audioMode: moduleId === 'reading' ? undefined : 'FULL_TEST',
    fullAudio: null,
    difficulty: 'IELTS 6.5 - 7.5',
    createdTime: adminExamNow(),
    updatedTime: adminExamNow(),
    deletedTime: null,
    tasks: Array.from({ length: taskCount }, (_, index) => createAdminExamTask(index + 1, moduleId)),
  };
}

export function createAdminExamTask(index: number, moduleId: AdminExamModuleId): AdminExamTask {
  return {
    id: adminExamId('task'),
    title: `Task ${index}`,
    passageTitle: moduleId === 'reading' ? `Passage ${index}` : `Section ${index}`,
    passageContent: '',
    audio: null,
    media: [],
    questions: [],
  };
}

export function createAdminExamQuestion(type: AdminExamQuestionType, moduleId: AdminExamModuleId): AdminExamQuestion {
  const baseQuestion: AdminExamQuestion = {
    id: adminExamId('q'),
    type,
    title: getAdminQuestionTypeLabel(moduleId, type),
    instruction: 'Complete the task using the information provided.',
    prompt: '',
    score: 1,
    media: [],
  };

  if (type === 'multiple_choice') {
    return {
      ...baseQuestion,
      selectionMode: 'single',
      prompt: 'Choose the correct answer.',
      options: [
        { label: 'A', text: 'Option A', correct: true },
        { label: 'B', text: 'Option B', correct: false },
        { label: 'C', text: 'Option C', correct: false },
      ],
    };
  }

  if (type === 'true_false_not_given') {
    return {
      ...baseQuestion,
      statements: [
        { text: 'The passage supports this statement.', answer: 'TRUE' },
      ],
    };
  }

  if (type === 'matching_headings' || type === 'matching_information' || type === 'matching') {
    return {
      ...baseQuestion,
      bank: moduleId === 'reading'
        ? ['A. Matching option A', 'B. Matching option B', 'C. Matching option C', 'D. Matching option D']
        : ['A. Speaker A', 'B. Speaker B', 'C. Speaker C', 'D. Speaker D'],
      pairs: [
        { left: 'Match prompt 1', answer: 'A' },
        { left: 'Match prompt 2', answer: 'B' },
        { left: 'Match prompt 3', answer: 'C' },
        { left: 'Match prompt 4', answer: 'D' },
      ],
    };
  }

  if (type === 'summary_completion' || type === 'completion') {
    return {
      ...baseQuestion,
      template: 'The answer for (1) should be written here.',
      blanks: [{ no: 1, answer: '', acceptedAnswers: [] }],
    };
  }

  if (type === 'table_completion') {
    return {
      ...baseQuestion,
      tableRows: [
        ['Item', 'Detail'],
        ['(1)', 'Sample note'],
      ],
      tableHeaderDark: true,
      blanks: [{ no: 1, answer: '', acceptedAnswers: [] }],
    };
  }

  if (type === 'diagram_label') {
    return {
      ...baseQuestion,
      diagramTitle: 'Diagram',
      hotspots: [{ no: 1, x: 30, y: 40, answer: '' }],
      blanks: [{ no: 1, answer: '', acceptedAnswers: [] }],
    };
  }

  return {
    ...baseQuestion,
  };
}

export function getAdminQuestionTypeLabel(moduleId: AdminExamModuleId, type: AdminExamQuestionType) {
  const reading: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    true_false_not_given: 'True / False / Not Given',
    matching_headings: 'Matching',
    matching_information: 'Matching',
    matching: 'Matching',
    summary_completion: 'Summary / Completion',
    table_completion: 'Table Completion',
    diagram_label: 'Diagram Label Completion',
  };
  const listening: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    true_false_not_given: 'True / False / Not Given',
    completion: 'Completion',
    matching: 'Matching',
    table_completion: 'Table Completion',
    diagram_label: 'Diagram / Chart Label Completion',
  };
  return (moduleId === 'reading' ? reading : listening)[type] ?? type;
}

export function getAdminQuestionTypes(moduleId: AdminExamModuleId): AdminExamQuestionType[] {
  return moduleId === 'reading'
    ? ['multiple_choice', 'true_false_not_given', 'matching', 'summary_completion', 'table_completion']
    : ['multiple_choice', 'true_false_not_given', 'completion', 'matching', 'table_completion'];
}

export function getAdminExamQuestionUnits(question: AdminExamQuestion) {
  if (question.type === 'multiple_choice' && question.selectionMode === 'multiple') {
    return Math.max(1, getCorrectChoiceLabels(question).length);
  }
  if (question.blanks?.length) return question.blanks.length;
  if (question.statements?.length) return question.statements.length;
  if (question.pairs?.length) return question.pairs.length;
  if (question.hotspots?.length) return question.hotspots.length;
  return 1;
}

export function getAdminExamTaskUnits(task?: AdminExamTask) {
  return (task?.questions ?? []).reduce((sum, question) => sum + getAdminExamQuestionUnits(question), 0);
}

export function getAdminExamUnits(exam: AdminExam) {
  return exam.tasks.reduce((sum, task) => sum + getAdminExamTaskUnits(task), 0);
}

export function getAdminExamListTaskCount(exam: AdminExam) {
  return exam.summaryTaskCount ?? exam.tasks.length;
}

export function getAdminExamListQuestionCount(exam: AdminExam) {
  return exam.summaryQuestionCount ?? getAdminExamUnits(exam);
}

export function getAdminExamScore(exam: AdminExam) {
  const score = exam.tasks.reduce((sum, task) => (
    sum + task.questions.reduce((questionSum, question) => questionSum + getAdminExamQuestionUnits(question), 0)
  ), 0);
  return score || exam.summaryScore || 0;
}

export function buildAdminExamPayload(exam: AdminExam, options: { includePassages?: boolean; includeQuestions?: boolean } = {}) {
  const includePassages = options.includePassages ?? true;
  const includeQuestions = options.includeQuestions ?? true;
  const testId = Number(exam.id) || undefined;
  const payloadTasks = exam.tasks.filter(shouldPersistAdminExamTask);
  const questionStartNoByTaskId = new Map<string, number>();
  let nextQuestionNo = 1;

  payloadTasks.forEach((task) => {
    questionStartNoByTaskId.set(task.id, nextQuestionNo);
    nextQuestionNo += Math.max(1, getAdminExamTaskUnits(task));
  });

  const partGroups = payloadTasks.map((task, index) => {
    const questionNoStart = questionStartNoByTaskId.get(task.id) ?? 1;
    const questionNoEnd = questionNoStart + getAdminExamTaskUnits(task) - 1;
    return {
      id: Number(task.id) || undefined,
      testId,
      partNumber: index + 1,
      groupNumber: index + 1,
      title: task.passageTitle || task.title,
      instructionText: task.questions[0]?.instruction || `${exam.module} ${index + 1}`,
      groupGuideText: task.questions[0]?.instruction ?? '',
      groupRequirementText: task.questions[0]?.prompt || 'Write your answers in the boxes provided.',
      questionType: task.questions[0] ? toBackendQuestionType(task.questions[0], exam.module === 'Reading' ? 'reading' : 'listening') : defaultBackendQuestionType(exam.module === 'Reading' ? 'reading' : 'listening'),
      answerMode: task.questions[0] ? toBackendAnswerMode(task.questions[0]) : 'TEXT',
      optionsJson: '',
      acceptedAnswersJson: JSON.stringify([]),
      answerRulesJson: JSON.stringify([]),
      caseInsensitive: 1,
      ignoreWhitespace: 1,
      ignorePunctuation: 1,
      questionNoStart,
      questionNoEnd: Math.max(questionNoStart, questionNoEnd),
      displayOrder: index + 1,
      timeLimitSeconds: getAdminExamTaskUnits(task),
      images: task.media?.filter((media) => !media.file).map(mediaToBizImageResource) ?? [],
    };
  });
  const passages = exam.module === 'Reading' && includePassages ? payloadTasks.map((task, index) => ({
    id: Number(task.passageId) || undefined,
    partGroupId: Number(task.id) || undefined,
    passageNo: index + 1,
    title: task.passageTitle || task.title,
    content: task.passageContent,
    materialType: 'TEXT',
    displayOrder: index + 1,
  })) : undefined;
  const questions = includeQuestions ? payloadTasks.flatMap((task, taskIndex) => task.questions.flatMap((question, questionIndex) => {
    const startNo = questionStartNoForQuestionInPayload(task, questionIndex, questionStartNoByTaskId.get(task.id) ?? 1);
    return expandQuestionToBackendRows(question, {
      partGroupId: Number(task.id) || undefined,
      partNumber: taskIndex + 1,
      testId,
      startNo,
      displayOrderStart: startNo,
      passageId: Number(task.passageId) || undefined,
    });
  })) : undefined;

  return {
    test: buildAdminExamShellPayload(exam),
    partGroups,
    ...(passages ? { passages } : {}),
    ...(questions ? { questions } : {}),
    ...(exam.module === 'Listening' ? { audios: buildListeningAudioPayloads(exam, payloadTasks) } : {}),
  };
}

export function buildAdminExamShellPayload(exam: AdminExam) {
  return {
    title: exam.title,
    totalScore: getAdminExamScore(exam),
    totalMinutes: Math.round(exam.totalSeconds / 60),
    prepSeconds: exam.prepSeconds,
    timerMode: exam.timerMode,
    autoSubmit: exam.autoSubmit,
    allowPause: exam.allowPause,
    ...(exam.module === 'Listening' ? { allowAudioSeek: exam.allowAudioSeek } : {}),
  };
}

export function buildAdminReadingCreatePayload(exam: AdminExam) {
  const payload = buildAdminExamPayload(exam, { includePassages: false, includeQuestions: false });

  return {
    ...payload.test,
    partGroups: payload.partGroups,
  };
}

export function toStoredAdminExamDraft(draft: AdminExam): AdminExam {
  return {
    ...draft,
    fullAudio: draft.fullAudio ? toStoredAudioAsset(draft.fullAudio) : draft.fullAudio,
    tasks: draft.tasks.map((task) => ({
      ...task,
      audio: task.audio ? toStoredAudioAsset(task.audio) : task.audio,
      media: task.media?.map(toStoredMediaAsset),
      questions: task.questions.map((question) => ({
        ...question,
        media: question.media.map(toStoredMediaAsset),
      })),
    })),
  };
}

function toStoredAudioAsset(audio: AdminExamAudioAsset): AdminExamAudioAsset {
  const storedAudio = { ...audio };
  delete storedAudio.file;
  return storedAudio;
}

function toStoredMediaAsset(media: AdminExamMedia): AdminExamMedia {
  const storedMedia = { ...media };
  delete storedMedia.file;
  return storedMedia;
}

function expandQuestionToBackendRows(question: AdminExamQuestion, context: { partGroupId?: number; passageId?: number; partNumber: number; testId?: number; startNo: number; displayOrderStart: number }) {
  if (question.type === 'true_false_not_given') {
    return (question.statements?.length ? question.statements : [{ text: question.prompt ?? question.title, answer: 'TRUE' }]).map((statement, index) => buildBackendQuestion(question, context, {
      id: statement.id,
      questionNumber: context.startNo + index,
      questionText: statement.text,
      correctAnswer: statement.answer,
      displayOrder: context.displayOrderStart + index,
    }));
  }

  const blanks = question.blanks?.length ? question.blanks : [];
  if (blanks.length) {
    return blanks.map((blank, index) => buildBackendQuestion(question, context, {
      id: blank.id,
      questionNumber: context.startNo + index,
      questionText: question.template || question.prompt || question.title,
      correctAnswer: (blank.acceptedAnswers.length ? blank.acceptedAnswers : [blank.answer]).filter(Boolean)[0] ?? '',
      acceptedAnswersJson: JSON.stringify((blank.acceptedAnswers.length ? blank.acceptedAnswers : [blank.answer]).filter(Boolean)),
      displayOrder: context.displayOrderStart + index,
    }));
  }

  const pairs = question.pairs?.length ? question.pairs : [];
  if (pairs.length) {
    return pairs.map((pair, index) => buildBackendQuestion(question, context, {
      id: pair.id,
      questionNumber: context.startNo + index,
      questionText: pair.left,
      correctAnswer: pair.answer,
      displayOrder: context.displayOrderStart + index,
    }));
  }

  const hotspots = question.hotspots?.length ? question.hotspots : [];
  if (hotspots.length) {
    return hotspots.map((hotspot, index) => buildBackendQuestion(question, context, {
      id: hotspot.id,
      questionNumber: context.startNo + index,
      questionText: `${question.diagramTitle || 'Diagram'} label ${hotspot.no}`,
      correctAnswer: hotspot.answer,
      displayOrder: context.displayOrderStart + index,
    }));
  }

  const correctChoiceLabels = getCorrectChoiceLabels(question);
  const correctAnswer = question.type === 'multiple_choice' && correctChoiceLabels.length
    ? correctChoiceLabels.join(',')
    : correctChoiceLabels[0] ?? '';

  return [buildBackendQuestion(question, context, {
    questionNumber: context.startNo,
    questionText: question.prompt || question.title,
    correctAnswer,
    acceptedAnswersJson: question.type === 'multiple_choice' && correctChoiceLabels.length
      ? JSON.stringify(correctChoiceLabels)
      : undefined,
    displayOrder: context.displayOrderStart,
  })];
}

function buildBackendQuestion(question: AdminExamQuestion, context: { partGroupId?: number; passageId?: number; partNumber: number; testId?: number }, value: { id?: string; questionNumber: number; questionText: string; correctAnswer: string; acceptedAnswersJson?: string; displayOrder: number }) {
  const tableRows = question.type === 'table_completion' ? question.tableRows ?? [] : undefined;

  return {
    id: Number(value.id) || (Object.prototype.hasOwnProperty.call(value, 'id') ? undefined : Number(question.id) || undefined),
    testId: context.testId,
    passageId: context.passageId,
    partGroupId: context.partGroupId,
    sectionNumber: context.partNumber,
    questionNumber: value.questionNumber,
    questionType: toBackendQuestionType(question, undefined),
    answerMode: toBackendAnswerMode(question),
    questionText: value.questionText,
    correctAnswer: value.correctAnswer,
    optionsJson: getBackendOptionsJson(question),
    acceptedAnswersJson: value.acceptedAnswersJson ?? JSON.stringify(value.correctAnswer ? [value.correctAnswer] : []),
    caseInsensitive: 1,
    ignoreWhitespace: 1,
    ignorePunctuation: 1,
    displayOrder: value.displayOrder,
    score: 1,
    groupGuideText: question.instruction,
    groupRequirementText: question.prompt,
    questionNoStart: value.questionNumber,
    questionNoEnd: getBackendQuestionNoEnd(question, value.questionNumber),
    template: question.template,
    questionTemplate: question.template,
    tableRows,
    tableRowsJson: tableRows ? JSON.stringify(tableRows) : undefined,
    tableHeaderDark: question.type === 'table_completion' ? question.tableHeaderDark ?? true : undefined,
    images: question.media.filter((media) => !media.file).map(mediaToBizImageResource),
  };
}

function questionStartNoForTask(exam: AdminExam, taskIndex: number) {
  return exam.tasks.slice(0, taskIndex).reduce((sum, task) => sum + Math.max(1, getAdminExamTaskUnits(task)), 1);
}

function questionStartNoForQuestion(exam: AdminExam, taskIndex: number, questionIndex: number) {
  return questionStartNoForTask(exam, taskIndex) + exam.tasks[taskIndex].questions.slice(0, questionIndex).reduce((sum, question) => sum + getAdminExamQuestionUnits(question), 0);
}

function questionStartNoForQuestionInPayload(task: AdminExamTask, questionIndex: number, taskStartNo: number) {
  return taskStartNo + task.questions.slice(0, questionIndex).reduce((sum, question) => sum + getAdminExamQuestionUnits(question), 0);
}

function shouldPersistAdminExamTask(task: AdminExamTask) {
  return task.questions.length > 0
    || Boolean(task.passageContent.trim())
    || Boolean(task.audio?.transcriptText?.trim())
    || Boolean(task.passageId && Number(task.passageId))
    || Boolean(task.id && Number(task.id));
}

function buildListeningAudioPayloads(exam: AdminExam, payloadTasks: AdminExamTask[]) {
  if (exam.audioMode === 'TASK_AUDIO') {
    return payloadTasks
      .map((task) => buildListeningAudioPayload(task.audio, {
        audioScope: 'part_group',
        partGroupId: Number(task.id) || undefined,
        testId: Number(exam.id) || undefined,
      }))
      .filter(Boolean);
  }

  const fullAudioPayload = buildListeningAudioPayload(exam.fullAudio, {
    audioScope: 'test',
    partGroupId: null,
    testId: Number(exam.id) || undefined,
  });
  return fullAudioPayload ? [fullAudioPayload] : [];
}

function buildListeningAudioPayload(audio: AdminExamAudioAsset | null | undefined, scope: { audioScope: 'test' | 'part_group'; partGroupId?: number | null; testId?: number }) {
  const transcriptText = audio?.transcriptText?.trim();
  if (!audio?.id && !audio?.name && !transcriptText) return null;

  return {
    id: Number(audio?.id) || undefined,
    testId: scope.testId,
    partGroupId: scope.partGroupId,
    audioScope: scope.audioScope,
    title: audio?.name || undefined,
    ...(transcriptText ? { transcriptText } : {}),
  };
}

function getBackendQuestionNoEnd(question: AdminExamQuestion, questionNumber: number) {
  return question.type === 'multiple_choice' && question.selectionMode === 'multiple'
    ? questionNumber + getAdminExamQuestionUnits(question) - 1
    : questionNumber;
}

function getBackendOptionsJson(question: AdminExamQuestion) {
  const type = normalizeAdminQuestionType(question.type);
  const metadata = {
    instruction: question.instruction,
    prompt: question.prompt ?? '',
    template: question.template ?? '',
    tableRows: question.tableRows ?? [],
    tableHeaderDark: question.tableHeaderDark ?? true,
  };

  if (type === 'matching' || type === 'matching_headings' || type === 'matching_information') {
    const bank = question.bank?.length
      ? question.bank
      : (question.headings ?? []).map((heading) => `${heading.label}. ${heading.text}`);
    return JSON.stringify(bank.map((item, index) => {
      const option = splitLabelText(item, String.fromCharCode(65 + index));
      return {
        label: option.label,
        text: option.text,
      };
    }));
  }

  if (type === 'table_completion') {
    return JSON.stringify(metadata);
  }

  if (type === 'completion' || type === 'summary_completion' || type === 'diagram_label' || type === 'true_false_not_given') {
    return JSON.stringify(metadata);
  }

  if (type === 'multiple_choice') {
    return JSON.stringify({ ...metadata, options: question.options ?? [] });
  }

  return JSON.stringify(question.options ?? []);
}

function mapApiImages(value: unknown): AdminExamMedia[] {
  return normalizeUnknownCollection(value).map((image, index) => {
    const source = asRecord(image);
    const preview = stringValue(source.fileUrl ?? source.file_url ?? source.url ?? source.imageUrl ?? source.image_url);
    const name = stringValue(source.originalName ?? source.original_name ?? source.name, `Image ${index + 1}`);
    return {
      id: stringValue(source.objectKey ?? source.object_key ?? source.id, `image-${index + 1}`),
      name,
      kind: 'IMAGE' as const,
      size: source.fileSize || source.file_size ? formatBytes(Number(source.fileSize ?? source.file_size)) : '',
      preview,
      objectKey: stringValue(source.objectKey ?? source.object_key),
      contentType: stringValue(source.contentType ?? source.content_type),
      fileSize: Number(source.fileSize ?? source.file_size ?? 0) || undefined,
      width: Number(source.width ?? 0) || undefined,
      height: Number(source.height ?? 0) || undefined,
      sortOrder: Number(source.sortOrder ?? source.sort_order ?? index + 1),
    };
  });
}

function mapApiListeningAudio(value: unknown): AdminExamAudioAsset | null {
  const source = Array.isArray(value) ? asRecord(value[0]) : asRecord(value);
  if (!Object.keys(source).length) return null;

  const preview = stringValue(source.audioUrl ?? source.audio_url ?? source.fileUrl ?? source.file_url ?? source.url);
  const name = stringValue(source.title ?? source.name ?? source.originalName ?? source.original_name, 'Listening tape');
  const fileSize = Number(source.fileSize ?? source.file_size ?? 0);

  return {
    id: stringValue(source.id ?? source.audioId ?? source.audio_id),
    name,
    size: fileSize ? formatBytes(fileSize) : '',
    preview,
    durationLabel: stringValue(source.durationLabel ?? source.duration_label),
    transcriptText: stringValue(source.transcriptText ?? source.transcript_text),
  };
}

function mediaToBizImageResource(media: AdminExamMedia) {
  return {
    objectKey: media.objectKey,
    fileUrl: media.preview,
    originalName: media.name,
    contentType: media.contentType,
    fileSize: media.fileSize,
    width: media.width,
    height: media.height,
    sortOrder: media.sortOrder,
  };
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseQuestionOptions(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    const source = asRecord(parsed);
    return normalizeUnknownCollection(source.options ?? source.choices);
  } catch {
    return [];
  }
}

function parseQuestionOptionsMetadata(value: unknown): {
  bank?: string[];
  instruction?: string;
  prompt?: string;
  tableHeaderDark?: boolean;
  tableRows?: string[][];
  template?: string;
} {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    const source = asRecord(parsed);
    if (!Object.keys(source).length) return {};

    const tableRows = mapStringTable(source.tableRows ?? source.table_rows);
    return {
      bank: normalizeUnknownCollection(source.bank ?? source.answerBank ?? source.answer_bank)
        .map((item) => stringValue(item))
        .filter(Boolean),
      instruction: source.instruction === undefined ? undefined : stringValue(source.instruction),
      prompt: source.prompt === undefined ? undefined : stringValue(source.prompt),
      tableHeaderDark: source.tableHeaderDark === undefined && source.table_header_dark === undefined
        ? undefined
        : booleanValue(source.tableHeaderDark ?? source.table_header_dark, true),
      tableRows: tableRows.length ? tableRows : undefined,
      template: source.template === undefined ? undefined : stringValue(source.template),
    };
  } catch {
    return {};
  }
}

function getMatchingBankFromQuestion(source: Record<string, unknown>, type: AdminExamQuestionType, options: unknown[]) {
  const metadataBank = parseQuestionOptionsMetadata(source.optionsJson ?? source.options_json).bank;
  if (metadataBank?.length) return metadataBank;

  const explicitBank = normalizeUnknownCollection(source.bank ?? source.answerBank ?? source.answer_bank)
    .map((value) => stringValue(value))
    .filter(Boolean);
  if (explicitBank.length) return explicitBank;

  if (type !== 'matching' && type !== 'matching_headings' && type !== 'matching_information') {
    return [];
  }

  return options.map((option, optionIndex) => {
    const sourceOption = asRecord(option);
    if (!Object.keys(sourceOption).length && typeof option !== 'object') {
      return stringValue(option);
    }

    const label = stringValue(sourceOption.label);
    const text = stringValue(sourceOption.text ?? sourceOption.content);
    if (label && text) return `${label}. ${text}`;
    return text || label || String.fromCharCode(65 + optionIndex);
  }).filter(Boolean);
}

function getMatchingPairsFromQuestion(source: Record<string, unknown>, type: AdminExamQuestionType) {
  const pairs = normalizeUnknownCollection(source.pairs);
  if (pairs.length) return pairs;

  if (type !== 'matching' && type !== 'matching_headings' && type !== 'matching_information') {
    return [];
  }

  const left = stringValue(source.questionText ?? source.question_text);
  const answer = stringValue(source.correctAnswer ?? source.correct_answer);
  const id = stringValue(source.id ?? source.questionId ?? source.question_id);
  return left || answer ? [{ id, left, answer }] : [];
}

function sortAdminExamQuestionRows(rows: unknown[]) {
  return sortAdminExamRows(rows, [
    ['questionNumber', 'question_number'],
    ['questionNoStart', 'question_no_start'],
    ['displayOrder', 'display_order'],
    ['id'],
  ]);
}

function sortAdminExamRows(rows: unknown[], keyGroups: string[][]) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const keys of keyGroups) {
        const leftValue = sortableNumber(asRecord(left.row), keys);
        const rightValue = sortableNumber(asRecord(right.row), keys);
        if (leftValue !== rightValue) return leftValue - rightValue;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

function sortableNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const rawValue = source[key];
    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const value = Number(rawValue);
      if (Number.isFinite(value)) return value;
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

function groupAdminQuestionRows(rows: unknown[], moduleId: AdminExamModuleId) {
  const groups: unknown[][] = [];

  rows.forEach((row) => {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.length && shouldMergeQuestionRow(currentGroup[0], row, moduleId)) {
      currentGroup.push(row);
      return;
    }
    groups.push([row]);
  });

  return groups.map((group) => group.length > 1 ? mergeAdminQuestionRows(group, moduleId) : group[0]);
}

function shouldMergeQuestionRow(firstRow: unknown, nextRow: unknown, moduleId: AdminExamModuleId) {
  const first = asRecord(firstRow);
  const next = asRecord(nextRow);
  const type = normalizeAdminQuestionType(stringValue(first.questionType ?? first.question_type, moduleId === 'reading' ? 'multiple_choice' : 'completion'));
  const nextType = normalizeAdminQuestionType(stringValue(next.questionType ?? next.question_type, moduleId === 'reading' ? 'multiple_choice' : 'completion'));

  if (type !== nextType || !isExpandedQuestionType(type)) return false;
  return questionGroupSignature(first, type) === questionGroupSignature(next, type);
}

function isExpandedQuestionType(type: AdminExamQuestionType) {
  return [
    'true_false_not_given',
    'matching',
    'matching_headings',
    'matching_information',
    'summary_completion',
    'completion',
    'table_completion',
    'diagram_label',
  ].includes(type);
}

function usesBlankAnswers(type: AdminExamQuestionType) {
  return type === 'summary_completion'
    || type === 'completion'
    || type === 'table_completion'
    || type === 'diagram_label';
}

function getAdminQuestionPrompt(source: Record<string, unknown>, type: AdminExamQuestionType) {
  return stringValue(
    source.groupRequirementText
      ?? source.group_requirement_text
      ?? source.prompt
      ?? (usesBlankAnswers(type) ? '' : source.questionText ?? source.question_text),
  );
}

function getAdminQuestionInstruction(source: Record<string, unknown>) {
  return stringValue(
    source.groupGuideText
      ?? source.group_guide_text
      ?? source.instruction
      ?? source.instructionText
      ?? source.instruction_text,
  );
}

function getAdminQuestionTemplate(source: Record<string, unknown>, type: AdminExamQuestionType) {
  if (!usesBlankAnswers(type)) {
    return stringValue(source.template ?? source.questionTemplate ?? source.question_template);
  }

  return stringValue(
    source.template
      ?? source.questionTemplate
      ?? source.question_template
      ?? source.questionText
      ?? source.question_text,
  );
}

function questionGroupSignature(source: Record<string, unknown>, type: AdminExamQuestionType) {
  const baseSignature = [
    stringValue(source.partGroupId ?? source.part_group_id),
    stringValue(source.questionType ?? source.question_type).toUpperCase(),
    stringValue(source.groupGuideText ?? source.group_guide_text ?? source.instruction ?? source.instructionText ?? source.instruction_text),
    stringValue(source.groupRequirementText ?? source.group_requirement_text ?? source.prompt),
    stringValue(source.optionsJson ?? source.options_json),
  ];
  if (type === 'summary_completion' || type === 'completion' || type === 'table_completion' || type === 'diagram_label') {
    baseSignature.push(
      stringValue(source.template ?? source.questionTemplate ?? source.question_template ?? source.questionText ?? source.question_text),
    );
    if (type !== 'table_completion') {
      baseSignature.push(stringValue(source.tableRowsJson ?? source.table_rows_json));
    }
  }
  return baseSignature.join('\u001f');
}

function mergeAdminQuestionRows(rows: unknown[], moduleId: AdminExamModuleId) {
  const sortedRows = sortAdminExamQuestionRows(rows);
  const first = asRecord(sortedRows[0]);
  const type = normalizeAdminQuestionType(stringValue(first.questionType ?? first.question_type, moduleId === 'reading' ? 'multiple_choice' : 'completion'));
  const merged: Record<string, unknown> = {
    ...first,
    id: first.id ?? first.questionId ?? first.question_id,
  };

  if (type === 'true_false_not_given') {
    merged.statements = sortedRows.map((row) => {
      const source = asRecord(row);
      return {
        id: stringValue(source.id ?? source.questionId ?? source.question_id),
        text: stringValue(source.questionText ?? source.question_text),
        answer: stringValue(source.correctAnswer ?? source.correct_answer, 'TRUE'),
      };
    });
  }

  if (type === 'matching' || type === 'matching_headings' || type === 'matching_information') {
    merged.pairs = sortedRows.map((row) => {
      const source = asRecord(row);
      return {
        id: stringValue(source.id ?? source.questionId ?? source.question_id),
        left: stringValue(source.questionText ?? source.question_text),
        answer: stringValue(source.correctAnswer ?? source.correct_answer),
      };
    });
  }

  if (type === 'summary_completion' || type === 'completion' || type === 'table_completion' || type === 'diagram_label') {
    const blanks = sortedRows.map((row, index) => {
      const source = asRecord(row);
      const acceptedAnswers = parseJsonArray(source.acceptedAnswersJson ?? source.accepted_answers_json)
        .map((answer) => stringValue(answer))
        .filter(Boolean);
      const fallbackAnswer = stringValue(source.correctAnswer ?? source.correct_answer);
      return {
        id: stringValue(source.id ?? source.questionId ?? source.question_id),
        no: numberValue(source.questionNumber ?? source.question_number ?? source.questionNoStart ?? source.question_no_start, index + 1),
        answer: acceptedAnswers[0] ?? fallbackAnswer,
        acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : (fallbackAnswer ? [fallbackAnswer] : []),
      };
    });
    merged.blanks = blanks;

    if (type === 'table_completion') {
      const mergedTableRows = mergeStringTables(sortedRows.map((row) => {
        const source = asRecord(row);
        return mapStringTable(source.tableRows ?? source.table_rows ?? source.tableRowsJson ?? source.table_rows_json);
      }));
      if (mergedTableRows.length) {
        merged.tableRows = mergedTableRows;
        merged.tableRowsJson = JSON.stringify(mergedTableRows);
      }
    }

    if (type === 'diagram_label') {
      merged.hotspots = blanks.map((blank) => ({ no: blank.no, x: 30, y: 40, answer: blank.answer }));
    }
  }

  return merged;
}

function mapStringTable(value: unknown): string[][] {
  const rows = typeof value === 'string' ? parseJsonArray(value) : normalizeUnknownCollection(value);

  return rows
    .map((row) => normalizeUnknownCollection(row).map((cell) => stringValue(cell)))
    .filter((row) => row.length > 0);
}

function mergeStringTables(tables: string[][][]) {
  const mergedRows: string[][] = [];
  const seenRows = new Set<string>();

  tables.forEach((table) => {
    table.forEach((row) => {
      const key = JSON.stringify(row);
      if (!seenRows.has(key)) {
        seenRows.add(key);
        mergedRows.push(row);
      }
    });
  });

  return mergedRows;
}

function collectionLikeValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (value && typeof value === 'object') return value;
  return undefined;
}

function flattenNestedPartGroups(value: unknown) {
  return normalizeUnknownCollection(value).flatMap((part, partIndex) => {
    const sourcePart = asRecord(part);
    return normalizeUnknownCollection(sourcePart.groups).map((group, groupIndex) => {
      const sourceGroup = asRecord(group);
      return {
        partNumber: sourceGroup.partNumber ?? sourceGroup.part_number ?? sourcePart.partNumber ?? sourcePart.part_number ?? partIndex + 1,
        groupNumber: sourceGroup.groupNumber ?? sourceGroup.group_number ?? groupIndex + 1,
        ...sourceGroup,
      };
    });
  });
}

function numericSummaryValue(value: unknown) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return undefined;
  if (value === null || value === undefined || value === '') return undefined;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : undefined;
}

function booleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
}

function getCorrectOptionLabels(source: Record<string, unknown>) {
  const acceptedAnswers = parseJsonArray(source.acceptedAnswersJson ?? source.accepted_answers_json)
    .map((answer) => stringValue(answer))
    .filter(Boolean);
  if (acceptedAnswers.length) {
    return acceptedAnswers;
  }

  return stringValue(source.correctAnswer ?? source.correct_answer)
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

function resolveSelectionMode(source: Record<string, unknown>, correctLabels: string[]): AdminExamQuestion['selectionMode'] {
  const explicitMode = stringValue(source.selectionMode ?? source.selection_mode).toLowerCase();
  const questionType = stringValue(source.questionType ?? source.question_type).toUpperCase();
  const questionNoStart = numberValue(source.questionNoStart ?? source.question_no_start ?? source.questionNumber ?? source.question_number, 0);
  const questionNoEnd = numberValue(source.questionNoEnd ?? source.question_no_end, questionNoStart);

  if (explicitMode === 'multiple' || explicitMode === 'multi') return 'multiple';
  if (explicitMode === 'single') return 'single';
  if (questionType === 'MULTIPLE_CHOICE_MULTI') return 'multiple';
  if (questionNoEnd > questionNoStart && correctLabels.length > 1) return 'multiple';
  return 'single';
}

function getCorrectChoiceLabels(question: AdminExamQuestion) {
  return (question.options ?? [])
    .filter((option) => option.correct)
    .map((option) => option.label)
    .filter(Boolean);
}

function splitLabelText(value: string, fallbackLabel: string) {
  const match = value.match(/^([A-Za-z0-9ivxlcdmIVXLCDM]+)\s*(?:[.)]|\|)\s*(.*)$/);
  return match ? { label: match[1], text: match[2] } : { label: fallbackLabel, text: value };
}

function normalizeAdminQuestionType(value: string): AdminExamQuestionType {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'heading_matching'
    || normalized === 'matching_headings'
    || normalized === 'matching_information'
    || normalized === 'matching_features'
    || normalized === 'heading_matching'
  ) {
    return 'matching';
  }
  if (
    normalized === 'multiple_choice'
    || normalized === 'multiple_choice_single'
    || normalized === 'multiple_choice_multi'
  ) {
    return 'multiple_choice';
  }
  if (
    normalized === 'completion'
    || normalized === 'note_completion'
    || normalized === 'form_completion'
    || normalized === 'sentence_completion'
  ) {
    return 'completion';
  }
  if (normalized === 'diagram_label_completion') {
    return 'diagram_label';
  }
  return normalized as AdminExamQuestionType;
}

function defaultBackendQuestionType(moduleId?: AdminExamModuleId) {
  return moduleId === 'reading' ? 'SUMMARY_COMPLETION' : 'NOTE_COMPLETION';
}

function toBackendQuestionType(question: AdminExamQuestion, moduleId?: AdminExamModuleId) {
  const type = normalizeAdminQuestionType(question.type);

  if (type === 'multiple_choice') {
    return question.selectionMode === 'multiple' ? 'MULTIPLE_CHOICE_MULTI' : 'MULTIPLE_CHOICE_SINGLE';
  }
  if (type === 'true_false_not_given') {
    return 'TRUE_FALSE_NOT_GIVEN';
  }
  if (type === 'matching' || type === 'matching_headings' || type === 'matching_information') {
    return 'MATCHING';
  }
  if (type === 'summary_completion') {
    return 'SUMMARY_COMPLETION';
  }
  if (type === 'table_completion') {
    return 'TABLE_COMPLETION';
  }
  if (type === 'diagram_label') {
    return 'DIAGRAM_LABEL_COMPLETION';
  }
  if (type === 'completion') {
    return moduleId === 'reading' ? 'SUMMARY_COMPLETION' : 'NOTE_COMPLETION';
  }

  return defaultBackendQuestionType(moduleId);
}

function toBackendAnswerMode(question: AdminExamQuestion) {
  const type = normalizeAdminQuestionType(question.type);
  if (type === 'multiple_choice') {
    return getCorrectChoiceLabels(question).length > 1 ? 'MULTI' : 'SINGLE';
  }
  if (type === 'true_false_not_given' || type === 'matching') {
    return 'SINGLE';
  }
  return 'TEXT';
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}
