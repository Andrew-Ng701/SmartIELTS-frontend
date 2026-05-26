import { useEffect, useMemo, useState } from 'react';
import type { PracticeAnswerValue, PracticeQuestion, PracticeReviewAnswer } from '../../features/user/practice/practiceModel';
import { getQuestionTypeLabel, normalizePracticeQuestionType } from '../../features/user/practice/practiceModel';

const OSS_FALLBACK_QUESTION_IMAGE_URL = 'https://oss-console-img-demo-cn-hangzhou-3az.oss-cn-hangzhou.aliyuncs.com/example.gif?x-oss-process=image/format,png';

type StudentExamQuestionPanelProps = {
  answers: Record<string, PracticeAnswerValue>;
  displayMode?: 'slider' | 'list';
  markedQuestions?: Record<string, boolean>;
  notes?: Record<string, string>;
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  onQuestionMarkToggle?: (questionIds: string[]) => void;
  previewMode?: boolean;
  questions: PracticeQuestion[];
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
  showQuestionMeta?: boolean;
  hideQuestionNumberBadge?: boolean;
};

export function StudentExamQuestionPanel({
  answers,
  displayMode = 'slider',
  markedQuestions = {},
  notes = {},
  onAnswerChange,
  onQuestionMarkToggle,
  previewMode = false,
  questions,
  reviewAnswers,
  showQuestionMeta = false,
  hideQuestionNumberBadge = false,
}: StudentExamQuestionPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const activeQuestion = questions[activeIndex] ?? null;
  const questionContext = useMemo(() => buildQuestionContext(questions), [questions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [questions]);

  useEffect(() => {
    if (activeIndex > Math.max(0, questions.length - 1)) {
      setActiveIndex(Math.max(0, questions.length - 1));
    }
  }, [activeIndex, questions.length]);

  if (!questions.length || !activeQuestion) {
    return (
      <article className="student-exam-question-card">
        <p>No sample questions are attached to this part yet.</p>
      </article>
    );
  }

  const activeKey = String(activeQuestion.id);
  const reviewAnswer = reviewAnswers?.[activeKey];
  const note = notes[String(activeQuestion.questionNumber)];

  if (displayMode === 'list') {
    const displayItems = buildQuestionDisplayItems(questions, questionContext, false, Boolean(reviewAnswers));

    return (
      <section className="student-exam-question-list student-exam-question-list-flow">
        {displayItems.map(({ question, groupedQuestions }) => (
          <QuestionCard
            key={groupedQuestions.length > 1 ? questionGroupRenderKey(question) : question.id}
            answers={answers}
            groupedQuestions={groupedQuestions}
            note={notes[String(question.questionNumber)]}
            onAnswerChange={onAnswerChange}
            onMarkToggle={onQuestionMarkToggle}
            onPreviewImage={setPreviewImage}
            previewMode={previewMode}
            question={question}
            questionContext={questionContext}
            isMarked={getGroupedQuestionIds(question, groupedQuestions).some((questionId) => Boolean(markedQuestions[questionId]))}
            reviewAnswer={reviewAnswers?.[String(question.id)]}
            reviewAnswers={reviewAnswers}
            showQuestionMeta={showQuestionMeta}
            hideQuestionNumberBadge={hideQuestionNumberBadge}
          />
        ))}
        {previewImage && (
          <ImageLightbox
            alt={previewImage.alt}
            onClose={() => setPreviewImage(null)}
            src={previewImage.src}
          />
        )}
      </section>
    );
  }

  return (
    <section className="student-exam-question-slider">
      <div className="student-exam-question-rail" aria-label="Question navigation">
        {questions.map((question, index) => (
          <button
            key={question.id}
            className={`student-exam-question-dot ${index === activeIndex ? 'student-exam-question-dot-active' : ''} ${hasAnswer(answers[String(question.id)]) ? 'student-exam-question-dot-answered' : ''}`}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            {question.questionNumber}
          </button>
        ))}
      </div>
      <article className="student-exam-question-card-active">
        <QuestionCard
          answers={answers}
          isMarked={Boolean(markedQuestions[activeKey])}
          note={note}
          onAnswerChange={onAnswerChange}
          onMarkToggle={onQuestionMarkToggle}
          onPreviewImage={setPreviewImage}
          previewMode={previewMode}
          question={activeQuestion}
          questionContext={questionContext}
          reviewAnswer={reviewAnswer}
          reviewAnswers={reviewAnswers}
          showQuestionMeta={showQuestionMeta}
          hideQuestionNumberBadge={hideQuestionNumberBadge}
        />
      </article>
      <div className="student-exam-question-slider-actions">
        <button className="student-exam-ghost" disabled={activeIndex <= 0} type="button" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}>Previous</button>
        <span>{activeIndex + 1} / {questions.length}</span>
        <button className="student-exam-primary" disabled={activeIndex >= questions.length - 1} type="button" onClick={() => setActiveIndex((current) => Math.min(questions.length - 1, current + 1))}>Next</button>
      </div>
      {previewImage && (
        <ImageLightbox
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
          src={previewImage.src}
        />
      )}
    </section>
  );
}

function QuestionCard({
  answers,
  groupedQuestions = [],
  isMarked,
  note,
  onAnswerChange,
  onMarkToggle,
  onPreviewImage,
  previewMode,
  question,
  questionContext,
  reviewAnswer,
  reviewAnswers,
  showQuestionMeta,
  hideQuestionNumberBadge,
}: {
  answers: Record<string, PracticeAnswerValue>;
  groupedQuestions?: PracticeQuestion[];
  isMarked: boolean;
  note?: string;
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  onMarkToggle?: (questionIds: string[]) => void;
  onPreviewImage: (image: { src: string; alt: string } | null) => void;
  previewMode: boolean;
  question: PracticeQuestion;
  questionContext: QuestionContext;
  reviewAnswer?: PracticeReviewAnswer;
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
  showQuestionMeta: boolean;
  hideQuestionNumberBadge: boolean;
}) {
  const questionKey = String(question.id);
  const groupQuestionIds = getGroupedQuestionIds(question, groupedQuestions);
  const questionTitle = getQuestionCardTitle(question, groupedQuestions);
  const questionNumberLabel = getGroupedQuestionNumberLabel(question, groupedQuestions);
  const normalizedQuestionType = normalizePracticeQuestionType(question.questionType);
  const isMatchingGroup = groupedQuestions.length > 1 && normalizePracticeQuestionType(question.questionType) === 'MATCHING';
  const isTrueFalseNotGiven = normalizedQuestionType === 'TRUE_FALSE_NOT_GIVEN';
  const isFillBlankGroup = isFillBlankTemplateQuestion(question);
  const isReviewQuestionGroup = Boolean(reviewAnswers) && groupedQuestions.length > 1 && !isMatchingGroup && !isTrueFalseNotGiven && !isFillBlankTemplateQuestion(question);
  const shouldShowGuideBeforeQuestion = Boolean(question.groupGuideText?.trim());
  const shouldShowRequirementBeforeQuestion = Boolean(
    question.groupRequirementText
    && question.groupRequirementText.trim(),
  );
  const questionNumberState = getQuestionNumberState({
    hasValue: hasAnswer(answers[questionKey]),
    isMarked,
    reviewAnswer,
  });
  const answerSummaryQuestions = groupedQuestions.length ? groupedQuestions : [question];
  const reviewScore = formatReviewGroupScore(answerSummaryQuestions, reviewAnswers);

  return (
    <div className="student-exam-question-card student-exam-question-card-inner" id={`student-question-${question.id}`}>
      <div className="student-exam-question-card-head">
        <div>
          <h4>{questionTitle}</h4>
        </div>
        {reviewScore && <span className="student-exam-question-score">{reviewScore}</span>}
        <button
          className="student-exam-clear-answer"
          disabled={previewMode || reviewAnswer !== undefined}
          type="button"
          onClick={() => {
            const targets = groupedQuestions.length ? groupedQuestions : [question];
            targets.forEach((target) => onAnswerChange(String(target.id), ''));
          }}
        >
          Clear
        </button>
      </div>
      <div className={`student-exam-question-title ${hideQuestionNumberBadge ? 'student-exam-question-title-no-badge' : ''} ${isFillBlankTemplateQuestion(question) ? 'student-exam-question-title-fill-blank' : ''}`.trim()}>
        {!hideQuestionNumberBadge && (
          <button
            aria-label={reviewAnswer ? `Question ${questionNumberLabel} result` : `Mark question ${questionNumberLabel}`}
            aria-pressed={isMarked}
            className={`student-exam-question-no ${questionNumberLabel.includes('-') ? 'student-exam-question-no-range' : ''} ${questionNumberState}`}
            disabled={previewMode || reviewAnswer !== undefined || !onMarkToggle}
            type="button"
            onClick={() => onMarkToggle?.(groupQuestionIds)}
          >
            {questionNumberLabel}
          </button>
        )}
        <div>
          {question.imageUrls.length > 0 && (
            <QuestionImageStrip
              imageUrls={question.imageUrls}
              questionNumber={question.questionNumber}
              onPreviewImage={onPreviewImage}
            />
          )}
          {note && <span className="student-exam-question-note">Note: {note}</span>}
          {(shouldShowGuideBeforeQuestion || shouldShowRequirementBeforeQuestion) && (
            <div className="student-exam-question-copy">
              {shouldShowGuideBeforeQuestion && <p className="student-exam-question-instruction-text">{question.groupGuideText}</p>}
              {shouldShowRequirementBeforeQuestion && <p className="student-exam-question-requirement">{question.groupRequirementText}</p>}
            </div>
          )}
          {isReviewQuestionGroup ? (
            <ReviewQuestionGroup
              answers={answers}
              onAnswerChange={onAnswerChange}
              questions={groupedQuestions}
              questionContext={questionContext}
              reviewAnswers={reviewAnswers}
            />
          ) : isTrueFalseNotGiven ? (
            <TrueFalseNotGivenQuestionTable
              answers={answers}
              onQuestionAnswerChange={onAnswerChange}
              questions={groupedQuestions.length ? groupedQuestions : [question]}
              reviewAnswers={reviewAnswers}
            />
          ) : isMatchingGroup ? (
            <MatchingQuestionGroupInput
              answers={answers}
              onQuestionAnswerChange={onAnswerChange}
              questions={groupedQuestions}
              questionContext={questionContext}
              reviewAnswers={reviewAnswers}
            />
          ) : reviewAnswer ? (
            <>
              <QuestionPrompt
                answers={answers}
                groupedQuestions={groupedQuestions}
                onAnswerChange={onAnswerChange}
                question={question}
                questionContext={questionContext}
                reviewAnswers={reviewAnswers}
                showInlineCorrectAnswers={!isFillBlankGroup}
              />
              {isFillBlankGroup && (
                <FillBlankReviewSummary
                  answers={answers}
                  questions={groupedQuestions.length ? groupedQuestions : [question]}
                  reviewAnswers={reviewAnswers}
                />
              )}
              <StudentQuestionInput
                answers={answers}
                onChange={(value) => onAnswerChange(questionKey, value)}
                onQuestionAnswerChange={onAnswerChange}
                question={question}
                questionContext={questionContext}
                reviewAnswer={reviewAnswer}
                value={answers[questionKey] ?? reviewAnswer.userAnswer}
              />
            </>
          ) : (
            <>
              <QuestionPrompt groupedQuestions={groupedQuestions} question={question} questionContext={questionContext} answers={answers} onAnswerChange={onAnswerChange} />
              <StudentQuestionInput
                answers={answers}
                onChange={(value) => onAnswerChange(questionKey, value)}
                onQuestionAnswerChange={onAnswerChange}
                question={question}
                questionContext={questionContext}
                value={answers[questionKey] ?? ''}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionImageStrip({
  imageUrls,
  onPreviewImage,
  questionNumber,
}: {
  imageUrls: string[];
  onPreviewImage: (image: { src: string; alt: string } | null) => void;
  questionNumber: number;
}) {
  return (
    <div className="student-exam-question-image-strip">
      {imageUrls.map((imageUrl, index) => {
        const alt = `Question ${questionNumber} visual`;

        return (
          <button
            key={`${imageUrl}-${index}`}
            className="student-exam-image-button"
            type="button"
            onClick={() => onPreviewImage({ src: imageUrl, alt })}
          >
            <img
              alt={alt}
              className="student-exam-question-image"
              src={imageUrl}
              onError={(event) => {
                if (event.currentTarget.src !== OSS_FALLBACK_QUESTION_IMAGE_URL) {
                  event.currentTarget.src = OSS_FALLBACK_QUESTION_IMAGE_URL;
                }
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function StudentExamQuestionNav({
  activeQuestionId,
  answers,
  className = '',
  markedQuestions = {},
  onQuestionSelect,
  questions,
  reviewAnswers,
}: {
  activeQuestionId?: string | null;
  answers: Record<string, PracticeAnswerValue>;
  className?: string;
  markedQuestions?: Record<string, boolean>;
  onQuestionSelect: (question: PracticeQuestion) => void;
  questions: PracticeQuestion[];
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
}) {
  const answeredCount = questions.filter((question) => hasAnswer(answers[String(question.id)])).length;

  return (
    <footer className={`student-exam-bottom-nav ${className}`.trim()}>
      <div className="student-exam-bottom-nav-scroll">
        {questions.map((question) => {
          const questionKey = String(question.id);
          const stateClass = getQuestionNumberState({
            hasValue: hasAnswer(answers[questionKey]),
            isMarked: Boolean(markedQuestions[questionKey]),
            reviewAnswer: reviewAnswers?.[questionKey],
          });

          return (
            <button
              key={question.id}
              className={`student-exam-bottom-nav-item ${stateClass} ${activeQuestionId === questionKey ? 'student-exam-bottom-nav-active' : ''}`}
              type="button"
              onClick={() => onQuestionSelect(question)}
            >
              {getQuestionNumberLabel(question)}
            </button>
          );
        })}
      </div>
      <div className="student-exam-bottom-progress">
        <span>{reviewAnswers ? 'Reviewed' : 'Answered'}</span>
        <strong>{reviewAnswers ? questions.length : answeredCount} / {questions.length}</strong>
      </div>
    </footer>
  );
}

function QuestionPrompt({
  answers,
  groupedQuestions = [],
  onAnswerChange,
  question,
  questionContext,
  reviewAnswers,
  showInlineCorrectAnswers = true,
}: {
  answers: Record<string, PracticeAnswerValue>;
  groupedQuestions?: PracticeQuestion[];
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  question: PracticeQuestion;
  questionContext: QuestionContext;
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
  showInlineCorrectAnswers?: boolean;
}) {
  const normalizedType = normalizePracticeQuestionType(question.questionType);
  const template = question.template || (normalizedType === 'FILL_BLANK' ? question.questionText : '');
  const isPromptAlreadyShown = Boolean(
    question.groupRequirementText
    && question.groupRequirementText.trim()
    && question.groupRequirementText.trim() === question.questionText.trim(),
  );

  if (normalizedType === 'FILL_BLANK' && question.tableRows?.length) {
    return (
      <TableCompletionPrompt
        answers={answers}
        groupedQuestions={groupedQuestions.length ? groupedQuestions : [question]}
        onAnswerChange={onAnswerChange}
        question={question}
        questionContext={questionContext}
        reviewAnswers={reviewAnswers}
        showInlineCorrectAnswers={showInlineCorrectAnswers}
      />
    );
  }

  if (normalizedType === 'FILL_BLANK' && template) {
    return (
      <div className="student-exam-inline-template">
        {renderTemplateParts(template, question, questionContext, answers, onAnswerChange, reviewAnswers, showInlineCorrectAnswers)}
      </div>
    );
  }

  if (!question.questionText.trim() || isPromptAlreadyShown) {
    return null;
  }

  return <div className="student-exam-question-line"><strong>{question.questionText}</strong></div>;
}

function StudentQuestionInput({
  answers,
  onChange,
  onQuestionAnswerChange,
  question,
  questionContext,
  reviewAnswer,
  value,
}: {
  answers: Record<string, PracticeAnswerValue>;
  onChange: (value: PracticeAnswerValue) => void;
  onQuestionAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  question: PracticeQuestion;
  questionContext: QuestionContext;
  reviewAnswer?: PracticeReviewAnswer;
  value: PracticeAnswerValue;
}) {
  const normalizedType = normalizePracticeQuestionType(question.questionType);
  const reviewClassName = getReviewAnswerInputClass(reviewAnswer);

  if (normalizedType === 'FILL_BLANK' && (question.tableRows?.length || question.template || hasBlankToken(question.questionText))) {
    return null;
  }

  if (normalizedType === 'MULTIPLE_CHOICE') {
    const options = question.options.length ? question.options : [
      { label: 'A', text: 'Main idea' },
      { label: 'B', text: 'Supporting detail' },
      { label: 'C', text: 'Opposing view' },
      { label: 'D', text: 'Final result' },
    ];

    if (question.answerMode === 'MULTIPLE') {
      const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

      return (
        <div className="student-exam-answer-options">
          <span className="student-exam-select-instruction">Select all that apply:</span>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.label);

            return (
              <label key={option.label} className={`student-exam-answer-option ${getChoiceReviewOptionClass(option.label, isSelected, reviewAnswer)}`.trim()}>
                <input
                  checked={isSelected}
                  disabled={Boolean(reviewAnswer)}
                  name={`question-${question.id}-${option.label}`}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.label]
                      : selectedValues.filter((item) => item !== option.label);
                    onChange(nextValues);
                  }}
                  type="checkbox"
                />
                <span>{option.label}. {option.text}</span>
              </label>
            );
          })}
        </div>
      );
    }

    const selectedValue = Array.isArray(value) ? value[0] ?? '' : value;

    return (
      <div className="student-exam-answer-options">
        <span className="student-exam-select-instruction">Select one:</span>
        {options.map((option) => (
          <label key={option.label} className={`student-exam-answer-option ${getChoiceReviewOptionClass(option.label, selectedValue === option.label, reviewAnswer)}`.trim()}>
            <input checked={selectedValue === option.label} disabled={Boolean(reviewAnswer)} name={`question-${question.id}`} onChange={() => onChange(option.label)} type="radio" />
            <span>{option.label}. {option.text}</span>
          </label>
        ))}
      </div>
    );
  }

  if (normalizedType === 'TRUE_FALSE_NOT_GIVEN') {
    const selectedValue = Array.isArray(value) ? value[0] ?? '' : value;

    return (
      <div className="student-exam-answer-options student-exam-answer-options-inline">
        <span className="student-exam-select-instruction">Select one:</span>
        {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => (
          <label key={option} className={`student-exam-answer-option ${selectedValue === option ? reviewClassName : ''}`.trim()}>
            <input checked={selectedValue === option} disabled={Boolean(reviewAnswer)} name={`question-${question.id}`} onChange={() => onChange(option)} type="radio" />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (normalizedType === 'MATCHING') {
    const selectedValue = Array.isArray(value) ? value[0] ?? '' : value;
    const bank = question.bank.length ? question.bank : questionContext.matchingBank;

    return (
      <div className="student-exam-matching-panel">
        {bank.length > 0 && (
          <div className="student-exam-matching-bank">
            {bank.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
          </div>
        )}
        <label className="student-exam-matching-answer">
          <span>{question.pairs[0]?.left || question.questionText || 'Choose the matching answer'}</span>
        <span className="student-exam-review-answer-row">
          <select className={`student-exam-answer-input ${reviewClassName}`.trim()} disabled={Boolean(reviewAnswer)} onChange={(event) => onChange(event.target.value)} value={selectedValue}>
            <option value="">Choose option</option>
            {buildMatchingOptions(bank).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <CorrectAnswerHint reviewAnswer={reviewAnswer} />
        </span>
      </label>
    </div>
    );
  }

  return (
    <span className="student-exam-review-answer-row">
      <input
        className={`student-exam-answer-input ${reviewClassName}`.trim()}
        onChange={(event) => onQuestionAnswerChange(String(question.id), event.target.value)}
        placeholder={`${getQuestionTypeLabel(question.questionType)} answer`}
        readOnly={Boolean(reviewAnswer)}
        value={Array.isArray(value) ? value.join(', ') : value}
      />
    </span>
  );
}

function MatchingQuestionGroupInput({
  answers,
  onQuestionAnswerChange,
  questions,
  questionContext,
  reviewAnswers,
}: {
  answers: Record<string, PracticeAnswerValue>;
  onQuestionAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  questions: PracticeQuestion[];
  questionContext: QuestionContext;
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
}) {
  const firstQuestion = questions[0];
  const bank = firstQuestion && firstQuestion.bank.length ? firstQuestion.bank : questionContext.matchingBank;
  const options = buildMatchingOptions(bank);

  return (
    <div className="student-exam-matching-panel">
      {bank.length > 0 && (
        <div className="student-exam-matching-bank">
          {bank.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      )}
      <div className="student-exam-matching-list">
        {questions.map((question) => {
          const questionKey = String(question.id);
          const value = answers[questionKey] ?? '';
          const selectedValue = Array.isArray(value) ? value[0] ?? '' : value;
          const reviewAnswer = reviewAnswers?.[questionKey];

          return (
            <label key={question.id} className="student-exam-matching-answer">
              <span>{question.questionNumber}. {question.pairs[0]?.left || question.questionText || 'Choose the matching answer'}</span>
              <span className="student-exam-review-answer-row">
                <select className={`student-exam-answer-input ${getReviewAnswerInputClass(reviewAnswer)}`.trim()} disabled={Boolean(reviewAnswer)} onChange={(event) => onQuestionAnswerChange(questionKey, event.target.value)} value={selectedValue}>
                  <option value="">Choose option</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <CorrectAnswerHint reviewAnswer={reviewAnswer} />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TrueFalseNotGivenQuestionTable({
  answers,
  onQuestionAnswerChange,
  questions,
  reviewAnswers,
}: {
  answers: Record<string, PracticeAnswerValue>;
  onQuestionAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  questions: PracticeQuestion[];
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
}) {
  const options = [
    ['TRUE', 'T'],
    ['FALSE', 'F'],
    ['NOT GIVEN', 'NG'],
  ] as const;

  return (
    <div className="student-exam-tfng-wrap">
      <table className="student-exam-tfng-table">
        <thead>
          <tr>
            <th aria-label="Statement" />
            {options.map(([, label]) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {questions.map((question, index) => {
            const questionKey = String(question.id);
          const selectedValue = answers[questionKey];
          const selectedAnswer = Array.isArray(selectedValue) ? selectedValue[0] ?? '' : selectedValue;
          const reviewAnswer = reviewAnswers?.[questionKey];

          return (
              <tr key={question.id}>
                <td>
                  <span className="student-exam-tfng-row-label">{formatRomanNumeral(index + 1)})</span>
                  <span>{question.questionText}</span>
                </td>
                {options.map(([value, label]) => (
                  <td key={value}>
                    <label className={`student-exam-tfng-option ${getTrueFalseReviewOptionClass(value, selectedAnswer, reviewAnswer)}`.trim()} aria-label={`Question ${question.questionNumber} ${value}`}>
                      <input
                        checked={selectedAnswer === value}
                        disabled={Boolean(reviewAnswer)}
                        name={`question-${question.id}`}
                        type="radio"
                        onChange={() => onQuestionAnswerChange(questionKey, value)}
                      />
                      <span>{label}</span>
                    </label>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableCompletionPrompt({
  answers,
  groupedQuestions,
  onAnswerChange,
  question,
  questionContext,
  reviewAnswers,
  showInlineCorrectAnswers = true,
}: {
  answers: Record<string, PracticeAnswerValue>;
  groupedQuestions: PracticeQuestion[];
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  question: PracticeQuestion;
  questionContext: QuestionContext;
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
  showInlineCorrectAnswers?: boolean;
}) {
  const rows = question.tableRows ?? [];
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnWeights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxLength = rows.reduce((max, row) => Math.max(max, tableCellTextLength(row[columnIndex] ?? '')), 0);
    return maxLength > 48 ? Math.min(2.4, maxLength / 48) : 1;
  });
  const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  const tableMinWidth = `${Math.max(34, columnCount * 12)}rem`;
  const tableContext = useMemo(() => ({
    ...questionContext,
    templateGroups: new Map(questionContext.templateGroups).set(templateKey(question), groupedQuestions),
  }), [groupedQuestions, question, questionContext]);

  return (
    <div className="student-exam-table-completion-wrap">
      <table className={`student-exam-table-completion ${question.tableHeaderDark ?? true ? 'student-exam-table-completion-dark-first-row' : ''}`} style={{ minWidth: tableMinWidth }}>
        <colgroup>
          {columnWeights.map((weight, index) => (
            <col key={index} style={{ width: `${(weight / totalWeight) * 100}%` }} />
          ))}
        </colgroup>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columnCount }, (_, cellIndex) => {
                const Tag = rowIndex === 0 ? 'th' : 'td';
                const cell = row[cellIndex] ?? '';

                return (
                  <Tag key={cellIndex}>
                    {renderTemplateParts(cell, question, tableContext, answers, onAnswerChange, reviewAnswers, showInlineCorrectAnswers)}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewQuestionGroup({
  answers,
  onAnswerChange,
  questions,
  questionContext,
  reviewAnswers,
}: {
  answers: Record<string, PracticeAnswerValue>;
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void;
  questions: PracticeQuestion[];
  questionContext: QuestionContext;
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
}) {
  const renderedPrompts = new Set<string>();

  return (
    <div className="student-exam-review-question-group">
      {questions.map((item) => {
        const itemKey = String(item.id);
        const itemReviewAnswer = reviewAnswers?.[itemKey];
        const promptKey = [
          item.questionText.trim(),
          item.template?.trim() ?? '',
          JSON.stringify(item.tableRows ?? []),
        ].join(':');
        const shouldRenderPrompt = !renderedPrompts.has(promptKey);
        renderedPrompts.add(promptKey);

        return (
          <div key={item.id} className="student-exam-review-question-group-item">
            {shouldRenderPrompt && (
              <QuestionPrompt
                answers={answers}
                question={item}
                questionContext={questionContext}
                reviewAnswers={reviewAnswers}
                onAnswerChange={onAnswerChange}
                showInlineCorrectAnswers={false}
              />
            )}
            <StudentQuestionInput
              answers={answers}
              onChange={(value) => onAnswerChange(itemKey, value)}
              onQuestionAnswerChange={onAnswerChange}
              question={item}
              questionContext={questionContext}
              reviewAnswer={itemReviewAnswer}
              value={answers[itemKey] ?? itemReviewAnswer?.userAnswer ?? ''}
            />
          </div>
        );
      })}
    </div>
  );
}

function ImageLightbox({ alt, onClose, src }: { alt: string; onClose: () => void; src: string }) {
  return (
    <div className="image-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button className="image-lightbox-close" type="button" onClick={onClose}>Cancel</button>
      <img alt={alt} src={src} />
    </div>
  );
}

type QuestionContext = {
  matchingGroups: Map<string, PracticeQuestion[]>;
  matchingBank: string[];
  questionsByNumber: Map<number, PracticeQuestion>;
  reviewGroups: Map<string, PracticeQuestion[]>;
  templateGroups: Map<string, PracticeQuestion[]>;
  trueFalseGroups: Map<string, PracticeQuestion[]>;
};

type QuestionDisplayItem = {
  question: PracticeQuestion;
  groupedQuestions: PracticeQuestion[];
};

export type QuestionNoteGroup = {
  keyQuestionNumber: number;
  label: string;
};

export function buildQuestionNoteGroups(questions: PracticeQuestion[]): QuestionNoteGroup[] {
  const questionContext = buildQuestionContext(questions);
  return buildQuestionDisplayItems(questions, questionContext, false, true).map(({ question, groupedQuestions }) => ({
    keyQuestionNumber: question.questionNumber,
    label: `Q${getGroupedQuestionNumberLabel(question, groupedQuestions)}`,
  }));
}

function buildQuestionContext(questions: PracticeQuestion[]): QuestionContext {
  const matchingGroups = new Map<string, PracticeQuestion[]>();
  const questionsByNumber = new Map<number, PracticeQuestion>();
  const reviewGroups = new Map<string, PracticeQuestion[]>();
  const templateGroups = new Map<string, PracticeQuestion[]>();
  const trueFalseGroups = new Map<string, PracticeQuestion[]>();
  const matchingBank: string[] = [];

  questions.forEach((question) => {
    questionsByNumber.set(question.questionNumber, question);
    if (isFillBlankTemplateQuestion(question)) {
      const key = templateKey(question);
      templateGroups.set(key, [...(templateGroups.get(key) ?? []), question]);
    }
    if (normalizePracticeQuestionType(question.questionType) === 'MATCHING') {
      const key = matchingGroupKey(question);
      matchingGroups.set(key, [...(matchingGroups.get(key) ?? []), question]);
      question.bank.forEach((item) => {
        if (!matchingBank.includes(item)) {
          matchingBank.push(item);
        }
      });
    }
    if (normalizePracticeQuestionType(question.questionType) === 'TRUE_FALSE_NOT_GIVEN') {
      const key = trueFalseGroupKey(question);
      trueFalseGroups.set(key, [...(trueFalseGroups.get(key) ?? []), question]);
    }
    const reviewKey = reviewGroupKey(question);
    reviewGroups.set(reviewKey, [...(reviewGroups.get(reviewKey) ?? []), question]);
  });

  templateGroups.forEach((group, key) => {
    templateGroups.set(key, [...group].sort((left, right) => left.questionNumber - right.questionNumber));
  });
  matchingGroups.forEach((group, key) => {
    matchingGroups.set(key, [...group].sort((left, right) => left.questionNumber - right.questionNumber));
  });
  trueFalseGroups.forEach((group, key) => {
    trueFalseGroups.set(key, [...group].sort((left, right) => left.questionNumber - right.questionNumber));
  });
  reviewGroups.forEach((group, key) => {
    reviewGroups.set(key, [...group].sort((left, right) => left.questionNumber - right.questionNumber));
  });

  return { matchingBank, matchingGroups, questionsByNumber, reviewGroups, templateGroups, trueFalseGroups };
}

function buildQuestionDisplayItems(questions: PracticeQuestion[], context: QuestionContext, disableMatchingGroups = false, enableReviewGroups = false): QuestionDisplayItem[] {
  const renderedTemplateKeys = new Set<string>();
  const renderedMatchingKeys = new Set<string>();
  const renderedReviewKeys = new Set<string>();
  const renderedTrueFalseKeys = new Set<string>();

  const displayItems = questions.flatMap((question) => {
    if (isFillBlankTemplateQuestion(question)) {
      const key = templateKey(question);
      if (renderedTemplateKeys.has(key)) {
        return [];
      }

      renderedTemplateKeys.add(key);
      return [{
        question,
        groupedQuestions: context.templateGroups.get(key) ?? [question],
      }];
    }

    if (!disableMatchingGroups && normalizePracticeQuestionType(question.questionType) === 'MATCHING') {
      const key = matchingGroupKey(question);
      if (renderedMatchingKeys.has(key)) {
        return [];
      }

      renderedMatchingKeys.add(key);
      return [{
        question,
        groupedQuestions: context.matchingGroups.get(key) ?? [question],
      }];
    }

    if (!disableMatchingGroups && normalizePracticeQuestionType(question.questionType) === 'TRUE_FALSE_NOT_GIVEN') {
      const key = trueFalseGroupKey(question);
      if (renderedTrueFalseKeys.has(key)) {
        return [];
      }

      renderedTrueFalseKeys.add(key);
      return [{
        question,
        groupedQuestions: context.trueFalseGroups.get(key) ?? [question],
      }];
    }

    if (enableReviewGroups) {
      const key = reviewGroupKey(question);
      const group = context.reviewGroups.get(key) ?? [question];
      if (group.length > 1 && canUseReviewGroup(question)) {
        if (renderedReviewKeys.has(key)) {
          return [];
        }

        renderedReviewKeys.add(key);
        return [{
          question,
          groupedQuestions: group,
        }];
      }
    }

    return [{ question, groupedQuestions: [question] }];
  });

  return enableReviewGroups ? removeOverlappingDisplayItems(displayItems) : displayItems;
}

function removeOverlappingDisplayItems(items: QuestionDisplayItem[]) {
  const keptItems: QuestionDisplayItem[] = [];

  items.forEach((item) => {
    const range = getGroupedQuestionRange(item.question, item.groupedQuestions);
    const overlapsKept = keptItems.some((keptItem) => {
      const keptRange = getGroupedQuestionRange(keptItem.question, keptItem.groupedQuestions);
      return range.start <= keptRange.end && range.end >= keptRange.start;
    });

    if (!overlapsKept) {
      keptItems.push(item);
    }
  });

  return keptItems;
}

function canUseReviewGroup(question: PracticeQuestion) {
  const normalizedType = normalizePracticeQuestionType(question.questionType);
  if (normalizedType === 'MULTIPLE_CHOICE' || normalizedType === 'SHORT_ANSWER') {
    return Boolean(question.groupGuideText?.trim() || question.groupRequirementText?.trim())
      && Boolean(question.questionNoEnd && question.questionNoEnd > question.questionNumber);
  }

  return true;
}

function renderTemplateParts(
  template: string,
  question: PracticeQuestion,
  context: QuestionContext,
  answers: Record<string, PracticeAnswerValue>,
  onAnswerChange: (questionId: string, value: PracticeAnswerValue) => void,
  reviewAnswers?: Record<string, PracticeReviewAnswer>,
  showInlineCorrectAnswers = true,
) {
  let sequentialBlankIndex = 0;
  const parts = template.split(/(\(\d+\)|\{\}|_{3,})/g);

  return parts.map((part, index) => {
    if (!part) return null;
    const numericMatch = part.match(/^\((\d+)\)$/);
    const isAnonymousBlank = part === '{}' || /^_{3,}$/.test(part);

    if (!numericMatch && !isAnonymousBlank) {
      return part;
    }

    const blankNumber = numericMatch ? Number(numericMatch[1]) : sequentialBlankIndex + 1;
    const targetQuestion = resolveBlankQuestion(question, blankNumber, sequentialBlankIndex, context, Boolean(numericMatch));
    sequentialBlankIndex += 1;
    const targetKey = String(targetQuestion.id);
    const reviewAnswer = reviewAnswers?.[targetKey];
    const value = getReviewDisplayValue(answers[targetKey], reviewAnswer);
    return (
      <span key={`${targetKey}-${index}`} className="student-exam-inline-answer-review">
        <label className="student-exam-inline-blank-control">
          <span className="student-exam-inline-blank-label">Q{targetQuestion.questionNumber} -</span>
        <input
          aria-label={`Question ${targetQuestion.questionNumber} answer`}
          className={`student-exam-inline-blank ${getReviewAnswerInputClass(reviewAnswer)}`.trim()}
          onChange={(event) => onAnswerChange(targetKey, event.target.value)}
          placeholder=""
          readOnly={Boolean(reviewAnswer)}
          value={Array.isArray(value) ? value.join(', ') : value}
        />
        </label>
        {showInlineCorrectAnswers && <CorrectAnswerHint reviewAnswer={reviewAnswer} />}
      </span>
    );
  });
}

function FillBlankReviewSummary({
  answers,
  questions,
  reviewAnswers,
}: {
  answers: Record<string, PracticeAnswerValue>;
  questions: PracticeQuestion[];
  reviewAnswers?: Record<string, PracticeReviewAnswer>;
}) {
  const items = questions
    .map((question) => {
      const questionKey = String(question.id);
      const reviewAnswer = reviewAnswers?.[questionKey];
      if (!reviewAnswer) return null;

      return {
        label: `Q${question.questionNumber}`,
        userAnswer: formatAnswerValue(getReviewDisplayValue(answers[questionKey], reviewAnswer)),
        correctAnswer: reviewAnswer.correctAnswer,
        isCorrect: reviewAnswer.isCorrect,
      };
    })
    .filter((item): item is { label: string; userAnswer: string; correctAnswer: string; isCorrect: boolean } => Boolean(item));

  if (!items.length) return null;

  return (
    <div className="student-exam-fill-blank-review-list">
      {items.map((item) => (
        <div key={item.label} className={item.isCorrect ? 'student-exam-fill-blank-review-correct' : 'student-exam-fill-blank-review-wrong'}>
          <p><strong>{item.label}</strong> user answer - {item.userAnswer || 'No answer'}</p>
          <p>answer - {item.correctAnswer || 'N/A'}</p>
        </div>
      ))}
    </div>
  );
}

function formatAnswerValue(value: PracticeAnswerValue) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function getReviewDisplayValue(value: PracticeAnswerValue | undefined, reviewAnswer?: PracticeReviewAnswer): PracticeAnswerValue {
  if (Array.isArray(value)) return value.length ? value : reviewAnswer?.userAnswer ?? '';
  if (value !== undefined && value !== '') return value;
  return reviewAnswer?.userAnswer ?? '';
}

function formatReviewGroupScore(questions: PracticeQuestion[], reviewAnswers?: Record<string, PracticeReviewAnswer>) {
  if (!reviewAnswers) return '';

  const answers = questions
    .map((question) => ({ answer: reviewAnswers[String(question.id)], score: question.score || 1 }))
    .filter((item) => Boolean(item.answer));
  if (!answers.length) return '';

  const total = answers.reduce((sum, item) => sum + item.score, 0);
  const earned = answers.reduce((sum, item) => sum + (item.answer?.isCorrect ? item.score : 0), 0);
  return `${earned}/${total}`;
}


function getReviewAnswerInputClass(answer?: PracticeReviewAnswer) {
  if (!answer) return '';
  return answer.isCorrect ? 'student-exam-answer-input-correct' : 'student-exam-answer-input-wrong';
}

function CorrectAnswerHint({ reviewAnswer }: { reviewAnswer?: PracticeReviewAnswer }) {
  if (!reviewAnswer || reviewAnswer.isCorrect || !reviewAnswer.correctAnswer) return null;
  return <span className="student-exam-correct-answer-hint">Correct: {reviewAnswer.correctAnswer}</span>;
}

function getTrueFalseReviewOptionClass(value: string, selectedAnswer: string, answer?: PracticeReviewAnswer) {
  if (!answer) return '';
  if (selectedAnswer === value && answer.isCorrect) return 'student-exam-answer-input-correct';
  if (selectedAnswer === value) return 'student-exam-answer-input-wrong';
  if (answer.correctAnswer === value) return 'student-exam-answer-input-correct';
  return '';
}

function getChoiceReviewOptionClass(optionLabel: string, isSelected: boolean, answer?: PracticeReviewAnswer) {
  if (!answer) return '';
  const correctLabels = answer.correctAnswer
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const isCorrectOption = correctLabels.includes(optionLabel);
  if (isSelected && answer.isCorrect) return 'student-exam-answer-input-correct';
  if (isSelected) return 'student-exam-answer-input-wrong';
  if (isCorrectOption) return 'student-exam-answer-input-correct';
  return '';
}

function resolveBlankQuestion(question: PracticeQuestion, blankNumber: number, blankIndex: number, context: QuestionContext, allowGlobalNumberLookup: boolean) {
  const sameTemplateQuestions = context.templateGroups.get(templateKey(question)) ?? [question];
  return sameTemplateQuestions.find((item) => item.questionNumber === blankNumber)
    ?? sameTemplateQuestions[blankIndex]
    ?? sameTemplateQuestions[blankNumber - 1]
    ?? (allowGlobalNumberLookup ? context.questionsByNumber.get(blankNumber) : undefined)
    ?? question;
}

function templateKey(question: PracticeQuestion) {
  const tableSignature = question.tableRows?.length ? JSON.stringify(question.tableRows) : '';
  return `${question.partGroupId}:${question.template || question.questionText || tableSignature}`;
}

function matchingGroupKey(question: PracticeQuestion) {
  return [
    question.partGroupId,
    question.groupGuideText ?? '',
    question.groupRequirementText ?? '',
    question.bank.join('|'),
  ].join(':');
}

function trueFalseGroupKey(question: PracticeQuestion) {
  return [
    question.partGroupId,
    question.groupGuideText ?? '',
    question.groupRequirementText ?? '',
    normalizePracticeQuestionType(question.questionType),
  ].join(':');
}

function reviewGroupKey(question: PracticeQuestion) {
  if (question.questionNoEnd) {
    return [
      question.partGroupId,
      normalizePracticeQuestionType(question.questionType),
      question.questionNoEnd,
      question.bank.join('|'),
    ].join(':');
  }

  return [
    question.partGroupId,
    normalizePracticeQuestionType(question.questionType),
    question.groupGuideText ?? '',
    question.groupRequirementText ?? '',
    question.template ?? '',
    question.bank.join('|'),
  ].join(':');
}

function questionGroupRenderKey(question: PracticeQuestion) {
  const normalizedType = normalizePracticeQuestionType(question.questionType);
  if (normalizedType === 'MATCHING') return matchingGroupKey(question);
  if (normalizedType === 'TRUE_FALSE_NOT_GIVEN') return trueFalseGroupKey(question);
  return templateKey(question);
}

function isFillBlankTemplateQuestion(question: PracticeQuestion) {
  return normalizePracticeQuestionType(question.questionType) === 'FILL_BLANK'
    && Boolean(question.tableRows?.length || question.template || hasBlankToken(question.questionText));
}

function getQuestionCardTitle(question: PracticeQuestion, groupedQuestions: PracticeQuestion[]) {
  const range = getGroupedQuestionRange(question, groupedQuestions);
  if (groupedQuestions.length <= 1) {
    const label = getSingleQuestionDisplayLabel(question);
    return label.includes('-') ? `Questions ${label}` : `Question ${label}`;
  }

  if (range.start === range.end) {
    return `Question ${question.questionNumber}`;
  }

  return `Questions ${range.start}-${range.end}`;
}

function getGroupedQuestionNumberLabel(question: PracticeQuestion, groupedQuestions: PracticeQuestion[]) {
  if (groupedQuestions.length <= 1) {
    return getSingleQuestionDisplayLabel(question);
  }

  const range = getGroupedQuestionRange(question, groupedQuestions);
  if (range.start !== range.end) {
    return `${range.start}-${range.end}`;
  }

  return String(question.questionNumber);
}

function getGroupedQuestionRange(question: PracticeQuestion, groupedQuestions: PracticeQuestion[]) {
  const targets = groupedQuestions.length ? groupedQuestions : [question];
  const starts = targets.map((item) => item.questionNumber);
  const ends = groupedQuestions.length > 1
    ? targets.map((item) => item.questionNoEnd && item.questionNoEnd > item.questionNumber ? item.questionNoEnd : item.questionNumber)
    : targets.map((item) => item.questionNumber);

  return {
    start: Math.min(...starts),
    end: Math.max(...ends),
  };
}

function getGroupedQuestionIds(question: PracticeQuestion, groupedQuestions: PracticeQuestion[]) {
  const targets = groupedQuestions.length ? groupedQuestions : [question];
  return targets.map((item) => String(item.id));
}

function getQuestionNumberLabel(question: PracticeQuestion) {
  return question.questionNoEnd && question.questionNoEnd > question.questionNumber
    ? `${question.questionNumber}-${question.questionNoEnd}`
    : String(question.questionNumber);
}

function getSingleQuestionDisplayLabel(question: PracticeQuestion) {
  return (question.answerMode === 'MULTIPLE' || question.score > 1)
    && question.questionNoEnd
    && question.questionNoEnd > question.questionNumber
    ? `${question.questionNumber}-${question.questionNoEnd}`
    : String(question.questionNumber);
}

function hasBlankToken(value: string) {
  return /(\(\d+\)|\{\}|_{3,})/.test(value);
}

function tableCellTextLength(value: string) {
  return value.replace(/(\(\d+\)|\{\}|_{3,})/g, 'answer').trim().length;
}

function formatRomanNumeral(value: number) {
  const numerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  return numerals[value - 1] ?? String(value);
}

function hasAnswer(value: PracticeAnswerValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function getQuestionNumberState({
  hasValue,
  isMarked,
}: {
  hasValue: boolean;
  isMarked: boolean;
  reviewAnswer?: PracticeReviewAnswer;
}) {
  if (isMarked) return 'student-exam-question-no-marked';
  if (hasValue) return 'student-exam-question-no-answered';
  return 'student-exam-question-no-unanswered';
}

function buildMatchingOptions(bank: string[]) {
  if (!bank.length) return ['A', 'B', 'C', 'D', 'E'];
  return bank.map((item, index) => {
    const match = item.match(/^([A-Za-z0-9]+)\s*(?:[.)]|\|)\s*/);
    return match ? match[1] : String.fromCharCode(65 + index);
  });
}
