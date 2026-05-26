import type { ListeningSessionVO, ListeningTestDetailVO, ListeningTestSummaryVO } from '../../../contracts/listening';
import type { ReadingSessionVO, ReadingTestDetailVO, ReadingTestSummaryVO } from '../../../contracts/reading';

export const DEFAULT_PREP_SECONDS = 120;

export type PracticeModuleId = 'reading' | 'listening';

export type PracticeRecordStatus = 'in_progress' | 'paused' | 'submitted' | 'auto_submitted';

export type TimerMode = 'COUNTDOWN' | 'NONE';

export type PracticePart = {
  partNumber: number;
  title: string;
  displayOrder: number;
  groups: string[];
};

export type PracticePartGroup = {
  id: number;
  partNumber: number;
  groupNumber: number;
  title: string;
  instructionText: string;
  groupGuideText: string;
  groupRequirementText: string;
  questionType: string;
  answerMode: string;
  questionNoStart: number;
  questionNoEnd: number;
  displayOrder: number;
  timeLimitSeconds: number;
  passageTitle?: string;
  passageContent?: string;
};

export type PracticeQuestionOption = {
  label: string;
  text: string;
};

export type PracticeQuestionBlank = {
  no: number;
  questionId?: number;
  questionNumber?: number;
};

export type PracticeQuestionPair = {
  left: string;
  answer?: string;
};

export type PracticeQuestion = {
  id: number;
  passageId?: number;
  partGroupId: number;
  questionNumber: number;
  questionNoEnd?: number;
  questionType: string;
  answerMode: string;
  questionText: string;
  score: number;
  imageUrl?: string;
  imageUrls: string[];
  options: PracticeQuestionOption[];
  template?: string;
  tableRows?: string[][];
  tableHeaderDark?: boolean;
  blanks: PracticeQuestionBlank[];
  bank: string[];
  pairs: PracticeQuestionPair[];
  groupGuideText?: string;
  groupRequirementText?: string;
};

export type PracticeAnswerValue = string | string[];

export type ListeningAudio = {
  id: number;
  testId: number;
  partGroupId: number | null;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
};

export type PracticeTestDetail = {
  id: number;
  title: string;
  totalScore: number;
  timerMode: TimerMode;
  totalSeconds: number;
  prepSeconds: number;
  autoSubmit: 0 | 1;
  allowPause: 0 | 1;
  allowAudioSeek: 0 | 1;
  parts: PracticePart[];
  partGroups: PracticePartGroup[];
  questions: PracticeQuestion[];
  testAudio?: ListeningAudio;
  partGroupAudios?: ListeningAudio[];
};

export type PracticeRecord = {
  recordId: number;
  testId: number;
  testTitle: string;
  totalScore: number;
  status: PracticeRecordStatus;
  createdTime: string;
  submittedTime: string | null;
  timeSpentSeconds: number;
  remainingSeconds: number;
};

export type PracticeReviewAnswer = {
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  label?: string;
};

export function normalizeApiList<T>(value: T[] | { list?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.list ?? [];
}

export function mapApiPracticeTest(raw: ReadingTestSummaryVO | ReadingTestDetailVO | ListeningTestSummaryVO | ListeningTestDetailVO | unknown): PracticeTestDetail {
  const source = resolvePracticeTestSource(raw);
  const nestedParts = normalizeUnknownArray(source.parts);
  const nestedGroups = nestedParts.flatMap((part, partIndex) => normalizeUnknownArray(part.groups).map((group, groupIndex) => ({
    ...group,
    partNumber: group.partNumber ?? group.part_number ?? part.partNumber ?? part.part_number ?? partIndex + 1,
    partTitle: part.title,
    displayOrder: group.displayOrder ?? group.display_order ?? groupIndex + 1,
  })));
  const passages = [
    ...normalizeUnknownArray(source.passages ?? source.readingPassages ?? source.reading_passages),
    ...nestedGroups.flatMap((group) => normalizeUnknownArray(group.passages)),
  ];
  const partGroupSource = nestedGroups.length
    ? nestedGroups
    : normalizeUnknownArray(source.partGroups ?? source.part_groups ?? passages);
  const partGroups = partGroupSource.map((group, index) => {
    const passage = findPassageForGroup(passages, group, index);

    return {
      id: Number(group.id ?? group.partGroupId ?? group.part_group_id ?? passage?.partGroupId ?? passage?.part_group_id ?? index + 1),
      partNumber: Number(group.partNumber ?? group.part_number ?? group.part ?? passage?.partNumber ?? passage?.part_number ?? passage?.passageNo ?? passage?.passage_no ?? index + 1),
      groupNumber: Number(group.groupNumber ?? group.group_number ?? passage?.groupNumber ?? passage?.group_number ?? index + 1),
      title: String(group.title ?? group.passageTitle ?? group.passage_title ?? passage?.title ?? passage?.passageTitle ?? passage?.passage_title ?? `Group ${index + 1}`),
      instructionText: String(group.instructionText ?? group.instruction_text ?? ''),
      groupGuideText: String(group.groupGuideText ?? group.group_guide_text ?? ''),
      groupRequirementText: String(group.groupRequirementText ?? group.group_requirement_text ?? ''),
      questionType: String(group.questionType ?? group.question_type ?? 'FILL_BLANK'),
      answerMode: String(group.answerMode ?? group.answer_mode ?? 'TEXT'),
      questionNoStart: Number(group.questionNoStart ?? group.question_no_start ?? 1),
      questionNoEnd: Number(group.questionNoEnd ?? group.question_no_end ?? 1),
      displayOrder: Number(group.displayOrder ?? group.display_order ?? passage?.displayOrder ?? passage?.display_order ?? index + 1),
      timeLimitSeconds: Number(group.timeLimitSeconds ?? group.time_limit_seconds ?? 0),
      passageTitle: group.passageTitle ?? group.passage_title ?? passage?.title ?? passage?.passageTitle ?? passage?.passage_title,
      passageContent: group.passageContent ?? group.passage_content ?? group.content ?? passage?.content ?? passage?.passageContent ?? passage?.passage_content,
    };
  });
  const parts = nestedParts.length
    ? nestedParts.map((part, index) => ({
      partNumber: Number(part.partNumber ?? part.part_number ?? index + 1),
      title: String(part.title ?? `Part ${index + 1}`),
      displayOrder: Number(part.displayOrder ?? part.display_order ?? index + 1),
      groups: normalizeUnknownArray(part.groups).map(formatPracticeGroupLabel),
    }))
    : buildPracticePartsFromGroups(partGroups);
  const questions = [
    ...normalizeUnknownArray(source.questions ?? source.readingQuestions ?? source.reading_questions),
    ...nestedGroups.flatMap((group) => normalizeUnknownArray(group.questions)),
    ...passages.flatMap((passage) => normalizeUnknownArray(passage.questions)),
  ];

  const sourceAudios = normalizeUnknownArray(source.audios);
  const testAudioSource = source.testAudio
    ?? source.test_audio
    ?? source.audio
    ?? sourceAudios.find((audio) => {
      const audioSource = asRecord(audio);
      const scope = String(audioSource.audioScope ?? audioSource.audio_scope ?? '').toLowerCase();
      return scope === 'test' || (!audioSource.partGroupId && !audioSource.part_group_id);
    });
  const partGroupAudioSources = [
    ...normalizeUnknownArray(source.partGroupAudios ?? source.part_group_audios),
    ...sourceAudios.filter((audio) => {
      const audioSource = asRecord(audio);
      const scope = String(audioSource.audioScope ?? audioSource.audio_scope ?? '').toLowerCase();
      return scope === 'part_group' || Boolean(audioSource.partGroupId ?? audioSource.part_group_id);
    }),
    ...nestedGroups.flatMap((group) => normalizeUnknownArray(group.audio ?? group.audios)),
  ];

  return {
    id: Number(source.id ?? source.testId ?? source.test_id),
    title: String(source.title ?? source.name ?? 'Untitled test'),
    totalScore: Number(source.totalScore ?? source.total_score ?? 40),
    timerMode: normalizeTimerMode(source.timerMode ?? source.timer_mode),
    totalSeconds: Number((source.totalSeconds ?? source.total_seconds ?? (Number(source.totalMinutes ?? source.total_minutes ?? 0) * 60)) || 3600),
    prepSeconds: Number((source.prepSeconds ?? source.prep_seconds ?? (Number(source.prepMinutes ?? source.prep_minutes ?? 0) * 60)) || DEFAULT_PREP_SECONDS),
    autoSubmit: Number(source.autoSubmit ?? source.auto_submit ?? 1) as 0 | 1,
    allowPause: Number(source.allowPause ?? source.allow_pause ?? 0) as 0 | 1,
    allowAudioSeek: Number(source.allowAudioSeek ?? source.allow_audio_seek ?? 1) as 0 | 1,
    parts,
    partGroups,
    questions: dedupeById(questions).map((question, index) => mapPracticeQuestion(question, index, partGroups)),
    testAudio: mapApiListeningAudio(testAudioSource),
    partGroupAudios: partGroupAudioSources.map(mapApiListeningAudio).filter((audio): audio is ListeningAudio => Boolean(audio?.audioUrl)),
  };
}

export function buildPracticeSubmitBody(
  answers: Record<string, PracticeAnswerValue>,
  questions: Pick<PracticeQuestion, 'id' | 'answerMode'>[],
  sessionId: string,
) {
  const questionsById = new Map(questions.map((question) => [String(question.id), question]));

  return {
    sessionId,
    answers: Object.entries(answers).map(([questionId, answer]) => {
      const question = questionsById.get(questionId);
      const shouldSendMultiple = question?.answerMode === 'MULTIPLE' || Array.isArray(answer);

      if (shouldSendMultiple) {
        return {
          questionId: Number(questionId),
          answers: Array.isArray(answer) ? answer : [answer].filter(Boolean),
        };
      }

      return {
        questionId: Number(questionId),
        answer,
      };
    }),
  };
}

export function getSessionIdFromPracticeResponse(value: ReadingSessionVO | ListeningSessionVO | unknown) {
  const source = value as Record<string, any> | null;
  return source?.sessionId ?? source?.session_id ?? source?.id ?? null;
}

export function buildPracticePartsFromGroups(groups: PracticePartGroup[]): PracticePart[] {
  const partNumbers = Array.from(new Set(groups.map((group) => group.partNumber))).sort((a, b) => a - b);
  return partNumbers.map((partNumber, index) => ({
    partNumber,
    title: `Part ${partNumber}`,
    displayOrder: index + 1,
    groups: groups.filter((group) => group.partNumber === partNumber).map((group) => group.title),
  }));
}

export function getLatestPracticeRecord(testId: number, records: PracticeRecord[]) {
  return records.find((record) => record.testId === testId && (record.status === 'submitted' || record.status === 'auto_submitted'))
    ?? records.find((record) => record.testId === testId)
    ?? null;
}

export function mapApiPracticeRecord(raw: unknown): PracticeRecord | null {
  const source = asRecord(raw);
  const nested = asRecord(source.raw);
  const recordSource = {
    ...nested,
    ...source,
  };
  const testId = Number(
    recordSource.testId
    ?? recordSource.test_id
    ?? asRecord(recordSource.test).id
    ?? asRecord(recordSource.readingRecord).testId
    ?? asRecord(recordSource.reading_record).test_id
    ?? asRecord(recordSource.listeningRecord).testId
    ?? asRecord(recordSource.listening_record).test_id,
  );

  if (!Number.isFinite(testId) || testId <= 0) {
    return null;
  }

  return {
    recordId: Number(recordSource.recordId ?? recordSource.record_id ?? recordSource.id ?? 0),
    testId,
    testTitle: String(recordSource.testTitle ?? recordSource.test_title ?? recordSource.title ?? recordSource.name ?? 'Practice record'),
    totalScore: readNullableNumber(recordSource.score ?? recordSource.totalScore ?? recordSource.total_score) ?? 0,
    status: normalizePracticeRecordStatus(recordSource.status ?? recordSource.answerStatus ?? recordSource.answer_status),
    createdTime: String(recordSource.createdTime ?? recordSource.created_time ?? ''),
    submittedTime: stringOrNull(recordSource.submittedTime ?? recordSource.submitted_time ?? recordSource.updatedTime ?? recordSource.updated_time),
    timeSpentSeconds: readNullableNumber(recordSource.timeSpentSeconds ?? recordSource.time_spent_seconds) ?? 0,
    remainingSeconds: readNullableNumber(recordSource.remainingSeconds ?? recordSource.remaining_seconds) ?? 0,
  };
}

export function getCompletedPracticeRecord(record: PracticeRecord | null) {
  return record?.status === 'submitted' || record?.status === 'auto_submitted' ? record : null;
}

export function getPracticeStatusLabel(record: PracticeRecord | null) {
  if (!record || record.status === 'in_progress' || record.status === 'paused') {
    return 'Not started';
  }

  const labels: Record<PracticeRecordStatus, string> = {
    in_progress: 'Not started',
    paused: 'Not started',
    submitted: 'Completed',
    auto_submitted: 'Auto submitted',
  };

  return labels[record.status];
}

export function getPartGroups(test: PracticeTestDetail, partNumber: number) {
  return test.partGroups
    .filter((group) => group.partNumber === partNumber)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function getPartQuestions(test: PracticeTestDetail, partNumber: number) {
  const groupIds = new Set(getPartGroups(test, partNumber).map((group) => group.id));

  return test.questions
    .filter((question) => groupIds.has(question.partGroupId))
    .sort((left, right) => left.questionNumber - right.questionNumber);
}

export function getQuestionGroup(test: PracticeTestDetail, question: PracticeQuestion) {
  return test.partGroups.find((group) => group.id === question.partGroupId) ?? null;
}

export function getQuestionTypeLabel(questionType: string) {
  if (questionType === 'TRUE_FALSE_NOT_GIVEN') return 'True / False / Not Given';
  if (questionType === 'MULTIPLE_CHOICE') return 'Multiple Choice';
  if (questionType === 'SHORT_ANSWER') return 'Short Answer';
  if (questionType === 'FILL_BLANK' || questionType === 'COMPLETION' || questionType === 'SUMMARY_COMPLETION' || questionType === 'TABLE_COMPLETION') return 'Completion';
  if (normalizePracticeQuestionType(questionType) === 'MATCHING') return 'Matching';
  return formatUiLabel(questionType);
}

export function normalizePracticeQuestionType(questionType: string) {
  const normalized = questionType.trim().toUpperCase();
  if (normalized === 'HEADING_MATCHING' || normalized === 'MATCHING_HEADINGS' || normalized === 'MATCHING_INFORMATION' || normalized === 'MATCHING_FEATURES') {
    return 'MATCHING';
  }
  if (
    normalized === 'COMPLETION'
    || normalized === 'SUMMARY_COMPLETION'
    || normalized === 'NOTE_COMPLETION'
    || normalized === 'NOTES_COMPLETION'
    || normalized === 'FORM_COMPLETION'
    || normalized === 'SENTENCE_COMPLETION'
    || normalized === 'TABLE_COMPLETION'
    || normalized === 'FLOW_CHART_COMPLETION'
    || normalized === 'FLOWCHART_COMPLETION'
    || normalized === 'PLAN_MAP_DIAGRAM_LABELING'
    || normalized === 'DIAGRAM_LABEL'
  ) {
    return 'FILL_BLANK';
  }
  if (normalized === 'MULTIPLE_CHOICE_SINGLE' || normalized === 'MULTIPLE_CHOICE_MULTI') {
    return 'MULTIPLE_CHOICE';
  }
  return normalized;
}

export function createVirtualQuestions(partNumber: number, moduleId: PracticeModuleId, imageUrl?: string) {
  return Array.from({ length: moduleId === 'reading' ? 13 : 10 }, (_, index) => createVirtualQuestion(partNumber, index, moduleId, imageUrl));
}

export function getPracticeReviewAnswers(moduleId: PracticeModuleId, questions: PracticeQuestion[]) {
  return questions.reduce<Record<string, PracticeReviewAnswer>>((answers, question, index) => {
    const correctAnswer = getMockCorrectAnswer(question, index);
    const isCorrect = (question.questionNumber + (moduleId === 'reading' ? 0 : 1)) % 3 !== 0;
    answers[String(question.id)] = {
      correctAnswer,
      isCorrect,
      userAnswer: isCorrect ? correctAnswer : getMockWrongAnswer(question, index),
    };
    return answers;
  }, {});
}

export function formatUiLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatPracticePassageParagraphs(value: string) {
  const paragraphs = value
    .split(/\r?\n\s*\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length ? paragraphs : [''];
}

function normalizeTimerMode(value: unknown): TimerMode {
  return String(value ?? 'COUNTDOWN').trim().toUpperCase() === 'NONE' ? 'NONE' : 'COUNTDOWN';
}

export function formatDateLabel(value: string | null) {
  if (!value) return 'Not submitted';
  return value.replace('T', ' ').slice(0, 16);
}

function normalizeUnknownArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const source = value as Record<string, any> | null;
  if (Array.isArray(source?.list)) return source.list;
  if (Array.isArray(source?.data)) return source.data;
  return [];
}

function mapPracticeQuestion(question: any, index: number, partGroups: PracticePartGroup[]): PracticeQuestion {
  const id = Number(question.id ?? question.questionId ?? question.question_id ?? index + 1);
  const questionNumber = Number(question.questionNumber ?? question.questionNo ?? question.question_no ?? index + 1);
  const rawQuestionNoEnd = Number(question.questionNoEnd ?? question.question_no_end ?? questionNumber) || questionNumber;
  const metadata = parseJsonObject(question.optionsJson ?? question.options_json ?? question.metadataJson ?? question.metadata_json);
  const partGroup = resolveQuestionPartGroup(question, questionNumber, partGroups);
  const rawQuestionType = String(question.questionType ?? question.question_type ?? metadata.questionType ?? metadata.question_type ?? metadata.type ?? 'FILL_BLANK').trim().toUpperCase();
  const questionType = normalizePracticeQuestionType(rawQuestionType);
  const options = mapQuestionOptions(question.options ?? question.optionsJson ?? question.options_json);
  const acceptedAnswers = getAcceptedAnswers(question, metadata);
  const explicitAnswerMode = question.answerMode ?? question.answer_mode ?? metadata.answerMode ?? metadata.answer_mode ?? metadata.selectionMode ?? metadata.selection_mode;
  const isMultiScoreChoice = isMultipleScoredChoice(explicitAnswerMode, rawQuestionType);
  const questionNoEnd = isMultiScoreChoice && rawQuestionNoEnd <= questionNumber && acceptedAnswers.length > 1
    ? questionNumber + acceptedAnswers.length - 1
    : rawQuestionNoEnd;
  const images = mapQuestionImages(question.images ?? question.groupImages ?? question.group_images);
  const fallbackTemplate = questionType === 'FILL_BLANK'
    ? (question.questionText ?? question.question_text ?? question.prompt ?? '')
    : '';
  const template = String(question.template ?? question.questionTemplate ?? question.question_template ?? metadata.template ?? metadata.questionTemplate ?? metadata.question_template ?? fallbackTemplate);
  const tableRows = mapStringTable(question.tableRows ?? question.table_rows ?? question.tableRowsJson ?? question.table_rows_json ?? metadata.tableRows ?? metadata.table_rows ?? metadata.rows);
  const answerMode = normalizePracticeAnswerMode(explicitAnswerMode, {
    acceptedAnswerCount: acceptedAnswers.length,
    questionNoEnd,
    questionNumber,
    questionType,
    rawQuestionType,
  });

  return {
    id,
    passageId: question.passageId ?? question.passage_id,
    partGroupId: partGroup?.id ?? Number(question.partGroupId ?? question.part_group_id ?? partGroups[0]?.id ?? 1),
    questionNumber,
    questionNoEnd,
    questionType,
    answerMode,
    questionText: String(question.questionText ?? question.question_text ?? question.prompt ?? ''),
    score: Number(question.score ?? 1),
    imageUrl: question.imageUrl ?? question.image_url ?? images[0],
    imageUrls: images.length ? images : [question.imageUrl ?? question.image_url].filter(Boolean).map(String),
    options,
    template,
    tableRows,
    tableHeaderDark: readBoolean(question.tableHeaderDark ?? question.table_header_dark, true),
    blanks: mapQuestionBlanks(question.blanks ?? question.answers, acceptedAnswers, questionNumber, id),
    bank: resolvePracticeMatchingBank(question, options, questionType),
    pairs: mapQuestionPairs(question.pairs),
    groupGuideText: stringOrUndefined(
      question.groupGuideText
      ?? question.group_guide_text
      ?? question.instruction
      ?? question.instructionText
      ?? question.instruction_text
      ?? metadata.instruction
      ?? metadata.instructionText
      ?? metadata.instruction_text
      ?? partGroup?.groupGuideText
      ?? partGroup?.instructionText,
    ),
    groupRequirementText: stringOrUndefined(
      question.groupRequirementText
      ?? question.group_requirement_text
      ?? question.prompt
      ?? metadata.prompt
      ?? metadata.groupRequirementText
      ?? metadata.group_requirement_text
      ?? partGroup?.groupRequirementText,
    ),
  };
}

function resolveQuestionPartGroup(question: any, questionNumber: number, partGroups: PracticePartGroup[]) {
  const explicitPartGroupId = question.partGroupId ?? question.part_group_id;
  if (explicitPartGroupId !== null && explicitPartGroupId !== undefined && explicitPartGroupId !== '') {
    const explicitGroup = partGroups.find((group) => String(group.id) === String(explicitPartGroupId));
    if (explicitGroup) return explicitGroup;
  }

  const sectionNumber = readNullableNumber(question.sectionNumber ?? question.section_number ?? question.partNumber ?? question.part_number);
  if (sectionNumber !== null) {
    const sectionGroup = partGroups.find((group) => group.partNumber === sectionNumber);
    if (sectionGroup) return sectionGroup;
  }

  return partGroups.find((group) => questionNumber >= group.questionNoStart && questionNumber <= group.questionNoEnd);
}

function mapQuestionOptions(value: unknown): PracticeQuestionOption[] {
  return parseQuestionOptions(value).map((option, index) => {
    const source = asRecord(option);
    if (!Object.keys(source).length && typeof option !== 'object') {
      const parsed = splitOptionLabel(String(option), String.fromCharCode(65 + index));
      return { label: parsed.label, text: parsed.text };
    }

    return {
      label: String(source.label ?? String.fromCharCode(65 + index)),
      text: String(source.text ?? source.content ?? source.value ?? ''),
    };
  }).filter((option) => option.label || option.text);
}

function mapQuestionBlanks(value: unknown, acceptedAnswers: unknown[], questionNumber: number, questionId: number): PracticeQuestionBlank[] {
  const blanks = normalizeUnknownArray(value).map((blank, index) => {
    const source = asRecord(blank);
    return {
      no: Number(source.no ?? source.questionNo ?? source.question_no ?? index + 1),
      questionId: Number(source.questionId ?? source.question_id ?? questionId) || questionId,
      questionNumber: Number(source.questionNumber ?? source.questionNo ?? source.question_no ?? questionNumber) || questionNumber,
    };
  });

  if (blanks.length) {
    return blanks;
  }

  if (acceptedAnswers.length) {
    return acceptedAnswers.map((_, index) => ({
      no: index + 1,
      questionId,
      questionNumber,
    }));
  }

  return [{ no: questionNumber, questionId, questionNumber }];
}

function mapStringTable(value: unknown): string[][] | undefined {
  const source = asRecord(value);
  const rawRows = Object.keys(source).length
    ? source.rows ?? source.tableRows ?? source.table_rows ?? value
    : value;
  const rows = (typeof rawRows === 'string' ? parseJsonArray(rawRows) : normalizeUnknownArray(rawRows))
    .map((row) => normalizeUnknownArray(row).map((cell) => String(cell ?? '')));
  return rows.length ? rows : undefined;
}

function normalizePracticeAnswerMode(value: unknown, context: { acceptedAnswerCount: number; questionNoEnd: number; questionNumber: number; questionType: string; rawQuestionType: string }) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['MULTIPLE', 'MULTI', 'CHECKBOX', 'CHECKBOXES'].includes(normalized)) return 'MULTIPLE';
  if (['SINGLE', 'RADIO'].includes(normalized)) {
    return context.questionType === 'MULTIPLE_CHOICE' && context.acceptedAnswerCount > 1 ? 'MULTIPLE' : 'SINGLE';
  }
  if (['TEXT', 'INPUT'].includes(normalized)) return 'TEXT';
  if (context.rawQuestionType === 'MULTIPLE_CHOICE_MULTI') return 'MULTIPLE';
  if (context.questionType === 'MULTIPLE_CHOICE' && context.acceptedAnswerCount > 1) return 'MULTIPLE';
  if (context.questionType === 'MULTIPLE_CHOICE' && context.questionNoEnd > context.questionNumber) return 'MULTIPLE';
  return context.questionType === 'FILL_BLANK' ? 'TEXT' : 'SINGLE';
}

function getAcceptedAnswers(question: any, metadata: Record<string, any>) {
  const acceptedAnswers = parseJsonArray(
    question.acceptedAnswersJson
      ?? question.accepted_answers_json
      ?? metadata.acceptedAnswers
      ?? metadata.accepted_answers
      ?? metadata.correctAnswers
      ?? metadata.correct_answers,
  );
  if (acceptedAnswers.length) return acceptedAnswers;

  return splitAnswerList(question.correctAnswer ?? question.correct_answer ?? metadata.correctAnswer ?? metadata.correct_answer);
}

function splitAnswerList(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function isMultipleScoredChoice(value: unknown, rawQuestionType: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return rawQuestionType === 'MULTIPLE_CHOICE_MULTI'
    || ['MULTIPLE', 'MULTI', 'CHECKBOX', 'CHECKBOXES'].includes(normalized);
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
}

function mapQuestionPairs(value: unknown): PracticeQuestionPair[] {
  return parseJsonArray(value).map((pair) => {
    const source = asRecord(pair);
    return {
      left: String(source.left ?? source.prompt ?? source.text ?? ''),
      answer: source.answer ? String(source.answer) : undefined,
    };
  }).filter((pair) => pair.left);
}

function mapStringList(value: unknown): string[] {
  return parseJsonArray(value).map((item) => {
    const source = asRecord(item);
    if (Object.keys(source).length) {
      const label = source.label ? `${source.label}. ` : '';
      return `${label}${String(source.text ?? source.heading ?? source.value ?? '')}`.trim();
    }
    return String(item);
  }).filter(Boolean);
}

function resolvePracticeMatchingBank(question: any, options: PracticeQuestionOption[], questionType: string) {
  const explicitBank = mapStringList(question.bank ?? question.answerBank ?? question.answer_bank ?? question.labels);
  if (explicitBank.length || questionType !== 'MATCHING') return explicitBank;
  return options
    .map((option, index) => `${option.label || String.fromCharCode(65 + index)}. ${option.text}`.trim())
    .filter(Boolean);
}

function mapQuestionImages(value: unknown): string[] {
  return normalizeUnknownArray(value).map((image) => {
    const source = asRecord(image);
    return String(source.fileUrl ?? source.file_url ?? source.url ?? source.imageUrl ?? source.image_url ?? '');
  }).filter(Boolean);
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

function parseJsonObject(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return {};
  }
}

function parseQuestionOptions(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    const source = asRecord(parsed);
    return normalizeUnknownArray(source.options ?? source.choices);
  } catch {
    return [];
  }
}

function splitOptionLabel(value: string, fallbackLabel: string) {
  const match = value.match(/^([A-Za-z0-9]+)[.)]\s*(.*)$/);
  return match ? { label: match[1], text: match[2] } : { label: fallbackLabel, text: value };
}

function resolvePracticeTestSource(raw: unknown): Record<string, any> {
  const source = asRecord(raw);
  const nestedCandidates = [
    source.detail,
    source.test,
    source.testDetail,
    source.test_detail,
    source.readingTest,
    source.reading_test,
    source.listeningTest,
    source.listening_test,
    source.paper,
    source.exam,
  ].map(asRecord).filter((candidate) => Object.keys(candidate).length > 0);
  const nested = nestedCandidates.find(hasPracticeTestContent) ?? nestedCandidates[0];

  if (!nested) {
    return source;
  }

  return {
    ...source,
    ...nested,
    id: nested.id ?? nested.testId ?? nested.test_id ?? source.testId ?? source.test_id ?? source.id,
    testId: nested.testId ?? nested.test_id ?? nested.id ?? source.testId ?? source.test_id,
    title: nested.title ?? nested.name ?? source.title ?? source.name,
    totalScore: nested.totalScore ?? nested.total_score ?? source.totalScore ?? source.total_score,
    timerMode: nested.timerMode ?? nested.timer_mode ?? source.timerMode ?? source.timer_mode,
    prepSeconds: nested.prepSeconds ?? nested.prep_seconds ?? source.prepSeconds ?? source.prep_seconds,
    prepMinutes: nested.prepMinutes ?? nested.prep_minutes ?? source.prepMinutes ?? source.prep_minutes,
    totalSeconds: nested.totalSeconds ?? nested.total_seconds ?? source.totalSeconds ?? source.total_seconds,
    totalMinutes: nested.totalMinutes ?? nested.total_minutes ?? source.totalMinutes ?? source.total_minutes,
    autoSubmit: nested.autoSubmit ?? nested.auto_submit ?? source.autoSubmit ?? source.auto_submit,
    allowPause: nested.allowPause ?? nested.allow_pause ?? source.allowPause ?? source.allow_pause,
    allowAudioSeek: nested.allowAudioSeek ?? nested.allow_audio_seek ?? source.allowAudioSeek ?? source.allow_audio_seek,
    parts: nested.parts ?? source.parts,
    partGroups: nested.partGroups ?? nested.part_groups ?? source.partGroups ?? source.part_groups,
    part_groups: nested.part_groups ?? nested.partGroups ?? source.part_groups ?? source.partGroups,
    passages: nested.passages ?? source.passages,
    questions: nested.questions ?? source.questions,
    readingQuestions: nested.readingQuestions ?? nested.reading_questions ?? source.readingQuestions ?? source.reading_questions,
    reading_questions: nested.reading_questions ?? nested.readingQuestions ?? source.reading_questions ?? source.readingQuestions,
    audio: nested.audio ?? source.audio,
    testAudio: nested.testAudio ?? nested.test_audio ?? source.testAudio ?? source.test_audio,
    partGroupAudios: nested.partGroupAudios ?? nested.part_group_audios ?? source.partGroupAudios ?? source.part_group_audios,
    audios: nested.audios ?? source.audios,
  };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalizePracticeRecordStatus(value: unknown): PracticeRecordStatus {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'AUTO_SUBMITTED') return 'auto_submitted';
  if (['SUBMITTED', 'COMPLETED', 'SUCCESS', 'SCORED'].includes(normalized)) return 'submitted';
  if (normalized === 'PAUSED') return 'paused';
  return 'in_progress';
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function stringOrNull(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function hasPracticeTestContent(value: Record<string, any>) {
  return Boolean(
    value.title
    || value.name
    || value.testId
    || value.test_id
    || value.id
    || value.partGroups
    || value.part_groups
    || value.passages
    || value.questions
    || value.readingQuestions
    || value.reading_questions,
  );
}

function findPassageForGroup(passages: any[], group: any, index: number) {
  const groupId = group.id ?? group.partGroupId ?? group.part_group_id;
  const groupPartNumber = group.partNumber ?? group.part_number ?? group.part;

  return passages.find((passage) => {
    const passageGroupId = passage.partGroupId ?? passage.part_group_id;
    return groupId !== undefined && passageGroupId !== undefined && String(groupId) === String(passageGroupId);
  }) ?? passages.find((passage) => {
    const passageNo = passage.passageNo ?? passage.passage_no ?? passage.partNumber ?? passage.part_number;
    return groupPartNumber !== undefined && passageNo !== undefined && String(groupPartNumber) === String(passageNo);
  }) ?? passages[index];
}

function formatPracticeGroupLabel(group: any) {
  if (typeof group === 'string' || typeof group === 'number') {
    return String(group);
  }

  const source = asRecord(group);
  return String(source.title ?? source.passageTitle ?? source.passage_title ?? source.name ?? 'Group');
}

function dedupeById<T extends Record<string, any>>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  items.forEach((item, index) => {
    const key = String(item.id ?? item.questionId ?? item.question_id ?? `index-${index}`);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(item);
  });

  return result;
}

function mapApiListeningAudio(raw: any): ListeningAudio | undefined {
  if (!raw) return undefined;
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!source) return undefined;
  const durationSeconds = readDurationSeconds(source);
  const audioUrl = String(source.audioUrl ?? source.audio_url ?? source.fileUrl ?? source.file_url ?? source.url ?? '');
  if (!audioUrl) return undefined;

  return {
    id: Number(source.id ?? source.audioId ?? source.audio_id ?? 0),
    testId: Number(source.testId ?? source.test_id ?? 0),
    partGroupId: source.partGroupId ?? source.part_group_id ? Number(source.partGroupId ?? source.part_group_id) : null,
    title: String(source.title ?? source.name ?? source.originalName ?? source.original_name ?? 'Listening tape'),
    audioUrl,
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  };
}

function readDurationSeconds(source: Record<string, any>) {
  const rawValue = source.durationSeconds
    ?? source.duration_seconds
    ?? source.duration
    ?? source.audioDurationSeconds
    ?? source.audio_duration_seconds;
  const seconds = Number(rawValue);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function createVirtualQuestion(partNumber: number, index: number, moduleId: PracticeModuleId, imageUrl?: string): PracticeQuestion {
  const listeningTypes = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'TRUE_FALSE_NOT_GIVEN', 'SHORT_ANSWER', 'MATCHING', 'FILL_BLANK', 'MULTIPLE_CHOICE', 'MATCHING', 'SHORT_ANSWER'];
  const readingTypes = ['MATCHING', 'TRUE_FALSE_NOT_GIVEN', 'FILL_BLANK', 'MATCHING', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'MATCHING', 'FILL_BLANK', 'TRUE_FALSE_NOT_GIVEN', 'MULTIPLE_CHOICE'];
  const questionNumber = moduleId === 'listening'
    ? (partNumber - 1) * 10 + index + 1
    : (partNumber - 1) * 13 + index + 1;
  const questionType = moduleId === 'listening' ? listeningTypes[index % listeningTypes.length] : readingTypes[index % readingTypes.length];

  return {
    id: Number(`${moduleId === 'listening' ? 8 : 7}${partNumber}${String(index + 1).padStart(2, '0')}`),
    partGroupId: -partNumber,
    questionNumber,
    questionType,
    answerMode: questionType === 'MULTIPLE_CHOICE' ? 'SINGLE' : 'TEXT',
    questionText: moduleId === 'listening'
      ? `Section ${partNumber} question ${index + 1}: ${getQuestionTypeLabel(questionType)} practice item from the virtual listening tape.`
      : `Passage ${partNumber} question ${index + 1}: ${getQuestionTypeLabel(questionType)} practice item from the virtual passage.`,
    score: 1,
    imageUrl: index === 0 ? imageUrl : undefined,
    imageUrls: index === 0 && imageUrl ? [imageUrl] : [],
    options: questionType === 'MULTIPLE_CHOICE' ? [
      { label: 'A', text: 'Main idea' },
      { label: 'B', text: 'Supporting detail' },
      { label: 'C', text: 'Opposing view' },
      { label: 'D', text: 'Final result' },
    ] : [],
    template: questionType === 'FILL_BLANK' ? `Passage detail ${questionNumber}: I am (1).` : undefined,
    blanks: questionType === 'FILL_BLANK' ? [{ no: 1, questionId: Number(`${moduleId === 'listening' ? 8 : 7}${partNumber}${String(index + 1).padStart(2, '0')}`), questionNumber }] : [],
    bank: questionType === 'MATCHING' ? ['A. Paragraph A', 'B. Paragraph B', 'C. Paragraph C'] : [],
    pairs: questionType === 'MATCHING' ? [{ left: 'Match this item' }] : [],
  };
}

function getMockCorrectAnswer(question: PracticeQuestion, index: number) {
  if (question.questionType === 'MULTIPLE_CHOICE') return ['A', 'B', 'C', 'D'][index % 4];
  if (question.questionType === 'TRUE_FALSE_NOT_GIVEN') return ['TRUE', 'FALSE', 'NOT GIVEN'][index % 3];
  if (normalizePracticeQuestionType(question.questionType) === 'MATCHING') return ['A', 'B', 'C', 'D', 'E'][index % 5];
  return ['learning zone', 'flexible layout', 'simple controls', 'time management'][index % 4];
}

function getMockWrongAnswer(question: PracticeQuestion, index: number) {
  if (question.questionType === 'MULTIPLE_CHOICE') return ['D', 'C', 'B', 'A'][index % 4];
  if (question.questionType === 'TRUE_FALSE_NOT_GIVEN') return ['FALSE', 'NOT GIVEN', 'TRUE'][index % 3];
  if (normalizePracticeQuestionType(question.questionType) === 'MATCHING') return ['E', 'D', 'C', 'B', 'A'][index % 5];
  return ['technology', 'lecture hall', 'screen', 'feedback'][index % 4];
}
