import { useEffect, useState } from 'react';
import type { WheelEvent } from 'react';
import { getApiErrorMessage } from '../../../api/errors';
import { recordsApi } from '../../../api/recordsApi';
import { AudioPlayerControl } from '../../../components/AudioPlayerControl';
import { StudentExamQuestionPanel } from '../../../components/exam/StudentExamQuestionPanel';
import type { ModuleType } from '../../../contracts/common';
import type { UserRecordDetailVO } from '../../../contracts/records';
import { formatUiLabel } from '../practice';
import type { PracticeQuestion, PracticeReviewAnswer } from '../practice';
import { wordCount } from '../writing';
import { mapApiRecordDetailToView } from './recordDetailModel';
import type { ExamRecordDetailView, RecordDetailView, WritingRecordPreviewAssetView } from './recordDetailModel';
import { moduleLabelToApi } from './recordsModel';
import type { UserRecord } from './recordsModel';

type RecordDetailPageProps = {
  loadRecordDetail?: (moduleType: ModuleType, recordId: number) => Promise<UserRecordDetailVO>;
  record: UserRecord;
  onExit: () => void;
};

type RecordDetailTabPart = {
  partNumber: number;
  title: string;
  passageTitle?: string;
  passageContent?: string;
  partGroupId?: number | null;
};

export function RecordDetailPage({
  loadRecordDetail = recordsApi.getRecordDetail,
  record,
  onExit,
}: RecordDetailPageProps) {
  const [detail, setDetail] = useState<RecordDetailView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage('');

    loadRecordDetail(moduleLabelToApi(record.module), record.id)
      .then((payload: UserRecordDetailVO) => {
        if (!cancelled) {
          setDetail(mapApiRecordDetailToView(payload));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDetail(null);
          setErrorMessage(getApiErrorMessage(error, 'Unable to load record detail.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record.id, record.module]);

  if (isLoading) {
    return (
      <section className="student-exam-page record-detail-page">
        <RecordDetailTop moduleName={record.module} onExit={onExit} score={record.score} title={record.title} />
        <div className="mx-auto max-w-4xl rounded bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-black/5">
          Loading record detail from SmartIELTS...
        </div>
      </section>
    );
  }

  if (errorMessage || !detail) {
    return (
      <section className="student-exam-page record-detail-page">
        <RecordDetailTop moduleName={record.module} onExit={onExit} score={record.score} title={record.title} />
        <div className="mx-auto max-w-4xl rounded bg-red-50 p-6 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {errorMessage || 'Unable to load record detail.'}
        </div>
      </section>
    );
  }

  if (detail.writing) {
    return <WritingRecordDetail detail={detail} onExit={onExit} />;
  }

  if (detail.speaking) {
    return <SpeakingRecordDetail detail={detail} onExit={onExit} />;
  }

  return <ExamRecordDetail detail={detail} onExit={onExit} />;
}

function ExamRecordDetail({
  detail,
  onExit,
}: {
  detail: RecordDetailView;
  onExit: () => void;
}) {
  const exam = detail.exam;
  const [activePartNumber, setActivePartNumber] = useState(exam?.parts[0]?.partNumber ?? 1);
  const activePart = exam?.parts.find((part) => part.partNumber === activePartNumber) ?? exam?.parts[0] ?? null;
  const allQuestions = dedupeRecordQuestions(exam?.questions ?? []);
  const activePartRange = getExamPartQuestionRange(detail.moduleLabel, activePartNumber, exam);
  const visibleQuestions = allQuestions.filter((question) => isQuestionInRange(question, activePartRange));
  const sourceQuestions = visibleQuestions.length ? visibleQuestions : allQuestions;
  const reviewQuestions = sourceQuestions.map(mapRecordQuestionToPracticeQuestion);
  const reviewAnswers = sourceQuestions.reduce<Record<string, PracticeReviewAnswer>>((items, question) => {
    items[String(question.id)] = {
      correctAnswer: question.correctAnswer,
      isCorrect: question.isCorrect,
      label: `Q${getRecordQuestionNumberLabel(question)}`,
      userAnswer: question.userAnswer,
    };
    return items;
  }, {});
  const reviewUserAnswers = sourceQuestions.reduce<Record<string, string | string[]>>((items, question) => {
    items[String(question.id)] = parseReviewAnswerValue(question.userAnswer, question.answerMode);
    return items;
  }, {});
  const isListeningReview = detail.moduleLabel === 'Listening';
  const activeAudio = isListeningReview
    ? findListeningSectionAudio(exam, activePartNumber, activePart?.partGroupId ?? null)
    : null;
  const activePartScore = formatReviewScore(sourceQuestions, getQuestionRangeTotal(activePartRange));
  const fullExamScore = formatReviewScore(allQuestions, getExamQuestionTotal(detail.moduleLabel, exam, allQuestions));

  return (
    <section className={`student-exam-page record-detail-page ${detail.moduleLabel === 'Listening' ? 'student-exam-page-listening' : 'student-exam-page-reading'}`}>
      <ExamRecordReviewTop
        activePartLabel={`${isListeningReview ? 'Section' : 'Passage'} ${activePartNumber}`}
        activePartScore={activePartScore}
        fullExamScore={fullExamScore}
        moduleName={detail.moduleLabel}
        onExit={onExit}
        title={detail.title}
      />
      <>
        <ExamReviewPartTopBar
          activeAudio={activeAudio}
          activePartNumber={activePartNumber}
          allowAudioSeek={Boolean(exam?.allowAudioSeek)}
          labelPrefix={isListeningReview ? 'Section' : 'Passage'}
          onPartChange={setActivePartNumber}
          parts={exam?.parts.length ? exam.parts : [{ partNumber: 1, title: isListeningReview ? 'Section 1' : 'Part 1', passageTitle: isListeningReview ? 'Section 1' : 'Part 1', passageContent: '', partGroupId: null }]}
          title={exam?.testTitle ?? detail.title}
        />
        <section className="student-exam-split">
          <>
            <aside className="student-exam-pane student-exam-passage-pane">
              <article className="student-exam-card student-reading-passage-card">
                <h3>{activePart?.passageTitle || activePart?.title || exam?.testTitle || detail.title}</h3>
                {isListeningReview ? (
                  <>
                    {activeAudio?.transcriptText || activePart?.passageContent ? (
                      <div className="record-detail-transcript">
                        {(activeAudio?.transcriptText || activePart?.passageContent || '').split(/\n{2,}|\r?\n/).filter(Boolean).map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    ) : (
                      <p>No audio transcript is attached to this record yet.</p>
                    )}
                  </>
                ) : activePart?.passageContent ? (
                  activePart.passageContent.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
                ) : (
                  <p>No passage material is attached to this record yet.</p>
                )}
              </article>
            </aside>
            <div className="student-exam-divider" aria-hidden="true" />
          </>
          <main className="student-exam-pane student-exam-question-pane">
            <StudentExamQuestionPanel
              answers={reviewUserAnswers}
              displayMode="list"
              onAnswerChange={() => undefined}
              previewMode
              questions={reviewQuestions}
              reviewAnswers={reviewAnswers}
            />
          </main>
        </section>
      </>
    </section>
  );
}

function ExamRecordReviewTop({
  activePartLabel,
  activePartScore,
  fullExamScore,
  moduleName,
  onExit,
  title,
}: {
  activePartLabel: string;
  activePartScore: string;
  fullExamScore: string;
  moduleName: string;
  onExit: () => void;
  title: string;
}) {
  return (
    <header className="student-exam-top record-detail-exam-top">
      <div className="student-exam-title">
        <button className="student-exam-ghost" type="button" onClick={onExit}>Exit Page</button>
        <div><span>{moduleName}</span><h2>{title}</h2></div>
      </div>
      <div className="student-exam-info">
        <ModuleMetric label={activePartLabel} value={activePartScore} />
        <ModuleMetric label="Full exam" value={fullExamScore} />
      </div>
    </header>
  );
}

function ExamReviewPartTopBar({
  activeAudio,
  activePartNumber,
  allowAudioSeek,
  labelPrefix,
  onPartChange,
  parts,
  title,
}: {
  activeAudio?: ExamRecordDetailView['partGroupAudios'][number] | null;
  activePartNumber: number;
  allowAudioSeek?: boolean;
  labelPrefix: 'Passage' | 'Section';
  onPartChange: (partNumber: number) => void;
  parts: RecordDetailTabPart[];
  title?: string;
}) {
  return (
    <div className="student-exam-listening-top student-exam-reading-timers-top record-detail-reading-topbar">
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
      <div />
      {labelPrefix === 'Section' ? (
        <AudioPlayerControl
          allowSeek={Boolean(allowAudioSeek)}
          className="student-exam-audio admin-audio-player"
          durationSeconds={activeAudio?.durationSeconds ?? 0}
          showSpeedMenu={false}
          showVolume={false}
          showWaveform={false}
          src={activeAudio?.audioUrl ?? null}
          title={activeAudio?.title ?? title ?? 'Listening tape'}
        />
      ) : (
        <div className="student-exam-reading-timer-spacer" />
      )}
    </div>
  );
}

function WritingRecordDetail({
  detail,
  onExit,
}: {
  detail: RecordDetailView;
  onExit: () => void;
}) {
  const writing = detail.writing!;
  const [previewAsset, setPreviewAsset] = useState<WritingRecordPreviewAssetView | null>(null);
  const questionPreviewAssets = writing.previewAssets.filter((asset) => asset.sourceType === 'QUESTION_IMAGE');
  const answerPreviewAssets = writing.previewAssets.filter((asset) => asset.sourceType === 'ANSWER_ATTACHMENT');
  return (
    <section className="student-exam-page student-exam-page-writing record-detail-page">
      <RecordDetailTop moduleName="Writing" onExit={onExit} score={detail.scoreText} showScore={false} title={detail.title} />
      <section className="student-exam-writing-layout">
        <aside className="student-exam-pane student-exam-prompt-pane">
          <article className="student-exam-card">
            <span className="student-exam-status">
              {writing.chartType && writing.taskType === 'TASK_1' ? writing.chartType : formatUiLabel(writing.taskType)}
            </span>
            <h3>{writing.questionTitle}</h3>
            <p>{writing.questionDescription || 'No prompt description is available.'}</p>
            {writing.questionImages.length > 0 && (
              <div className="student-exam-writing-images">
                {writing.questionImages.map((image) => {
                  const asset = questionPreviewAssets.find((item) => item.objectKey === image.objectKey || item.fileUrl === image.url)
                    ?? {
                      sourceType: 'QUESTION_IMAGE',
                      fileType: 'IMAGE' as const,
                      fileName: `Question image ${image.sortOrder}`,
                      fileUrl: image.url,
                      objectKey: image.objectKey,
                      sortOrder: image.sortOrder,
                      label: `Question image ${image.sortOrder}`,
                      contentType: 'image/*',
                    };

                  return (
                    <button
                      key={image.objectKey}
                      className="student-exam-writing-image-button"
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <img alt={`${writing.questionTitle} visual ${image.sortOrder}`} src={image.url} />
                    </button>
                  );
                })}
              </div>
            )}
          </article>
          <article className="student-exam-card record-detail-ai-card">
            <span className="student-exam-status">{writing.aiStatus}</span>
            <h3>{writing.aiScore === null ? 'Pending' : writing.aiScore.toFixed(1)}</h3>
            <FormattedWritingAiFeedback text={writing.aiFeedback} />
          </article>
        </aside>
        <main className="student-exam-pane student-exam-answer-pane">
          <article className="student-exam-card">
            <h3>User answer</h3>
            <textarea className="student-exam-writing-box" readOnly value={writing.answerText} />
            <div className="student-exam-writing-meta">
              <span>Words: <strong>{wordCount(writing.answerText)}</strong></span>
              <span>Input: {writing.inputType}</span>
            </div>
            <WritingAnswerAttachmentList
              attachments={writing.attachments}
              previewAssets={answerPreviewAssets}
              onPreview={setPreviewAsset}
            />
          </article>
        </main>
      </section>
      {previewAsset && (
        <WritingRecordAssetPreview
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </section>
  );
}

function WritingAnswerAttachmentList({
  attachments,
  onPreview,
  previewAssets,
}: {
  attachments: NonNullable<RecordDetailView['writing']>['attachments'];
  onPreview: (asset: WritingRecordPreviewAssetView) => void;
  previewAssets: WritingRecordPreviewAssetView[];
}) {
  if (!attachments.length) {
    return <div className="student-exam-file-list"><span className="student-exam-muted">No files attached.</span></div>;
  }

  return (
    <div className="student-exam-file-preview-list student-exam-record-attachment-list">
      {attachments.map((attachment, index) => {
        const previewAsset = previewAssets.find((asset) => asset.fileUrl === attachment.fileUrl)
          ?? (attachment.fileUrl ? {
            sourceType: 'ANSWER_ATTACHMENT',
            fileType: attachment.fileType,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            objectKey: attachment.fileUrl,
            sortOrder: index + 1,
            label: attachment.fileName,
            contentType: attachment.contentType,
          } : null);

        return (
          <article key={`${attachment.fileName}-${attachment.fileUrl ?? index}`} className="student-exam-file-preview-card">
            <div className="student-exam-file-preview-head">
              <strong>{attachment.fileName}</strong>
              {previewAsset ? (
                <button type="button" onClick={() => onPreview(previewAsset)}>Preview</button>
              ) : (
                <span>{attachment.fileType}</span>
              )}
            </div>
            {previewAsset?.fileType === 'IMAGE' && (
              <button
                className="student-exam-uploaded-image-button"
                type="button"
                onClick={() => onPreview(previewAsset)}
              >
                <img alt={previewAsset.label} src={previewAsset.fileUrl} />
              </button>
            )}
            {previewAsset?.fileType === 'PDF' && (
              <button
                className="student-exam-uploaded-pdf-button"
                type="button"
                onClick={() => onPreview(previewAsset)}
              >
                <iframe className="student-exam-uploaded-pdf" src={previewAsset.fileUrl} title={previewAsset.label} />
              </button>
            )}
            {!previewAsset && <span className="student-exam-muted">No preview URL is attached.</span>}
          </article>
        );
      })}
    </div>
  );
}

function WritingRecordAssetPreview({ asset, onClose }: { asset: WritingRecordPreviewAssetView; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 0.12 : -0.12;
    setZoom((current) => Math.min(4, Math.max(0.5, Number((current + direction).toFixed(2)))));
  };

  return (
    <div
      className="student-exam-uploaded-image-expanded student-exam-zoomable-image-expanded writing-record-asset-expanded"
      role="presentation"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {asset.fileType === 'PDF' ? (
        <iframe
          className="writing-record-expanded-pdf"
          src={asset.fileUrl}
          style={{ transform: `scale(${zoom})` }}
          title={asset.label}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <img
          alt={asset.label}
          src={asset.fileUrl}
          style={{ transform: `scale(${zoom})` }}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}

function FormattedWritingAiFeedback({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return <p>AI feedback is still pending for this writing answer.</p>;
  }

  return (
    <div className="writing-ai-feedback">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`${paragraph}-${paragraphIndex}`}>
          {renderInlineFeedbackEmphasis(paragraph)}
        </p>
      ))}
    </div>
  );
}

function renderInlineFeedbackEmphasis(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function SpeakingRecordDetail({ detail, onExit }: { detail: RecordDetailView; onExit: () => void }) {
  const speaking = detail.speaking!;
  return (
    <section className="record-detail-page speaking-record-review-page">
      <RecordDetailTop moduleName="Speaking" onExit={onExit} score={detail.scoreText} title={detail.title} />
      <main className="speaking-record-review-body">
        <section className="speaking-record-overall">
          <div>
            <span className="student-exam-status">Overall score</span>
            <h2>{speaking.overallScore === null ? 'Pending' : speaking.overallScore.toFixed(1)}</h2>
          </div>
          <p>{speaking.feedback}</p>
        </section>
        <section className="speaking-record-part-list">
          {speaking.conversations.map((part) => (
            <article key={part.recordId} className="speaking-record-part-card">
              <div>
                <span className="student-exam-status">{formatUiLabel(part.part)}</span>
                <h3>{part.questionText || 'Speaking prompt'}</h3>
                {part.cueCard && <p>{part.cueCard}</p>}
              </div>
              {part.audioUrl ? (
                <AudioPlayerControl
                  className="student-exam-audio speaking-record-audio-player"
                  showSpeedMenu={false}
                  showVolume={false}
                  src={part.audioUrl}
                  title={part.questionText || 'Speaking answer'}
                />
              ) : (
                <p className="student-exam-muted">No audio file is attached.</p>
              )}
              <div className="speaking-record-part-feedback">
                <strong>AI score {part.overallScore === null ? 'Pending' : part.overallScore.toFixed(1)}</strong>
                <p>{part.feedback || part.transcript || 'No conversation feedback is available yet.'}</p>
              </div>
              <div className="speaking-record-part-bands">
                <ModuleMetric label="Fluency" value={formatBand(part.fluencyAndCoherence)} />
                <ModuleMetric label="Lexical" value={formatBand(part.lexicalResource)} />
                <ModuleMetric label="Grammar" value={formatBand(part.grammaticalRangeAndAccuracy)} />
                <ModuleMetric label="Pronunciation" value={formatBand(part.pronunciation)} />
              </div>
              <div className="speaking-record-comment-grid">
                <div>
                  <span>Reference comment</span>
                  <p>{part.relevanceComment || 'No reference comment is available.'}</p>
                </div>
                <div>
                  <span>Quality comment</span>
                  <p>{part.qualityComment || 'No quality comment is available.'}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </section>
  );
}

function RecordDetailTop({
  moduleName,
  onExit,
  score,
  showScore = true,
  title,
}: {
  moduleName: string;
  onExit: () => void;
  score: string;
  showScore?: boolean;
  title: string;
}) {
  return (
    <header className="record-detail-top">
      <button className="student-exam-ghost" type="button" onClick={onExit}>Exit Page</button>
      <div>
        <span>{moduleName} record</span>
        <h2>{title}</h2>
      </div>
      {showScore && <strong>{score}</strong>}
    </header>
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

function formatBand(value: number | null) {
  return value === null ? 'Pending' : value.toFixed(1);
}

function formatReviewScore(questions: ExamRecordDetailView['questions'], totalOverride?: number | null) {
  const total = totalOverride ?? questions.reduce((sum, question) => sum + (question.score ?? 1), 0);
  const earned = questions.reduce((sum, question) => sum + (question.isCorrect ? question.score ?? 1 : 0), 0);
  return `${earned}/${total || questions.length || 0}`;
}

function getExamPartQuestionRange(moduleLabel: RecordDetailView['moduleLabel'], activePartNumber: number, exam: ExamRecordDetailView | undefined) {
  const maxQuestionNumber = getFullExamQuestionTotal(dedupeRecordQuestions(exam?.questions ?? []));
  const total = getExamQuestionTotal(moduleLabel, exam, dedupeRecordQuestions(exam?.questions ?? []));
  const partCount = Math.max(1, exam?.parts.length ?? (moduleLabel === 'Listening' ? 4 : 3));
  const unit = moduleLabel === 'Listening' ? 10 : 13;
  const start = (activePartNumber - 1) * unit + 1;
  const end = activePartNumber >= partCount ? total : activePartNumber * unit;

  return { start, end: Math.max(start, end) };
}

function getExamQuestionTotal(moduleLabel: RecordDetailView['moduleLabel'], exam: ExamRecordDetailView | undefined, questions: ExamRecordDetailView['questions']) {
  const defaultTotal = moduleLabel === 'Reading' || moduleLabel === 'Listening' ? 40 : 0;
  return Math.max(defaultTotal, exam?.totalScore ?? 0, getFullExamQuestionTotal(questions));
}

function getFullExamQuestionTotal(questions: ExamRecordDetailView['questions']) {
  return Math.max(0, ...questions.map((question) => getQuestionRange(question).end));
}

function getQuestionRangeTotal(range: { start: number; end: number }) {
  return Math.max(0, range.end - range.start + 1);
}

function isQuestionInRange(question: ExamRecordDetailView['questions'][number], range: { start: number; end: number }) {
  const questionRange = getQuestionRange(question);
  return questionRange.start <= range.end && questionRange.end >= range.start;
}

function findListeningSectionAudio(exam: ExamRecordDetailView | undefined, sectionNumber: number, partGroupId: number | null) {
  if (!exam) return null;

  const groupAudio = exam.partGroupAudios.find((audio) => (
    partGroupId !== null && audio.partGroupId === partGroupId
  ));
  if (groupAudio) return groupAudio;

  const sectionAudio = exam.partGroupAudios.find((audio) => audio.partGroupId === sectionNumber);
  if (sectionAudio) return sectionAudio;

  return exam.testAudioUrl
    ? {
        id: 0,
        testId: 0,
        partGroupId: null,
        title: exam.testAudioTitle ?? exam.testTitle,
        audioUrl: exam.testAudioUrl,
        durationSeconds: undefined,
        transcriptText: exam.testAudioTranscriptText,
      }
    : null;
}

function dedupeRecordQuestions(questions: ExamRecordDetailView['questions']) {
  const seen = new Set<string>();
  const uniqueQuestions = questions.filter((question, index) => {
    const key = String(question.id || `${question.partGroupId ?? question.partNumber ?? 0}-${question.questionNumber}-${index}`);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return uniqueQuestions.filter((question, index) => {
    const range = getQuestionRange(question);
    const isRangeQuestion = range.end > range.start;
    if (!isRangeQuestion) return true;

    return !uniqueQuestions.some((candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return false;
      }

      const candidateRange = getQuestionRange(candidate);
      const candidateIsNarrower = candidateRange.end - candidateRange.start < range.end - range.start;
      const overlapsRange = candidateRange.start <= range.end && candidateRange.end >= range.start;
      return overlapsRange && candidateIsNarrower;
    });
  });
}

function getRecordQuestionNumberLabel(question: NonNullable<ExamRecordDetailView['questions']>[number]) {
  return question.questionNoEnd && question.questionNoEnd > question.questionNumber
    ? `${question.questionNumber}-${question.questionNoEnd}`
    : String(question.questionNumber);
}

function getQuestionRange(question: NonNullable<ExamRecordDetailView['questions']>[number]) {
  return {
    start: question.questionNumber,
    end: question.questionNoEnd && question.questionNoEnd > question.questionNumber ? question.questionNoEnd : question.questionNumber,
  };
}

function mapRecordQuestionToPracticeQuestion(question: NonNullable<ExamRecordDetailView['questions']>[number]): PracticeQuestion {
  return {
    id: question.id,
    partGroupId: question.partGroupId ?? question.partNumber ?? 1,
    questionNumber: question.questionNumber,
    questionNoEnd: question.questionNoEnd,
    questionType: question.questionType,
    answerMode: question.answerMode,
    questionText: question.questionText,
    score: question.score ?? 1,
    imageUrl: question.imageUrl ?? question.imageUrls[0],
    imageUrls: question.imageUrls,
    options: question.options,
    template: question.template,
    tableRows: question.tableRows,
    tableHeaderDark: question.tableHeaderDark,
    blanks: question.blanks,
    bank: question.bank,
    pairs: question.pairs,
    groupGuideText: question.groupGuideText,
    groupRequirementText: question.groupRequirementText,
  };
}

function parseReviewAnswerValue(value: string, answerMode: string): string | string[] {
  if (answerMode !== 'MULTIPLE') return value;
  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
