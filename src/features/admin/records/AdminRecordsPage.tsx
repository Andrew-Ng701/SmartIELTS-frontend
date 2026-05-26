import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { adminApi } from '../../../api/adminApi';
import { getApiErrorMessage } from '../../../api/errors';
import { useAsyncActionLock } from '../../../hooks/useInteractionGuard';
import {
  compareRecordsBySort,
  moduleLabelToApi,
  RecordFilters,
  RecordPagination,
  RecordTable,
  RECORDS_PAGE_SIZE,
} from '../../user/records';
import type { AdminRecordRow, RecordScope, RecordSortField, UserRecord } from '../../user/records';
import { AdminRecordDetailPage } from './AdminRecordDetailPage';
import { getAdminRecordModuleSummaries } from './adminRecordsModel';
import type { AdminRecordModuleSummary } from './adminRecordsModel';

export function AdminRecordsPage({
  records,
  onRecordsChange,
  onToast,
}: {
  records: AdminRecordRow[];
  onRecordsChange: (updater: (records: AdminRecordRow[]) => AdminRecordRow[]) => void;
  onToast: (message: string) => void;
}) {
  const moduleSummaries = getAdminRecordModuleSummaries(records);

  const deleteRecord = useAsyncActionLock(async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await adminApi.deleteRecord(moduleLabelToApi(record.module), record.id);
      onRecordsChange((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 1, deletedAt: 'Today' } : item
      )));
      onToast('Record moved to the deleted records list.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to delete record.'));
    }
  });

  const restoreRecord = useAsyncActionLock(async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await adminApi.restoreRecord(moduleLabelToApi(record.module), record.id);
      onRecordsChange((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 0, deletedAt: null } : item
      )));
      onToast('Record restored to the active records list.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to restore record.'));
    }
  });

  return (
    <div className="admin-grid">
      <AdminRecordsSectionHeader
        title="Records management"
        description="Review learner exam records by module, status, user, score, and time."
      />
      <section className="admin-record-module-grid">
        {moduleSummaries.map((item) => (
          <AdminRecordModuleKpi key={item.module} {...item} />
        ))}
      </section>
      <AdminRecordWorkspace
        description="Filter records by view, module, user, status, score, and time."
        records={records}
        showUserColumn
        showUserFilter
        title="All user exam records"
        onDelete={deleteRecord}
        onRestore={restoreRecord}
      />
    </div>
  );
}

function AdminRecordWorkspace({
  description,
  records,
  showUserColumn = false,
  showUserFilter = false,
  title,
  onDelete,
  onRestore,
}: {
  description: string;
  records: AdminRecordRow[];
  showUserColumn?: boolean;
  showUserFilter?: boolean;
  title: string;
  onDelete: (recordId: number) => void;
  onRestore: (recordId: number) => void;
}) {
  const [activeModule, setActiveModule] = useState<'All' | UserRecord['module']>('All');
  const [activeStatus, setActiveStatus] = useState<'All' | UserRecord['status']>('All');
  const [activeUserId, setActiveUserId] = useState<'All' | number>('All');
  const [recordScope, setRecordScope] = useState<RecordScope>('active');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');
  const [sortField, setSortField] = useState<RecordSortField>('time');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<UserRecord | null>(null);
  const availableUsers = Array.from(
    new Map(records.map((record) => [record.userId, { userId: record.userId, userEmail: record.userEmail }])).values(),
  ).sort((a, b) => a.userId - b.userId);
  const visibleRecords = records
    .filter((record) => record.isDeleted === (recordScope === 'deleted' ? 1 : 0))
    .filter((record) => activeModule === 'All' || record.module === activeModule)
    .filter((record) => activeStatus === 'All' || record.status === activeStatus)
    .filter((record) => !showUserFilter || activeUserId === 'All' || record.userId === activeUserId)
    .sort((a, b) => compareRecordsBySort(a, b, sortField, sortDirection));
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / RECORDS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = visibleRecords.slice((safeCurrentPage - 1) * RECORDS_PAGE_SIZE, safeCurrentPage * RECORDS_PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeModule, activeStatus, activeUserId, recordScope, sortDirection, sortField]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (detailRecord) {
    return <AdminRecordDetailPage record={detailRecord} onExit={() => setDetailRecord(null)} />;
  }

  const openDetail = (record: UserRecord) => {
    setDetailRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded bg-[#f8fafc] px-3 py-1 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          {visibleRecords.length} records
        </span>
      </div>
      <RecordFilters
        activeModule={activeModule}
        activeStatus={activeStatus}
        activeUserId={activeUserId}
        availableUsers={availableUsers}
        recordScope={recordScope}
        sortDirection={sortDirection}
        sortField={sortField}
        onModuleChange={setActiveModule}
        onScopeChange={setRecordScope}
        onSortChange={setSortDirection}
        onSortFieldChange={setSortField}
        onStatusChange={setActiveStatus}
        onUserChange={showUserFilter ? setActiveUserId : undefined}
      />
      <div className="mt-6">
        <RecordTable
          records={paginatedRecords}
          actionMode={recordScope === 'deleted' ? 'restore' : 'delete'}
          showUserColumn={showUserColumn}
          onDelete={onDelete}
          onRestore={onRestore}
          onViewDetails={openDetail}
        />
        <RecordPagination
          currentPage={safeCurrentPage}
          pageSize={RECORDS_PAGE_SIZE}
          totalItems={visibleRecords.length}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}

function AdminRecordsSectionHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="admin-section-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function AdminRecordModuleKpi({ activeCount, deletedCount, module }: AdminRecordModuleSummary) {
  return (
    <article className={`admin-record-module-card admin-record-module-${module.toLowerCase()}`}>
      <div className="admin-record-module-head">
        <span>{module}</span>
      </div>
      <div className="admin-record-module-simple">
        <div>
          <strong>{activeCount}</strong>
          <span>Active records</span>
        </div>
        <div>
          <strong>{deletedCount}</strong>
          <span>Deleted records</span>
        </div>
      </div>
    </article>
  );
}

