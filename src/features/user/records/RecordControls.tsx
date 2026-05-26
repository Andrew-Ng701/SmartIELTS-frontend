import type { ReactNode } from 'react';
import type { AdminRecordRow, RecordScope, RecordSortField, UserRecord } from './recordsModel';

export function RecordPagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="record-pagination" aria-label="Records pagination">
      <span>{startItem}-{endItem} of {totalItems}</span>
      <span>{pageSize} / page</span>
      <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
        Previous
      </button>
      <strong>Page {currentPage} of {totalPages}</strong>
      <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>
        Next
      </button>
    </nav>
  );
}

export function RecordFilters({
  activeModule,
  activeStatus,
  activeUserId = 'All',
  availableUsers = [],
  recordScope,
  sortDirection,
  sortField,
  onModuleChange,
  onScopeChange,
  onSortChange,
  onSortFieldChange,
  onStatusChange,
  onUserChange,
}: {
  activeModule: 'All' | UserRecord['module'];
  activeStatus: 'All' | UserRecord['status'];
  activeUserId?: 'All' | number;
  availableUsers?: Array<{ userId: number; userEmail: string }>;
  recordScope: RecordScope;
  sortDirection: 'DESC' | 'ASC';
  sortField: RecordSortField;
  onModuleChange: (module: 'All' | UserRecord['module']) => void;
  onScopeChange: (scope: RecordScope) => void;
  onSortChange: (direction: 'DESC' | 'ASC') => void;
  onSortFieldChange: (field: RecordSortField) => void;
  onStatusChange: (status: 'All' | UserRecord['status']) => void;
  onUserChange?: (userId: 'All' | number) => void;
}) {
  const moduleFilters: Array<'All' | UserRecord['module']> = ['All', 'Reading', 'Listening', 'Writing', 'Speaking'];
  const statusFilters: Array<'All' | UserRecord['status']> = ['All', 'Completed', 'In progress', 'Reviewed', 'Draft'];

  return (
    <div className="mt-6 grid gap-3 rounded bg-[#f8f6ef] p-3">
      <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
        <FilterGroup label="Record view">
          <SegmentButton active={recordScope === 'active'} onClick={() => onScopeChange('active')}>Active</SegmentButton>
          <SegmentButton active={recordScope === 'deleted'} onClick={() => onScopeChange('deleted')}>Deleted</SegmentButton>
        </FilterGroup>
        <FilterGroup label="Module">
          {moduleFilters.map((filter) => (
            <SegmentButton key={filter} active={activeModule === filter} onClick={() => onModuleChange(filter)}>
              {filter}
            </SegmentButton>
          ))}
        </FilterGroup>
      </div>
      <div className={`grid gap-3 ${onUserChange ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {onUserChange && (
          <FilterGroup label="User ID">
            <select
              className="h-9 w-full rounded border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#f1bd03]"
              value={activeUserId}
              onChange={(event) => onUserChange(event.target.value === 'All' ? 'All' : Number(event.target.value))}
            >
              <option value="All">All users</option>
              {availableUsers.map((user) => (
                <option key={user.userId} value={user.userId}>{user.userId} {user.userEmail}</option>
              ))}
            </select>
          </FilterGroup>
        )}
        <FilterGroup label="Status">
          <select
            className="h-9 w-full rounded border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#f1bd03]"
            value={activeStatus}
            onChange={(event) => onStatusChange(event.target.value as 'All' | UserRecord['status'])}
          >
            {statusFilters.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Sort by">
          <select
            className="h-9 w-full rounded border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#f1bd03]"
            value={sortField}
            onChange={(event) => onSortFieldChange(event.target.value as RecordSortField)}
          >
            <option value="time">Time</option>
            <option value="score">Score</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Order">
          <select
            className="h-9 w-full rounded border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#f1bd03]"
            value={sortDirection}
            onChange={(event) => onSortChange(event.target.value as 'DESC' | 'ASC')}
          >
            <option value="DESC">{sortField === 'time' ? 'Newest first' : 'Highest first'}</option>
            <option value="ASC">{sortField === 'time' ? 'Oldest first' : 'Lowest first'}</option>
          </select>
        </FilterGroup>
      </div>
    </div>
  );
}

export function RecordTable({
  records,
  actionMode = 'none',
  showUserColumn = false,
  onDelete,
  onRestore,
  onViewDetails,
}: {
  records: Array<UserRecord | AdminRecordRow>;
  actionMode?: 'none' | 'delete' | 'restore';
  showUserColumn?: boolean;
  onDelete?: (recordId: number) => void;
  onRestore?: (recordId: number) => void;
  onViewDetails?: (record: UserRecord) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-slate-200 text-sm tracking-wide text-slate-500">
            {showUserColumn && <th className="py-3 pr-4">User ID</th>}
            <th className="py-3 pr-4">Record</th>
            <th className="py-3 pr-4">Module</th>
            <th className="record-table-status-col py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Score</th>
            <th className="py-3 pr-4">Updated</th>
            <th className="py-3 pr-4">Details</th>
            <th className="py-3 pr-4">Action</th>
            {actionMode === 'restore' && <th className="py-3 pr-4">Deleted time</th>}
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? (
            records.map((record) => (
              <tr key={record.id} className="border-b border-slate-100 transition hover:bg-[#fff9eb]">
                {showUserColumn && (
                  <td className="py-4 pr-4">
                    <div className="font-bold">{'userId' in record ? record.userId : '-'}</div>
                  </td>
                )}
                <td className="py-4 pr-4 font-semibold">{record.title}</td>
                <td className="py-4 pr-4 text-sm font-bold text-slate-500">{record.module}</td>
                <td className="record-table-status-col py-4 pr-4">
                  <span className={`record-status-pill rounded px-2 py-1 text-xs font-bold ${getRecordStatusTone(record.status)}`}>{record.status}</span>
                </td>
                <td className="py-4 pr-4 font-bold">{record.score}</td>
                <td className="py-4 pr-4 text-sm text-slate-500">{record.updatedAt}</td>
                <td className="py-4 pr-4">
                  <button className="record-table-button record-table-button-details" type="button" onClick={() => onViewDetails?.(record)}>
                    View details
                  </button>
                </td>
                <td className="py-4 pr-4">
                  {actionMode === 'delete' && (
                    <button className="record-table-button record-table-button-delete" type="button" onClick={() => onDelete?.(record.id)}>
                      Delete record
                    </button>
                  )}
                  {actionMode === 'restore' && (
                    <button className="record-table-button record-table-button-restore" type="button" onClick={() => onRestore?.(record.id)}>
                      Restore
                    </button>
                  )}
                </td>
                {actionMode === 'restore' && <td className="py-4 pr-4 text-sm font-semibold text-slate-500">{record.deletedAt}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td className="py-8 text-center text-sm font-semibold text-slate-500" colSpan={(actionMode === 'restore' ? 8 : 7) + (showUserColumn ? 1 : 0)}>
                No records match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="min-w-0">
      <span className="text-xs font-bold tracking-wide text-slate-500">{label}</span>
      <div className="mt-2 flex min-h-9 flex-nowrap items-center gap-1.5 overflow-x-auto">{children}</div>
    </label>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`h-9 shrink-0 rounded px-2.5 text-sm font-bold transition ${
        active ? 'bg-[#e56a2e] text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-[#fff1e8]'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getRecordStatusTone(status: UserRecord['status']) {
  const tones: Record<UserRecord['status'], string> = {
    Completed: 'bg-emerald-50 text-emerald-700',
    'In progress': 'bg-amber-50 text-amber-700',
    Reviewed: 'bg-sky-50 text-sky-700',
    Draft: 'bg-slate-100 text-slate-700',
  };

  return tones[status];
}

