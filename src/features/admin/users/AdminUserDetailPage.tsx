import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import defaultAvatar from '../../../assets/default-avatar.jpeg';
import { adminApi } from '../../../api/adminApi';
import { adminUsersApi } from '../../../api/adminUsersApi';
import { getApiErrorMessage } from '../../../api/errors';
import type { ModuleType } from '../../../contracts/common';
import type { UserRecordDetailVO } from '../../../contracts/records';
import {
  compareRecordsBySort,
  moduleLabelToApi,
  RecordDetailPage,
  RecordFilters,
  RecordPagination,
  RecordTable,
  RECORDS_PAGE_SIZE,
  recordScopeToApi,
  recordSortToApi,
  userStatusToApi,
} from '../../user/records';
import type { AdminRecordRow, RecordScope, RecordSortField, UserRecord } from '../../user/records';
import { normalizeAdminRecordDetail } from '../records/adminRecordDetailModel';
import {
  getAdminUserDisplayName,
  getAdminUserModuleSummary,
  mapAdminUserRecordToRow,
} from './adminUserDetailModel';
import type { AdminUserDetailUser, AdminUserModuleSummary } from './adminUserDetailModel';

export function AdminUserDetailPage({ onBack, user }: { onBack: () => void; user: AdminUserDetailUser }) {
  const [records, setRecords] = useState<AdminRecordRow[]>([]);
  const [activeModule, setActiveModule] = useState<'All' | UserRecord['module']>('All');
  const [activeStatus, setActiveStatus] = useState<'All' | UserRecord['status']>('All');
  const [recordScope, setRecordScope] = useState<RecordScope>('active');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');
  const [sortField, setSortField] = useState<RecordSortField>('time');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<AdminRecordRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const visibleRecords = records
    .filter((record) => record.isDeleted === (recordScope === 'deleted' ? 1 : 0))
    .filter((record) => activeModule === 'All' || record.module === activeModule)
    .filter((record) => activeStatus === 'All' || record.status === activeStatus)
    .sort((a, b) => compareRecordsBySort(a, b, sortField, sortDirection));
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / RECORDS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = visibleRecords.slice((safeCurrentPage - 1) * RECORDS_PAGE_SIZE, safeCurrentPage * RECORDS_PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeModule, activeStatus, recordScope, sortDirection, sortField]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage('');

    adminUsersApi.listUserRecords(user.id, {
      recordState: recordScopeToApi(recordScope),
      module: activeModule === 'All' ? undefined : moduleLabelToApi(activeModule),
      status: userStatusToApi(activeStatus),
      sort: recordSortToApi(sortField, sortDirection),
      pageNum: 1,
      pageSize: 200,
    })
      .then((pageResult) => {
        if (!cancelled) {
          setRecords((pageResult.list ?? []).map((item) => mapAdminUserRecordToRow(item, user)));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecords([]);
          setErrorMessage(getApiErrorMessage(error, 'Unable to load user records.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeModule, activeStatus, recordScope, sortDirection, sortField, user]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const deleteRecord = async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await adminApi.deleteRecord(moduleLabelToApi(record.module), record.id);
      setRecords((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 1, deletedAt: 'Today' } : item
      )));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete record.'));
    }
  };

  const restoreRecord = async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await adminApi.restoreRecord(moduleLabelToApi(record.module), record.id);
      setRecords((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 0, deletedAt: null } : item
      )));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to restore record.'));
    }
  };

  if (detailRecord) {
    return (
      <RecordDetailPage
        loadRecordDetail={(moduleType: ModuleType, recordId: number): Promise<UserRecordDetailVO> => (
          adminUsersApi.getUserRecordDetail(user.id, moduleType, recordId)
            .then((payload) => normalizeAdminRecordDetail(payload, moduleType, recordId))
        )}
        record={detailRecord}
        onExit={() => setDetailRecord(null)}
      />
    );
  }

  return (
    <div className="admin-grid">
      <AdminUxSectionHeader
        title="User details"
        description="Review learner profile, target bands, and backend user-scoped exam record history."
        action={<button className="admin-secondary-action" type="button" onClick={onBack}>Back to users</button>}
      />
      <section className="admin-card">
        <div className="admin-user-detail-head">
          <img alt={getAdminUserDisplayName(user)} src={defaultAvatar} />
          <div>
            <h2 className="text-2xl font-bold">{getAdminUserDisplayName(user)}</h2>
            <div className="admin-sub">{user.email}</div>
            <div className="admin-inline mt-3">
              <span className="admin-pill admin-pill-primary">ID {user.id}</span>
              <span className="admin-pill">Totals {user.totalActiveRecordCount + user.totalDeletedRecordCount}</span>
              <span className="admin-pill admin-pill-blue">Active {user.totalActiveRecordCount}</span>
              <span className="admin-pill admin-pill-danger">Deleted {user.totalDeletedRecordCount}</span>
            </div>
          </div>
        </div>
        <div className="admin-info-grid mt-5">
          <AdminUxUserModuleMetric module="Reading" summary={getAdminUserModuleSummary(user, 'Reading')} />
          <AdminUxUserModuleMetric module="Listening" summary={getAdminUserModuleSummary(user, 'Listening')} />
          <AdminUxUserModuleMetric module="Writing" summary={getAdminUserModuleSummary(user, 'Writing')} />
          <AdminUxUserModuleMetric module="Speaking" summary={getAdminUserModuleSummary(user, 'Speaking')} />
        </div>
      </section>
      <section className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">All exam records</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading ? 'Loading backend user records...' : 'User-scoped records loaded from admin API.'}
            </p>
          </div>
          <span className="rounded bg-[#f8fafc] px-3 py-1 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            {visibleRecords.length} records
          </span>
        </div>
        {errorMessage && (
          <div className="mt-4 rounded bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}
        <RecordFilters
          activeModule={activeModule}
          activeStatus={activeStatus}
          recordScope={recordScope}
          sortDirection={sortDirection}
          sortField={sortField}
          onModuleChange={setActiveModule}
          onScopeChange={setRecordScope}
          onSortChange={setSortDirection}
          onSortFieldChange={setSortField}
          onStatusChange={setActiveStatus}
        />
        <div className="mt-6">
          <RecordTable
            records={paginatedRecords}
            actionMode={recordScope === 'deleted' ? 'restore' : 'delete'}
            onDelete={deleteRecord}
            onRestore={restoreRecord}
            onViewDetails={(record) => {
              setDetailRecord(records.find((item) => item.id === record.id) ?? null);
            }}
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
    </div>
  );
}

function AdminUxSectionHeader({
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

function AdminUxUserModuleMetric({ module, summary }: { module: UserRecord['module']; summary: AdminUserModuleSummary }) {
  const moduleClass = `admin-user-module-${module.toLowerCase()}`;

  return (
    <div className={`admin-mini-metric admin-user-module-metric ${moduleClass}`}>
      <div className="admin-user-module-metric-head">
        <span className="admin-user-module-name">{module}</span>
        <span className="admin-user-target-badge">Target {summary.target}</span>
      </div>
      <div className="admin-user-module-body">
        <strong>{summary.active}</strong>
        <span>Active records</span>
      </div>
      <div className="admin-user-module-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.max(8, summary.completed * 10))}%` }} />
      </div>
    </div>
  );
}
