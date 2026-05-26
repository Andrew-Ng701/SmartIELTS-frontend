import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { adminApi } from '../../../api/adminApi';
import { adminUsersApi } from '../../../api/adminUsersApi';
import { consoleApi } from '../../../api/consoleApi';
import { getApiErrorMessage } from '../../../api/errors';
import { listeningApi } from '../../../api/listeningApi';
import { readingApi } from '../../../api/readingApi';
import { speakingApi } from '../../../api/speakingApi';
import { writingApi } from '../../../api/writingApi';
import brandIcon from '../../../assets/brand-icon-cropped.png';
import type { UserAdminVO } from '../../../contracts/user';
import { AdminReadingListeningPage, mapApiAdminExam } from '../exams';
import type { AdminExam, AdminExamModuleId } from '../exams';
import { AdminRecordsPage } from '../records';
import {
  AdminUxDeletedSpeakingPage,
  AdminUxSpeaking,
  AdminUxSpeakingForm,
  buildSpeakingQuestionRows,
  createAdminSpeakingDraft,
  mapApiAdminSpeakingTopics,
} from '../speaking';
import type { AdminSpeakingMode, AdminSpeakingTopic } from '../speaking';
import { AdminUsersPage } from '../users';
import type { AdminUserDetailUser } from '../users/adminUserDetailModel';
import {
  AdminUxDeletedWritingPage,
  AdminUxWriting,
  AdminUxWritingForm,
  AdminWritingStudentPreview,
  buildWritingQuestionPayload,
  createAdminWritingDraft,
  mapApiAdminWritingQuestion,
} from '../writing';
import type { AdminWritingQuestion, AdminWritingTaskType } from '../writing';
import { mapApiRecordToAdminRecord, normalizePageList } from '../../user/records';
import type { AdminRecordRow } from '../../user/records';
import { AdminOverviewPage } from './AdminOverviewPage';
import { mapAdminConsoleToSnapshot } from './adminOverviewModel';
import type { AdminDashboardSnapshot, AdminOverviewView } from './adminOverviewModel';

type AdminConsoleView = AdminOverviewView;
type AdminEditorMode = 'list' | 'deleted';

export function AdminConsolePage({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<AdminConsoleView>('overview');
  const [editorMode, setEditorMode] = useState<AdminEditorMode>('list');
  const [adminSnapshot, setAdminSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [adminError, setAdminError] = useState('');
  const [users, setUsers] = useState<AdminUserDetailUser[]>([]);
  const [adminRecords, setAdminRecords] = useState<AdminRecordRow[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [writingView, setWritingView] = useState<AdminWritingTaskType>('TASK_1');
  const [writingQuestions, setWritingQuestions] = useState<AdminWritingQuestion[]>([]);
  const [writingDraft, setWritingDraft] = useState<AdminWritingQuestion | null>(null);
  const [isWritingPreviewOpen, setIsWritingPreviewOpen] = useState(false);
  const [speakingView, setSpeakingView] = useState<AdminSpeakingMode>('TOPIC_1');
  const [speakingTopics, setSpeakingTopics] = useState<AdminSpeakingTopic[]>([]);
  const [speakingDraft, setSpeakingDraft] = useState<AdminSpeakingTopic | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadAdminData = async () => {
      try {
        const [
          consoleData,
          userData,
          deletedUserData,
          recordData,
          readingData,
          listeningData,
          writingData,
          speakingData,
        ] = await Promise.all([
          consoleApi.getAdminConsole(),
          adminUsersApi.listUsers({ pageNum: 1, pageSize: 200 }),
          adminUsersApi.listDeletedUsers({ pageNum: 1, pageSize: 200 }),
          adminApi.listRecords({ pageNum: 1, pageSize: 200 }),
          loadAllAdminTests('reading'),
          loadAllAdminTests('listening'),
          writingApi.listAdminQuestions({ pageNum: 1, pageSize: 200 }),
          speakingApi.listAdminQuestions({ pageNum: 1, pageSize: 200 }),
        ]);

        if (cancelled) return;

        const activeUsers = normalizePageList(userData.users).map(mapApiAdminUser);
        const deletedUsers = normalizePageList(deletedUserData).map(mapApiAdminUser);
        setAdminSnapshot(mapAdminConsoleToSnapshot(consoleData));
        setUsers([...activeUsers, ...deletedUsers]);
        setAdminRecords(normalizePageList(recordData).map(mapApiRecordToAdminRecord));
        setExams([
          ...normalizeApiList(readingData).map((item) => mapApiAdminExam(item, 'reading')),
          ...normalizeApiList(listeningData).map((item) => mapApiAdminExam(item, 'listening')),
        ]);
        setWritingQuestions(normalizeApiList(writingData).map(mapApiAdminWritingQuestion));
        setSpeakingTopics(mapApiAdminSpeakingTopics(normalizeApiList(speakingData)));
        setAdminError('');
      } catch (error) {
        if (!cancelled) {
          setAdminError(getApiErrorMessage(error, 'Unable to load admin console data.'));
        }
      }
    };

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (message: string) => setToast(message);
  const moduleId: AdminExamModuleId = activeView === 'listening' ? 'listening' : 'reading';

  const titleEntries = (exclude?: { scope: string; id: string }) => [
    ...exams.filter((exam) => !exam.deletedTime).map((exam) => ({ scope: exam.module.toLowerCase(), id: exam.id, title: exam.title })),
    ...writingQuestions.filter((question) => !question.deletedTime).map((question) => ({ scope: 'writing', id: question.id, title: question.title })),
    ...speakingTopics.filter((topic) => !topic.deletedTime).map((topic) => ({ scope: 'speaking', id: topic.id, title: topic.topic })),
  ].filter((entry) => !(exclude && entry.scope === exclude.scope && entry.id === exclude.id));

  const validateTitle = (title: string, exclude?: { scope: string; id: string }) => {
    const raw = title.trim();
    if (!raw) {
      showToast('Enter a title before saving.');
      return false;
    }
    const key = normalizeTitle(raw);
    const duplicate = titleEntries(exclude).find((entry) => normalizeTitle(entry.title) === key);
    if (duplicate) {
      showToast(`Title already exists: ${duplicate.title}`);
      return false;
    }
    return true;
  };

  const navigateAdmin = (view: AdminConsoleView) => {
    setActiveView(view);
    setEditorMode('list');
    setWritingDraft(null);
    setIsWritingPreviewOpen(false);
    setSpeakingDraft(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWritingDraft = (question?: AdminWritingQuestion) => {
    setIsWritingPreviewOpen(false);
    setWritingDraft(question ? structuredClone(question) : createAdminWritingDraft(writingView));
  };

  const saveWritingDraft = async () => {
    if (!writingDraft || !validateTitle(writingDraft.title, { scope: 'writing', id: writingDraft.id })) return;
    if (!writingDraft.expectedWords || writingDraft.expectedWords < 1) {
      showToast('Enter expected words before saving.');
      return;
    }
    if (writingDraft.totalSeconds < 60) {
      showToast('Enter total exam time before saving.');
      return;
    }
    const saved: AdminWritingQuestion = {
      ...writingDraft,
      title: writingDraft.title.trim(),
      chartType: writingDraft.taskType === 'TASK_1' ? writingDraft.chartType : undefined,
      updatedTime: nowIso(),
    };
    try {
      const uploadedImages = saved.media
        .filter((media) => media.kind === 'IMAGE' && media.file)
        .map((media) => media.file as File);
      const backendSaved = Number(saved.id)
        ? await writingApi.updateAdminQuestion(Number(saved.id), buildWritingQuestionPayload(saved))
        : await writingApi.createAdminQuestion(buildWritingQuestionPayload(saved));
      const backendSavedRecord = backendSaved as Record<string, unknown>;
      const savedQuestionId = Number(backendSavedRecord.id ?? backendSavedRecord.questionId ?? backendSavedRecord.question_id ?? saved.id);
      let backendDetail = backendSaved;
      let uploadedImageData: unknown = null;
      let mediaUploadError = '';

      if (savedQuestionId && uploadedImages.length) {
        try {
          uploadedImageData = await writingApi.replaceAdminQuestionImages(savedQuestionId, uploadedImages);
          backendDetail = await writingApi.getAdminQuestion(savedQuestionId);
        } catch (error) {
          mediaUploadError = getApiErrorMessage(error, 'Question saved, but image upload failed.');
        }
      }

      const backendMapped = mapApiAdminWritingQuestion(backendDetail);
      const uploadMapped = uploadedImageData
        ? mapApiAdminWritingQuestion({ ...backendDetail, images: uploadedImageData }).media
        : [];
      const preservedExistingMedia = saved.media.filter((media) => !media.file);
      const mapped = {
        ...backendMapped,
        media: backendMapped.media.length ? backendMapped.media : (uploadMapped.length ? uploadMapped : preservedExistingMedia),
      };
      setWritingQuestions((current) => current.some((question) => question.id === mapped.id)
        ? current.map((question) => (question.id === mapped.id ? mapped : question))
        : [mapped, ...current]);
      setWritingDraft(null);
      setIsWritingPreviewOpen(false);
      showToast(mediaUploadError || 'Writing question saved. It may take a moment for the question to appear everywhere.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save writing question.'));
    }
  };

  const deleteWritingQuestion = async (questionId: string) => {
    try {
      await writingApi.deleteAdminQuestion(Number(questionId));
      setWritingQuestions((current) => current.map((question) => (
        question.id === questionId ? { ...question, deletedTime: nowIso() } : question
      )));
      showToast('Writing question moved to deleted items.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to delete writing question.'));
    }
  };

  const restoreWritingQuestion = async (questionId: string) => {
    try {
      await writingApi.restoreAdminQuestion(Number(questionId));
      setWritingQuestions((current) => current.map((question) => (
        question.id === questionId ? { ...question, deletedTime: null } : question
      )));
      showToast('Writing question restored.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to restore writing question.'));
    }
  };

  const saveSpeakingDraft = async () => {
    if (!speakingDraft || !validateTitle(speakingDraft.topic, { scope: 'speaking', id: speakingDraft.id })) return;
    const saved = { ...speakingDraft, topic: speakingDraft.topic.trim(), updatedTime: nowIso() };
    try {
      await Promise.all(buildSpeakingQuestionRows(saved).map((row) => (
        Number(row.id)
          ? speakingApi.updateAdminQuestion(Number(row.id), row)
          : speakingApi.createAdminQuestion(row)
      )));
      const refreshed = await speakingApi.listAdminQuestions({ pageNum: 1, pageSize: 200 });
      setSpeakingTopics(mapApiAdminSpeakingTopics(normalizeApiList(refreshed)));
      setSpeakingDraft(null);
      showToast('Speaking topic created. It may take a moment for the new topic to appear everywhere.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save speaking topic.'));
    }
  };

  const deleteSpeakingTopic = async (topicId: string) => {
    try {
      await speakingApi.deleteAdminQuestion(Number(topicId));
      setSpeakingTopics((current) => current.map((topic) => (
        topic.id === topicId ? { ...topic, deletedTime: nowIso() } : topic
      )));
      showToast('Speaking topic moved to deleted items.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to delete speaking topic.'));
    }
  };

  const restoreSpeakingTopic = async (topicId: string) => {
    try {
      await speakingApi.restoreAdminQuestion(Number(topicId));
      setSpeakingTopics((current) => current.map((topic) => (
        topic.id === topicId ? { ...topic, deletedTime: null } : topic
      )));
      showToast('Speaking topic restored.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to restore speaking topic.'));
    }
  };

  return (
    <div className="admin-console">
      <header className="admin-app-nav">
        <div className="admin-nav-left">
          <button className="admin-brand" type="button" onClick={() => navigateAdmin('overview')}>
            <span className="admin-brand-mark"><img alt="SmartIELTS Admin" src={brandIcon} /></span>
            <span>
              <span className="admin-brand-title">SmartIELTS Admin</span>
              <span className="admin-brand-sub">Authoring Console</span>
            </span>
          </button>
          <nav className="admin-nav-links" aria-label="Admin navigation">
            {(['overview', 'users', 'records', 'reading', 'listening', 'writing', 'speaking'] as AdminConsoleView[]).map((view) => (
              <button key={view} className={`admin-nav-btn ${activeView === view ? 'admin-nav-btn-active' : ''}`} title={`${view[0].toUpperCase()}${view.slice(1)} section`} type="button" onClick={() => navigateAdmin(view)}>
                {view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <div className="admin-inline">
          <span className="admin-pill admin-pill-primary">Admin</span>
          <button className="admin-secondary-action" type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="admin-shell">
        {adminError && (
          <div className="admin-card">
            <strong className="text-red-700">Backend error</strong>
            <div className="admin-sub mt-2">{adminError}</div>
          </div>
        )}
        {activeView === 'overview' && (
          <AdminOverviewPage
            exams={exams}
            snapshot={adminSnapshot}
            speakingTopics={speakingTopics}
            writingQuestions={writingQuestions}
          />
        )}
        {activeView === 'users' && (
          <AdminUsersPage
            records={adminRecords}
            users={users}
            onToast={showToast}
            onUsersChange={(updater) => setUsers((current) => updater(current))}
          />
        )}
        {activeView === 'records' && (
          <AdminRecordsPage
            records={adminRecords}
            onRecordsChange={setAdminRecords}
            onToast={showToast}
          />
        )}
        {(activeView === 'reading' || activeView === 'listening') && (
          <AdminReadingListeningPage
            exams={exams}
            moduleId={moduleId}
            onExamsChange={setExams}
            onToast={showToast}
            validateTitle={validateTitle}
          />
        )}
        {activeView === 'writing' && editorMode === 'list' && (
          <AdminUxWriting
            activeTask={writingView}
            questions={writingQuestions}
            onDelete={deleteWritingQuestion}
            onEdit={openWritingDraft}
            onNew={() => openWritingDraft()}
            onOpenDeleted={() => setEditorMode('deleted')}
            onTaskChange={(task) => { setWritingView(task); setWritingDraft(null); }}
          />
        )}
        {activeView === 'writing' && editorMode === 'deleted' && (
          <AdminUxDeletedWritingPage
            activeTask={writingView}
            questions={writingQuestions}
            onBack={() => setEditorMode('list')}
            onRestore={restoreWritingQuestion}
          />
        )}
        {activeView === 'speaking' && editorMode === 'list' && (
          <AdminUxSpeaking
            activeMode={speakingView}
            topics={speakingTopics}
            onDelete={deleteSpeakingTopic}
            onEdit={(topic) => setSpeakingDraft(structuredClone(topic))}
            onModeChange={(mode) => { setSpeakingView(mode); setSpeakingDraft(null); }}
            onNew={() => setSpeakingDraft(createAdminSpeakingDraft(speakingView))}
            onOpenDeleted={() => setEditorMode('deleted')}
          />
        )}
        {activeView === 'speaking' && editorMode === 'deleted' && (
          <AdminUxDeletedSpeakingPage
            activeMode={speakingView}
            topics={speakingTopics}
            onBack={() => setEditorMode('list')}
            onRestore={restoreSpeakingTopic}
          />
        )}
      </main>

      {writingDraft && (
        <AdminFullscreenEditor
          title={writingDraft.id ? 'Writing Question Editor' : 'New Writing Question'}
          subtitle="Add or edit Academic Writing prompts before saving."
          onClose={() => { setWritingDraft(null); setIsWritingPreviewOpen(false); }}
          onSave={saveWritingDraft}
        >
          <AdminUxWritingForm draft={writingDraft} onChange={setWritingDraft} onPreview={() => setIsWritingPreviewOpen(true)} />
        </AdminFullscreenEditor>
      )}
      {writingDraft && isWritingPreviewOpen && (
        <AdminWritingStudentPreview draft={writingDraft} onBack={() => setIsWritingPreviewOpen(false)} />
      )}
      {speakingDraft && (
        <AdminFullscreenEditor
          title="Speaking Topic Editor"
          subtitle="Topic 1 short questions and Topic 2/3 cue cards are managed separately."
          onClose={() => setSpeakingDraft(null)}
          onSave={saveSpeakingDraft}
        >
          <AdminUxSpeakingForm draft={speakingDraft} onChange={setSpeakingDraft} />
        </AdminFullscreenEditor>
      )}
      {toast && (
        <div className="admin-toast admin-toast-show" role="status">
          <div>
            <strong>Notice</strong>
            <span>{toast}</span>
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}>x</button>
        </div>
      )}
    </div>
  );
}

function AdminFullscreenEditor({
  children,
  onClose,
  onSave,
  subtitle,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="admin-fullscreen-mask">
      <section className="admin-fullscreen-editor">
        <div className="admin-fullscreen-head">
          <div><h2 className="text-2xl font-bold">{title}</h2><div className="admin-sub">{subtitle}</div></div>
          <div className="admin-inline"><button className="admin-secondary-action" type="button" onClick={onClose}>Cancel</button><button className="admin-primary-action" type="button" onClick={onSave}>Save</button></div>
        </div>
        <div className="admin-fullscreen-body">{children}</div>
      </section>
    </div>
  );
}

function mapApiAdminUser(raw: UserAdminVO | Record<string, unknown>): AdminUserDetailUser {
  const source = asRecord(raw);
  const moduleStats = asRecord(source.moduleStats ?? source.module_stats ?? {});
  const readingStats = asRecord(moduleStats.Reading ?? moduleStats.reading ?? {});
  const listeningStats = asRecord(moduleStats.Listening ?? moduleStats.listening ?? {});
  const writingStats = asRecord(moduleStats.Writing ?? moduleStats.writing ?? {});
  const speakingStats = asRecord(moduleStats.Speaking ?? moduleStats.speaking ?? {});
  const readingCount = numberValue(source.readingActiveRecordCount ?? source.reading_active_record_count ?? source.readingRecordCount ?? source.reading_record_count ?? source.readingRecords ?? source.reading_records ?? readingStats.activeRecords ?? readingStats.active_records ?? readingStats.activeCount ?? readingStats.active_count);
  const listeningCount = numberValue(source.listeningActiveRecordCount ?? source.listening_active_record_count ?? source.listeningRecordCount ?? source.listening_record_count ?? source.listeningRecords ?? source.listening_records ?? listeningStats.activeRecords ?? listeningStats.active_records ?? listeningStats.activeCount ?? listeningStats.active_count);
  const writingCount = numberValue(source.writingActiveRecordCount ?? source.writing_active_record_count ?? source.writingRecordCount ?? source.writing_record_count ?? source.writingRecords ?? source.writing_records ?? writingStats.activeRecords ?? writingStats.active_records ?? writingStats.activeCount ?? writingStats.active_count);
  const speakingCount = numberValue(source.speakingActiveRecordCount ?? source.speaking_active_record_count ?? source.speakingRecordCount ?? source.speaking_record_count ?? source.speakingRecords ?? source.speaking_records ?? speakingStats.activeRecords ?? speakingStats.active_records ?? speakingStats.activeCount ?? speakingStats.active_count);
  const moduleActiveTotal = readingCount + listeningCount + writingCount + speakingCount;
  const totalActive = numberValue(source.totalActiveRecordCount ?? source.total_active_record_count ?? source.activeRecords ?? source.active_records ?? source.activeRecordCount ?? source.active_record_count, moduleActiveTotal);
  const totalDeleted = numberValue(source.totalDeletedRecordCount ?? source.total_deleted_record_count ?? source.deletedRecords ?? source.deleted_records ?? source.deletedRecordCount ?? source.deleted_record_count);

  return {
    id: Number(source.id ?? source.userId ?? source.user_id ?? 0),
    email: stringValue(source.email, 'user@example.com'),
    role: source.role === 'ADMIN' ? 'ADMIN' : 'USER',
    isDeleted: Number(source.isDeleted ?? source.is_deleted ?? (source.deletedTime || source.deleted_time ? 1 : 0)) as 0 | 1,
    deletedTime: (source.deletedTime ?? source.deleted_time ?? null) as string | null,
    createdTime: stringValue(source.createdTime ?? source.created_time, new Date().toISOString()),
    lastLoginTime: stringValue(source.lastLoginTime ?? source.last_login_time, new Date().toISOString()),
    consecutiveLoginDays: numberValue(source.consecutiveLoginDays ?? source.consecutive_login_days),
    readingActiveRecordCount: readingCount,
    listeningActiveRecordCount: listeningCount,
    writingActiveRecordCount: writingCount,
    speakingActiveRecordCount: speakingCount,
    totalActiveRecordCount: totalActive,
    totalDeletedRecordCount: totalDeleted,
  };
}

function normalizeApiList<T>(value: T[] | { list?: T[]; total?: number } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.list ?? [];
}

async function loadAllAdminTests(moduleId: AdminExamModuleId) {
  const pageSize = 200;
  const firstPage = moduleId === 'reading'
    ? await readingApi.listAdminTests({ pageNum: 1, pageSize })
    : await listeningApi.listAdminTests({ pageNum: 1, pageSize });
  const firstList = normalizeApiList(firstPage);
  const total = !Array.isArray(firstPage) && firstPage?.total ? Number(firstPage.total) : firstList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return firstList;
  }

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => (
      moduleId === 'reading'
        ? readingApi.listAdminTests({ pageNum: index + 2, pageSize })
        : listeningApi.listAdminTests({ pageNum: index + 2, pageSize })
    )),
  );

  return [
    ...firstList,
    ...restPages.flatMap((page) => normalizeApiList(page)),
  ];
}

function normalizeTitle(value = '') {
  return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '');
}

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function stringValue(value: unknown, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}
