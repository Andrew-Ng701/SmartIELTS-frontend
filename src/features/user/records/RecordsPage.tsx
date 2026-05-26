import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getApiErrorMessage } from '../../../api/errors';
import { recordsApi } from '../../../api/recordsApi';
import { useAsyncActionLock } from '../../../hooks/useInteractionGuard';
import { RecordDetailPage } from './RecordDetailPage';
import { RecordFilters, RecordPagination, RecordTable } from './RecordControls';
import {
  compareRecordsBySort,
  mapApiRecordToUserRecord,
  moduleLabelToApi,
  normalizePageList,
  RECORDS_PAGE_SIZE,
  recordScopeToApi,
  recordSortToApi,
  userStatusToApi,
} from './recordsModel';
import type { RecordScope, RecordSortField, UserRecord } from './recordsModel';

export function RecordsPage() {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [activeModule, setActiveModule] = useState<'All' | UserRecord['module']>('All');
  const [activeStatus, setActiveStatus] = useState<'All' | UserRecord['status']>('All');
  const [recordScope, setRecordScope] = useState<RecordScope>('active');
  const [sortField, setSortField] = useState<RecordSortField>('time');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scopedRecords = records.filter((record) => record.isDeleted === (recordScope === 'deleted' ? 1 : 0));
  const visibleRecords = scopedRecords
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
    recordsApi.listRecords({
      recordState: recordScopeToApi(recordScope),
      module: activeModule === 'All' ? undefined : moduleLabelToApi(activeModule),
      status: userStatusToApi(activeStatus),
      sort: recordSortToApi(sortField, sortDirection),
      pageNum: 1,
      pageSize: 200,
    })
      .then((pageResult) => {
        if (!cancelled) {
          setRecords(normalizePageList(pageResult).map((item) => ({
            ...mapApiRecordToUserRecord(item),
            isDeleted: recordScope === 'deleted' ? 1 : 0,
          })));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecords([]);
          setErrorMessage(getApiErrorMessage(error, 'Unable to load records.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeModule, activeStatus, recordScope, sortDirection, sortField]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const deleteRecord = useAsyncActionLock(async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await recordsApi.deleteRecord(moduleLabelToApi(record.module), record.id);
      setRecords((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 1, deletedAt: 'Today' } : item
      )));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete record.'));
    }
  });

  const restoreRecord = useAsyncActionLock(async (recordId: number) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      await recordsApi.restoreRecord(moduleLabelToApi(record.module), record.id);
      setRecords((current) => current.map((item) => (
        item.id === recordId ? { ...item, isDeleted: 0, deletedAt: null } : item
      )));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to restore record.'));
    }
  });

  if (detailRecord) {
    return <RecordDetailPage record={detailRecord} onExit={() => setDetailRecord(null)} />;
  }

  const openDetail = (record: UserRecord) => {
    setDetailRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageFrame
      eyebrow="User records"
      title="Practice records hub"
      description="Filter module attempts, scan status chips, and keep deleted records in a separate restore view."
    >
      <section className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{recordScope === 'deleted' ? 'Deleted records' : 'Recent records'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading ? 'Loading backend records...' : `Showing ${visibleRecords.length} backend records`}
            </p>
          </div>
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
    </PageFrame>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
