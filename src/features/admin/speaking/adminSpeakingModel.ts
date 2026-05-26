import type { SpeakingQuestionVO } from '../../../contracts/speaking';

export type AdminSpeakingMode = 'TOPIC_1' | 'TOPIC_2_3';

export type AdminSpeakingTopic = {
  id: string;
  mode: AdminSpeakingMode;
  topic: string;
  questions: string[];
  questionIds?: string[];
  cueCard?: string;
  prepSeconds?: number;
  answerSeconds?: number;
  followUps: string[];
  followUpIds?: string[];
  displayOrder?: number;
  active?: 0 | 1;
  createdTime: string;
  updatedTime?: string;
  deletedTime: string | null;
};

export function createAdminSpeakingDraft(mode: AdminSpeakingMode): AdminSpeakingTopic {
  return mode === 'TOPIC_1'
    ? {
      id: adminSpeakingId('s'),
      mode,
      topic: 'New Topic 1',
      questions: [''],
      followUps: [],
      displayOrder: 1,
      active: 1,
      createdTime: adminSpeakingNow(),
      deletedTime: null,
    }
    : {
      id: adminSpeakingId('s'),
      mode,
      topic: 'New Topic 2',
      questions: [],
      cueCard: 'Describe something you would like to learn in the future. You should say what it is, how you would learn it, why you are interested in it, and explain how it could help you.',
      prepSeconds: 0,
      answerSeconds: 120,
      followUps: ['Why do many people enjoy learning new skills?', 'How can schools encourage lifelong learning?'],
      displayOrder: 1,
      active: 1,
      createdTime: adminSpeakingNow(),
      deletedTime: null,
    };
}

export function mapApiAdminSpeakingTopic(raw: SpeakingQuestionVO | Record<string, unknown>): AdminSpeakingTopic {
  const source = asRecord(raw);
  const part = stringValue(source.part ?? source.mode, 'PART1').toUpperCase();
  const subType = stringValue(source.subType ?? source.sub_type, '').toUpperCase();
  const mode: AdminSpeakingMode = part.includes('2') || part.includes('3') || subType.includes('CUE') || subType.includes('FOLLOW') ? 'TOPIC_2_3' : 'TOPIC_1';
  const prompts = normalizeUnknownCollection(source.prompts ?? source.questions ?? source.followUpQuestions ?? source.followUpQuestionsJson ?? source.follow_up_questions_json).map(String);
  const questionText = stringValue(source.questionText ?? source.question_text);

  return {
    id: stringValue(source.id ?? source.questionId ?? source.question_id, adminSpeakingId('s')),
    mode,
    topic: stringValue(source.topic ?? source.topicKey ?? source.topic_key ?? source.title, 'Speaking topic'),
    questions: mode === 'TOPIC_1' ? (prompts.length ? prompts : [questionText].filter(Boolean)) : [],
    questionIds: mode === 'TOPIC_1' ? [stringValue(source.id ?? source.questionId ?? source.question_id)].filter(Boolean) : [],
    cueCard: stringValue(source.cueCard ?? source.cue_card ?? source.prompt),
    prepSeconds: nullableNumber(source.prepSeconds ?? source.prep_seconds) ?? undefined,
    answerSeconds: nullableNumber(source.answerSeconds ?? source.answer_seconds) ?? undefined,
    followUps: mode === 'TOPIC_2_3' ? prompts : [],
    followUpIds: mode === 'TOPIC_2_3' && part.includes('3') ? [stringValue(source.id ?? source.questionId ?? source.question_id)].filter(Boolean) : [],
    displayOrder: nullableNumber(source.displayOrder ?? source.display_order) ?? 1,
    active: Number(source.active ?? 1) as 0 | 1,
    createdTime: stringValue(source.createdTime ?? source.created_time, adminSpeakingNow()),
    updatedTime: stringValue(source.updatedTime ?? source.updated_time, ''),
    deletedTime: (source.deletedTime ?? source.deleted_time ?? null) as string | null,
};
}

export function mapApiAdminSpeakingTopics(rawItems: Array<SpeakingQuestionVO | Record<string, unknown>>): AdminSpeakingTopic[] {
  const groups = new Map<string, AdminSpeakingTopic>();
  rawItems.forEach((raw) => {
    const source = asRecord(raw);
    const id = stringValue(source.id ?? source.questionId ?? source.question_id, adminSpeakingId('s'));
    const part = stringValue(source.part, 'PART1').toUpperCase();
    const subType = stringValue(source.subType ?? source.sub_type, 'NORMAL').toUpperCase();
    const topic = stringValue(source.topicKey ?? source.topic_key ?? source.topic ?? source.title, 'Speaking topic');
    const questionText = stringValue(source.questionText ?? source.question_text);
    const cueCard = stringValue(source.cueCard ?? source.cue_card);
    const key = part === 'PART1' ? `PART1:${topic}` : `TOPIC23:${topic}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id,
        mode: part === 'PART1' ? 'TOPIC_1' : 'TOPIC_2_3',
        topic,
        questions: [],
        questionIds: [],
        cueCard: '',
        prepSeconds: nullableNumber(source.prepSeconds ?? source.prep_seconds) ?? undefined,
        answerSeconds: nullableNumber(source.answerSeconds ?? source.answer_seconds) ?? undefined,
        followUps: [],
        followUpIds: [],
        displayOrder: nullableNumber(source.displayOrder ?? source.display_order) ?? 1,
        active: Number(source.active ?? 1) as 0 | 1,
        createdTime: stringValue(source.createdTime ?? source.created_time, adminSpeakingNow()),
        updatedTime: stringValue(source.updatedTime ?? source.updated_time, ''),
        deletedTime: (source.deletedTime ?? source.deleted_time ?? null) as string | null,
      });
    }

    const group = groups.get(key)!;
    if (part === 'PART1') {
      group.questions.push(questionText);
      group.questionIds = [...(group.questionIds ?? []), id];
    } else if (part === 'PART2' || subType === 'CUECARD') {
      group.id = id;
      group.cueCard = cueCard || questionText;
      group.prepSeconds = nullableNumber(source.prepSeconds ?? source.prep_seconds) ?? group.prepSeconds;
      group.answerSeconds = nullableNumber(source.answerSeconds ?? source.answer_seconds) ?? group.answerSeconds;
    } else if (part === 'PART3') {
      group.followUps.push(questionText);
      group.followUpIds = [...(group.followUpIds ?? []), id];
    }
  });

  return Array.from(groups.values());
}

export function buildSpeakingQuestionPayload(topic: AdminSpeakingTopic) {
  return buildSpeakingQuestionRows(topic)[0];
}

export function buildSpeakingQuestionRows(topic: AdminSpeakingTopic) {
  const questions = topic.questions.map((question) => question.trim()).filter(Boolean);
  const followUps = topic.followUps.map((question) => question.trim()).filter(Boolean);
  if (topic.mode === 'TOPIC_1') {
    return (questions.length ? questions : [topic.topic.trim()]).map((questionText, index) => ({
      id: Number(topic.questionIds?.[index]) || undefined,
      title: topic.topic,
      part: 'PART1',
      subType: 'NORMAL',
      sub_type: 'NORMAL',
      topicKey: topic.topic,
      topic_key: topic.topic,
      questionText,
      question_text: questionText,
      cueCard: null,
      cue_card: null,
      followUpQuestionsJson: '[]',
      follow_up_questions_json: '[]',
      prepSeconds: topic.prepSeconds,
      prep_seconds: topic.prepSeconds,
      answerSeconds: topic.answerSeconds,
      answer_seconds: topic.answerSeconds,
      displayOrder: (topic.displayOrder ?? 1) + index,
      display_order: (topic.displayOrder ?? 1) + index,
      active: topic.active ?? 1,
    }));
  }

  const rows = [{
    id: Number(topic.id) || undefined,
    title: topic.topic,
    part: 'PART2',
    subType: 'CUECARD',
    sub_type: 'CUECARD',
    topicKey: topic.topic,
    topic_key: topic.topic,
    questionText: topic.topic,
    question_text: topic.topic,
    cueCard: topic.cueCard?.trim() || topic.topic.trim(),
    cue_card: topic.cueCard?.trim() || topic.topic.trim(),
    followUpQuestionsJson: JSON.stringify(followUps),
    follow_up_questions_json: JSON.stringify(followUps),
    prepSeconds: topic.prepSeconds,
    prep_seconds: topic.prepSeconds,
    answerSeconds: topic.answerSeconds,
    answer_seconds: topic.answerSeconds,
    displayOrder: topic.displayOrder ?? 1,
    display_order: topic.displayOrder ?? 1,
    active: topic.active ?? 1,
  }];

  return [
    ...rows,
    ...followUps.map((questionText, index) => ({
      id: Number(topic.followUpIds?.[index]) || undefined,
      title: topic.topic,
      part: 'PART3',
      subType: 'FOLLOWUP',
      sub_type: 'FOLLOWUP',
      topicKey: topic.topic,
      topic_key: topic.topic,
      questionText,
      question_text: questionText,
      cueCard: null,
      cue_card: null,
      followUpQuestionsJson: '[]',
      follow_up_questions_json: '[]',
      prepSeconds: undefined,
      prep_seconds: undefined,
      answerSeconds: undefined,
      answer_seconds: undefined,
      displayOrder: (topic.displayOrder ?? 1) + index + 1,
      display_order: (topic.displayOrder ?? 1) + index + 1,
      active: topic.active ?? 1,
    })),
  ];
}

export function adminSpeakingNow() {
  return new Date().toISOString();
}

function adminSpeakingId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnknownCollection(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  const source = asRecord(value);
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.data)) return source.data;
  return [];
}

function stringValue(value: unknown, fallback = '') {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

