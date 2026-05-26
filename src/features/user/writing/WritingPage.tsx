import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import { getApiErrorMessage } from '../../../api/errors';
import { writingApi } from '../../../api/writingApi';
import { useAsyncActionLock } from '../../../hooks/useInteractionGuard';
import { validateSelectedFiles } from '../../../lib';
import { DEFAULT_PREP_SECONDS, formatClock, formatUiLabel, normalizeApiList } from '../practice';
import {
  getLatestWritingRecord,
  getWritingStatusLabel,
  mapApiWritingQuestion,
  splitWritingFiles,
  wordCount,
} from './writingModel';
import type { WritingQuestion, WritingRecord } from './writingModel';

const writingRecords: WritingRecord[] = [];
const WRITING_MAX_FILES = 10;
const WRITING_MAX_FILE_BYTES = 10 * 1024 * 1024;
const WRITING_ACCEPTED_FILE_TYPES = ['image/*', 'application/pdf', '.pdf'];
const WRITING_MIXED_INPUT_MESSAGE = 'Choose one answer format only: typed text, image upload, or PDF upload.';
type WritingTaskFilter = 'All' | WritingQuestion['taskType'];
const WRITING_TASK_FILTERS: WritingTaskFilter[] = ['All', 'TASK_1', 'TASK_2'];

export function WritingPage() {
  const [questions, setQuestions] = useState<WritingQuestion[]>([]);
  const [activeTaskFilter, setActiveTaskFilter] = useState<WritingTaskFilter>('All');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [activeExamQuestionId, setActiveExamQuestionId] = useState<number | null>(null);
  const [prepRemainingSeconds, setPrepRemainingSeconds] = useState(DEFAULT_PREP_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [entryMessage, setEntryMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null;
  const selectedRecord = selectedQuestion ? getLatestWritingRecord(selectedQuestion.id, writingRecords) : null;
  const isExamOpen = Boolean(selectedQuestion && activeExamQuestionId === selectedQuestion.id);
  const validateWritingInputMode = (text: string, selectedFiles: File[]) => {
    if (text.trim() && selectedFiles.length) {
      return WRITING_MIXED_INPUT_MESSAGE;
    }

    const hasImage = selectedFiles.some(isImageFile);
    const hasPdf = selectedFiles.some(isPdfFile);
    return hasImage && hasPdf ? WRITING_MIXED_INPUT_MESSAGE : '';
  };

  const submitWritingAnswer = useAsyncActionLock(async () => {
    if (!selectedQuestion) {
      return;
    }

    if (!answerText.trim() && files.length === 0) {
      setEntryMessage('Enter an answer or attach an image/PDF before submitting.');
      return;
    }

    const fileError = validateSelectedFiles(files, {
      acceptedTypes: WRITING_ACCEPTED_FILE_TYPES,
      maxBytes: WRITING_MAX_FILE_BYTES,
      maxFiles: WRITING_MAX_FILES,
    });
    const modeError = validateWritingInputMode(answerText, files);

    if (fileError) {
      setEntryMessage(fileError);
      return;
    }

    if (modeError) {
      setEntryMessage(modeError);
      return;
    }

    try {
      setIsSubmitting(true);
      const { images, pdf } = splitWritingFiles(files);
      await writingApi.submit(selectedQuestion.id, {
        images,
        pdf,
        textContent: answerText,
      });
      setIsSubmitted(true);
      setEntryMessage(`${selectedQuestion.title} submitted.`);
    } catch (error) {
      setEntryMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  const loadWritingQuestions = useCallback((taskFilter: WritingTaskFilter) => {
    setEntryMessage('Loading writing questions...');
    writingApi.listQuestions(taskFilter === 'All' ? {} : { taskType: taskFilter })
      .then((result) => {
        const mappedQuestions = normalizeApiList(result).map(mapApiWritingQuestion);
        setQuestions(mappedQuestions);
        setSelectedQuestionId((current) => {
          if (current && mappedQuestions.some((question) => question.id === current)) {
            return current;
          }

          return mappedQuestions[0]?.id ?? null;
        });
        setEntryMessage(mappedQuestions.length ? '' : 'No writing questions are available.');
      })
      .catch((error) => {
        setQuestions([]);
        setSelectedQuestionId(null);
        setEntryMessage(getApiErrorMessage(error));
      });
  }, []);

  useEffect(() => {
    loadWritingQuestions(activeTaskFilter);
  }, [activeTaskFilter, loadWritingQuestions]);

  useEffect(() => {
    if (!isExamOpen || isSubmitted || isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPrepRemainingSeconds((currentPrep) => {
        if (currentPrep > 0) {
          return Math.max(0, currentPrep - 1);
        }

        setRemainingSeconds((current) => Math.max(0, current - 1));
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isExamOpen, isSubmitted, isPaused]);

  const openWritingExam = (question: WritingQuestion) => {
    const record = getLatestWritingRecord(question.id, writingRecords);

    setSelectedQuestionId(question.id);
    setActiveExamQuestionId(question.id);
    setPrepRemainingSeconds(question.prepSeconds);
    setRemainingSeconds(question.totalSeconds);
    setIsSubmitted(false);
    setIsPaused(false);
    setAnswerText(record?.answerPreview ?? '');
    setFiles([]);
    setEntryMessage('');
  };

  if (isExamOpen && selectedQuestion) {
    return (
      <WritingExamWorkspace
        answerText={answerText}
        files={files}
        isPaused={isPaused}
        isPrepActive={prepRemainingSeconds > 0}
        isSubmitted={isSubmitted}
        onAnswerChange={(value) => {
          if (files.length && value.trim()) {
            setEntryMessage(WRITING_MIXED_INPUT_MESSAGE);
            return;
          }

          setAnswerText(value);
          setEntryMessage('');
        }}
        onBackToList={() => {
          setActiveExamQuestionId(null);
          setEntryMessage(`${selectedQuestion.title} closed.`);
        }}
        onExit={() => {
          setActiveExamQuestionId(null);
          setIsSubmitted(false);
          setIsPaused(false);
          setEntryMessage(`${selectedQuestion.title} exited. Draft changes were not submitted.`);
        }}
        onFilesChange={(selectedFiles) => {
          if (prepRemainingSeconds > 0) {
            setEntryMessage('Preparation time is active. You cannot upload files until answering starts.');
            return;
          }

          const nextFiles = selectedFiles;
          const combinedFiles = [...files, ...nextFiles];
          const fileError = validateSelectedFiles(combinedFiles, {
            acceptedTypes: WRITING_ACCEPTED_FILE_TYPES,
            maxBytes: WRITING_MAX_FILE_BYTES,
            maxFiles: WRITING_MAX_FILES,
          });
          const modeError = validateWritingInputMode(answerText, combinedFiles);

          if (fileError) {
            setEntryMessage(fileError);
            return;
          }

          if (modeError) {
            setEntryMessage(modeError);
            return;
          }

          setEntryMessage('');
          setFiles(combinedFiles);
        }}
        onRemoveFile={(index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
        onPrepBlocked={() => setEntryMessage(isPaused ? 'Exam is paused. Resume to continue.' : 'Preparation time is active. You cannot write or upload files until answering starts.')}
        onSubmit={submitWritingAnswer}
        onTogglePause={() => {
          if (!selectedQuestion.allowPause) {
            setEntryMessage('This writing exam does not allow pausing.');
            return;
          }

          setIsPaused((current) => {
            const nextPaused = !current;
            setEntryMessage(nextPaused ? 'Exam paused.' : 'Exam resumed.');
            return nextPaused;
          });
        }}
        isSubmitting={isSubmitting}
        question={selectedQuestion}
        prepRemainingSeconds={prepRemainingSeconds}
        record={selectedRecord}
        remainingSeconds={remainingSeconds}
        workspaceMessage={entryMessage}
      />
    );
  }

  return (
    <PageFrame
      eyebrow="Writing module"
      title="Writing questions"
      description="Choose a writing question and enter the full-screen exam workspace with prompt, answer, uploads, and word count."
    >
      <section className="student-exam-selection-card">
        <div className="student-exam-selection-head">
          <div>
            <h2>Tasks list</h2>
            <p>Task 1 and Task 2 are loaded from SmartIELTS. Text, image, and PDF answers submit as multipart data.</p>
          </div>
          <span className="student-exam-status">Available x {questions.length}</span>
        </div>
        {entryMessage && (
          <div className="mt-4 rounded bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {entryMessage}
          </div>
        )}
        <div className="mt-2 grid gap-3 rounded bg-[#f8f6ef] p-3">
          <FilterGroup label="Task">
            {WRITING_TASK_FILTERS.map((filter) => (
              <SegmentButton
                key={filter}
                active={activeTaskFilter === filter}
                onClick={() => setActiveTaskFilter(filter)}
              >
                {filter === 'All' ? 'All' : formatUiLabel(filter)}
              </SegmentButton>
            ))}
          </FilterGroup>
        </div>

        <div className="student-exam-list">
          {questions.map((question) => {
            const record = getLatestWritingRecord(question.id, writingRecords);
            const isSelected = question.id === selectedQuestion?.id;

            return (
              <article
                key={question.id}
                className={`student-exam-test-row student-exam-writing-row ${isSelected ? 'student-exam-test-row-active' : ''}`}
              >
                <button
                  className="student-exam-row-main"
                  type="button"
                  onClick={() => {
                    setSelectedQuestionId(question.id);
                    setEntryMessage('');
                  }}
                >
                  <span className={`student-exam-chip ${getStatusTone(record?.aiStatus ?? null)}`}>
                    {getWritingStatusLabel(record)}
                  </span>
                  <h3>{question.title}</h3>
                </button>
                <ModuleMetric label="Duration" value={formatClock(question.totalSeconds)} />
                <ModuleMetric label="Words" value={getWritingExpectedWordsLabel(question)} />
                <ModuleMetric label="Chart" value={getWritingChartLabel(question)} />
                <ModuleMetric label="Preparation" value={formatClock(question.prepSeconds)} />
                <div className="student-exam-row-actions">
                  <button className="student-exam-primary" type="button" onClick={() => openWritingExam(question)}>
                    {record?.aiStatus === 'PENDING' ? 'Resume exam' : 'Start exam'}
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

export function WritingExamWorkspace({
  answerText,
  backLabel = 'Back',
  className = '',
  files,
  isPaused,
  isPrepActive,
  isSubmitting,
  isSubmitted,
  onAnswerChange,
  onBackToList,
  onExit,
  onFilesChange,
  onRemoveFile,
  onPrepBlocked,
  onSubmit,
  onTogglePause,
  previewMode = false,
  prepRemainingSeconds,
  question,
  remainingSeconds,
  workspaceMessage,
}: {
  answerText: string;
  backLabel?: string;
  className?: string;
  files: File[];
  isPaused: boolean;
  isPrepActive: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onAnswerChange: (value: string) => void;
  onBackToList: () => void;
  onExit: () => void;
  onFilesChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onPrepBlocked: () => void;
  onSubmit: () => void;
  onTogglePause: () => void;
  previewMode?: boolean;
  prepRemainingSeconds: number;
  question: WritingQuestion;
  record: WritingRecord | null;
  remainingSeconds: number;
  workspaceMessage: string;
}) {
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [expandedPromptImage, setExpandedPromptImage] = useState<WritingQuestion['images'][number] | null>(null);
  const uploadedPreviews = useMemo(() => files.map((file, index) => ({
    file,
    index,
    isImage: isImageFile(file),
    isPdf: isPdfFile(file),
    url: URL.createObjectURL(file),
  })), [files]);
  const isInputLocked = isPrepActive || isPaused;

  useEffect(() => () => {
    uploadedPreviews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [uploadedPreviews]);

  if (isSubmitted) {
    return (
      <StudentExamResult
        detail={`${question.title} is complete. The submitted answer contains ${wordCount(answerText)} words and ${files.length} attachment(s).`}
        onBackToList={onBackToList}
        title="Writing Answer Submitted"
      />
    );
  }

  const writingLayout = (
    <section className="student-exam-writing-layout">
      <aside className="student-exam-pane student-exam-prompt-pane">
        <article className="student-exam-card">
          <span className="student-exam-status">
            {question.taskType === 'TASK_1' && question.chartType
              ? question.chartType
              : formatUiLabel(question.taskType)}
          </span>
          <h3>{question.title}</h3>
          <p>{question.description}</p>
          {question.images.length > 0 ? (
            <div className="student-exam-writing-images">
              {question.images.map((image) => (
                <button
                  key={image.objectKey}
                  className="student-exam-writing-image-button"
                  type="button"
                  onClick={() => setExpandedPromptImage(image)}
                >
                  <img alt={`${question.title} visual ${image.sortOrder}`} src={image.url} />
                </button>
              ))}
            </div>
          ) : (
            <p className="student-exam-muted">Give reasons for your answer and include relevant examples.</p>
          )}
        </article>
      </aside>
      <main className="student-exam-pane student-exam-answer-pane">
        <article className="student-exam-card">
          <h3>Answer</h3>
          <p className="student-exam-muted">
            {isPrepActive
              ? 'You may read the prompt during preparation. Press Start answering to unlock the answer box.'
              : isPaused
                ? 'The exam is paused. Resume to continue writing or uploading files.'
              : 'Type or paste text here. Image and PDF attachments are supported.'}
          </p>
          <textarea
            className="student-exam-writing-box"
            readOnly={isInputLocked}
            disabled={files.length > 0}
            onFocus={() => {
              if (isInputLocked) {
                onPrepBlocked();
              }
            }}
            onMouseDown={(event) => {
              if (isInputLocked) {
                event.preventDefault();
                onPrepBlocked();
              }
            }}
            onChange={(event) => onAnswerChange(event.target.value)}
            onPaste={(event) => {
              const pastedFiles = Array.from(event.clipboardData.files ?? []);
              if (pastedFiles.length) {
                event.preventDefault();
                onFilesChange(pastedFiles);
              }
            }}
            placeholder="Start writing here..."
            onClick={() => {
              if (isInputLocked) {
                onPrepBlocked();
              }
            }}
            value={answerText}
          />
          <div className="student-exam-writing-meta">
            <span>Words: <strong>{wordCount(answerText)}</strong></span>
            <span>Expected: {getWritingExpectedWordsLabel(question)}</span>
          </div>
          {workspaceMessage && (
            <div className="mt-4 rounded bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              {workspaceMessage}
            </div>
          )}
          <label className="student-exam-dropzone">
            <strong>Drop images or PDF here</strong>
            <span>{isInputLocked ? 'Writing is currently locked' : 'Or choose files'}</span>
            <input
              accept="image/*,.pdf,application/pdf"
              disabled={isInputLocked}
              multiple
              onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          <div className="student-exam-file-preview-list">
            {uploadedPreviews.length ? uploadedPreviews.map((item) => (
              <article key={`${item.file.name}-${item.index}`} className="student-exam-file-preview-card">
                <div className="student-exam-file-preview-head">
                  <strong>{item.file.name}</strong>
                  <button type="button" onClick={() => onRemoveFile(item.index)} aria-label={`Remove ${item.file.name}`}>Remove</button>
                </div>
                {item.isImage && (
                  <>
                    <button
                      className="student-exam-uploaded-image-button"
                      type="button"
                      onClick={() => setExpandedImageIndex(item.index)}
                    >
                      <img alt={item.file.name} src={item.url} />
                    </button>
                    {expandedImageIndex === item.index && (
                      <div className="student-exam-uploaded-image-expanded" role="presentation" onClick={() => setExpandedImageIndex(null)}>
                        <img alt={item.file.name} src={item.url} onClick={(event) => event.stopPropagation()} />
                      </div>
                    )}
                  </>
                )}
                {item.isPdf && (
                  <iframe className="student-exam-uploaded-pdf" src={item.url} title={item.file.name} />
                )}
              </article>
            )) : <span className="student-exam-muted">No files attached.</span>}
          </div>
        </article>
      </main>
      {expandedPromptImage && (
        <ZoomableWritingImagePreview
          alt={`${question.title} visual ${expandedPromptImage.sortOrder}`}
          onClose={() => setExpandedPromptImage(null)}
          src={expandedPromptImage.url}
        />
      )}
    </section>
  );

  if (previewMode) {
    return (
      <section className={`student-exam-page student-exam-page-writing student-exam-page-preview ${className}`}>
        <div className="student-exam-preview-head">
          <button className="student-exam-ghost" type="button" onClick={onExit}>{backLabel}</button>
        </div>
        {writingLayout}
      </section>
    );
  }

  return (
    <section className={`student-exam-page student-exam-page-writing ${className}`}>
      <StudentExamTop
        moduleName="Writing"
        onExit={onExit}
        onPause={onTogglePause}
        onSubmit={onSubmit}
        pauseAllowed={question.allowPause}
        pauseLabel={question.allowPause ? 'Pause allowed' : 'No pause'}
        isPaused={isPaused}
        submitLabel="Multipart submit"
        title={question.title}
        isSubmitting={isSubmitting}
      />
      <StudentExamSubnav
        activePartNumber={1}
        labelPrefix="Task"
        onPartChange={() => undefined}
        parts={[{
          partNumber: 1,
          title: question.title,
          displayOrder: 1,
          groups: [question.taskType === 'TASK_1' && question.chartType ? question.chartType : formatUiLabel(question.taskType)],
        }]}
        prepRemainingSeconds={prepRemainingSeconds}
        remainingSeconds={remainingSeconds}
      />
      {writingLayout}
    </section>
  );
}

function ZoomableWritingImagePreview({ alt, onClose, src }: { alt: string; onClose: () => void; src: string }) {
  const [zoom, setZoom] = useState(1);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 0.12 : -0.12;
    setZoom((current) => Math.min(4, Math.max(0.5, Number((current + direction).toFixed(2)))));
  };

  return (
    <div
      className="student-exam-uploaded-image-expanded student-exam-zoomable-image-expanded"
      role="presentation"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <img
        alt={alt}
        src={src}
        style={{ transform: `scale(${zoom})` }}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

type ExamPart = {
  partNumber: number;
  title: string;
  displayOrder: number;
  groups: string[];
};

function StudentExamTop({
  isPaused,
  moduleName,
  onExit,
  onPause,
  onSubmit,
  pauseAllowed,
  pauseLabel,
  submitLabel,
  title,
  isSubmitting,
}: {
  isSubmitting: boolean;
  isPaused: boolean;
  moduleName: string;
  onExit: () => void;
  onPause: () => void;
  onSubmit: () => void;
  pauseAllowed: boolean;
  pauseLabel: string;
  submitLabel: string;
  title: string;
}) {
  return (
    <header className="student-exam-top">
      <div className="student-exam-title">
        <button className="student-exam-ghost" type="button" onClick={onExit}>Exit Exam</button>
        <div>
          <span>{moduleName}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="student-exam-info student-exam-info-writing">
        <ModuleMetric label="Submit Rule" value={submitLabel} />
        <ModuleMetric label="Pause" value={pauseLabel} />
      </div>
      <div className="student-exam-actions">
        <button
          className="student-exam-ghost"
          type="button"
          disabled={!pauseAllowed || isSubmitting}
          onClick={onPause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="student-exam-primary" type="button" disabled={isSubmitting || isPaused} onClick={onSubmit}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </header>
  );
}

function StudentExamSubnav({
  activePartNumber,
  labelPrefix,
  onPartChange,
  parts,
  prepRemainingSeconds,
  remainingSeconds,
}: {
  activePartNumber: number;
  labelPrefix: string;
  onPartChange: (partNumber: number) => void;
  parts: ExamPart[];
  prepRemainingSeconds: number;
  remainingSeconds: number;
}) {
  return (
    <nav className="student-exam-subnav">
      <div className="student-exam-tabs">
        {parts.map((part, index) => (
          <button
            key={part.partNumber}
            className={`student-exam-tab ${part.partNumber === activePartNumber ? 'student-exam-tab-active' : ''}`}
            type="button"
            onClick={() => onPartChange(part.partNumber)}
          >
            {labelPrefix} {index + 1}
          </button>
        ))}
      </div>
      <div className="student-exam-subnav-center">
        {prepRemainingSeconds > 0 && (
          <span className="student-exam-prep"><span>Preparation</span><strong>{formatClock(prepRemainingSeconds)}</strong></span>
        )}
        <span className="student-exam-timer">{formatClock(remainingSeconds)}</span>
      </div>
      <div />
    </nav>
  );
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

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">
          {eyebrow}
        </p>
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
      <div className="text-[0.68rem] font-bold tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex min-w-0 flex-nowrap items-center gap-3 whitespace-nowrap">
      <span className="shrink-0 text-sm font-bold tracking-wide text-slate-500">{label}</span>
      <div className="flex min-h-10 min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">{children}</div>
    </label>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`h-10 shrink-0 rounded px-3 text-base font-bold transition ${
        active ? 'bg-[#e56a2e] text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-[#fff1e8]'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getWritingChartLabel(question: WritingQuestion) {
  if (question.chartType) {
    return question.chartType;
  }

  return question.taskType === 'TASK_1' ? 'Chart' : 'Essay';
}

function getWritingExpectedWordsLabel(question: WritingQuestion) {
  return `(around ${question.expectedWords})`;
}

function getStatusTone(status: string | null) {
  if (status === 'submitted' || status === 'auto_submitted' || status === 'SUCCESS' || status === 'SCORED') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'in_progress' || status === 'paused' || status === 'PENDING' || status === 'IN_PROGRESS') {
    return 'bg-amber-100 text-amber-800';
  }

  if (status === 'FAILED') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-slate-100 text-slate-600';
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
