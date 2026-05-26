import type { NextQuestionVO, StartExamVO } from '../../../contracts/speaking';

export const DID_SPEAKING_FRAME_PATH = '/did-speaking-frame.html';
export const DID_SCRIPT_SRC = import.meta.env.VITE_DID_SCRIPT_SRC || 'https://agent.d-id.com/v2/index.js';
export const DID_CLIENT_KEY = import.meta.env.VITE_DID_CLIENT_KEY || 'Z29vZ2xlLW9hdXRoMnwxMDMwNjMyMjkwMjczMDYzMjQ4MzA6X1BYalY1TGdoUUtKWklLTmlFeFk2';
export const DID_AGENT_ID = import.meta.env.VITE_DID_AGENT_ID || 'v2_agt_kFp4XHyG';
export const DID_TARGET_ID = 'did-agent-root';

export type SpeakingSessionStatus =
  | 'PENDING'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_FINAL_EVALUATION'
  | 'COMPLETED'
  | 'FAILED';

export type SpeakingQuestionStep = {
  sessionId: string;
  questionId: number;
  part: string;
  stepType: string;
  topicKey: string;
  questionText: string;
  cueCard: string;
  displayScript: string;
  spokenScript: string;
  prepSeconds: number;
  answerSeconds: number;
  currentIndex: number;
  hasNext: boolean;
  talkId: string;
  examStatus: SpeakingSessionStatus;
};

export type SpeakingExamOverview = {
  sessionId: string;
  status: SpeakingSessionStatus;
  totalQuestions: number;
  openingCount: number;
  part1Count: number;
  part3Count: number;
  topicKey: string | null;
  message: string;
};

export const speakingCurrentStep: SpeakingQuestionStep = {
  sessionId: 'speaking-session-1001',
  questionId: 5001,
  part: 'PART_2',
  stepType: 'CUE_CARD',
  topicKey: 'education',
  questionText: 'Describe a teacher who influenced you.',
  cueCard:
    'You should say who this teacher was, what they taught, what made their lessons memorable, and explain why this person influenced you.',
  displayScript: 'Now describe a teacher who influenced you.',
  spokenScript: 'Now describe a teacher who influenced you.',
  prepSeconds: 0,
  answerSeconds: 120,
  currentIndex: 2,
  hasNext: true,
  talkId: 'talk-abc',
  examStatus: 'IN_PROGRESS',
};

export function buildDidSpeakingFrameUrl(reloadKey: number, origin = window.location.origin) {
  const url = new URL(DID_SPEAKING_FRAME_PATH, origin);
  url.searchParams.set('reload', String(reloadKey));
  url.searchParams.set('scriptSrc', DID_SCRIPT_SRC);
  url.searchParams.set('targetId', DID_TARGET_ID);

  if (DID_CLIENT_KEY) {
    url.searchParams.set('clientKey', DID_CLIENT_KEY);
  }

  if (DID_AGENT_ID) {
    url.searchParams.set('agentId', DID_AGENT_ID);
  }

  return url.toString();
}

export function mapStartExamToOverview(raw: StartExamVO | Record<string, unknown>): SpeakingExamOverview {
  const source = raw as Record<string, any>;

  return {
    sessionId: String(source.sessionId ?? source.session_id ?? ''),
    status: normalizeSessionStatus(source.examStatus ?? source.exam_status ?? source.status),
    totalQuestions: Number(source.totalQuestions ?? source.total_questions ?? 0),
    openingCount: Number(source.openingCount ?? source.opening_count ?? 0),
    part1Count: Number(source.part1Count ?? source.part1_count ?? 0),
    part3Count: Number(source.part3Count ?? source.part3_count ?? 0),
    topicKey: source.topicKeyForPart2And3 ?? source.topic_key_for_part2_and3 ?? null,
    message: String(source.message ?? 'Speaking exam started.'),
  };
}

export function mapNextQuestionToStep(raw: NextQuestionVO | Record<string, unknown>): SpeakingQuestionStep {
  const source = raw as Record<string, any>;

  return {
    sessionId: String(source.sessionId ?? source.session_id ?? ''),
    questionId: Number(source.questionId ?? source.question_id ?? 0),
    part: String(source.part ?? 'PART_1'),
    stepType: String(source.stepType ?? source.step_type ?? 'QUESTION'),
    topicKey: String(source.topicKey ?? source.topic_key ?? ''),
    questionText: String(source.questionText ?? source.question_text ?? 'Question is loading.'),
    cueCard: String(source.cueCard ?? source.cue_card ?? ''),
    displayScript: String(source.displayScript ?? source.display_script ?? source.questionText ?? source.question_text ?? ''),
    spokenScript: String(source.spokenScript ?? source.spoken_script ?? ''),
    prepSeconds: Number(source.prepSeconds ?? source.prep_seconds ?? 0),
    answerSeconds: Number(source.answerSeconds ?? source.answer_seconds ?? 0),
    currentIndex: Number(source.currentIndex ?? source.current_index ?? 1),
    hasNext: Boolean(source.hasNext ?? source.has_next ?? false),
    talkId: String(source.talkId ?? source.talk_id ?? ''),
    examStatus: normalizeSessionStatus(source.examStatus ?? source.exam_status),
  };
}

function normalizeSessionStatus(value: unknown): SpeakingSessionStatus {
  const status = String(value ?? 'IN_PROGRESS');
  if (
    status === 'PENDING'
    || status === 'STARTED'
    || status === 'IN_PROGRESS'
    || status === 'WAITING_FINAL_EVALUATION'
    || status === 'COMPLETED'
    || status === 'FAILED'
  ) {
    return status;
  }

  return 'IN_PROGRESS';
}
