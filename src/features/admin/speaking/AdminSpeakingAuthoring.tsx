import type { ReactNode } from 'react';
import type { AdminSpeakingMode, AdminSpeakingTopic } from './adminSpeakingModel';

export function AdminUxSpeaking({
  activeMode,
  onDelete,
  onEdit,
  onModeChange,
  onNew,
  onOpenDeleted,
  topics,
}: {
  activeMode: AdminSpeakingMode;
  onDelete: (id: string) => void;
  onEdit: (topic: AdminSpeakingTopic) => void;
  onModeChange: (mode: AdminSpeakingMode) => void;
  onNew: () => void;
  onOpenDeleted: () => void;
  topics: AdminSpeakingTopic[];
}) {
  const visibleTopics = topics.filter((topic) => topic.mode === activeMode && !topic.deletedTime);
  const deletedTopics = topics.filter((topic) => topic.mode === activeMode && topic.deletedTime);

  return (
    <div className="admin-grid">
      <AdminSectionHeader
        title="Speaking Management"
        description=""
        action={(
          <div className="admin-inline">
            <button className="admin-secondary-action" type="button" onClick={onOpenDeleted}>
              Check deleted items ({deletedTopics.length})
            </button>
            <button className="admin-primary-action" type="button" onClick={onNew}>Add topic</button>
          </div>
        )}
      />
      <div className="admin-card admin-card-tight admin-task-tabs">
        <button className={`admin-task-tab ${activeMode === 'TOPIC_1' ? 'admin-task-tab-active' : ''}`} type="button" onClick={() => onModeChange('TOPIC_1')}>Topic 1</button>
        <button className={`admin-task-tab ${activeMode === 'TOPIC_2_3' ? 'admin-task-tab-active' : ''}`} type="button" onClick={() => onModeChange('TOPIC_2_3')}>Topic 2 / Topic 3</button>
      </div>
      <section className="admin-card admin-management-table">
        <div className={`admin-module-summary admin-table-head admin-speaking-management-row ${activeMode === 'TOPIC_1' ? 'admin-speaking-management-row-no-followups' : ''}`}>
          <div>Topic</div><div>Mode</div><div>Questions</div>{activeMode === 'TOPIC_2_3' && <div>Follow-ups</div>}<div>Timing</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
        {visibleTopics.length ? visibleTopics.map((topic) => (
          <article key={topic.id} className={`admin-module-summary admin-speaking-management-row ${activeMode === 'TOPIC_1' ? 'admin-speaking-management-row-no-followups' : ''}`}>
            <div>
              <strong>{topic.topic}</strong>
              <div className="admin-tiny">Updated {displayTime(topic.updatedTime ?? topic.createdTime)}</div>
            </div>
            <div><span className="admin-table-value">{topic.mode === 'TOPIC_1' ? 'Topic 1' : 'Topic 2 / 3'}</span></div>
            <div><span className="admin-table-value">{getSpeakingQuestionCount(topic)}</span></div>
            {activeMode === 'TOPIC_2_3' && <div><span className="admin-table-value">{topic.followUps.length}</span></div>}
            <div>{topic.mode === 'TOPIC_1' ? 'Short questions' : `${topic.prepSeconds ?? 0}s prep`}<div className="admin-tiny">{topic.mode === 'TOPIC_1' ? 'No fixed cue card' : `${topic.answerSeconds ?? 120}s answer`}</div></div>
            <div>
              <div className="admin-inline admin-row-actions">
                <button className="admin-primary-action admin-edit-action" type="button" onClick={() => onEdit(topic)}>Edit</button>
                <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onDelete(topic.id)}>Delete</button>
              </div>
            </div>
          </article>
        )) : <div className="admin-empty-zone">No topics yet.</div>}
        </div>
      </section>
    </div>
  );
}

export function AdminUxDeletedSpeakingPage({
  activeMode,
  onBack,
  onRestore,
  topics,
}: {
  activeMode: AdminSpeakingMode;
  onBack: () => void;
  onRestore: (id: string) => void;
  topics: AdminSpeakingTopic[];
}) {
  const deletedTopics = topics.filter((topic) => topic.mode === activeMode && topic.deletedTime);

  return (
    <div className="admin-grid">
      <AdminSectionHeader
        title={`Deleted ${activeMode === 'TOPIC_1' ? 'Topic 1' : 'Topic 2 / 3'} items`}
        description="Manage logically deleted speaking topics on a dedicated recovery page."
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to speaking list</button>}
      />
      <section className="admin-card">
        <div className={`admin-module-summary admin-table-head admin-speaking-management-row ${activeMode === 'TOPIC_1' ? 'admin-speaking-management-row-no-followups' : ''}`}>
          <div>Topic</div><div>Mode</div><div>Questions</div>{activeMode === 'TOPIC_2_3' && <div>Follow-ups</div>}<div>Timing</div><div>Actions</div>
        </div>
        <div className="admin-grid mt-3">
          {deletedTopics.length ? deletedTopics.map((topic) => (
            <article key={topic.id} className={`admin-module-summary admin-speaking-management-row ${activeMode === 'TOPIC_1' ? 'admin-speaking-management-row-no-followups' : ''}`}>
              <div>
                <strong>{topic.topic}</strong>
                <div className="admin-tiny">Deleted {displayTime(topic.deletedTime)} - Updated {displayTime(topic.updatedTime ?? topic.createdTime)}</div>
              </div>
              <div><span className="admin-pill admin-pill-primary">{topic.mode === 'TOPIC_1' ? 'Topic 1' : 'Topic 2 / 3'}</span></div>
              <div><span className="admin-pill admin-pill-blue">{getSpeakingQuestionCount(topic)}</span></div>
              {activeMode === 'TOPIC_2_3' && <div><span className="admin-pill admin-pill-blue">{topic.followUps.length}</span></div>}
              <div>{topic.mode === 'TOPIC_1' ? 'Short questions' : `${topic.prepSeconds ?? 0}s prep`}</div>
              <div><button className="admin-primary-action admin-restore-action" type="button" onClick={() => onRestore(topic.id)}>Restore</button></div>
            </article>
          )) : <div className="admin-empty-zone">No deleted speaking topics.</div>}
        </div>
      </section>
    </div>
  );
}

export function AdminUxSpeakingForm({
  draft,
  onChange,
}: {
  draft: AdminSpeakingTopic;
  onChange: (draft: AdminSpeakingTopic) => void;
}) {
  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div><h3 className="text-xl font-bold">{draft.mode === 'TOPIC_1' ? 'Topic 1' : 'Topic 2 / Topic 3'}</h3><div className="admin-sub">Selected from the speaking topic list before opening this editor.</div></div>
      </div>
      <div className="admin-divider" />
      <AdminTextInput label="Topic name / main title" value={draft.topic} onChange={(topic) => onChange({ ...draft, topic })} />
      {draft.mode === 'TOPIC_1' ? (
        <AdminStringRows title="Topic 1 questions" values={draft.questions} placeholder="Short question" onChange={(questions) => onChange({ ...draft, questions })} />
      ) : (
        <>
          <AdminTextarea label="Cue card" value={draft.cueCard ?? ''} rows={9} onChange={(cueCard) => onChange({ ...draft, cueCard })} />
          <div className="admin-time-pair">
            <AdminNumberInput label="Preparation time (seconds)" value={draft.prepSeconds ?? 0} onChange={(prepSeconds) => onChange({ ...draft, prepSeconds: Math.max(0, prepSeconds) })} />
            <AdminNumberInput label="Answer time (seconds)" value={draft.answerSeconds ?? 120} onChange={(answerSeconds) => onChange({ ...draft, answerSeconds })} />
          </div>
          <AdminStringRows title="Topic 3 follow-up questions" values={draft.followUps} placeholder="Follow-up discussion question" onChange={(followUps) => onChange({ ...draft, followUps })} />
        </>
      )}
    </div>
  );
}

function AdminSectionHeader({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <section className="admin-page-title">
      <div><h1>{title}</h1><p className="max-w-3xl leading-7">{description}</p></div>
      {action}
    </section>
  );
}

function AdminTextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="admin-field"><span>{label}</span><input className="admin-input mt-2" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function AdminNumberInput({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return <label className="admin-field"><span>{label}</span><input className="admin-input mt-2" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function AdminTextarea({ label, onChange, rows = 1, value }: { label: string; onChange: (value: string) => void; rows?: number; value: string }) {
  return <label className="admin-field"><span>{label}</span><textarea className="admin-textarea mt-2" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function AdminStringRows({
  onChange,
  placeholder,
  title,
  values,
}: {
  onChange: (values: string[]) => void;
  placeholder: string;
  title: string;
  values: string[];
}) {
  return (
    <section className="admin-nested-card">
      <div className="admin-toolbar">
        <strong>{title}</strong>
        <button className="admin-secondary-action" type="button" onClick={() => onChange([...values, ''])}>Add row</button>
      </div>
      <div className="admin-grid">
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="admin-inline-row">
            <input className="admin-input" placeholder={placeholder} value={value} onChange={(event) => onChange(values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))} />
            <button className="admin-primary-action admin-danger-action" type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function getSpeakingQuestionCount(topic: AdminSpeakingTopic) {
  return topic.mode === 'TOPIC_1'
    ? topic.questions.filter(Boolean).length
    : 1 + topic.followUps.filter(Boolean).length;
}

function displayTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 19) : 'Not recorded';
}

