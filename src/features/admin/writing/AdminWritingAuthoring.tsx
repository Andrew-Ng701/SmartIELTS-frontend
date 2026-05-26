import { useState } from 'react';
import type { ReactNode } from 'react';
import { WritingExamWorkspace } from '../../user/writing/WritingPage';
import type { WritingQuestion } from '../../user/writing/writingModel';
import type { AdminWritingQuestion, AdminWritingTaskType } from './adminWritingModel';

const ADMIN_WRITING_CHART_TYPES = ['Line graph', 'Bar chart', 'Pie chart', 'Table', 'Map', 'Process diagram', 'Mixed charts'];
const WRITING_MIXED_INPUT_MESSAGE = 'Choose one answer format only: typed text, image upload, or PDF upload.';

export function AdminUxWriting({
  activeTask,
  onDelete,
  onEdit,
  onNew,
  onOpenDeleted,
  onTaskChange,
  questions,
}: {
  activeTask: AdminWritingTaskType;
  onDelete: (id: string) => void;
  onEdit: (question: AdminWritingQuestion) => void;
  onNew: () => void;
  onOpenDeleted: () => void;
  onTaskChange: (task: AdminWritingTaskType) => void;
  questions: AdminWritingQuestion[];
}) {
  const visibleQuestions = questions.filter((question) => question.taskType === activeTask && !question.deletedTime);
  const deletedQuestions = questions.filter((question) => question.taskType === activeTask && question.deletedTime);

  return (
    <div className="admin-grid">
      <AdminSectionHeader
        title="Writing Management"
        description=""
        action={(
          <div className="admin-inline">
            <button className="admin-secondary-action" type="button" onClick={onOpenDeleted}>
              Check deleted items ({deletedQuestions.length})
            </button>
            <button className="admin-primary-action" type="button" onClick={onNew}>Add question</button>
          </div>
        )}
      />
      <div className="admin-card admin-card-tight admin-task-tabs">
        <button className={`admin-task-tab ${activeTask === 'TASK_1' ? 'admin-task-tab-active' : ''}`} type="button" onClick={() => onTaskChange('TASK_1')}>Academic Task 1</button>
        <button className={`admin-task-tab ${activeTask === 'TASK_2' ? 'admin-task-tab-active' : ''}`} type="button" onClick={() => onTaskChange('TASK_2')}>Academic Task 2</button>
      </div>
      <section className="admin-card admin-management-table">
        <div className="admin-module-summary admin-table-head admin-writing-management-row">
          <div>Question</div><div>Words</div><div>Time</div><div>Type</div><div>Media</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
        {visibleQuestions.length ? visibleQuestions.map((question) => (
          <article key={question.id} className="admin-module-summary admin-writing-management-row">
            <div>
              <strong>{question.title}</strong>
              <div className="admin-tiny">Updated {displayTime(question.updatedTime ?? question.createdTime)} - {question.taskType === 'TASK_1' ? 'Academic Task 1' : 'Academic Task 2'}</div>
            </div>
            <div><span className="admin-table-value">{question.expectedWords}</span></div>
            <div>{formatMinutes(question.totalSeconds)}<div className="admin-tiny">{question.prepSeconds} sec prep</div></div>
            <div>
              <span className="admin-table-value">{question.taskType === 'TASK_1' ? question.chartType ?? 'Chart' : 'Essay'}</span>
            </div>
            <div>{formatWritingMedia(question.media)}</div>
            <div>
              <div className="admin-inline admin-row-actions">
                <button className="admin-primary-action admin-edit-action" type="button" onClick={() => onEdit(question)}>Edit</button>
                <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onDelete(question.id)}>Delete</button>
              </div>
            </div>
          </article>
        )) : <div className="admin-empty-zone">No questions yet.</div>}
        </div>
      </section>
    </div>
  );
}

export function AdminUxDeletedWritingPage({
  activeTask,
  onBack,
  onRestore,
  questions,
}: {
  activeTask: AdminWritingTaskType;
  onBack: () => void;
  onRestore: (id: string) => void;
  questions: AdminWritingQuestion[];
}) {
  const deletedQuestions = questions.filter((question) => question.taskType === activeTask && question.deletedTime);

  return (
    <div className="admin-grid">
      <AdminSectionHeader
        title={`Deleted ${activeTask === 'TASK_1' ? 'Task 1' : 'Task 2'} questions`}
        description="Manage logically deleted writing questions on a dedicated recovery page."
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to writing list</button>}
      />
      <section className="admin-card">
        <div className="admin-module-summary admin-table-head">
          <div>Question</div><div>Task</div><div>Words</div><div>Time</div><div>Type</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
          {deletedQuestions.length ? deletedQuestions.map((question) => (
            <article key={question.id} className="admin-module-summary">
              <div>
                <strong>{question.title}</strong>
                <div className="admin-tiny">Deleted {displayTime(question.deletedTime)} - Updated {displayTime(question.updatedTime ?? question.createdTime)}</div>
              </div>
              <div><span className="admin-pill admin-pill-primary">{question.taskType === 'TASK_1' ? 'Task 1' : 'Task 2'}</span></div>
              <div><span className="admin-pill admin-pill-blue">{question.expectedWords}</span></div>
              <div>{formatMinutes(question.totalSeconds)}<div className="admin-tiny">{question.prepSeconds} sec prep</div></div>
              <div>{question.taskType === 'TASK_1' ? question.chartType ?? 'Chart' : 'Essay'}</div>
              <div><button className="admin-primary-action admin-restore-action" type="button" onClick={() => onRestore(question.id)}>Restore</button></div>
            </article>
          )) : <div className="admin-empty-zone">No deleted writing questions.</div>}
        </div>
      </section>
    </div>
  );
}

export function AdminUxWritingForm({
  draft,
  onChange,
  onPreview,
}: {
  draft: AdminWritingQuestion;
  onChange: (draft: AdminWritingQuestion) => void;
  onPreview: () => void;
}) {
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const handleFileChange = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    onChange({
      ...draft,
      media: [{
        id: `media-${Date.now()}`,
        name: file.name,
        kind: 'IMAGE',
        size: formatBytes(file.size),
        file,
        preview: URL.createObjectURL(file),
      }],
    });
  };
  const totalExamMinutes = Math.max(1, Math.round(draft.totalSeconds / 60));

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div><h3 className="text-xl font-bold">{draft.taskType === 'TASK_1' ? 'Academic Task 1' : 'Academic Task 2'}</h3><div className="admin-sub">Main title must be unique across all four modules.</div></div>
        <button className="admin-secondary-action admin-writing-preview-action" type="button" onClick={onPreview}>Preview</button>
      </div>
      <div className="admin-divider" />
      <AdminTextInput label="Question title / main title" value={draft.title} onChange={(title) => onChange({ ...draft, title })} />
      <AdminTextarea label="Question description / prompt" value={draft.description} rows={7} onChange={(description) => onChange({ ...draft, description })} />
      {draft.taskType === 'TASK_1' && <AdminSelect label="Chart type" value={draft.chartType ?? 'Line graph'} options={ADMIN_WRITING_CHART_TYPES} onChange={(chartType) => onChange({ ...draft, chartType })} />}
      <AdminNumberInput label="Expected words" value={draft.expectedWords} onChange={(expectedWords) => onChange({ ...draft, expectedWords })} />
      <div className="admin-time-pair">
        <AdminNumberInput label="Total exam time (minutes)" min={1} value={totalExamMinutes} onChange={(totalMinutes) => onChange({ ...draft, totalSeconds: Math.max(1, totalMinutes) * 60 })} />
        <AdminNumberInput label="Preparation time (seconds)" value={draft.prepSeconds} onChange={(prepSeconds) => onChange({ ...draft, prepSeconds: Math.max(0, prepSeconds) })} />
      </div>
      <label className="admin-file-picker">
        <span>Question media</span>
        <input accept="image/*" type="file" onChange={(event) => handleFileChange(event.target.files)} />
      </label>
      {draft.media.length > 0 && (
        <div className="admin-file-list">
          {draft.media.map((file) => (
            <div key={file.id} className="admin-file-row">
              <div>
                <strong>{file.name}</strong>
                <span>{file.kind} - {file.size}</span>
                {file.preview && (
                  <button className="admin-writing-media-preview" type="button" onClick={() => setPreviewImage({ src: file.preview!, alt: file.name })}>
                    <img alt={file.name} src={file.preview} />
                  </button>
                )}
              </div>
              <button className="admin-secondary-action" type="button" onClick={() => onChange({ ...draft, media: draft.media.filter((item) => item.id !== file.id) })}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {previewImage && (
        <ImageLightbox
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
          src={previewImage.src}
        />
      )}
      <div className="admin-sub">Expected words, exam timing, and prompt details are used for learner-facing question information and AI scoring context.</div>
    </div>
  );
}

export function AdminWritingStudentPreview({
  draft,
  onBack,
}: {
  draft: AdminWritingQuestion;
  onBack: () => void;
}) {
  const [previewAnswer, setPreviewAnswer] = useState('');
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewMessage, setPreviewMessage] = useState('');
  const previewQuestion = adminWritingToStudentQuestion(draft);

  const addPreviewFiles = (files: File[]) => {
    const combinedFiles = [...previewFiles, ...files];
    const modeError = validateWritingInputMode(previewAnswer, combinedFiles);
    if (modeError) {
      setPreviewMessage(modeError);
      return;
    }

    setPreviewFiles(combinedFiles);
    setPreviewMessage('');
  };

  return (
    <WritingExamWorkspace
      answerText={previewAnswer}
      backLabel="Back"
      files={previewFiles}
      isPaused={false}
      isPrepActive={false}
      isSubmitted={false}
      isSubmitting={false}
      onAnswerChange={(value) => {
        if (previewFiles.length && value.trim()) {
          setPreviewMessage(WRITING_MIXED_INPUT_MESSAGE);
          return;
        }

        setPreviewAnswer(value);
        setPreviewMessage('');
      }}
      onBackToList={() => undefined}
      onExit={onBack}
      onFilesChange={addPreviewFiles}
      onPrepBlocked={() => undefined}
      onRemoveFile={(index) => setPreviewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
      onSubmit={() => undefined}
      onTogglePause={() => undefined}
      prepRemainingSeconds={draft.prepSeconds}
      previewMode
      question={previewQuestion}
      record={null}
      remainingSeconds={draft.totalSeconds}
      workspaceMessage={previewMessage}
    />
  );
}

function ImageLightbox({ alt, onClose, src }: { alt: string; onClose: () => void; src: string }) {
  return (
    <div className="image-lightbox" role="presentation" onClick={onClose}>
      <button className="image-lightbox-close" type="button" onClick={onClose}>Cancel</button>
      <img alt={alt} src={src} onClick={(event) => event.stopPropagation()} />
    </div>
  );
}

function AdminSectionHeader({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <section className="admin-page-title">
      <div><h1>{title}</h1>{description && <p className="max-w-3xl leading-7">{description}</p>}</div>
      {action}
    </section>
  );
}

function AdminTextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="admin-field"><span>{label}</span><input className="admin-input mt-2" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function AdminNumberInput({
  disabled = false,
  label,
  min = 0,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        className="admin-input mt-2"
        disabled={disabled}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function AdminTextarea({ label, onChange, rows = 1, value }: { label: string; onChange: (value: string) => void; rows?: number; value: string }) {
  return <label className="admin-field"><span>{label}</span><textarea className="admin-textarea mt-2" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function AdminSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select className="admin-input mt-2" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function formatMinutes(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  return `${minutes} min`;
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

function formatWritingMedia(media: AdminWritingQuestion['media']) {
  if (!media.length) return 'No media';
  const imageCount = media.filter((item) => item.kind === 'IMAGE').length;
  const pdfCount = media.filter((item) => item.kind === 'PDF').length;
  return [
    imageCount ? `${imageCount} image${imageCount > 1 ? 's' : ''}` : '',
    pdfCount ? `${pdfCount} PDF${pdfCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ');
}

function adminWritingToStudentQuestion(question: AdminWritingQuestion): WritingQuestion {
  const images = question.media
    .filter((item) => item.kind === 'IMAGE' && item.preview)
    .map((item, index) => ({
      url: item.preview!,
      objectKey: item.objectKey || item.id,
      sortOrder: item.sortOrder ?? index + 1,
    }));

  return {
    id: Number(question.id) || 0,
    taskType: question.taskType,
    chartType: question.chartType,
    title: question.title || 'Writing question',
    description: question.description,
    expectedWords: question.expectedWords,
    totalSeconds: question.totalSeconds,
    prepSeconds: question.prepSeconds,
    allowPause: false,
    imageUrl: images[0]?.url ?? null,
    imageObjectKey: images[0]?.objectKey ?? null,
    images,
    createdTime: question.createdTime,
  };
}

function validateWritingInputMode(text: string, files: File[]) {
  if (text.trim() && files.length) {
    return WRITING_MIXED_INPUT_MESSAGE;
  }

  const hasImage = files.some((file) => file.type.startsWith('image/'));
  const hasPdf = files.some((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  return hasImage && hasPdf ? WRITING_MIXED_INPUT_MESSAGE : '';
}

function displayTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 19) : 'Not recorded';
}

