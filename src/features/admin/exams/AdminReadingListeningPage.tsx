import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { listeningApi } from '../../../api/listeningApi';
import { readingApi } from '../../../api/readingApi';
import { getApiErrorMessage } from '../../../api/errors';
import { AudioPlayerControl } from '../../../components/AudioPlayerControl';
import { ListeningPreviewNotes } from '../../../components/exam/ListeningPreviewNotes';
import { StudentExamQuestionPanel } from '../../../components/exam/StudentExamQuestionPanel';
import {
  buildAdminExamPayload,
  buildAdminReadingCreatePayload,
  buildAdminExamShellPayload,
  createAdminExamDraft,
  createAdminExamQuestion,
  createAdminExamTask,
  getAdminExamQuestionUnits,
  getAdminExamModuleName,
  getAdminExamListQuestionCount,
  getAdminExamListTaskCount,
  getAdminExamScore,
  getAdminExamUnits,
  getAdminExamTaskUnits,
  getAdminQuestionTypeLabel,
  getAdminQuestionTypes,
  mapApiAdminExam,
  parseAcceptedAnswersInput,
  toStoredAdminExamDraft,
} from './adminExamModel';
import type { AdminExam, AdminExamAudioAsset, AdminExamBlank, AdminExamModuleId, AdminExamOption, AdminExamQuestion, AdminExamQuestionType, AdminExamTask } from './adminExamModel';
import type { PracticeAnswerValue, PracticeQuestion } from '../../user/practice/practiceModel';

type AdminReadingListeningPageProps = {
  exams: AdminExam[];
  moduleId: AdminExamModuleId;
  onExamsChange: (updater: (exams: AdminExam[]) => AdminExam[]) => void;
  onToast: (message: string) => void;
  validateTitle?: (title: string, exclude?: { scope: string; id: string }) => boolean;
};

export function AdminReadingListeningPage({
  exams,
  moduleId,
  onExamsChange,
  onToast,
  validateTitle,
}: AdminReadingListeningPageProps) {
  const [mode, setMode] = useState<'list' | 'edit' | 'deleted'>('list');
  const [draft, setDraft] = useState<AdminExam | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const moduleName = getAdminExamModuleName(moduleId);
  const visibleExams = useMemo(() => exams.filter((exam) => exam.module === moduleName && !exam.deletedTime), [exams, moduleName]);
  const deletedExams = useMemo(() => exams.filter((exam) => exam.module === moduleName && exam.deletedTime), [exams, moduleName]);
  const activeTask = draft?.tasks.find((task) => task.id === activeTaskId) ?? draft?.tasks[0] ?? null;

  useEffect(() => {
    setMode('list');
    setDraft(null);
    setActiveTaskId(null);
    setIsSaving(false);
  }, [moduleId]);

  useEffect(() => {
    if (mode !== 'edit' || !draft) return;
    window.localStorage.setItem(adminExamDraftBackupKey(moduleId), JSON.stringify(toStoredAdminExamDraft(draft)));
  }, [draft, mode, moduleId]);

  useEffect(() => {
    if (!draft?.tasks.length) {
      setActiveTaskId(null);
      return;
    }
    if (!activeTaskId || !draft.tasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(draft.tasks[0].id);
    }
  }, [activeTaskId, draft]);

  const openCreate = () => {
    const nextDraft = createAdminExamDraft(moduleId, moduleId === 'reading' ? 'Untitled Reading Test' : 'Untitled Listening Test');
    setDraft(nextDraft);
    setActiveTaskId(nextDraft.tasks[0]?.id ?? null);
    setMode('edit');
  };

  const openEdit = async (exam: AdminExam) => {
    setMode('edit');
    setDraft(structuredClone(exam));
    setActiveTaskId(exam.tasks[0]?.id ?? null);

    const testId = Number(exam.id);
    if (!testId) {
      return;
    }

    try {
      const detail = moduleId === 'reading'
        ? await readingApi.getAdminTest(testId)
        : await listeningApi.getAdminTest(testId);
      const nextDraft = mapApiAdminExam(detail, moduleId);
      setDraft(nextDraft);
      setActiveTaskId(nextDraft.tasks[0]?.id ?? null);
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to load full test detail. Showing the list summary instead.'));
    }
  };

  const saveDraft = async () => {
    if (!draft || isSaving) return;
    if (validateTitle && !validateTitle(draft.title, { scope: moduleId, id: draft.id })) return;

    setIsSaving(true);
    onToast('Saving test...');
    try {
      const moduleApi = moduleId === 'reading' ? readingApi : listeningApi;
      const shellPayload = moduleId === 'reading'
        ? buildAdminReadingCreatePayload(draft) as any
        : buildAdminExamShellPayload(draft) as any;
      const testId = Number(draft.id)
        ? Number(draft.id)
        : Number((await moduleApi.createAdminTest(shellPayload)).id);
      const structureSaved = await moduleApi.saveAdminFullTest(
        testId,
        buildAdminExamPayload({ ...draft, id: String(testId) }, { includePassages: false, includeQuestions: false }) as Record<string, unknown>,
      );
      const keyedDraft = rekeyDraftFromSaved({ ...draft, id: String(testId) }, mapApiAdminExam(structureSaved, moduleId));
      const materialSaved = moduleId === 'reading'
        ? await moduleApi.saveAdminFullTest(testId, buildAdminExamPayload(keyedDraft, { includeQuestions: false }) as Record<string, unknown>)
        : structureSaved;
      const contentDraft = moduleId === 'reading'
        ? rekeyDraftFromSaved(keyedDraft, mapApiAdminExam(materialSaved, moduleId))
        : keyedDraft;
      const saved = await moduleApi.saveAdminFullTest(testId, buildAdminExamPayload(contentDraft) as Record<string, unknown>);
      const savedBeforeUpload = mapApiAdminExam(await moduleApi.getAdminTest(testId).catch(() => saved), moduleId);
      onToast(moduleId === 'listening' ? 'Uploading listening audio...' : 'Uploading media files...');
      await uploadPendingAssets(draft, savedBeforeUpload, moduleId);
      const savedDetail = await moduleApi.getAdminTest(testId).catch(() => saved);
      const mapped = mapApiAdminExam(savedDetail, moduleId);
      onExamsChange((current) => current.some((exam) => exam.id === mapped.id)
        ? current.map((exam) => (exam.id === mapped.id ? mapped : exam))
        : [mapped, ...current]);
      setMode('list');
      setDraft(null);
      setActiveTaskId(null);
      window.localStorage.removeItem(adminExamDraftBackupKey(moduleId));
      onToast(moduleId === 'listening'
        ? 'Listening test created with audio.'
        : 'Reading test created. It may take a moment for the new test to appear everywhere.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to save test.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExam = async (examId: string) => {
    const exam = exams.find((item) => item.id === examId);
    if (!exam) return;

    try {
      await (moduleId === 'reading' ? readingApi.deleteAdminTest(Number(exam.id)) : listeningApi.deleteAdminTest(Number(exam.id)));
      onExamsChange((current) => current.map((item) => (item.id === examId ? { ...item, deletedTime: new Date().toISOString() } : item)));
      onToast('Test moved to trash.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to delete test.'));
    }
  };

  const restoreExam = async (examId: string) => {
    const exam = exams.find((item) => item.id === examId);
    if (!exam) return;

    try {
      await (moduleId === 'reading' ? readingApi.restoreAdminTest(Number(exam.id)) : listeningApi.restoreAdminTest(Number(exam.id)));
      onExamsChange((current) => current.map((item) => (item.id === examId ? { ...item, deletedTime: null } : item)));
      onToast('Test restored to the active list.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to restore test.'));
    }
  };

  const updateDraft = (updater: (draft: AdminExam) => AdminExam) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const updateTask = (taskId: string, updater: (task: AdminExamTask) => AdminExamTask) => {
    updateDraft((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
    }));
  };

  const updateQuestion = (taskId: string, questionId: string, updater: (question: AdminExamQuestion) => AdminExamQuestion) => {
    updateTask(taskId, (task) => ({
      ...task,
      questions: task.questions.map((question) => (question.id === questionId ? updater(question) : question)),
    }));
  };

  const updateFullAudio = (audio: AdminExamAudioAsset | null) => {
    const nextAudio = audio ? { ...audio, transcriptText: draft?.fullAudio?.transcriptText } : audio;
    updateDraft((current) => ({ ...current, fullAudio: nextAudio }));
  };

  const updateTaskAudio = (taskId: string, audio: AdminExamAudioAsset | null) => {
    const existingAudio = draft?.tasks.find((task) => task.id === taskId)?.audio;
    const nextAudio = audio ? { ...audio, transcriptText: existingAudio?.transcriptText } : audio;
    updateTask(taskId, (task) => ({ ...task, audio: nextAudio }));
  };

  const addTask = () => {
    const nextTask = createAdminExamTask((draft?.tasks.length ?? 0) + 1, moduleId);
    updateDraft((current) => ({ ...current, tasks: [...current.tasks, nextTask] }));
    setActiveTaskId(nextTask.id);
  };

  const removeActiveTask = () => {
    if (!draft || !activeTask || draft.tasks.length <= 1) return;

    const removeIndex = draft.tasks.findIndex((task) => task.id === activeTask.id);
    if (removeIndex < 0) return;

    const nextTasks = draft.tasks.filter((task) => task.id !== activeTask.id);
    const nextActiveTask = nextTasks[Math.min(removeIndex, nextTasks.length - 1)] ?? nextTasks[0] ?? null;

    updateDraft((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== activeTask.id) }));
    setActiveTaskId(nextActiveTask?.id ?? null);
  };

  if (mode === 'deleted') {
    return (
      <DeletedExamList
        deletedExams={deletedExams}
        moduleName={moduleName}
        onBack={() => setMode('list')}
        onRestore={restoreExam}
      />
    );
  }

  if (mode === 'edit' && draft && activeTask) {
    return (
      <ExamEditor
        activeTask={activeTask}
        draft={draft}
        isSaving={isSaving}
        moduleId={moduleId}
        onAddTask={addTask}
        onBack={() => { setMode('list'); setDraft(null); }}
        onDeleteQuestion={(taskId, questionId) => updateTask(taskId, (task) => ({ ...task, questions: task.questions.filter((question) => question.id !== questionId) }))}
        onRemoveTask={removeActiveTask}
        onSave={saveDraft}
        onSetActiveTask={setActiveTaskId}
        onUpdateFullAudio={updateFullAudio}
        onUpdateDraft={updateDraft}
        onUpdateQuestion={updateQuestion}
        onUpdateTaskAudio={updateTaskAudio}
        onUpdateTask={updateTask}
      />
    );
  }

  return (
    <ExamList
      deletedCount={deletedExams.length}
      exams={visibleExams}
        moduleName={moduleName}
        onCreate={openCreate}
        onDelete={deleteExam}
        onEdit={openEdit}
        onOpenDeleted={() => setMode('deleted')}
      />
  );
}

function rekeyDraftFromSaved(draft: AdminExam, saved: AdminExam): AdminExam {
  return {
    ...draft,
    id: saved.id,
    tasks: draft.tasks.map((task, index) => ({
      ...task,
      id: saved.tasks[index]?.id ?? task.id,
      passageId: saved.tasks[index]?.passageId ?? task.passageId,
      questions: task.questions.map((question, questionIndex) => ({
        ...question,
        id: saved.tasks[index]?.questions[questionIndex]?.id ?? question.id,
      })),
    })),
  };
}

async function uploadPendingAssets(draft: AdminExam, saved: AdminExam, moduleId: AdminExamModuleId) {
  const savedTestId = Number(saved.id);
  if (!savedTestId) return;
  const uploads: Array<Promise<unknown>> = [];

  if (moduleId === 'listening' && draft.fullAudio?.file) {
    uploads.push(listeningApi.uploadTestAudio(savedTestId, draft.fullAudio.file, draft.fullAudio.name, draft.fullAudio.transcriptText));
  }

  draft.tasks.filter(shouldUploadAdminExamTaskAssets).forEach((task, taskIndex) => {
    const savedTask = saved.tasks[taskIndex];
    const savedTaskId = Number(savedTask?.id);

    if (moduleId === 'listening' && task.audio?.file && savedTaskId) {
      uploads.push(listeningApi.uploadPartGroupAudio(savedTestId, savedTaskId, task.audio.file, task.audio.name, task.audio.transcriptText));
    }

    const partGroupImageFile = task.media?.find((media) => media.file)?.file;
    if (partGroupImageFile && savedTaskId) {
      uploads.push(moduleId === 'reading'
        ? readingApi.uploadPartGroupImage(savedTaskId, partGroupImageFile)
        : listeningApi.uploadPartGroupImage(savedTaskId, partGroupImageFile));
    }

    task.questions.forEach((question, questionIndex) => {
      const savedQuestionId = Number(savedTask?.questions[questionIndex]?.id);
      const questionImageFile = question.media.find((media) => media.file)?.file;
      if (questionImageFile && savedQuestionId) {
        uploads.push(moduleId === 'reading'
          ? readingApi.uploadQuestionImage(savedQuestionId, questionImageFile)
          : listeningApi.uploadQuestionImage(savedQuestionId, questionImageFile));
      }
    });
  });

  const results = await Promise.allSettled(uploads);
  const failedUpload = results.find((result) => result.status === 'rejected');
  if (failedUpload?.status === 'rejected') {
    throw failedUpload.reason;
  }
}

function shouldUploadAdminExamTaskAssets(task: AdminExamTask) {
  return task.questions.length > 0
    || Boolean(task.passageContent.trim())
    || Boolean(task.audio?.transcriptText?.trim())
    || Boolean(task.passageId && Number(task.passageId))
    || Boolean(task.id && Number(task.id));
}

function adminExamDraftBackupKey(moduleId: AdminExamModuleId) {
  return `smartielts-admin-${moduleId}-draft`;
}

function ExamList({
  deletedCount,
  exams,
  moduleName,
  onCreate,
  onDelete,
  onEdit,
  onOpenDeleted,
}: {
  deletedCount: number;
  exams: AdminExam[];
  moduleName: string;
  onCreate: () => void;
  onDelete: (examId: string) => void;
  onEdit: (exam: AdminExam) => void;
  onOpenDeleted: () => void;
}) {
  return (
    <div className="admin-grid">
      <AdminExamSectionHeader
        title={`${moduleName} management`}
        description={`Create and manage ${moduleName.toLowerCase()} tests for the admin content library.`}
        action={(
          <div className="admin-inline">
            <button className="admin-secondary-action" type="button" onClick={onOpenDeleted}>Check deleted tests ({deletedCount})</button>
            <button className="admin-primary-action" type="button" onClick={onCreate}>Create {moduleName} test</button>
          </div>
        )}
      />
      <section className="admin-card">
        <div className="admin-module-summary admin-exam-summary admin-table-head">
          <div>Test</div><div>Total score</div><div>Tasks</div><div>Questions</div><div>Timer</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
          {exams.length ? exams.map((exam) => (
            <article key={exam.id} className="admin-module-summary admin-exam-summary">
              <div>
                <strong className="admin-exam-title">{exam.title}</strong>
                <div className="admin-tiny">ID {exam.id} - Updated {displayTime(exam.updatedTime)} - {exam.difficulty}</div>
              </div>
              <div><strong className="admin-exam-number">{getAdminExamScore(exam)}</strong></div>
              <div><strong className="admin-exam-number">{getAdminExamListTaskCount(exam)}</strong></div>
              <div><strong className="admin-exam-number">{getAdminExamListQuestionCount(exam)}</strong></div>
              <div>
                <div>{Math.round(exam.totalSeconds / 60)} mins</div>
                <div className="admin-tiny">{exam.prepSeconds} sec prep</div>
                <div className="admin-tiny">Auto submit : {exam.autoSubmit ? 'Yes' : 'No'}</div>
                <div className="admin-tiny">Pause : {exam.allowPause ? 'Yes' : 'No'}</div>
                {moduleName === 'Listening' && <div className="admin-tiny">Tape position : {exam.allowAudioSeek ? 'Yes' : 'No'}</div>}
              </div>
              <div className="admin-inline admin-exam-actions">
                <button className="admin-primary-action admin-edit-action" type="button" onClick={() => onEdit(exam)}>Edit</button>
                <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onDelete(exam.id)}>Delete</button>
              </div>
            </article>
          )) : <div className="admin-empty-zone">No {moduleName.toLowerCase()} tests loaded.</div>}
        </div>
      </section>
    </div>
  );
}

function DeletedExamList({
  deletedExams,
  moduleName,
  onBack,
  onRestore,
}: {
  deletedExams: AdminExam[];
  moduleName: string;
  onBack: () => void;
  onRestore: (examId: string) => void;
}) {
  return (
    <div className="admin-grid">
      <AdminExamSectionHeader
        title={`Deleted ${moduleName} tests`}
        description="Manage logically deleted tests on a dedicated recovery page."
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to {moduleName} list</button>}
      />
      <section className="admin-card">
        <div className="admin-module-summary admin-exam-summary admin-table-head">
          <div>Test</div><div>Total score</div><div>Tasks</div><div>Questions</div><div>Timer</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
          {deletedExams.length ? deletedExams.map((exam) => (
            <article key={exam.id} className="admin-module-summary admin-exam-summary">
              <div>
                <strong className="admin-exam-title">{exam.title}</strong>
                <div className="admin-tiny">Deleted {displayTime(exam.deletedTime)} - ID {exam.id}</div>
              </div>
              <div><strong className="admin-exam-number">{getAdminExamScore(exam)}</strong></div>
              <div><strong className="admin-exam-number">{getAdminExamListTaskCount(exam)}</strong></div>
              <div><strong className="admin-exam-number">{getAdminExamListQuestionCount(exam)}</strong></div>
              <div>{Math.round(exam.totalSeconds / 60)} mins<div className="admin-tiny">{exam.prepSeconds} sec prep</div></div>
              <div><button className="admin-primary-action admin-restore-action" type="button" onClick={() => onRestore(exam.id)}>Restore</button></div>
            </article>
          )) : <div className="admin-empty-zone">No deleted {moduleName.toLowerCase()} tests.</div>}
        </div>
      </section>
    </div>
  );
}

function ExamEditor({
  activeTask,
  draft,
  isSaving,
  moduleId,
  onAddTask,
  onBack,
  onDeleteQuestion,
  onRemoveTask,
  onSave,
  onSetActiveTask,
  onUpdateFullAudio,
  onUpdateDraft,
  onUpdateQuestion,
  onUpdateTaskAudio,
  onUpdateTask,
}: {
  activeTask: AdminExamTask;
  draft: AdminExam;
  isSaving: boolean;
  moduleId: AdminExamModuleId;
  onAddTask: () => void;
  onBack: () => void;
  onDeleteQuestion: (taskId: string, questionId: string) => void;
  onRemoveTask: () => void;
  onSave: () => void;
  onSetActiveTask: (taskId: string) => void;
  onUpdateFullAudio: (audio: AdminExamAudioAsset | null) => void;
  onUpdateDraft: (updater: (draft: AdminExam) => AdminExam) => void;
  onUpdateQuestion: (taskId: string, questionId: string, updater: (question: AdminExamQuestion) => AdminExamQuestion) => void;
  onUpdateTaskAudio: (taskId: string, audio: AdminExamAudioAsset | null) => void;
  onUpdateTask: (taskId: string, updater: (task: AdminExamTask) => AdminExamTask) => void;
}) {
  const [editorView, setEditorView] = useState<'builder' | 'material' | 'transcript' | 'preview'>('builder');
  const [insertTarget, setInsertTarget] = useState<{ taskId: string; index: number; position: 'before' | 'after' | 'empty' } | null>(null);
  const moduleName = getAdminExamModuleName(moduleId);

  const insertQuestion = (type: AdminExamQuestionType) => {
    const target = insertTarget ?? { taskId: activeTask.id, index: activeTask.questions.length - 1, position: activeTask.questions.length ? 'after' : 'empty' };
    onUpdateTask(target.taskId, (task) => {
      const questions = [...task.questions];
      const nextQuestion = createAdminExamQuestion(type, moduleId);
      if (target.position === 'empty') questions.push(nextQuestion);
      else questions.splice(target.position === 'before' ? target.index : target.index + 1, 0, nextQuestion);
      return { ...task, questions };
    });
    setInsertTarget(null);
  };

  if (editorView === 'material') {
    return (
      <MaterialEditor
        activeTask={activeTask}
        moduleId={moduleId}
        onBack={() => setEditorView('builder')}
        onUpdateTask={(updater) => onUpdateTask(activeTask.id, updater)}
      />
    );
  }

  if (editorView === 'preview') {
    return (
      <StudentPreview
        activeTask={activeTask}
        draft={draft}
        moduleId={moduleId}
        onBack={() => setEditorView('builder')}
      />
    );
  }

  if (editorView === 'transcript') {
    return (
      <TranscriptEditor
        draft={draft}
        onBack={() => setEditorView('builder')}
        onUpdateDraft={onUpdateDraft}
      />
    );
  }

  return (
    <div className="admin-grid">
      <AdminExamSectionHeader
        title={`${moduleName} authoring`}
        description=""
        action={<div className="admin-inline"><button className="admin-secondary-action" type="button" onClick={onBack}>Back to list</button><button className="admin-primary-action" disabled={isSaving} type="button" onClick={onSave}>{isSaving ? 'Saving...' : 'Save changes'}</button></div>}
      />
      <section className="admin-card">
        <h2 className="text-2xl font-bold">Test metadata</h2>
        <div className="admin-divider" />
        <div className="admin-meta-grid">
          <TextInput label="Test title" value={draft.title} onChange={(title) => onUpdateDraft((current) => ({ ...current, title }))} />
          <SelectInput label="Timer mode" value={draft.timerMode} options={[['COUNTDOWN', 'Countdown'], ['NONE', 'None']]} onChange={(timerMode) => onUpdateDraft((current) => ({ ...current, timerMode: timerMode as AdminExam['timerMode'] }))} />
          <div className="admin-time-pair">
            <NumberInput label="Duration minutes" value={Math.round(draft.totalSeconds / 60)} onChange={(minutes) => onUpdateDraft((current) => ({ ...current, totalSeconds: minutes * 60 }))} />
            <NumberInput label="Preparation seconds" value={draft.prepSeconds} onChange={(seconds) => onUpdateDraft((current) => ({ ...current, prepSeconds: Math.max(0, seconds) }))} />
          </div>
          <SelectInput label="Auto submit" value={String(draft.autoSubmit)} options={[['1', 'Yes'], ['0', 'No']]} onChange={(autoSubmit) => onUpdateDraft((current) => ({ ...current, autoSubmit: Number(autoSubmit) as 0 | 1 }))} />
          <SelectInput label="Allow pause" value={String(draft.allowPause)} options={[['1', 'Yes'], ['0', 'No']]} onChange={(allowPause) => onUpdateDraft((current) => ({ ...current, allowPause: Number(allowPause) as 0 | 1 }))} />
        </div>
        {moduleId === 'listening' && (
          <>
            <div className="admin-listening-settings-grid mt-4">
              <SelectInput label="Allow tape position changes" value={String(draft.allowAudioSeek ?? 1)} options={[['1', 'Yes'], ['0', 'No']]} onChange={(allowAudioSeek) => onUpdateDraft((current) => ({ ...current, allowAudioSeek: Number(allowAudioSeek) as 0 | 1 }))} />
              <SelectInput label="Tape assignment" value={draft.audioMode ?? 'FULL_TEST'} options={[['FULL_TEST', 'One tape for whole test'], ['TASK_AUDIO', 'Task 1-3 separate tapes']]} onChange={(audioMode) => onUpdateDraft((current) => ({ ...current, audioMode: audioMode as AdminExam['audioMode'] }))} />
              <button className="admin-secondary-action admin-listening-transcript-action admin-listening-transcript-action-blue" type="button" onClick={() => setEditorView('transcript')}>Edit transcript</button>
            </div>
            {draft.audioMode !== 'TASK_AUDIO' && (
              <AudioPicker
                audio={hasAudioSource(draft.fullAudio) ? draft.fullAudio ?? null : null}
                compact
                label="Listening tape upload"
                note="Upload first, then continue creating questions. Audio processing may take a moment after save."
                onChange={onUpdateFullAudio}
              />
            )}
          </>
        )}
        <div className="admin-info-grid mt-4">
          <MiniMetric label="System score" value={String(getAdminExamScore(draft))} />
          <MiniMetric label="Question count" value={String(getAdminExamUnits(draft))} />
          <MiniMetric label="Preparation" value={`${draft.prepSeconds} sec`} />
          <MiniMetric label="Tasks" value={String(draft.tasks.length)} />
          <MiniMetric label="Current task" value={String(getAdminExamTaskUnits(activeTask))} />
        </div>
      </section>
      <section className="admin-builder-layout">
        <aside className="admin-side">
          <section className="admin-card admin-current-task-card">
            <div className="admin-current-task-head">
              <div>
                <h3 className="text-xl font-bold">Current task</h3>
                <div className="admin-sub">{activeTask.title}</div>
              </div>
            </div>
            <div className="admin-divider" />
            <div className="admin-current-task-stats">
              <MiniMetric label="Blocks" value={String(activeTask.questions.length)} />
              <MiniMetric label="Images" value={String(activeTask.media?.length ?? 0)} />
              <MiniMetric label="Task score" value={String(getAdminExamTaskScore(activeTask))} />
            </div>
            <TextInput label={moduleId === 'reading' ? 'Passage title' : 'Section title'} value={activeTask.passageTitle} onChange={(passageTitle) => onUpdateTask(activeTask.id, (task) => ({ ...task, passageTitle }))} />
            {moduleId === 'reading' && (
              <div className="admin-inline">
                <button className="admin-secondary-action" type="button" onClick={() => setEditorView('material')}>Edit passage page</button>
              </div>
            )}
            <div className="admin-field-group">
              <div className="admin-field-title">Question overview</div>
              <div className="admin-current-question-list">
                {activeTask.questions.length ? activeTask.questions.map((question, index) => (
                  <div key={question.id} className="admin-current-question-item">
                    <div><strong>{questionRange(questionStartNo(draft, activeTask.id, index), getAdminExamQuestionUnits(question))}</strong><span>{getAdminQuestionTypeLabel(moduleId, question.type)}</span></div>
                    <span>{getAdminExamQuestionUnits(question)} item(s)</span>
                  </div>
                )) : <div className="admin-empty-zone admin-empty-zone-compact">No questions in this task.</div>}
              </div>
            </div>
          </section>
        </aside>
        <main className="admin-grid admin-builder-main">
          <div className="admin-task-row">
            <div className="admin-task-tabs">
              {draft.tasks.map((task, index) => (
                <button key={task.id} className={`admin-task-tab ${activeTask.id === task.id ? 'admin-task-tab-active' : ''}`} type="button" onClick={() => onSetActiveTask(task.id)}>Task {index + 1}</button>
              ))}
              <button className="admin-secondary-action admin-icon-action" type="button" onClick={onAddTask}>+</button>
              <button className="admin-secondary-action admin-icon-action" disabled={draft.tasks.length <= 1} type="button" onClick={onRemoveTask}>-</button>
            </div>
            <div className="admin-task-row-actions">
              {moduleId === 'listening' && (
                <CurrentTaskAudioEditor
                  activeTask={activeTask}
                  draft={draft}
                  onUpdateFullAudio={onUpdateFullAudio}
                  onUpdateTaskAudio={onUpdateTaskAudio}
                />
              )}
              <button className="admin-secondary-action" type="button" onClick={() => setEditorView('preview')}>Preview current task</button>
            </div>
          </div>
          <section className="admin-card">
            <div className="admin-toolbar">
              <div>
                <h2 className="text-2xl font-bold">{activeTask.title} question order</h2>
                <div className="admin-sub">Add and edit question blocks for this task.</div>
              </div>
            </div>
            <div className="admin-divider" />
            <div className="admin-grid">
              {activeTask.questions.length ? (
                <>
                  <InsertLine label="Insert question above" onClick={() => setInsertTarget({ taskId: activeTask.id, index: 0, position: 'before' })} />
                  {activeTask.questions.map((question, index) => (
                    <div key={question.id}>
                      <QuestionEditor
                        moduleId={moduleId}
                        question={question}
                        startNo={questionStartNo(draft, activeTask.id, index)}
                        onDelete={() => onDeleteQuestion(activeTask.id, question.id)}
                        onUpdate={(updater) => onUpdateQuestion(activeTask.id, question.id, updater)}
                      />
                      {index < activeTask.questions.length - 1 ? (
                        <InsertLine label="Insert question between" onClick={() => setInsertTarget({ taskId: activeTask.id, index, position: 'after' })} />
                      ) : (
                        <InsertLine label="Insert question below" onClick={() => setInsertTarget({ taskId: activeTask.id, index, position: 'after' })} />
                      )}
                    </div>
                  ))}
                </>
              ) : <InsertLine label="Add question" onClick={() => setInsertTarget({ taskId: activeTask.id, index: 0, position: 'empty' })} />}
            </div>
          </section>
        </main>
      </section>
      {insertTarget && (
        <div className="admin-modal-mask admin-modal-mask-show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInsertTarget(null); }}>
          <section className="admin-modal admin-question-type-modal" role="dialog" aria-modal="true" aria-label="Insert question type">
            <div className="admin-modal-head">
              <div><h2>Insert question block</h2><p className="admin-sub">Choose the IELTS interaction type for this position.</p></div>
              <button className="admin-secondary-action" type="button" onClick={() => setInsertTarget(null)}>Close</button>
            </div>
            <div className="admin-type-grid">
              {getAdminQuestionTypes(moduleId).map((type) => (
                <button key={type} className="admin-type-card" type="button" onClick={() => insertQuestion(type)}>
                  <span className="admin-pill admin-pill-primary">{moduleName}</span>
                  <strong>{getAdminQuestionTypeLabel(moduleId, type)}</strong>
                  <span className="admin-sub">{getQuestionTypeDescription(type)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  moduleId,
  onDelete,
  onUpdate,
  question,
  startNo,
}: {
  moduleId: AdminExamModuleId;
  onDelete: () => void;
  onUpdate: (updater: (question: AdminExamQuestion) => AdminExamQuestion) => void;
  question: AdminExamQuestion;
  startNo: number;
}) {
  return (
    <article className="admin-question-card">
      <div className="admin-question-head">
        <div>
          <span className="admin-pill admin-pill-primary">{getAdminQuestionTypeLabel(moduleId, question.type)}</span>
          <h3 className="mt-2 text-lg font-bold">Questions {questionRange(startNo, getAdminExamQuestionUnits(question))}</h3>
          <div className="admin-sub">{question.title}</div>
        </div>
        <button className="admin-primary-action admin-danger-action" type="button" onClick={onDelete}>Delete</button>
      </div>
      <div className="admin-question-body admin-grid">
        <div className="admin-meta-grid">
          <div className="admin-field admin-readonly-field"><span>Question type</span><strong>{getAdminQuestionTypeLabel(moduleId, question.type)}</strong></div>
        </div>
        <TextareaInput label="Instruction" value={question.instruction} onChange={(instruction) => onUpdate((current) => ({ ...current, instruction }))} rows={2} />
        <TextareaInput label="Prompt" value={question.prompt ?? ''} onChange={(prompt) => onUpdate((current) => ({ ...current, prompt }))} rows={3} />
        <QuestionTypeFields question={question} startNo={startNo} onUpdate={onUpdate} />
        <ImagePicker
          images={question.media}
          label="Question image attachments"
          onChange={(media) => onUpdate((current) => ({ ...current, media }))}
        />
      </div>
    </article>
  );
}

function QuestionTypeFields({
  onUpdate,
  question,
  startNo,
}: {
  onUpdate: (updater: (question: AdminExamQuestion) => AdminExamQuestion) => void;
  question: AdminExamQuestion;
  startNo: number;
}) {
  if (question.type === 'multiple_choice') {
    const options = question.options?.length ? question.options : createAdminExamQuestion('multiple_choice', 'reading').options ?? [];
    return (
      <div className="admin-field-group">
        <SelectInput
          label="Selection mode"
          value={question.selectionMode ?? 'single'}
          options={[['single', 'Single scored question'], ['multiple', 'Multiple scored questions']]}
          onChange={(selectionMode) => onUpdate((current) => ({
            ...current,
            selectionMode: selectionMode as AdminExamQuestion['selectionMode'],
            options,
          }))}
        />
        <p className="admin-field-help">
          Single scored question counts as 1 point even when one or more options are correct; all correct options must be selected to earn the point. Multiple scored questions count each correct option as 1 point, for example 3 correct options out of 6 options count as 3 points.
        </p>
        <div className="admin-field-title">Options</div>
        {options.map((option, index) => (
          <div key={`${option.label}-${index}`} className="admin-list-row admin-option-row">
            <TextInput label="Label" value={option.label} onChange={(label) => onUpdate((current) => ({ ...current, options: replaceAt(options, index, { ...option, label }) }))} />
            <TextInput label="Option text" value={option.text} onChange={(text) => onUpdate((current) => ({ ...current, options: replaceAt(options, index, { ...option, text }) }))} />
            <label className="admin-checkbox-label"><input checked={Boolean(option.correct)} type="checkbox" onChange={(event) => onUpdate((current) => updateChoiceCorrect(current, options, index, event.target.checked))} />Correct</label>
            <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onUpdate((current) => ({ ...current, options: options.filter((_, optionIndex) => optionIndex !== index) }))}>Remove</button>
          </div>
        ))}
        <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onUpdate((current) => ({ ...current, options: [...options, { label: String.fromCharCode(65 + options.length), text: 'New option', correct: false }] }))}>Add option</button>
      </div>
    );
  }

  if (question.type === 'true_false_not_given') {
    const statements = question.statements ?? [];
    return (
      <div className="admin-field-group">
        <div className="admin-field-title">Statements</div>
        {statements.map((statement, index) => (
          <div key={`${question.id}-statement-${index}`} className="admin-list-row admin-statement-row">
            <TextareaInput label={`Statement ${index + 1}`} placeholder="New statement" value={statement.text} onChange={(text) => onUpdate((current) => ({ ...current, statements: replaceAt(statements, index, { ...statement, text }) }))} rows={2} />
            <SelectInput label="Answer" value={statement.answer} options={['TRUE', 'FALSE', 'NOT GIVEN']} onChange={(answer) => onUpdate((current) => ({ ...current, statements: replaceAt(statements, index, { ...statement, answer }) }))} />
            <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onUpdate((current) => ({ ...current, statements: statements.filter((_, statementIndex) => statementIndex !== index) }))}>Remove</button>
          </div>
        ))}
        <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onUpdate((current) => ({ ...current, statements: [...statements, { text: '', answer: 'TRUE' }] }))}>Add statement</button>
      </div>
    );
  }

  if (question.type === 'matching_headings' || question.type === 'matching_information' || question.type === 'matching') {
    const bank = question.bank?.length ? question.bank : (question.headings ?? []).map((heading) => `${heading.label}. ${heading.text}`);
    const answerLabels = getMatchingBankLabels(bank);
    return (
      <div className="admin-grid admin-grid-2">
        <MatchingAnswerBankEditor values={bank} onChange={(nextBank) => onUpdate((current) => ({ ...current, bank: nextBank, headings: undefined, type: 'matching' }))} />
        <PairEditor answerLabels={answerLabels} pairs={question.pairs ?? []} onChange={(pairs) => onUpdate((current) => ({ ...current, pairs }))} />
      </div>
    );
  }

  if (question.type === 'summary_completion' || question.type === 'completion') {
    return (
      <div className="admin-grid">
        <p className="admin-field-help">In the template, use local placeholders only: (1), (2), (3). Do not type real IELTS question numbers inside the brackets. In Question No. below, enter the real IELTS question numbers, such as 14, 15, 16, 17, 18.</p>
        <TextareaInput label="Completion template" value={question.template ?? ''} onChange={(template) => onUpdate((current) => ({ ...current, template }))} rows={4} />
        <BlankEditor blanks={question.blanks ?? []} startNo={startNo} onChange={(blanks) => onUpdate((current) => ({ ...current, blanks }))} />
      </div>
    );
  }

  if (question.type === 'table_completion') {
    return (
      <div className="admin-grid">
        <p className="admin-field-help">Inside table cells, use local placeholders only: (1), (2), (3). In Question No. below, enter the real IELTS question numbers.</p>
        <TableBuilder
          firstRowDark={question.tableHeaderDark ?? true}
          rows={question.tableRows?.length ? question.tableRows : [['Item', 'Detail']]}
          onChange={(tableRows) => onUpdate((current) => ({ ...current, tableRows }))}
          onFirstRowDarkChange={(tableHeaderDark) => onUpdate((current) => ({ ...current, tableHeaderDark }))}
        />
        <BlankEditor blanks={question.blanks ?? []} startNo={startNo} onChange={(blanks) => onUpdate((current) => ({ ...current, blanks }))} />
      </div>
    );
  }

  if (question.type === 'diagram_label') {
    const hotspots = question.hotspots ?? [];
    return (
      <div className="admin-field-group">
        <TextInput label="Diagram title" value={question.diagramTitle ?? ''} onChange={(diagramTitle) => onUpdate((current) => ({ ...current, diagramTitle }))} />
        <div className="admin-field-title">Hotspots</div>
        {hotspots.map((hotspot, index) => (
          <div key={`${hotspot.no}-${index}`} className="admin-list-row admin-mini-row">
            <NumberInput label="No." value={hotspot.no} onChange={(no) => onUpdate((current) => ({ ...current, hotspots: replaceAt(hotspots, index, { ...hotspot, no }) }))} />
            <NumberInput label="X%" value={hotspot.x} onChange={(x) => onUpdate((current) => ({ ...current, hotspots: replaceAt(hotspots, index, { ...hotspot, x }) }))} />
            <NumberInput label="Y%" value={hotspot.y} onChange={(y) => onUpdate((current) => ({ ...current, hotspots: replaceAt(hotspots, index, { ...hotspot, y }) }))} />
            <TextInput label="Answer" value={hotspot.answer} onChange={(answer) => onUpdate((current) => ({ ...current, hotspots: replaceAt(hotspots, index, { ...hotspot, answer }) }))} />
            <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onUpdate((current) => ({ ...current, hotspots: hotspots.filter((_, hotspotIndex) => hotspotIndex !== index) }))}>Remove</button>
          </div>
        ))}
        <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onUpdate((current) => ({ ...current, hotspots: [...hotspots, { no: hotspots.length + 1, x: 30, y: 40, answer: '' }] }))}>Add hotspot</button>
      </div>
    );
  }

  return null;
}

function MatchingAnswerBankEditor({ onChange, values }: { onChange: (values: string[]) => void; values: string[] }) {
  const rows = normalizeMatchingBankRows(values);

  return (
    <div className="admin-field-group">
      <div className="admin-field-title">Answer bank</div>
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="admin-list-row admin-matching-bank-row">
          <div className="admin-matching-label-badge" aria-label={`Answer label ${row.label}`}>{row.label}</div>
          <TextInput label="Matching option" value={row.text} onChange={(text) => onChange(replaceAt(rows, index, { ...row, text }).map(formatMatchingBankRow))} />
          <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index).map(formatMatchingBankRow))}>Remove</button>
        </div>
      ))}
      <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onChange([...rows, { label: String.fromCharCode(65 + rows.length), text: 'New matching option' }].map(formatMatchingBankRow))}>Add option</button>
    </div>
  );
}

function PairEditor({ answerLabels, onChange, pairs }: { answerLabels: string[]; onChange: (pairs: NonNullable<AdminExamQuestion['pairs']>) => void; pairs: NonNullable<AdminExamQuestion['pairs']> }) {
  const fallbackLabels = answerLabels.length ? answerLabels : ['A', 'B', 'C', 'D'];

  return (
    <div className="admin-field-group">
      <div className="admin-field-title">Prompts and answers</div>
      {pairs.map((pair, index) => (
        <div key={`${pair.left}-${index}`} className="admin-list-row admin-pair-row">
          <TextInput label="Answer" value={pair.answer} onChange={(answer) => onChange(replaceAt(pairs, index, { ...pair, answer }))} />
          <TextInput label="Prompt" value={pair.left} onChange={(left) => onChange(replaceAt(pairs, index, { ...pair, left }))} />
          <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onChange(pairs.filter((_, pairIndex) => pairIndex !== index))}>Remove</button>
        </div>
      ))}
      <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onChange([...pairs, { left: 'New prompt', answer: fallbackLabels[pairs.length] ?? String.fromCharCode(65 + pairs.length) }])}>Add prompt</button>
    </div>
  );
}

function normalizeMatchingBankRows(values: string[]) {
  return values.length
    ? values.map((value, index) => parseMatchingBankRow(value, index))
    : ['A', 'B', 'C'].map((label) => ({ label, text: '' }));
}

function parseMatchingBankRow(value: string, index: number) {
  const fallbackLabel = String.fromCharCode(65 + index);
  const match = value.match(/^([A-Za-z0-9ivxlcdmIVXLCDM]+)\s*(?:[.)]|\|)\s*(.*)$/);
  return match ? { label: match[1], text: match[2] } : { label: fallbackLabel, text: value };
}

function formatMatchingBankRow(row: { label: string; text: string }) {
  return `${row.label}. ${row.text}`.trim();
}

function getMatchingBankLabels(values: string[]) {
  return normalizeMatchingBankRows(values).map((row) => row.label).filter(Boolean);
}

function BlankEditor({ blanks, onChange, startNo }: { blanks: AdminExamBlank[]; onChange: (blanks: AdminExamBlank[]) => void; startNo: number }) {
  return (
    <div className="admin-field-group">
      <div className="admin-field-title">Blanks / accepted answers</div>
      <p className="admin-field-help">Template No. is display-only and maps to placeholders in the template: (1), (2), (3). Question No. should match the real IELTS numbering.</p>
      {blanks.map((blank, index) => (
        <div key={`blank-${index}`} className="admin-list-row admin-blank-row">
          <div className="admin-placeholder-index" aria-label={`Template placeholder ${index + 1}`}>
            <span>Template No.</span>
            <strong>{index + 1}</strong>
          </div>
          <NumberInput label="Question No." value={getDisplayBlankNo(blank, index, startNo)} onChange={(no) => onChange(replaceAt(blanks, index, { ...blank, no }))} />
          <TextareaInput
            label="Accepted answers"
            value={(blank.acceptedAnswers.length ? blank.acceptedAnswers : [blank.answer]).filter(Boolean).join('\n')}
            onChange={(value) => {
              const acceptedAnswers = parseAcceptedAnswersInput(value);
              onChange(replaceAt(blanks, index, { ...blank, acceptedAnswers, answer: acceptedAnswers[0] ?? '' }));
            }}
            rows={2}
          />
          <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onChange(blanks.filter((_, blankIndex) => blankIndex !== index))}>Remove</button>
        </div>
      ))}
      <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onChange([...blanks, { no: getNextBlankNo(blanks, startNo), answer: '', acceptedAnswers: [] }])}>Add blank</button>
    </div>
  );
}

function getDisplayBlankNo(blank: AdminExamBlank, index: number, startNo: number) {
  return blank.no < startNo ? startNo + index : blank.no;
}

function getNextBlankNo(blanks: AdminExamBlank[], startNo: number) {
  return blanks.length ? Math.max(...blanks.map((blank, index) => getDisplayBlankNo(blank, index, startNo))) + 1 : startNo;
}

function TableBuilder({ firstRowDark, onChange, onFirstRowDarkChange, rows }: { firstRowDark: boolean; onChange: (rows: string[][]) => void; onFirstRowDarkChange: (firstRowDark: boolean) => void; rows: string[][] }) {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const removeColumn = (columnIndex: number) => {
    if (columnCount <= 1) {
      return;
    }
    onChange(rows.map((row) => row.filter((_, nextColumnIndex) => nextColumnIndex !== columnIndex)));
  };

  return (
    <div className="admin-field-group">
      <div className="admin-table-builder-head">
        <div className="admin-field-title">Table builder</div>
        <div className="admin-inline">
          <button className={`admin-secondary-action ${firstRowDark ? 'admin-secondary-action-active' : ''}`} type="button" onClick={() => onFirstRowDarkChange(!firstRowDark)}>
            {firstRowDark ? 'First row dark' : 'First row plain'}
          </button>
          <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onChange([...rows, Array.from({ length: columnCount }, () => '')])}>Add row</button>
          <button className="admin-secondary-action admin-add-action" type="button" onClick={() => onChange(rows.map((row) => [...row, '']))}>Add column</button>
        </div>
      </div>
      <div className={`admin-table-builder ${firstRowDark ? 'admin-table-builder-dark-first-row' : ''}`}>
        <table>
          <colgroup>
            {Array.from({ length: columnCount }, (_, columnIndex) => <col key={columnIndex} />)}
            <col className="admin-table-builder-action-col" />
          </colgroup>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <td key={columnIndex}>
                    <textarea className="admin-table-cell-input" value={row[columnIndex] ?? ''} onChange={(event) => onChange(rows.map((nextRow, nextRowIndex) => nextRowIndex === rowIndex ? replaceAt(nextRow, columnIndex, event.target.value) : nextRow))} />
                  </td>
                ))}
                <td className="admin-table-builder-action-cell"><button className="admin-primary-action admin-danger-action" type="button" onClick={() => onChange(rows.filter((_, nextRowIndex) => nextRowIndex !== rowIndex))}>Remove row</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {Array.from({ length: columnCount }, (_, columnIndex) => (
                <td key={columnIndex} className="admin-table-column-action-cell">
                  <button
                    className="admin-primary-action admin-danger-action"
                    disabled={columnCount <= 1}
                    type="button"
                    onClick={() => removeColumn(columnIndex)}
                  >
                    Remove column {columnIndex + 1}
                  </button>
                </td>
              ))}
              <td className="admin-table-builder-action-cell" aria-hidden="true" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CurrentTaskAudioList({ allowSeek, audios, onRemove }: { allowSeek: boolean; audios: Array<{ audio: AdminExamAudioAsset; label: string }>; onRemove?: () => void }) {
  const playableAudios = audios.filter(({ audio }) => Boolean(audio.preview));

  if (!playableAudios.length) {
    return null;
  }

  return (
    <div className="admin-current-task-tapes" aria-label="Current task tapes">
      {playableAudios.map(({ audio, label }) => (
        <div key={`${label}-${audio.id || audio.name}`} className="admin-current-task-tape">
          <div className="admin-current-task-tape-main">
            <AudioPlayerControl
              allowSeek={allowSeek}
              className="student-exam-audio admin-audio-player admin-current-task-audio-player"
              durationSeconds={audio.preview ? undefined : 0}
              showSpeedMenu={false}
              showVolume={false}
              showWaveform={false}
              src={audio.preview}
              title={audio.name || label}
            />
          </div>
          {onRemove && (
            <button className="admin-audio-remove-action" type="button" onClick={onRemove}>Remove</button>
          )}
        </div>
      ))}
    </div>
  );
}

function CurrentTaskAudioEditor({
  activeTask,
  draft,
  onUpdateFullAudio,
  onUpdateTaskAudio,
}: {
  activeTask: AdminExamTask;
  draft: AdminExam;
  onUpdateFullAudio: (audio: AdminExamAudioAsset | null) => void;
  onUpdateTaskAudio: (taskId: string, audio: AdminExamAudioAsset | null) => void;
}) {
  if (draft.audioMode === 'TASK_AUDIO') {
    return hasPlayableAudioSource(activeTask.audio) ? (
      <CurrentTaskAudioList
        allowSeek={Boolean(draft.allowAudioSeek)}
        audios={[{ audio: activeTask.audio as AdminExamAudioAsset, label: `${activeTask.title} tape` }]}
        onRemove={() => onUpdateTaskAudio(activeTask.id, null)}
      />
    ) : (
      <AudioPicker
        audio={hasAudioSource(activeTask.audio) ? activeTask.audio ?? null : null}
        compact
        label={`Upload audio for task (${activeTask.title})`}
        note="Upload first, then continue creating questions. Audio processing may take a moment after save."
        onChange={(audio) => onUpdateTaskAudio(activeTask.id, audio)}
      />
    );
  }

  return (
    <CurrentTaskAudioList
      allowSeek={Boolean(draft.allowAudioSeek)}
      audios={getCurrentTaskAudios(draft, activeTask)}
      onRemove={draft.fullAudio ? () => onUpdateFullAudio(null) : undefined}
    />
  );
}

function getCurrentTaskAudios(draft: AdminExam, activeTask: AdminExamTask) {
  if (draft.audioMode === 'TASK_AUDIO') {
    return draft.tasks
      .map((task, index) => hasPlayableAudioSource(task.audio) ? { audio: task.audio as AdminExamAudioAsset, label: task.id === activeTask.id ? `${task.title} tape` : `Task ${index + 1} tape` } : null)
      .filter((audio): audio is { audio: AdminExamAudioAsset; label: string } => Boolean(audio));
  }

  return hasPlayableAudioSource(draft.fullAudio)
    ? [{ audio: draft.fullAudio as AdminExamAudioAsset, label: 'Full test tape' }]
    : [];
}

function AudioPicker({ audio, compact = false, disabled = false, label, note, onChange }: { audio: AdminExamAudioAsset | null; compact?: boolean; disabled?: boolean; label: string; note: string; onChange: (audio: AdminExamAudioAsset | null) => void }) {
  return (
    <label className={`admin-dropzone admin-audio-dropzone ${compact ? 'admin-audio-dropzone-compact' : ''}`}>
      <span className="admin-dropzone-copy"><strong>{label}</strong><span>{note}</span></span>
      {!audio && (
        <input
          accept="audio/mpeg,audio/mp3"
          className="admin-dropzone-input"
          disabled={disabled}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onChange({
              id: adminLocalId('audio'),
            name: file.name,
            size: formatBytes(file.size),
            preview: URL.createObjectURL(file),
            file,
          });
          }}
        />
      )}
      {audio && (
        <div className="admin-audio-file-card">
          <div>
            <strong>{audio.name}</strong>
            <span className="admin-tiny">{audio.size}</span>
          </div>
          <button className="admin-audio-remove-action" type="button" onClick={(event) => { event.preventDefault(); onChange(null); }}>Remove</button>
        </div>
      )}
    </label>
  );
}

function ImagePicker({ images, label, onChange }: { images: NonNullable<AdminExamQuestion['media']>; label: string; onChange: (images: NonNullable<AdminExamQuestion['media']>) => void }) {
  const [previewImage, setPreviewImage] = useState<NonNullable<AdminExamQuestion['media']>[number] | null>(null);

  return (
    <div className="admin-field-group">
      <label className="admin-dropzone">
        <span className="admin-dropzone-copy"><strong>{label}</strong><span>Images preview locally and upload through the existing admin media endpoints after save.</span></span>
        <input
          accept="image/*"
          className="admin-dropzone-input"
          type="file"
          onChange={(event) => {
            const file = Array.from(event.target.files ?? []).find((item) => item.type.startsWith('image/'));
            if (!file) return;
            onChange([{ id: adminLocalId('media'), name: file.name, kind: 'IMAGE' as const, size: formatBytes(file.size), preview: URL.createObjectURL(file), file }]);
          }}
        />
      </label>
      {images.length > 0 && (
        <div className="admin-question-image-preview-grid">
          {images.map((image) => (
            <div key={image.id} className="admin-question-image-card">
              <strong>{image.name}</strong>
              <span className="admin-tiny">{image.size}</span>
              {image.preview && (
                <button className="admin-image-preview-button" type="button" onClick={() => setPreviewImage(image)}>
                  <img src={image.preview} alt={image.name} />
                </button>
              )}
              <button className="admin-secondary-action mt-2" type="button" onClick={() => onChange(images.filter((item) => item.id !== image.id))}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {previewImage?.preview && (
        <ImageLightbox
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
          src={previewImage.preview}
        />
      )}
    </div>
  );
}

function MaterialEditor({ activeTask, moduleId, onBack, onUpdateTask }: { activeTask: AdminExamTask; moduleId: AdminExamModuleId; onBack: () => void; onUpdateTask: (updater: (task: AdminExamTask) => AdminExamTask) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const applyBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = activeTask.passageContent.slice(start, end);
    if (!selected) return;
    const beforeSelection = activeTask.passageContent.slice(0, start);
    const afterSelection = activeTask.passageContent.slice(end);
    const selectedWithMarkers = selected.startsWith('**') && selected.endsWith('**') && selected.length > 4;
    const wrappedByMarkers = beforeSelection.endsWith('**') && afterSelection.startsWith('**');
    const nextContent = selectedWithMarkers
      ? `${beforeSelection}${selected.slice(2, -2)}${afterSelection}`
      : wrappedByMarkers
        ? `${beforeSelection.slice(0, -2)}${selected}${afterSelection.slice(2)}`
        : `${beforeSelection}**${selected}**${afterSelection}`;
    onUpdateTask((task) => ({ ...task, passageContent: nextContent }));
    window.requestAnimationFrame(() => {
      textarea.focus();
      if (selectedWithMarkers) {
        textarea.setSelectionRange(start, end - 4);
      } else if (wrappedByMarkers) {
        textarea.setSelectionRange(start - 2, end - 2);
      } else {
        textarea.setSelectionRange(start + 2, end + 2);
      }
    });
  };

  return (
    <div className="admin-grid">
      <AdminExamSectionHeader
        className="admin-material-page-title"
        title={moduleId === 'reading' ? `${activeTask.title} passage page` : `${activeTask.title} data`}
        description=""
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to authoring</button>}
      />
      <section className="admin-material-editor-shell">
        <div className="admin-material-document">
          <div className="admin-material-toolbar">
            <button className="admin-secondary-action admin-format-action" type="button" onClick={applyBold}>Bold</button>
            <button className="admin-secondary-action" type="button" onClick={() => setIsPreviewOpen(true)}>Preview</button>
          </div>
          <TextInput label={moduleId === 'reading' ? 'Passage title' : 'Section title'} value={activeTask.passageTitle} onChange={(passageTitle) => onUpdateTask((task) => ({ ...task, passageTitle }))} />
          <TextareaInput inputRef={textareaRef} label={moduleId === 'reading' ? 'Passage content' : 'Section notes'} textareaClassName="admin-word-textarea" value={activeTask.passageContent} onChange={(passageContent) => onUpdateTask((task) => ({ ...task, passageContent }))} rows={16} />
        </div>
      </section>
      {isPreviewOpen && (
        <div className="admin-modal-mask admin-modal-mask-show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPreviewOpen(false); }}>
          <section className="admin-modal admin-material-preview-modal" role="dialog" aria-modal="true" aria-label="Passage preview">
            <div className="admin-modal-head">
              <div>
                <h2>Passage preview</h2>
              </div>
              <button className="admin-secondary-action" type="button" onClick={() => setIsPreviewOpen(false)}>Close</button>
            </div>
            <div className="admin-material-preview-body">
              <h2 className="admin-material-preview-title">{activeTask.passageTitle || 'Untitled material'}</h2>
              <div>{renderFormattedMaterial(activeTask.passageContent || 'Material content will appear here.')}</div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TranscriptEditor({ draft, onBack, onUpdateDraft }: { draft: AdminExam; onBack: () => void; onUpdateDraft: (updater: (draft: AdminExam) => AdminExam) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState(draft.tasks[0]?.id ?? '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const selectedTask = draft.tasks.find((task) => task.id === selectedTaskId) ?? draft.tasks[0] ?? null;
  const isTaskAudio = draft.audioMode === 'TASK_AUDIO';
  const transcriptText = isTaskAudio ? selectedTask?.audio?.transcriptText ?? '' : draft.fullAudio?.transcriptText ?? '';

  useEffect(() => {
    if (!isTaskAudio) return;
    if (!selectedTask || !draft.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(draft.tasks[0]?.id ?? '');
    }
  }, [draft.tasks, isTaskAudio, selectedTask, selectedTaskId]);

  const updateTranscript = (transcriptText: string) => {
    if (isTaskAudio && selectedTask) {
      onUpdateDraft((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (
          task.id === selectedTask.id
            ? { ...task, audio: { ...createTranscriptAudioAsset(task.audio), transcriptText } }
            : task
        )),
      }));
      return;
    }

    onUpdateDraft((current) => ({
      ...current,
      fullAudio: { ...createTranscriptAudioAsset(current.fullAudio), transcriptText },
    }));
  };

  return (
    <div className="admin-grid">
      <AdminExamSectionHeader
        className="admin-material-page-title"
        title="Listening transcript"
        description=""
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to authoring</button>}
      />
      <section className="admin-material-editor-shell">
        <div className="admin-material-document">
          <div className="admin-material-toolbar">
            {isTaskAudio ? (
              <div className="admin-transcript-task-select">
                <SelectInput
                  label="Transcript target"
                  value={selectedTask?.id ?? ''}
                  options={draft.tasks.map((task, index) => [task.id, `Task ${index + 1}`] as [string, string])}
                  onChange={setSelectedTaskId}
                />
              </div>
            ) : (
              <span className="admin-transcript-target-label">Whole test</span>
            )}
            <button className="admin-secondary-action" type="button" onClick={() => setIsPreviewOpen(true)}>Preview</button>
          </div>
          <TextareaInput inputRef={textareaRef} label="Transcript content" textareaClassName="admin-word-textarea" value={transcriptText} onChange={updateTranscript} rows={16} />
        </div>
      </section>
      {isPreviewOpen && (
        <div className="admin-modal-mask admin-modal-mask-show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPreviewOpen(false); }}>
          <section className="admin-modal admin-material-preview-modal" role="dialog" aria-modal="true" aria-label="Transcript preview">
            <div className="admin-modal-head">
              <div>
                <h2>Transcript preview</h2>
              </div>
              <button className="admin-secondary-action" type="button" onClick={() => setIsPreviewOpen(false)}>Close</button>
            </div>
            <div className="admin-material-preview-body">
              {renderPlainTranscript(transcriptText || 'Transcript content will appear here.')}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StudentPreview({ activeTask, draft, moduleId, onBack }: { activeTask: AdminExamTask; draft: AdminExam; moduleId: AdminExamModuleId; onBack: () => void }) {
  const [previewTaskId, setPreviewTaskId] = useState(activeTask.id);
  const previewTask = draft.tasks.find((task) => task.id === previewTaskId) ?? activeTask;
  const previewAudio = draft.audioMode === 'FULL_TEST' ? draft.fullAudio : previewTask.audio;
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, PracticeAnswerValue>>({});
  const [previewNotes, setPreviewNotes] = useState<Record<string, string>>({});
  const [previewDraftLines, setPreviewDraftLines] = useState<Record<string, string>>({});
  const [previewNotePage, setPreviewNotePage] = useState(0);
  const previewQuestions = previewTask.questions.flatMap((question, index) => (
    adminQuestionToPracticeQuestions(question, previewTask, questionStartNo(draft, previewTask.id, index))
  ));

  useEffect(() => {
    setPreviewTaskId(activeTask.id);
  }, [activeTask.id]);

  const updatePreviewAnswer = (questionId: string, value: PracticeAnswerValue) => {
    setPreviewAnswers((current) => {
      const isEmpty = Array.isArray(value) ? value.length === 0 : value === '';
      if (!isEmpty) {
        return { ...current, [questionId]: value };
      }

      const nextAnswers = { ...current };
      delete nextAnswers[questionId];
      return nextAnswers;
    });
  };

  if (moduleId === 'reading') {
    return (
      <div className="admin-preview-shell">
        <div className="admin-preview-toolbar">
          <div className="admin-preview-title-side">
            <span>Student preview</span>
            <PreviewTaskJump activeTaskId={previewTask.id} tasks={draft.tasks} onSelectTask={setPreviewTaskId} />
          </div>
          <div className="admin-preview-actions">
            <button className="admin-secondary-action" type="button" onClick={onBack}>Back to authoring</button>
          </div>
        </div>
        <section className="student-exam-page student-exam-page-reading admin-student-exam-preview">
          <section className="student-exam-split">
            <aside className="student-exam-pane student-exam-passage-pane">
              <article className="student-exam-card">
                <h3>{previewTask.passageTitle || previewTask.title}</h3>
                <div className="admin-preview-passage-body">
                  {renderFormattedMaterial(previewTask.passageContent || 'No passage material is attached to this test yet.')}
                </div>
              </article>
            </aside>
            <div className="student-exam-divider" aria-hidden="true" />
            <main className="student-exam-pane student-exam-question-pane">
              <h3>{previewTask.title}</h3>
              <StudentExamQuestionPanel answers={previewAnswers} displayMode="list" hideQuestionNumberBadge onAnswerChange={updatePreviewAnswer} questions={previewQuestions} />
            </main>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-preview-shell">
      <div className="admin-preview-toolbar">
        <div className="admin-preview-title-side">
          <span>Student preview</span>
          <PreviewTaskJump activeTaskId={previewTask.id} tasks={draft.tasks} onSelectTask={setPreviewTaskId} />
        </div>
        <div className="admin-preview-actions">
          <button className="admin-secondary-action" type="button" onClick={onBack}>Back to authoring</button>
        </div>
      </div>
      <section className="student-exam-page student-exam-page-listening admin-student-exam-preview admin-student-listening-preview">
        <section className="student-exam-listening-layout">
          <div className="student-exam-listening-top admin-student-listening-preview-top">
            <div aria-hidden="true" />
            <div aria-hidden="true" />
            <AudioPlayerControl
              allowSeek={Boolean(draft.allowAudioSeek)}
              className="student-exam-audio admin-audio-player"
              durationSeconds={previewAudio?.preview ? undefined : 0}
              showSpeedMenu={false}
              showVolume={false}
              showWaveform={false}
              src={previewAudio?.preview}
              title={previewAudio?.name ?? 'Listening tape'}
            />
          </div>
          <section className="student-exam-listening-body admin-student-listening-reading-format">
            <ListeningPreviewNotes
              draftLines={previewDraftLines}
              notePage={previewNotePage}
              notes={previewNotes}
              questions={previewQuestions}
              onDraftLineChange={(lineKey, value) => setPreviewDraftLines((current) => ({ ...current, [lineKey]: value }))}
              onNoteChange={(questionNumber, value) => setPreviewNotes((current) => ({ ...current, [String(questionNumber)]: value }))}
              onNotePageChange={(nextPage) => setPreviewNotePage(Math.max(0, nextPage))}
            />
            <div className="student-exam-divider" aria-hidden="true" />
            <main className="student-exam-listening-answers admin-student-listening-answer-pane">
              <StudentExamQuestionPanel answers={previewAnswers} displayMode="list" hideQuestionNumberBadge notes={previewNotes} onAnswerChange={updatePreviewAnswer} questions={previewQuestions} />
            </main>
          </section>
        </section>
      </section>
    </div>
  );
}

function PreviewTaskJump({ activeTaskId, onSelectTask, tasks }: { activeTaskId: string; onSelectTask: (taskId: string) => void; tasks: AdminExamTask[] }) {
  return (
    <div className="admin-preview-task-jump" aria-label="Preview task navigation">
      {tasks.map((task, index) => (
        <button
          key={task.id}
          className={`admin-preview-task-button ${task.id === activeTaskId ? 'admin-preview-task-button-active' : ''}`}
          type="button"
          onClick={() => onSelectTask(task.id)}
        >
          Task {index + 1}
        </button>
      ))}
    </div>
  );
}

function adminQuestionToPracticeQuestions(question: AdminExamQuestion, task: AdminExamTask, startNo: number): PracticeQuestion[] {
  const base = {
    passageId: Number(task.passageId) || undefined,
    partGroupId: stablePreviewNumber(task.id),
    score: 1,
    groupGuideText: question.instruction,
    groupRequirementText: question.prompt,
    imageUrl: question.media[0]?.preview ?? undefined,
    imageUrls: question.media.map((image) => image.preview).filter((value): value is string => Boolean(value)),
  };

    if (question.type === 'true_false_not_given') {
      const statements = question.statements?.length ? question.statements : [{ text: question.prompt ?? question.title, answer: 'TRUE' }];
      return statements.map((statement, index) => ({
        ...base,
        id: stablePreviewNumber(`${question.id}-${index}`),
        questionNumber: startNo + index,
        questionType: 'TRUE_FALSE_NOT_GIVEN',
      answerMode: 'SINGLE',
      questionText: statement.text,
      options: [],
      blanks: [],
      bank: [],
      pairs: [],
    }));
  }

  if (question.type === 'summary_completion' || question.type === 'completion' || question.type === 'table_completion') {
    const blanks = question.blanks?.length ? question.blanks : [{ no: 1, answer: '', acceptedAnswers: [] }];
    const template = question.type === 'table_completion'
      ? (question.tableRows ?? []).map((row) => row.join(' | ')).join('\n')
      : question.template ?? question.prompt ?? question.title;

    return blanks.map((blank, index) => ({
      ...base,
      id: stablePreviewNumber(`${question.id}-${blank.no}-${index}`),
      questionNumber: startNo + index,
      questionType: 'FILL_BLANK',
      answerMode: 'TEXT',
      questionText: template,
      options: [],
      template,
      tableRows: question.type === 'table_completion' ? question.tableRows : undefined,
      tableHeaderDark: question.type === 'table_completion' ? question.tableHeaderDark ?? true : undefined,
      blanks: [{ no: blank.no, questionId: stablePreviewNumber(`${question.id}-${blank.no}-${index}`), questionNumber: startNo + index }],
      bank: [],
      pairs: [],
    }));
  }

  if (question.type === 'matching' || question.type === 'matching_headings' || question.type === 'matching_information') {
    const pairs = question.pairs?.length ? question.pairs : [{ left: question.prompt ?? question.title, answer: '' }];
    const bank = question.bank?.length
      ? question.bank
      : (question.headings ?? []).map((heading) => `${heading.label}. ${heading.text}`);

    return pairs.map((pair, index) => ({
      ...base,
      id: stablePreviewNumber(`${question.id}-${index}`),
      questionNumber: startNo + index,
      questionType: 'MATCHING',
      answerMode: 'SINGLE',
      questionText: pair.left,
      options: [],
      blanks: [],
      bank,
      pairs: [{ left: pair.left, answer: pair.answer }],
    }));
  }

  if (question.type === 'diagram_label') {
    const hotspots = question.hotspots?.length ? question.hotspots : [{ no: 1, x: 30, y: 40, answer: '' }];
    return hotspots.map((hotspot, index) => ({
      ...base,
      id: stablePreviewNumber(`${question.id}-${hotspot.no}-${index}`),
      questionNumber: startNo + index,
      questionType: 'FILL_BLANK',
      answerMode: 'TEXT',
      questionText: `${question.diagramTitle || 'Diagram'} label (${hotspot.no})`,
      options: [],
      template: `${question.diagramTitle || 'Diagram'} label (${hotspot.no})`,
      blanks: [{ no: hotspot.no, questionId: stablePreviewNumber(`${question.id}-${hotspot.no}-${index}`), questionNumber: startNo + index }],
      bank: [],
      pairs: [],
    }));
  }

  return [{
    ...base,
    id: stablePreviewNumber(question.id),
    questionNumber: startNo,
    questionNoEnd: question.selectionMode === 'multiple' ? startNo + getAdminExamQuestionUnits(question) - 1 : startNo,
    questionType: 'MULTIPLE_CHOICE',
    answerMode: getCorrectOptionCount(question) > 1 ? 'MULTIPLE' : 'SINGLE',
    questionText: question.prompt ?? '',
    options: (question.options ?? []).map((option) => ({ label: option.label, text: option.text })),
    blanks: [],
    bank: [],
    pairs: [],
  }];
}

function stablePreviewNumber(value: string) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function StudentQuestion({ question, startNo }: { question: AdminExamQuestion; startNo: number }) {
  const [previewImage, setPreviewImage] = useState<NonNullable<AdminExamQuestion['media']>[number] | null>(null);

  return (
    <article className="admin-student-question">
      <div className="admin-inline"><span className="admin-pill admin-pill-primary">{questionRange(startNo, getAdminExamQuestionUnits(question))}</span><span className="admin-pill admin-pill-blue">{question.title}</span></div>
      <p className="mt-3">{question.instruction}</p>
      {question.prompt && <p><strong>{question.prompt}</strong></p>}
      {question.media.length > 0 && (
        <div className="admin-question-image-preview-grid">
          {question.media.map((image) => image.preview ? (
            <button key={image.id} className="admin-image-preview-button" type="button" onClick={() => setPreviewImage(image)}>
              <img className="admin-student-uploaded-image" src={image.preview} alt={image.name} />
            </button>
          ) : null)}
        </div>
      )}
      {renderStudentQuestionBody(question, startNo)}
      {previewImage?.preview && (
        <ImageLightbox
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
          src={previewImage.preview}
        />
      )}
    </article>
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

function renderStudentQuestionBody(question: AdminExamQuestion, startNo: number) {
  if (question.type === 'multiple_choice') {
    const inputType = getCorrectOptionCount(question) > 1 ? 'checkbox' : 'radio';
    return <div>{(question.options ?? []).map((option) => <label key={option.label} className="admin-student-option"><input name={question.id} type={inputType} />{option.label}. {option.text}</label>)}</div>;
  }
  if (question.type === 'true_false_not_given') {
    return <>{(question.statements ?? []).map((statement, index) => <div key={index} className="admin-student-preview-row"><span className="admin-student-qno">Q{startNo + index}</span><span>{statement.text}</span><select className="admin-student-select"><option>TRUE</option><option>FALSE</option><option>NOT GIVEN</option></select></div>)}</>;
  }
  if (question.type === 'summary_completion' || question.type === 'completion') {
    return <TemplatePreview text={question.template ?? ''} startNo={startNo} />;
  }
  if (question.type === 'table_completion') {
    return <div className="admin-student-table-wrap"><table className="admin-student-table"><tbody>{(question.tableRows ?? []).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}><TemplatePreview text={cell} startNo={startNo} /></th> : <td key={cellIndex}><TemplatePreview text={cell} startNo={startNo} /></td>)}</tr>)}</tbody></table></div>;
  }
  if (question.type === 'diagram_label') {
    return <div className="admin-diagram"><strong>{question.diagramTitle || 'Diagram'}</strong>{(question.hotspots ?? []).map((hotspot) => <div key={hotspot.no} className="admin-student-preview-row"><span className="admin-student-qno">Q{hotspot.no}</span><input className="admin-student-blank-input" /></div>)}</div>;
  }
  const bankRows = normalizeMatchingBankRows(question.bank ?? question.headings?.map((heading) => `${heading.label}. ${heading.text}`) ?? []);
  return (
    <div className="admin-student-preview-matching">
      <div className="admin-student-matching-bank">
        {bankRows.map((item) => (
          <div key={`${item.label}-${item.text}`} className="admin-student-match-chip">
            <strong>{item.label}</strong>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      <div className="admin-student-matching-list">
        {(question.pairs ?? []).map((pair, index) => (
          <div key={index} className="admin-student-match-row">
            <span className="admin-student-qno">Q{startNo + index}</span>
            <span className="admin-student-match-prompt">{pair.left}</span>
            <select className="admin-student-select" defaultValue="">
              <option value="" disabled>Choose option</option>
              {bankRows.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatePreview({ startNo, text }: { startNo: number; text: string }) {
  const parts = text.split(/(\(\d+\))/g);
  return (
    <span className="admin-student-inline-template">
      {parts.map((part, index) => {
        const match = part.match(/^\((\d+)\)$/);
        const questionNumber = match ? startNo + Number(match[1]) - 1 : null;
        return match ? (
          <label key={index} className="admin-student-blank-control">
            <span className="admin-student-blank-label">Q{questionNumber} -</span>
            <input className="admin-student-blank-input" placeholder={`Q${questionNumber}`} />
          </label>
        ) : part;
      })}
    </span>
  );
}

function InsertLine({ label = 'Insert question here', onClick }: { label?: string; onClick: () => void }) {
  return <div className="admin-insert-line"><button className="admin-insert-action" type="button" onClick={onClick}>{label}</button></div>;
}

function AdminExamSectionHeader({ action, className = '', description, title }: { action?: React.ReactNode; className?: string; description: string; title: string }) {
  return (
    <section className={`admin-page-title ${className}`}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input className="admin-input" min="0" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TextareaInput({ inputRef, label, onChange, placeholder, rows = 3, textareaClassName = '', value }: { inputRef?: RefObject<HTMLTextAreaElement | null>; label: string; onChange: (value: string) => void; placeholder?: string; rows?: number; textareaClassName?: string; value: string }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea ref={inputRef} className={`admin-textarea ${textareaClassName}`} placeholder={placeholder} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function renderFormattedMaterial(value: string) {
  const lines = value.split('\n');

  return lines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => (
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : <span key={partIndex}>{part}</span>
      ))}
      {lineIndex < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function renderPlainTranscript(value: string) {
  const lines = value.split('\n');

  return lines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      <span>{line}</span>
      {lineIndex < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function createTranscriptAudioAsset(audio: AdminExamAudioAsset | null | undefined): AdminExamAudioAsset {
  return {
    id: audio?.id ?? '',
    name: audio?.name ?? '',
    size: audio?.size ?? '',
    preview: audio?.preview ?? '',
    durationLabel: audio?.durationLabel,
    file: audio?.file,
    transcriptText: audio?.transcriptText ?? '',
  };
}

function hasAudioSource(audio: AdminExamAudioAsset | null | undefined) {
  return Boolean(audio?.file || audio?.id || audio?.preview || audio?.name);
}

function hasPlayableAudioSource(audio: AdminExamAudioAsset | null | undefined) {
  return Boolean(audio?.preview);
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<string | [string, string]>;
  value: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select className="admin-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const [optionValue, labelText] = Array.isArray(option) ? option : [option, option];
          return <option key={optionValue} value={optionValue}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function updateChoiceCorrect(question: AdminExamQuestion, options: AdminExamOption[], index: number, checked: boolean): AdminExamQuestion {
  const nextOptions = replaceAt(options, index, { ...options[index], correct: checked });

  return {
    ...question,
    selectionMode: question.selectionMode ?? 'single',
    options: nextOptions,
  };
}

function getCorrectOptionCount(question: AdminExamQuestion) {
  return (question.options ?? []).filter((option) => option.correct).length;
}

function questionStartNo(exam: AdminExam, taskId: string, questionIndex: number) {
  let startNo = 1;

  for (const task of exam.tasks) {
    if (task.id === taskId) {
      return task.questions.slice(0, questionIndex).reduce((sum, question) => sum + getAdminExamQuestionUnits(question), startNo);
    }

    startNo += getAdminExamTaskUnits(task);
  }

  return startNo;
}

function getAdminExamTaskScore(task?: AdminExamTask) {
  return (task?.questions ?? []).reduce((sum, question) => (
    sum + getAdminExamQuestionUnits(question)
  ), 0);
}

function questionRange(startNo: number, units: number) {
  return units <= 1 ? `Q${startNo}` : `Q${startNo}-${startNo + units - 1}`;
}

function splitLabelText(value: string, fallbackLabel: string) {
  const match = value.match(/^([A-Za-z0-9ivxlcdmIVXLCDM]+)\.\s*(.*)$/);
  return match ? { label: match[1], text: match[2] } : { label: fallbackLabel, text: value };
}

function adminLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
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

function getQuestionTypeDescription(type: AdminExamQuestionType) {
  const descriptions: Record<AdminExamQuestionType, string> = {
    multiple_choice: 'Answer with radio buttons or checkboxes.',
    true_false_not_given: 'IELTS Reading TRUE / FALSE / NOT GIVEN statement list.',
    matching_headings: 'Matching answer bank with prompt rows.',
    matching_information: 'Matching answer bank with prompt rows.',
    summary_completion: 'Template text with numbered blanks and accepted answers.',
    diagram_label: 'Diagram labels with hotspot coordinates and accepted answers.',
    completion: 'Listening completion prompts with numbered blanks.',
    matching: 'Matching answer bank with prompt rows.',
    table_completion: 'Table builder with numbered blank placeholders.',
  };
  return descriptions[type];
}

function displayTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 19) : 'Not recorded';
}

