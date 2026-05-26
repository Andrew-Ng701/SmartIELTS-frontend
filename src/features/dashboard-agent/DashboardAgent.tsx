import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { dashboardApi } from '../../api/dashboardApi';
import { getApiErrorMessage } from '../../api/errors';
import aiAgentIcon from '../../assets/ai-agent-icon.png';
import type { UserRole } from '../../contracts/common';
import type { DashboardAskConversationMessage, DashboardAskRequest } from '../../contracts/dashboard';
import { readAuthSession } from '../auth';

type AgentPosition = {
  initialized: boolean;
  x: number;
  y: number;
};

type ChatMessage = {
  createdAt?: string;
  id: number;
  isError?: boolean;
  isLoading?: boolean;
  isSystem?: boolean;
  role: 'user' | 'ai';
  text: string;
};

type DashboardSsePayload = {
  answer?: string;
  clearPrevious?: boolean;
  displayAnswer?: string;
  delta?: string;
  done?: boolean;
  text?: string;
  content?: string;
  message?: string;
  [key: string]: unknown;
};

type DashboardSseTextChunk = {
  eventName?: string;
  phase: 'loading' | 'finalStart' | 'answerDelta' | 'result' | 'error';
  suggestions?: string[];
  text: string;
};

export type AgentPrompt = {
  label: string;
  query: string;
};

export type DashboardAgentRequestContext = Pick<
  DashboardAskRequest,
  'askScene' | 'clientContext' | 'context' | 'objectRef' | 'preloadedPayload' | 'targetUserId'
> & {
  loadingText?: string;
  prompts?: AgentPrompt[];
  welcome?: string;
};

type DashboardAnswerResult = {
  answer: string;
  suggestions: string[];
};

const userAgentPrompts: AgentPrompt[] = [
  { label: 'Explain my overall performance', query: 'Explain my overall IELTS performance using my latest practice records.' },
  { label: 'How is my reading score?', query: 'How is my Reading score and what should I improve next?' },
  { label: 'Did I improve this month?', query: 'Compare last month and this month. Did I improve?' },
];

const adminAgentPrompts: AgentPrompt[] = [
  { label: 'Summarize platform activity', query: 'Summarize recent platform activity, active users, records, and AI scoring issues.' },
  { label: 'Which users need attention?', query: 'Which learners need admin attention based on recent records, weak modules, or failed AI scoring?' },
  { label: 'Review content health', query: 'Review Reading, Listening, Writing, and Speaking content health for the admin console.' },
];

const FINAL_STREAM_RENDER_DELAY_MS = 24;
const FINAL_STREAM_FALLBACK_CHARS = 24;
const LAUNCHER_MARGIN_X = 12;
const LAUNCHER_MARGIN_TOP = 84;
const LAUNCHER_MARGIN_BOTTOM = 84;

export function DashboardAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<AgentPosition>({
    initialized: false,
    x: 0,
    y: 0,
  });

  return (
    <>
      <AiAgentLauncher
        position={position}
        onOpen={() => setIsOpen(true)}
        onPositionChange={setPosition}
      />
      <AiAgentDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

function AiAgentLauncher({
  position,
  onOpen,
  onPositionChange,
}: {
  position: AgentPosition;
  onOpen: () => void;
  onPositionChange: (position: AgentPosition) => void;
}) {
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!position.initialized) {
      return undefined;
    }

    const handleResize = () => {
      const safePosition = getSafeLauncherPosition(position, launcherRef.current);
      if (safePosition.x !== position.x || safePosition.y !== position.y) {
        onPositionChange(safePosition);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onPositionChange, position]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onPositionChange({ initialized: true, x: rect.left, y: rect.top });
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) {
      return;
    }

    const deltaX = Math.abs(event.clientX - dragRef.current.startX);
    const deltaY = Math.abs(event.clientY - dragRef.current.startY);
    if (deltaX > 4 || deltaY > 4) {
      dragRef.current.moved = true;
    }

    const buttonSize = launcherRef.current?.offsetWidth ?? 76;
    const nextX = clamp(
      event.clientX - dragRef.current.offsetX,
      LAUNCHER_MARGIN_X,
      getLauncherMaxX(buttonSize),
    );
    const nextY = clamp(
      event.clientY - dragRef.current.offsetY,
      LAUNCHER_MARGIN_TOP,
      getLauncherMaxY(buttonSize),
    );
    onPositionChange({ initialized: true, x: nextX, y: nextY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const wasDragged = dragRef.current.moved;
    dragRef.current.active = false;

    if (!wasDragged) {
      onOpen();
    }
  };

  return (
    <button
      ref={launcherRef}
      className="ai-agent-launcher"
      style={
        position.initialized
          ? { left: position.x, top: position.y }
          : undefined
      }
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <span className="ai-agent-image-wrap">
        <img alt="" draggable={false} src={aiAgentIcon} />
      </span>
      <span className="ai-agent-label">AI Agent</span>
    </button>
  );
}

export function AiAgentDrawer({
  isOpen,
  onClose,
  requestContext,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestContext?: DashboardAgentRequestContext;
}) {
  const role = readAuthSession()?.role ?? null;
  const agentConfig = getAgentConfig(role, requestContext);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      createdAt: new Date().toISOString(),
      id: 1,
      isSystem: true,
      role: 'ai',
      text: agentConfig.welcome,
    },
  ]);
  const [draftMessage, setDraftMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<AgentPrompt[]>(agentConfig.prompts);

  useEffect(() => {
    setMessages((currentMessages) => (
      currentMessages.length === 1 && currentMessages[0].isSystem
        ? [{ ...currentMessages[0], createdAt: new Date().toISOString(), text: agentConfig.welcome }]
        : currentMessages
    ));
    setQuickPrompts(agentConfig.prompts);
  }, [agentConfig.prompts, agentConfig.welcome]);

  const handleQuickPrompt = (prompt: string) => {
    const selectedPrompt = quickPrompts.find((item) => item.label === prompt);
    setDraftMessage(selectedPrompt?.query ?? prompt);
  };

  const handleSend = async () => {
    const messageText = draftMessage.trim();
    if (!messageText || isProcessing) {
      return;
    }
    const conversationHistory = createConversationHistory(messages);

    const userMessage: ChatMessage = {
      createdAt: new Date().toISOString(),
      id: Date.now(),
      role: 'user',
      text: messageText,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraftMessage('');
    setIsProcessing(true);
    const aiMessageId = Date.now() + 1;

    try {
      const session = readAuthSession();
      if (!session) {
        throw new Error('Please log in before asking the dashboard assistant.');
      }

      const aiMessage: ChatMessage = {
        createdAt: new Date().toISOString(),
        id: aiMessageId,
        isLoading: true,
        role: 'ai',
        text: agentConfig.loadingText,
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      const result = await requestDashboardAnswer(
        messageText,
        session.role,
        (partialAnswer) => {
          setMessages((currentMessages) => updateMessageText(currentMessages, aiMessageId, partialAnswer));
        },
        (suggestions) => {
          setQuickPrompts(createSuggestionPrompts(suggestions, agentConfig.prompts));
        },
        conversationHistory,
        requestContext,
      );

      setMessages((currentMessages) => updateMessage(currentMessages, aiMessageId, {
        createdAt: new Date().toISOString(),
        isLoading: false,
        text: result.answer || 'The assistant returned an empty answer.',
      }));
      setQuickPrompts(createSuggestionPrompts(result.suggestions, agentConfig.prompts));
    } catch (error) {
      const aiMessage: ChatMessage = {
        createdAt: new Date().toISOString(),
        id: aiMessageId,
        isError: true,
        isLoading: false,
        role: 'ai',
        text: getApiErrorMessage(error),
      };
      setMessages((currentMessages) => (
        currentMessages.some((message) => message.id === aiMessageId)
          ? updateMessage(currentMessages, aiMessageId, aiMessage)
          : [...currentMessages, aiMessage]
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    const nextAgentConfig = getAgentConfig(readAuthSession()?.role ?? null, requestContext);
    setMessages([
      {
        createdAt: new Date().toISOString(),
        id: Date.now(),
        isSystem: true,
        role: 'ai',
        text: nextAgentConfig.welcome,
      },
    ]);
    setQuickPrompts(nextAgentConfig.prompts);
    setDraftMessage('');
    setIsProcessing(false);
  };

  return (
    <aside
      aria-label="IELTS AI Tutor drawer"
      className={`ai-agent-drawer ${isOpen ? 'ai-agent-drawer-open' : ''}`}
    >
      <div className="ai-chat-card">
        <header className="ai-chat-header">
          <div className="ai-chat-title">
            <div>
              <h2>IELTS AI Tutor</h2>
              <span>
                <i aria-hidden="true" />
                System Ready - Backend API
              </span>
            </div>
          </div>
          <div className="ai-chat-actions">
            <button type="button" aria-label="Reset chat" title="Reset chat" onClick={handleReset}>
              Reset
            </button>
            <button type="button" aria-label="Close tutor" title="Close tutor" onClick={onClose}>
              X
            </button>
          </div>
        </header>

        <div className="ai-chat-history">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`ai-chat-bubble ${
                message.role === 'user' ? 'ai-chat-user-bubble' : 'ai-chat-ai-bubble'
              }`}
            >
              <p>
                {message.isLoading && <span className="ai-loading-spinner" aria-hidden="true" />}
                <span className="ai-message-text">{renderAiMessageText(message.text)}</span>
                {message.isLoading && <span className="ai-loading-dots" aria-hidden="true" />}
              </p>
            </div>
          ))}
        </div>

        <footer className="ai-chat-footer">
          <div className="ai-chat-chips">
            {quickPrompts.map((prompt) => (
              <button key={prompt.label} type="button" onClick={() => handleQuickPrompt(prompt.label)}>
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="ai-chat-input-row">
            <textarea
              placeholder="Enter query..."
              rows={1}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" disabled={!draftMessage.trim() || isProcessing} onClick={handleSend}>
              Send
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
        </footer>
      </div>
    </aside>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSafeLauncherPosition(position: AgentPosition, launcher: HTMLButtonElement | null): AgentPosition {
  const launcherSize = launcher?.offsetWidth ?? 76;
  return {
    initialized: true,
    x: clamp(position.x, LAUNCHER_MARGIN_X, getLauncherMaxX(launcherSize)),
    y: clamp(position.y, LAUNCHER_MARGIN_TOP, getLauncherMaxY(launcherSize)),
  };
}

function getLauncherMaxX(launcherSize: number) {
  return Math.max(LAUNCHER_MARGIN_X, window.innerWidth - launcherSize - LAUNCHER_MARGIN_X);
}

function getLauncherMaxY(launcherSize: number) {
  return Math.max(LAUNCHER_MARGIN_TOP, window.innerHeight - launcherSize - LAUNCHER_MARGIN_BOTTOM);
}

function renderAiMessageText(text: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const boldStart = text.indexOf('**', cursor);
    const bulletLabel = findNextBulletLabel(text, cursor);
    const nextStart = bulletLabel && (boldStart === -1 || bulletLabel.start < boldStart)
      ? bulletLabel.start
      : boldStart;

    if (nextStart === -1) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (nextStart > cursor) {
      nodes.push(text.slice(cursor, nextStart));
    }

    if (bulletLabel && nextStart === bulletLabel.start) {
      nodes.push(text.slice(bulletLabel.start, bulletLabel.labelStart));
      const labelText = text.slice(bulletLabel.labelStart, bulletLabel.end);
      const normalizedLabel = unwrapBoldLabel(labelText);
      nodes.push(<strong key={`ai-label-${key}`}>{normalizedLabel.label}</strong>);
      if (normalizedLabel.suffix) {
        nodes.push(normalizedLabel.suffix);
      }
      key += 1;
      cursor = bulletLabel.end;
      continue;
    }

    const boldEnd = text.indexOf('**', boldStart + 2);
    if (boldEnd === -1) {
      nodes.push(text.slice(boldStart));
      break;
    }
    const boldText = text.slice(boldStart + 2, boldEnd);
    nodes.push(<strong key={`ai-bold-${key}`}>{boldText}</strong>);
    key += 1;
    cursor = boldEnd + 2;
  }

  return nodes;
}

function findNextBulletLabel(text: string, cursor: number) {
  const bulletLabelPattern = /(?:^|\s)([-\u2022]\s*)([^:\u2022\n]{1,80}:)/g;
  bulletLabelPattern.lastIndex = cursor;
  const match = bulletLabelPattern.exec(text);
  if (!match || match.index < cursor) {
    return null;
  }

  const leadingSpaceLength = match[0].length - match[1].length - match[2].length;
  const start = match.index;
  const labelStart = start + leadingSpaceLength + match[1].length;
  return {
    end: labelStart + match[2].length,
    labelStart,
    start,
  };
}

function unwrapBoldLabel(labelText: string) {
  const trimmedLabel = labelText.trimEnd();
  const trailingWhitespace = labelText.slice(trimmedLabel.length);
  const match = /^\*\*(.+?)\*\*(:?)$/.exec(trimmedLabel);
  if (!match) {
    return { label: trimmedLabel, suffix: trailingWhitespace };
  }

  return {
    label: match[1],
    suffix: `${match[2]}${trailingWhitespace}`,
  };
}

function getAgentConfig(role: UserRole | null, requestContext?: DashboardAgentRequestContext) {
  const customPrompts = requestContext?.prompts;
  const loadingText = requestContext?.loadingText ?? "I'm checking your dashboard data and organizing the key points now.";

  if (role === 'ADMIN') {
    return {
      loadingText,
      prompts: customPrompts ?? adminAgentPrompts,
      welcome: requestContext?.welcome ?? 'Welcome to the SmartIELTS admin assistant. I can review user activity, records, content health, and AI scoring issues from the admin dashboard.',
    };
  }

  return {
    loadingText,
    prompts: customPrompts ?? userAgentPrompts,
    welcome: requestContext?.welcome ?? 'Welcome to the IELTS AI tutoring system. I can query your practice records to explain scores, progress, and next-step study priorities.',
  };
}

function createDashboardAskBody(
  messageText: string,
  role: UserRole,
  conversationHistory: DashboardAskConversationMessage[] = [],
  requestContext?: DashboardAgentRequestContext,
): DashboardAskRequest {
  const isAdmin = role === 'ADMIN';
  const defaultClientContext = {
    pageName: isAdmin ? 'adminConsole' : 'userConsole',
    route: isAdmin ? '/admin' : '/dashboard',
    locale: 'en',
  };

  return {
    query: messageText,
    askScene: requestContext?.askScene ?? 'floating_agent',
    responseMode: 'stream',
    targetUserId: isAdmin ? requestContext?.targetUserId : undefined,
    context: requestContext?.context,
    conversationHistory: conversationHistory.length ? conversationHistory : undefined,
    objectRef: requestContext?.objectRef,
    preloadedPayload: requestContext?.preloadedPayload,
    clientContext: {
      ...defaultClientContext,
      ...requestContext?.clientContext,
      clientTime: new Date().toISOString(),
    },
  };
}

async function requestDashboardAnswer(
  messageText: string,
  role: UserRole,
  onPartialAnswer: (answer: string) => void,
  onSuggestions: (suggestions: string[]) => void,
  conversationHistory: DashboardAskConversationMessage[] = [],
  requestContext?: DashboardAgentRequestContext,
): Promise<DashboardAnswerResult> {
  const body = createDashboardAskBody(messageText, role, conversationHistory, requestContext);

  try {
    const reader = role === 'ADMIN'
      ? await dashboardApi.askAdminSse(body)
      : await dashboardApi.askUserSse(body);

    return await readDashboardSseAnswer(reader, onPartialAnswer, onSuggestions);
  } catch (error) {
    const response = role === 'ADMIN'
      ? await dashboardApi.askAdmin({ ...body, responseMode: 'normal' })
      : await dashboardApi.askUser({ ...body, responseMode: 'normal' });

    const fallbackAnswer = extractDashboardResponseAnswer(response) || getApiErrorMessage(error);
    const suggestions = extractDashboardResponseSuggestions(response);
    onPartialAnswer(fallbackAnswer);
    onSuggestions(suggestions);
    return { answer: fallbackAnswer, suggestions };
  }
}

function extractDashboardResponseAnswer(response: unknown) {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object') return '';
  const source = response as Record<string, any>;
  const data = source.data && typeof source.data === 'object' ? source.data as Record<string, any> : {};
  const nestedData = data.data && typeof data.data === 'object' ? data.data as Record<string, any> : {};

  return String(
    source.answer
    ?? source.response
    ?? source.result
    ?? source.text
    ?? source.content
    ?? source.message
    ?? data.answer
    ?? data.response
    ?? data.result
    ?? data.text
    ?? data.content
    ?? nestedData.answer
    ?? nestedData.response
    ?? nestedData.result
    ?? nestedData.text
    ?? nestedData.content
    ?? '',
  );
}

function extractDashboardResponseSuggestions(response: unknown) {
  const suggestions = new Set<string>();

  const collect = (source: unknown) => {
    if (!source || typeof source !== 'object') {
      return;
    }

    const record = source as Record<string, unknown>;
    const rawSuggestions = record.suggestions;
    if (Array.isArray(rawSuggestions)) {
      rawSuggestions.forEach((item) => {
        if (typeof item === 'string' && item.trim()) {
          suggestions.add(item.trim());
        }
      });
    }

    collect(record.data);
  };

  collect(response);
  return Array.from(suggestions).slice(0, 3);
}

function createSuggestionPrompts(suggestions: string[], fallbackPrompts: AgentPrompt[]) {
  const prompts = suggestions
    .map((suggestion) => suggestion.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((suggestion) => ({
      label: suggestion,
      query: suggestion,
    }));

  return prompts.length ? prompts : fallbackPrompts;
}

function createConversationHistory(messages: ChatMessage[]): DashboardAskConversationMessage[] {
  return messages
    .filter((message) => (
      !message.isSystem
      && !message.isLoading
      && !message.isError
      && Boolean(message.text.trim())
    ))
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.text.trim(),
      createdAt: message.createdAt,
    }));
}

async function readDashboardSseAnswer(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPartialAnswer: (answer: string) => void,
  onSuggestions: (suggestions: string[]) => void,
): Promise<DashboardAnswerResult> {
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let loadingAnswer = '';
  let hasResultStarted = false;
  let suggestions: string[] = [];

  const applyChunk = async (chunk: DashboardSseTextChunk | null) => {
    if (!chunk) return;
    if (chunk.suggestions?.length) {
      suggestions = chunk.suggestions;
      onSuggestions(suggestions);
    }

    if (chunk.phase === 'finalStart') {
      hasResultStarted = true;
      answer = '';
      onPartialAnswer('');
      return;
    }

    if (chunk.phase === 'loading' && !hasResultStarted) {
      loadingAnswer = mergeDashboardAnswer(loadingAnswer, chunk.text);
      onPartialAnswer(loadingAnswer);
      return;
    }

    if (chunk.phase === 'result' && answer) {
      return;
    }

    hasResultStarted = true;
    if (chunk.phase === 'result') {
      answer = await streamDashboardTextFallback(chunk.text, onPartialAnswer);
      return;
    }

    answer = mergeDashboardAnswer(answer, chunk.text);
    onPartialAnswer(answer);
    if (chunk.phase === 'answerDelta') {
      await waitForDashboardRenderFrame();
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        await applyChunk(extractDashboardSseTextChunk(block));
      }

      if (done) {
        await applyChunk(extractDashboardSseTextChunk(buffer));
        return { answer: answer || loadingAnswer, suggestions };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractDashboardSseTextChunk(block: string): DashboardSseTextChunk | null {
  const lines = block.split(/\r?\n/);
  const eventName = lines
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n');

  if (!data || eventName === 'done') {
    return null;
  }

  const payload = parseDashboardSsePayload(data);
  if (typeof payload === 'string') {
    return createDashboardSseTextChunk(eventName, payload);
  }

  if (payload && typeof payload === 'object') {
    const nestedData = payload.data && typeof payload.data === 'object'
      ? payload.data as Record<string, any>
      : {};

    if (eventName === 'finalStart' || payload.clearPrevious === true) {
      return { eventName, phase: 'finalStart', suggestions: extractDashboardResponseSuggestions(payload), text: '' };
    }

    if (eventName === 'finalEnd') {
      return null;
    }

    if (eventName === 'error') {
      return createDashboardSseTextChunk(
        eventName,
        String(payload.msg ?? payload.message ?? payload.text ?? getPrimitiveDataText(payload.data) ?? 'The assistant stream returned an error.'),
      );
    }

    const text = String(
      payload.displayAnswer
      ?? payload.answer
      ?? payload.delta
      ?? payload.text
      ?? payload.content
      ?? payload.message
      ?? getPrimitiveDataText(payload.data)
      ?? nestedData.displayAnswer
      ?? nestedData.answer
      ?? nestedData.delta
      ?? nestedData.text
      ?? nestedData.content
      ?? nestedData.message
      ?? '',
    );
    return createDashboardSseTextChunk(eventName, text, extractDashboardResponseSuggestions(payload));
  }

  return null;
}

function createDashboardSseTextChunk(
  eventName: string | undefined,
  text: string,
  suggestions: string[] = [],
): DashboardSseTextChunk | null {
  if (isDashboardTraceText(text)) {
    return suggestions.length ? {
      eventName,
      phase: getDashboardSseChunkPhase(eventName),
      suggestions,
      text: '',
    } : null;
  }

  return {
    eventName,
    phase: getDashboardSseChunkPhase(eventName),
    suggestions,
    text,
  };
}

function getDashboardSseChunkPhase(eventName: string | undefined): DashboardSseTextChunk['phase'] {
  if (eventName === 'answerDelta') {
    return 'answerDelta';
  }
  if (!eventName || eventName === 'result') {
    return 'result';
  }
  if (eventName === 'error') {
    return 'error';
  }
  return 'loading';
}

function getPrimitiveDataText(data: unknown) {
  return typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean'
    ? String(data)
    : undefined;
}

function isDashboardTraceText(text: string) {
  const normalized = text.trim().toLowerCase();
  return !normalized
    || normalized.includes('dashboard request started')
    || normalized.includes('stream completed')
    || normalized.includes('intent resolved')
    || normalized.includes('process trace');
}

function parseDashboardSsePayload(data: string): DashboardSsePayload | string | null {
  try {
    return JSON.parse(data) as DashboardSsePayload;
  } catch {
    return data;
  }
}

function mergeDashboardAnswer(currentAnswer: string, nextText: string) {
  if (!currentAnswer || nextText.startsWith(currentAnswer)) {
    return nextText;
  }

  return `${currentAnswer}${nextText}`;
}

async function streamDashboardTextFallback(
  text: string,
  onPartialAnswer: (answer: string) => void,
) {
  let streamedAnswer = '';
  for (let offset = 0; offset < text.length;) {
    const nextOffset = getDashboardTextChunkOffset(text, offset, FINAL_STREAM_FALLBACK_CHARS);
    streamedAnswer += text.slice(offset, nextOffset);
    onPartialAnswer(streamedAnswer);
    offset = nextOffset;
    if (offset < text.length) {
      await waitForDashboardRenderFrame();
    }
  }
  return streamedAnswer;
}

function getDashboardTextChunkOffset(text: string, offset: number, chunkCodePoints: number) {
  const remainingCodePoints = Array.from(text.slice(offset)).length;
  const nextChunkCodePoints = Math.min(chunkCodePoints, remainingCodePoints);
  return offset + Array.from(text.slice(offset)).slice(0, nextChunkCodePoints).join('').length;
}

function waitForDashboardRenderFrame() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, FINAL_STREAM_RENDER_DELAY_MS);
  });
}

function updateMessageText(messages: ChatMessage[], id: number, text: string) {
  return updateMessage(messages, id, { text });
}

function updateMessage(messages: ChatMessage[], id: number, patch: Partial<ChatMessage>) {
  return messages.map((message) => (
    message.id === id ? { ...message, ...patch } : message
  ));
}

