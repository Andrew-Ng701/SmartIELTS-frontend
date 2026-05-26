import type { PracticeQuestion } from '../../features/user/practice/practiceModel';
import { buildQuestionNoteGroups } from './StudentExamQuestionPanel';

type ListeningPreviewNotesProps = {
  draftLines: Record<string, string>;
  notePage: number;
  notes: Record<string, string>;
  onDraftLineChange: (lineKey: string, value: string) => void;
  onNoteChange: (questionNumber: number, value: string) => void;
  onNotePageChange: (nextPage: number) => void;
  questions: PracticeQuestion[];
  readOnly?: boolean;
};

export function ListeningPreviewNotes({
  draftLines,
  notePage,
  notes,
  onDraftLineChange,
  onNoteChange,
  onNotePageChange,
  questions,
  readOnly = false,
}: ListeningPreviewNotesProps) {
  const noteGroups = buildQuestionNoteGroups(questions);

  return (
    <aside className="student-exam-notes admin-student-listening-notes-pane">
      <div className="student-exam-note-upper">
        <p>Add short notes for each question group; they will appear beside the matching question.</p>
        <div className="student-exam-note-list">
          {noteGroups.map((group, index) => (
            <label key={group.label} className="student-exam-note-row">
              <span>{group.label}</span>
              <input
                disabled={readOnly}
                onChange={(event) => onNoteChange(group.keyQuestionNumber, event.target.value)}
                placeholder={index === 0 ? 'e.g. maybe A or B' : ''}
                value={notes[String(group.keyQuestionNumber)] ?? ''}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="student-exam-note-pad">
        <div className="student-exam-note-pad-head">
          <span>Page {notePage + 1}</span>
          <div>
            <button
              disabled={readOnly}
              type="button"
              onClick={() => {
                Array.from({ length: 8 }, (_, index) => `page-${notePage}-line-${index}`)
                  .forEach((lineKey) => onDraftLineChange(lineKey, ''));
              }}
            >
              Clear
            </button>
            <button disabled={readOnly} type="button" onClick={() => onNotePageChange(notePage - 1)}>Prev</button>
            <button disabled={readOnly} type="button" onClick={() => onNotePageChange(notePage + 1)}>Next</button>
          </div>
        </div>
        <div className="student-exam-draft-lines">
          {Array.from({ length: 8 }, (_, index) => {
            const lineKey = `page-${notePage}-line-${index}`;
            return (
              <input
                disabled={readOnly}
                key={lineKey}
                onChange={(event) => onDraftLineChange(lineKey, event.target.value)}
                placeholder={index === 0 ? 'Enter listening draft or keywords here' : ''}
                value={draftLines[lineKey] ?? ''}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
}
