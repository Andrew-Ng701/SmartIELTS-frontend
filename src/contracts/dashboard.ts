import type { LocalDateTimeString } from './common';

export type DashboardObjectRef = {
  module?: string;
  objectType?: string;
  testId?: number;
  passageId?: number;
  questionId?: number;
  questionNumber?: number;
  recordId?: number;
  sessionId?: string;
};

export type DashboardAskConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: LocalDateTimeString;
  meta?: Record<string, unknown>;
};

export type DashboardAskRequest = {
  query: string;
  targetUserId?: number;
  context?: Record<string, unknown>;
  conversationHistory?: DashboardAskConversationMessage[];
  askScene?: string;
  responseMode?: string;
  objectRef?: DashboardObjectRef;
  preloadedPayload?: unknown;
  clientContext?: {
    pageName?: string;
    route?: string;
    tab?: string;
    locale?: string;
    clientTime?: LocalDateTimeString;
    ext?: Record<string, unknown>;
  };
};

export type DashboardAskResponse = {
  answer?: string;
  data?: unknown;
  suggestions?: string[];
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type DashboardPreloadPayload = Record<string, unknown>;
export type DashboardOverviewVisualVO = Record<string, unknown>;
export type DashboardExecutiveSummaryVO = string | {
  snapshot_id?: string;
  snapshot_time?: LocalDateTimeString;
  summary_type?: string;
  summary_text?: string;
  summary_sentences?: string[];
  query_used?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
} | null;

export type DashboardSseEventName = 'start' | 'loading' | 'intentResolved' | 'result' | 'error' | 'done';

export type DashboardSseEvent = {
  event: DashboardSseEventName;
  data?: unknown;
};
