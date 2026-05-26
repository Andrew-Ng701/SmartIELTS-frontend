import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getApiErrorMessage } from '../../../api/errors';
import { listeningApi } from '../../../api/listeningApi';
import { readingApi } from '../../../api/readingApi';
import { recordsApi } from '../../../api/recordsApi';
import { AudioPlayerControl } from '../../../components/AudioPlayerControl';
import { ListeningPreviewNotes } from '../../../components/exam/ListeningPreviewNotes';
import { StudentExamQuestionNav, StudentExamQuestionPanel } from '../../../components/exam/StudentExamQuestionPanel';
import { useAsyncActionLock } from '../../../hooks/useInteractionGuard';
import {
  DEFAULT_PREP_SECONDS,
  buildPracticeSubmitBody,
  formatClock,
  getCompletedPracticeRecord,
  getLatestPracticeRecord,
  getPartGroups,
  getPartQuestions,
  getPracticeStatusLabel,
  getSessionIdFromPracticeResponse,
  formatPracticePassageParagraphs,
  mapApiPracticeRecord,
  mapApiPracticeTest,
  normalizeApiList,
} from './practiceModel';
import type { PracticeAnswerValue, PracticePart, PracticeQuestion, PracticeRecord, PracticeTestDetail } from './practiceModel';

export type PracticeModuleCard = {
  id: string;
  name: string;
};

export function PracticePage({ module }: { module: PracticeModuleCard }) {
  const moduleId = module.id === 'listening' ? 'listening' : 'reading';
  const isListening = moduleId === 'listening';
  const [tests, setTests] = useState<PracticeTestDetail[]>([]);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [activePartNumber, setActivePartNumber] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [prepRemainingSeconds, setPrepRemainingSeconds] = useState(DEFAULT_PREP_SECONDS);
  const [completedTestIds, setCompletedTestIds] = useState<Set<number>>(() => new Set());
  const [answers, setAnswers] = useState<Record<string, PracticeAnswerValue>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftLines, setDraftLines] = useState<Record<string, string>>({});
  const [notePage, setNotePage] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const [entryMessage, setEntryMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionActionPending, setIsSessionActionPending] = useState(false);
  const [startingTestId, setStartingTestId] = useState<number | null>(null);
  const pauseActionIdRef = useRef(0);
  const submitActionRef = useRef(false);
  const autoSubmitTestIdRef = useRef<number | null>(null);
  const remainingSecondsRef = useRef(remainingSeconds);
  const prepRemainingSecondsRef = useRef(prepRemainingSeconds);
  const selectedTest = tests.find((test) => test.id === selectedTestId) ?? tests[0] ?? null;
  const activeTest = activeTestId ? tests.find((test) => test.id === activeTestId) ?? null : null;

  const loadTests = () => {
    setEntryMessage(`Loading ${module.name.toLowerCase()} tests...`);
    const listRequest = isListening ? listeningApi.listUserTests() : readingApi.listUserTests();
    listRequest
      .then((result) => {
        const mappedTests = normalizeApiList(result).map(mapApiPracticeTest);
        setTests(mappedTests);
        setSelectedTestId((current) => current ?? mappedTests[0]?.id ?? null);
        setEntryMessage(mappedTests.length ? '' : `No ${module.name.toLowerCase()} tests are available.`);
      })
      .catch((error) => {
        setTests([]);
        setSelectedTestId(null);
        setEntryMessage(getApiErrorMessage(error));
      });
  };

  const loadRecords = () => {
    recordsApi.listRecordsOverview({
      moduleType: isListening ? 'LISTENING' : 'READING',
      recordState: 'ACTIVE',
      pageNum: 1,
      pageSize: 200,
    })
      .then((result) => {
        setRecords(normalizeApiList(result).map(mapApiPracticeRecord).filter((record): record is PracticeRecord => Boolean(record)));
      })
      .catch(() => {
        setRecords([]);
      });
  };

  useEffect(() => {
    loadTests();
    loadRecords();
  }, [moduleId]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    prepRemainingSecondsRef.current = prepRemainingSeconds;
  }, [prepRemainingSeconds]);

  useEffect(() => {
    if (!activeTestId || isSubmitted || isPaused || activeTest?.timerMode !== 'COUNTDOWN') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (prepRemainingSecondsRef.current > 0) {
        const nextPrep = Math.max(0, prepRemainingSecondsRef.current - 1);
        prepRemainingSecondsRef.current = nextPrep;
        setPrepRemainingSeconds(nextPrep);
        return;
      }

      const nextRemaining = Math.max(0, remainingSecondsRef.current - 1);
      remainingSecondsRef.current = nextRemaining;
      setRemainingSeconds(nextRemaining);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTestId, activeTest?.timerMode, isPaused, isSubmitted]);

  useEffect(() => {
    if (
      !activeTest
      || activeTest.timerMode !== 'COUNTDOWN'
      || !activeTest.autoSubmit
      || isSubmitted
      || isPaused
      || prepRemainingSeconds > 0
      || remainingSeconds > 0
      || autoSubmitTestIdRef.current === activeTest.id
    ) {
      return;
    }

    autoSubmitTestIdRef.current = activeTest.id;
    void submitPractice(false);
  }, [activeTest, isPaused, isSubmitted, prepRemainingSeconds, remainingSeconds]);

  const openExam = useAsyncActionLock(async (test: PracticeTestDetail) => {
    setEntryMessage(`Starting ${test.title}...`);
    setStartingTestId(test.id);
    try {
      const startedSession = isListening
        ? await listeningApi.startSession(test.id)
        : await readingApi.startSession(test.id);
      const nextSessionId = getSessionIdFromPracticeResponse(startedSession);
      let sessionDetail: unknown = null;

      if (nextSessionId) {
        try {
          sessionDetail = isListening
            ? await listeningApi.getSession(String(nextSessionId))
            : await readingApi.getSession(String(nextSessionId));
        } catch {
          sessionDetail = null;
        }
      }

      const mappedSessionTest = sessionDetail
        ? mapApiPracticeTest(sessionDetail)
        : null;
      const sessionTest = mappedSessionTest
        ? {
            ...test,
            ...mappedSessionTest,
            id: test.id,
            title: test.title || mappedSessionTest.title,
            parts: mappedSessionTest.parts.length ? mappedSessionTest.parts : test.parts,
            partGroups: mappedSessionTest.partGroups.length ? mappedSessionTest.partGroups : test.partGroups,
            questions: mappedSessionTest.questions.length ? mappedSessionTest.questions : test.questions,
            testAudio: mappedSessionTest.testAudio ?? test.testAudio,
            partGroupAudios: mappedSessionTest.partGroupAudios?.length ? mappedSessionTest.partGroupAudios : test.partGroupAudios,
          }
        : test;
      setTests((current) => current.map((item) => (item.id === test.id ? sessionTest : item)));
      setSessionId(nextSessionId ? String(nextSessionId) : null);
      setSelectedTestId(sessionTest.id);
      setActiveTestId(sessionTest.id);
      setActivePartNumber(sessionTest.parts[0]?.partNumber ?? 1);
      setIsSubmitted(false);
      autoSubmitTestIdRef.current = null;
      setRemainingSeconds(sessionTest.totalSeconds);
      setPrepRemainingSeconds(sessionTest.prepSeconds || DEFAULT_PREP_SECONDS);
      setAnswers({});
      setMarkedQuestions({});
      setNotes({});
      setDraftLines({});
      setNotePage(0);
      setIsPaused(false);
      setIsAudioPlaying(false);
      setAudioPlaybackRate(1);
      setEntryMessage(
        sessionTest.timerMode === 'COUNTDOWN'
          ? `${sessionTest.title} started. Countdown is running.`
          : `${sessionTest.title} started. Timer is disabled for this test.`,
      );
    } catch (error) {
      setEntryMessage(getApiErrorMessage(error));
    } finally {
      setStartingTestId(null);
    }
  });

  const updateAnswer = (questionId: string, value: PracticeAnswerValue) => {
    setAnswers((current) => {
      const isEmpty = Array.isArray(value) ? value.length === 0 : value === '';
      if (!isEmpty) {
        return { ...current, [questionId]: value };
      }

      const nextAnswers = { ...current };
      delete nextAnswers[questionId];
      return nextAnswers;
    });
  };

  const pauseOrResumeSession = async () => {
    if (!sessionId || !activeTest) {
      setEntryMessage('A backend session is required before pausing or resuming.');
      return;
    }

    if (!activeTest.allowPause) {
      setEntryMessage('Pause is not enabled for this test.');
      return;
    }

    const actionId = pauseActionIdRef.current + 1;
    const nextPaused = !isPaused;
    const previousPaused = isPaused;
    const currentRemainingSeconds = remainingSeconds;
    const currentPrepRemainingSeconds = prepRemainingSeconds;
    pauseActionIdRef.current = actionId;
    setIsSessionActionPending(true);
    setIsPaused(nextPaused);
    setIsAudioPlaying(false);
    setEntryMessage(nextPaused ? 'Pausing session...' : 'Resuming session...');

    try {
      const nextSession = nextPaused
        ? isListening ? await listeningApi.pauseSession(sessionId) : await readingApi.pauseSession(sessionId)
        : isListening ? await listeningApi.resumeSession(sessionId) : await readingApi.resumeSession(sessionId);
      const sessionSource = asSessionRecord(nextSession);

      if (pauseActionIdRef.current !== actionId) {
        return;
      }

      setRemainingSeconds(readSessionSeconds(sessionSource, ['remainingSeconds', 'remaining_seconds'], currentRemainingSeconds));
      setPrepRemainingSeconds(readSessionSeconds(sessionSource, ['prepRemainingSeconds', 'prep_remaining_seconds'], currentPrepRemainingSeconds));
      setEntryMessage(nextPaused ? `${activeTest.title} paused.` : `${activeTest.title} resumed.`);
    } catch (error) {
      if (pauseActionIdRef.current === actionId) {
        setIsPaused(previousPaused);
        setRemainingSeconds(currentRemainingSeconds);
        setPrepRemainingSeconds(currentPrepRemainingSeconds);
        setEntryMessage(getApiErrorMessage(error));
      }
    } finally {
      if (pauseActionIdRef.current === actionId) {
        setIsSessionActionPending(false);
      }
    }
  };

  const submitPractice = async (requireConfirmation: boolean) => {
    if (!activeTest || submitActionRef.current) {
      return;
    }

    if (requireConfirmation && !window.confirm('Submit your answers now? This will send the attempt to SmartIELTS.')) {
      return;
    }

    if (!sessionId) {
      setEntryMessage('A backend session is required before submitting.');
      return;
    }

    submitActionRef.current = true;
    setEntryMessage(requireConfirmation ? 'Submitting answers...' : 'Time is up. Auto submitting answers...');

    try {
      const submitBody = buildPracticeSubmitBody(answers, activeTest.questions, sessionId);
      const submitResult = isListening
        ? await listeningApi.submit(activeTest.id, submitBody)
        : await readingApi.submit(activeTest.id, submitBody);
      const submittedRecord = mapApiPracticeRecord(submitResult);

      setIsSubmitted(true);
      setIsPaused(false);
      setIsAudioPlaying(false);
      setCompletedTestIds((current) => new Set(current).add(activeTest.id));
      if (submittedRecord) {
        setRecords((current) => [submittedRecord, ...current.filter((record) => record.recordId !== submittedRecord.recordId)]);
      } else {
        loadRecords();
      }
      setEntryMessage(`${activeTest.title} ${requireConfirmation ? 'submitted' : 'auto submitted'}.`);
    } catch (error) {
      if (!requireConfirmation) {
        autoSubmitTestIdRef.current = null;
      }
      setEntryMessage(getApiErrorMessage(error));
    } finally {
      submitActionRef.current = false;
    }
  };

  if (activeTest) {
    return (
      <StudentPracticeExam
        activePartNumber={activePartNumber}
        answers={answers}
        draftLines={draftLines}
        markedQuestions={markedQuestions}
        isAudioPlaying={isAudioPlaying}
        isPaused={isPaused}
        isSessionActionPending={isSessionActionPending}
        isListening={isListening}
        isSubmitted={isSubmitted}
        moduleName={module.name}
        notePage={notePage}
        notes={notes}
        onAnswerChange={updateAnswer}
        onAudioRateChange={setAudioPlaybackRate}
        onBackToList={() => {
          setActiveTestId(null);
          setIsPaused(false);
          setIsAudioPlaying(false);
          setEntryMessage(`${activeTest.title} closed.`);
        }}
        onDraftLineChange={(lineKey, value) => setDraftLines((current) => ({ ...current, [lineKey]: value }))}
        onExit={() => {
          if (window.confirm('Exit this exam? Your current answers will be cleared.')) {
            setActiveTestId(null);
            setIsSubmitted(false);
            setIsPaused(false);
            setIsAudioPlaying(false);
            setEntryMessage(`${activeTest.title} exited. Start again to create a new attempt.`);
          }
        }}
        onNoteChange={(questionNumber, value) => setNotes((current) => ({ ...current, [String(questionNumber)]: value }))}
        onNotePageChange={(nextPage) => setNotePage(Math.max(0, nextPage))}
        onPartChange={(partNumber) => setActivePartNumber(partNumber)}
        onPauseResume={pauseOrResumeSession}
        onQuestionMarkToggle={(questionIds) => {
          setMarkedQuestions((current) => {
            const shouldMark = questionIds.some((questionId) => !current[questionId]);
            const nextMarkedQuestions = { ...current };

            questionIds.forEach((questionId) => {
              if (shouldMark) {
                nextMarkedQuestions[questionId] = true;
              } else {
                delete nextMarkedQuestions[questionId];
              }
            });

            return nextMarkedQuestions;
          });
        }}
        onSubmit={async () => {
          await submitPractice(true);
        }}
        onToggleAudio={() => {
          setIsAudioPlaying((current) => !current);
        }}
        playbackRate={audioPlaybackRate}
        prepRemainingSeconds={prepRemainingSeconds}
        remainingSeconds={remainingSeconds}
        record={getCompletedPracticeRecord(getLatestPracticeRecord(activeTest.id, records))}
        test={activeTest}
      />
    );
  }

  return (
    <PageFrame
      eyebrow={`${module.name} module`}
      title={`${module.name} tests`}
      description={isListening ? 'Choose a listening test and enter the timed exam workspace with audio, notes, answer panels, and pause controls when the selected paper allows pausing.' : 'Choose a reading paper and enter the timed exam workspace with passage, answer panels, and pause controls when the selected paper allows pausing.'}
    >
      <section className="student-exam-selection-card">
        <div className="student-exam-selection-head">
          <div>
            <h2>Tasks list</h2>
            <p>Select one paper. Start creates a backend session; Submit sends answers to SmartIELTS.</p>
          </div>
          <span className="student-exam-status">Available x {tests.length}</span>
        </div>
        <div className="student-exam-list">
          {tests.map((test) => {
            const record = getCompletedPracticeRecord(getLatestPracticeRecord(test.id, records));
            const isSelected = test.id === selectedTest?.id;
            const isLocallyCompleted = completedTestIds.has(test.id);
            const statusLabel = isLocallyCompleted ? 'Completed' : getPracticeStatusLabel(record);
            const statusTone = isLocallyCompleted ? getStatusTone('submitted') : getStatusTone(record?.status ?? null);

            return (
              <article key={test.id} className={`student-exam-test-row ${isSelected ? 'student-exam-test-row-active' : ''}`}>
                <button className="student-exam-row-main" type="button" onClick={() => { setSelectedTestId(test.id); setEntryMessage(''); }}>
                  <span className={`student-exam-chip ${statusTone}`}>{statusLabel}</span>
                  <h3>{test.title}</h3>
                </button>
                <ModuleMetric label="Duration" value={formatClock(test.totalSeconds)} />
                <ModuleMetric label="Score" value={record ? `${record.totalScore}/${test.totalScore}` : `--/${test.totalScore}`} />
                <ModuleMetric label="Parts" value={String(test.parts.length)} />
                <ModuleMetric label="Preparation" value={formatClock(test.prepSeconds)} />
                <ModuleMetric label="Pause" value={test.allowPause ? 'Allowed' : 'Disabled'} />
                <div className="student-exam-row-actions">
                  <button className="student-exam-primary" type="button" disabled={startingTestId === test.id} onClick={() => openExam(test)}>
                    {startingTestId === test.id ? 'Opening...' : 'Enter paper'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageFrame>
  );
}

type StudentPracticeExamProps = {
  activePartNumber: number;
  answers: Record<string, PracticeAnswerValue>;
  draftLines: Record<string, string>;
  markedQuestions: Record<string, boolean>;
  isAudioPlaying: boolean;
  isListening: boolean;
  isPaused: boolean;
  isSessionActionPending: boolean;
  isSubmitted: boolean;
  moduleName: string;
  notePage: number;
  notes: Record<string, string>;
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  onAudioRateChange: (value: number) => void;
  onBackToList: () => void;
  onDraftLineChange: (lineKey: string, value: string) => void;
  onExit: () => void;
  onNoteChange: (questionNumber: number, value: string) => void;
  onNotePageChange: (nextPage: number) => void;
  onPartChange: (partNumber: number) => void;
  onPauseResume: () => void;
  onQuestionMarkToggle: (questionIds: string[]) => void;
  onSubmit: () => void;
  onToggleAudio: () => void;
  playbackRate: number;
  prepRemainingSeconds: number;
  remainingSeconds: number;
  record: PracticeRecord | null;
  test: PracticeTestDetail;
};

function StudentPracticeExam(props: StudentPracticeExamProps) {
  const {
    activePartNumber,
    answers,
    draftLines,
    markedQuestions,
    isAudioPlaying,
    isListening,
    isPaused,
    isSessionActionPending,
    isSubmitted,
    moduleName,
    notePage,
    notes,
    onAnswerChange,
    onAudioRateChange,
    onBackToList,
    onDraftLineChange,
    onExit,
    onNoteChange,
    onNotePageChange,
    onPartChange,
    onPauseResume,
    onQuestionMarkToggle,
    onSubmit,
    onToggleAudio,
    playbackRate,
    prepRemainingSeconds,
    remainingSeconds,
    test,
  } = props;
  const activePart = test.parts.find((part) => part.partNumber === activePartNumber) ?? test.parts[0];
  const groups = getPartGroups(test, activePart.partNumber);
  const questions = getPartQuestions(test, activePart.partNumber);
  const primaryGroup = groups[0];
  const jumpToQuestion = (question: PracticeQuestion) => {
    onPartChange(questionPartNumber(test, question));
    window.setTimeout(() => {
      document.getElementById(`student-question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  if (isSubmitted) {
    return <StudentExamResult detail={`${test.title} is complete. The attempt was submitted to SmartIELTS.`} onBackToList={onBackToList} title="Exam Submitted" />;
  }

  return (
    <section className={`student-exam-page ${isListening ? 'student-exam-page-listening' : 'student-exam-page-reading'}`}>
      <StudentExamTop
        isPauseDisabled={!test.allowPause}
        moduleName={moduleName}
        onExit={onExit}
        onPauseResume={onPauseResume}
        onSubmit={onSubmit}
        pauseButtonLabel={isPaused ? 'Resume' : 'Pause'}
        pauseLabel={isSessionActionPending ? 'Syncing' : isPaused ? 'Paused' : test.allowPause ? 'Pause allowed' : 'No pause'}
        scoreLabel={String(test.totalScore)}
        submitLabel={test.timerMode === 'COUNTDOWN' ? (test.autoSubmit ? 'Auto at 00:00' : 'Manual') : 'Manual'}
        timerModeLabel={test.timerMode === 'COUNTDOWN' ? 'Countdown' : 'None'}
        title={test.title}
      />
      {isListening ? (
        <ListeningExamBody activePartNumber={activePart.partNumber} answers={answers} draftLines={draftLines} isAudioPlaying={isAudioPlaying} markedQuestions={markedQuestions} notePage={notePage} notes={notes} onAnswerChange={onAnswerChange} onAudioRateChange={onAudioRateChange} onDraftLineChange={onDraftLineChange} onNoteChange={onNoteChange} onNotePageChange={onNotePageChange} onPartChange={onPartChange} onQuestionMarkToggle={onQuestionMarkToggle} onToggleAudio={onToggleAudio} playbackRate={playbackRate} prepRemainingSeconds={prepRemainingSeconds} questions={questions} remainingSeconds={remainingSeconds} test={test} />
      ) : (
        <>
          <ReadingExamTopBar activePartNumber={activePart.partNumber} onPartChange={onPartChange} parts={test.parts} prepRemainingSeconds={prepRemainingSeconds} remainingSeconds={remainingSeconds} timerMode={test.timerMode} />
          <section className="student-exam-split">
            <aside className="student-exam-pane student-exam-passage-pane">
              <article className="student-exam-card student-reading-passage-card">
                <h3>{primaryGroup?.passageTitle ?? primaryGroup?.title ?? activePart.title}</h3>
                {formatPracticePassageParagraphs(String(primaryGroup?.passageContent ?? 'No passage material is attached to this test yet.')).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </article>
            </aside>
            <div className="student-exam-divider" aria-hidden="true" />
            <main className="student-exam-pane student-exam-question-pane">
              <StudentExamQuestionPanel answers={answers} displayMode="list" markedQuestions={markedQuestions} notes={notes} onAnswerChange={onAnswerChange} onQuestionMarkToggle={onQuestionMarkToggle} questions={questions} />
            </main>
          </section>
        </>
      )}
      <StudentExamQuestionNav answers={answers} markedQuestions={markedQuestions} questions={questions} onQuestionSelect={jumpToQuestion} />
    </section>
  );
}

function StudentExamTop({
  isPauseDisabled,
  moduleName,
  onExit,
  onPauseResume,
  onSubmit,
  pauseButtonLabel,
  pauseLabel,
  scoreLabel,
  submitLabel,
  timerModeLabel,
  title,
}: {
  isPauseDisabled: boolean;
  moduleName: string;
  onExit: () => void;
  onPauseResume: () => void;
  onSubmit: () => void;
  pauseButtonLabel: string;
  pauseLabel: string;
  scoreLabel: string;
  submitLabel: string;
  timerModeLabel: string;
  title: string;
}) {
  return (
    <header className="student-exam-top">
      <div className="student-exam-title">
        <button className="student-exam-ghost" type="button" onClick={onExit}>Exit Exam</button>
        <div><span>{moduleName}</span><h2>{title}</h2></div>
      </div>
      <div className="student-exam-info">
        <ModuleMetric label="Total score" value={scoreLabel} />
        <ModuleMetric label="Time mode" value={timerModeLabel} />
        <ModuleMetric label="Submit Rule" value={submitLabel} />
        <ModuleMetric label="Pause" value={pauseLabel} />
      </div>
      <div className="student-exam-actions">
        <button className="student-exam-ghost" type="button" disabled={isPauseDisabled} onClick={onPauseResume}>{pauseButtonLabel}</button>
        <button className="student-exam-primary" type="button" onClick={onSubmit}>Submit</button>
      </div>
    </header>
  );
}

function StudentExamSubnav({ activePartNumber, labelPrefix, onPartChange, parts, prepRemainingSeconds, remainingSeconds }: { activePartNumber: number; labelPrefix: string; onPartChange: (partNumber: number) => void; parts: PracticePart[]; prepRemainingSeconds: number; remainingSeconds: number }) {
  return (
    <nav className="student-exam-subnav">
      <div className="student-exam-tabs">
        {parts.map((part, index) => (
          <button key={part.partNumber} className={`student-exam-tab ${part.partNumber === activePartNumber ? 'student-exam-tab-active' : ''}`} type="button" onClick={() => onPartChange(part.partNumber)}>{labelPrefix} {index + 1}</button>
        ))}
      </div>
      <div className="student-exam-subnav-center">
              {prepRemainingSeconds > 0 && <span className="student-exam-prep"><span>Preparation</span><strong>{formatClock(prepRemainingSeconds)}</strong></span>}
              <span className="student-exam-timer">{formatClock(remainingSeconds)}</span>
      </div>
      <div />
    </nav>
  );
}

function ReadingExamTopBar({
  activePartNumber,
  onPartChange,
  parts,
  prepRemainingSeconds,
  remainingSeconds,
  timerMode,
}: {
  activePartNumber: number;
  onPartChange: (partNumber: number) => void;
  parts: PracticePart[];
  prepRemainingSeconds: number;
  remainingSeconds: number;
  timerMode: string;
}) {
  return (
    <div className="student-exam-listening-top student-exam-reading-timers-top">
      <div className="student-exam-tabs">
        {parts.map((part, index) => (
          <button
            key={part.partNumber}
            className={`student-exam-tab ${part.partNumber === activePartNumber ? 'student-exam-tab-active' : ''}`}
            type="button"
            onClick={() => onPartChange(part.partNumber)}
          >
            Passage {index + 1}
          </button>
        ))}
      </div>
      <div className="student-exam-listening-timers">
        {timerMode === 'COUNTDOWN' ? (
          <>
            <span className="student-exam-prep"><span>Preparation</span><strong>{formatClock(prepRemainingSeconds)}</strong></span>
            <span className="student-exam-timer">{formatClock(remainingSeconds)}</span>
          </>
        ) : (
          <span className="student-exam-timer student-exam-timer-none">No timer</span>
        )}
      </div>
      <div className="student-exam-reading-timer-spacer" />
    </div>
  );
}

function ListeningExamBody({ activePartNumber, answers, draftLines, isAudioPlaying, markedQuestions, notePage, notes, onAnswerChange, onAudioRateChange, onDraftLineChange, onNoteChange, onNotePageChange, onPartChange, onQuestionMarkToggle, onToggleAudio, playbackRate, prepRemainingSeconds, questions, remainingSeconds, test }: { activePartNumber: number; answers: Record<string, PracticeAnswerValue>; draftLines: Record<string, string>; isAudioPlaying: boolean; markedQuestions: Record<string, boolean>; notePage: number; notes: Record<string, string>; onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void; onAudioRateChange: (value: number) => void; onDraftLineChange: (lineKey: string, value: string) => void; onNoteChange: (questionNumber: number, value: string) => void; onNotePageChange: (nextPage: number) => void; onPartChange: (partNumber: number) => void; onQuestionMarkToggle: (questionIds: string[]) => void; onToggleAudio: () => void; playbackRate: number; prepRemainingSeconds: number; questions: PracticeQuestion[]; remainingSeconds: number; test: PracticeTestDetail }) {
  const activePart = test.parts.find((part) => part.partNumber === activePartNumber) ?? test.parts[0];
  const activeGroups = getPartGroups(test, activePart.partNumber);
  const activeAudio = test.partGroupAudios?.find((audio) => activeGroups.some((group) => group.id === Number(audio.partGroupId))) ?? test.testAudio;

  return (
    <section className="student-exam-listening-layout admin-student-listening-preview">
      <div className="student-exam-listening-top admin-student-listening-preview-top">
        <div className="student-exam-tabs">
          {test.parts.map((part, index) => (
            <button
              key={part.partNumber}
              className={`student-exam-tab ${part.partNumber === activePartNumber ? 'student-exam-tab-active' : ''}`}
              type="button"
              onClick={() => onPartChange(part.partNumber)}
            >
              Task {index + 1}
            </button>
          ))}
        </div>
        <div className="student-exam-listening-timers">
          {test.timerMode === 'COUNTDOWN' ? (
            <>
              {prepRemainingSeconds > 0 && <span className="student-exam-prep"><span>Preparation</span><strong>{formatClock(prepRemainingSeconds)}</strong></span>}
              <span className="student-exam-timer">{formatClock(remainingSeconds)}</span>
            </>
          ) : (
            <span className="student-exam-timer student-exam-timer-none">No timer</span>
          )}
        </div>
        <AudioPlayerControl
          allowSeek={Boolean(test.allowAudioSeek)}
          className="student-exam-audio admin-audio-player"
          durationSeconds={activeAudio?.durationSeconds ?? 0}
          isPlaying={isAudioPlaying}
          playbackRate={playbackRate}
          showSpeedMenu={false}
          showVolume={false}
          showWaveform={false}
          src={activeAudio?.audioUrl}
          title={activeAudio?.title ?? 'Listening tape'}
          onPlayingChange={onToggleAudio}
          onRateChange={onAudioRateChange}
        />
      </div>
      <section className="student-exam-listening-body admin-student-listening-reading-format">
        <ListeningPreviewNotes
          draftLines={draftLines}
          notePage={notePage}
          notes={notes}
          questions={questions}
          onDraftLineChange={onDraftLineChange}
          onNoteChange={onNoteChange}
          onNotePageChange={(nextPage) => onNotePageChange(Math.max(0, nextPage))}
        />
        <div className="student-exam-divider" aria-hidden="true" />
        <main className="student-exam-listening-answers admin-student-listening-answer-pane">
          <StudentExamQuestionPanel answers={answers} displayMode="list" markedQuestions={markedQuestions} notes={notes} onAnswerChange={onAnswerChange} onQuestionMarkToggle={onQuestionMarkToggle} questions={questions} />
        </main>
      </section>
    </section>
  );
}

function questionPartNumber(test: PracticeTestDetail, question: PracticeQuestion) {
  const group = test.partGroups.find((item) => item.id === question.partGroupId);
  return group?.partNumber ?? Math.max(1, Math.ceil(question.questionNumber / 10));
}

function asSessionRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readSessionSeconds(source: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const rawValue = source[key];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const seconds = Number(rawValue);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds;
    }
  }

  return fallback;
}

function StudentExamResult({ detail, onBackToList, title }: { detail: string; onBackToList: () => void; title: string }) {
  return (
    <section className="student-exam-page student-exam-result-page">
      <div className="student-exam-result">
        <span className="student-exam-status">Submitted</span>
        <h2>{title}</h2>
        <p>{detail}</p>
        <button className="student-exam-primary" type="button" onClick={onBackToList}>Back to List</button>
      </div>
    </section>
  );
}

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ModuleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/70 p-3 ring-1 ring-black/5">
      <div className="text-[0.68rem] font-bold tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function getStatusTone(status: string | null) {
  if (status === 'submitted' || status === 'auto_submitted' || status === 'SUCCESS' || status === 'SCORED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'in_progress' || status === 'paused' || status === 'PENDING' || status === 'IN_PROGRESS') return 'bg-amber-100 text-amber-800';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}
