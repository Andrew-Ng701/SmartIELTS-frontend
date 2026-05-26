import { useState } from 'react';
import type { ReactNode } from 'react';
import { adminUsersApi } from '../../../api/adminUsersApi';
import { getApiErrorMessage } from '../../../api/errors';
import { useAsyncActionLock } from '../../../hooks/useInteractionGuard';
import type { UserRecord } from '../../user/records';
import type { AdminRecordRow } from '../../user/records';
import { AdminUserDetailPage } from './AdminUserDetailPage';
import {
  getAdminUserModuleSummary,
} from './adminUserDetailModel';
import type { AdminUserDetailUser, AdminUserModuleSummary } from './adminUserDetailModel';
import { getAdminUsersPageState } from './adminUsersModel';

export function AdminUsersPage({
  onToast,
  onUsersChange,
  records,
  users,
}: {
  onToast: (message: string) => void;
  onUsersChange: (updater: (users: AdminUserDetailUser[]) => AdminUserDetailUser[]) => void;
  records: AdminRecordRow[];
  users: AdminUserDetailUser[];
}) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetailUser | null>(null);
  const usersWithRecordCounts = users.map((user) => mergeUserRecordCounts(user, records));
  const { activeCount, deletedCount, displayedUsers, isDeletedView, totalCount } = getAdminUsersPageState(usersWithRecordCounts, showDeleted);

  const deleteUser = useAsyncActionLock(async (userId: number) => {
    try {
      await adminUsersApi.deleteUser(userId);
      onUsersChange((current) => current.map((user) => (
        user.id === userId && user.role === 'USER' ? { ...user, isDeleted: 1, deletedTime: new Date().toISOString() } : user
      )));
      onToast('User moved to the deleted users list.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to delete user.'));
    }
  });

  const restoreUser = useAsyncActionLock(async (userId: number) => {
    try {
      await adminUsersApi.restoreUser(userId);
      onUsersChange((current) => current.map((user) => (
        user.id === userId && user.role === 'USER' ? { ...user, isDeleted: 0, deletedTime: null } : user
      )));
      onToast('User restored to the active users list.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Unable to restore user.'));
    }
  });

  if (selectedUser) {
    return (
      <AdminUserDetailPage
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="admin-grid">
      <AdminUsersSectionHeader
        title={isDeletedView ? 'Deleted users' : 'User management'}
      />
      <section className="admin-grid admin-grid-3 admin-users-kpi-row">
        <AdminUsersKpi label="Total users" value={String(totalCount)} detail="Student accounts" />
        <AdminUsersKpi label="Active users" value={String(activeCount)} detail="Valid users" />
        <AdminUsersKpi label="Deleted users" value={String(deletedCount)} detail="Invalid users" />
      </section>
      <section className="admin-card">
        <div className="admin-toolbar">
          <div>
            <div className="admin-inline">
              <h2 className="text-2xl font-bold">{isDeletedView ? 'Deleted user list' : 'Active user list'}</h2>
              <span className={`admin-pill ${isDeletedView ? 'admin-pill-danger' : 'admin-pill-primary'}`}>{displayedUsers.length} users</span>
            </div>
            <div className="admin-sub">Each row shows ID, records, created time, last login, module counts, and direct actions.</div>
          </div>
          <button className={`admin-primary-action ${isDeletedView ? '' : 'admin-danger-action'}`} type="button" onClick={() => setShowDeleted(!isDeletedView)}>
            {isDeletedView ? 'Back to active users' : `View deleted users (${deletedCount})`}
          </button>
        </div>
        <div className="admin-divider" />
        <div className="admin-user-list">
          {displayedUsers.length ? displayedUsers.map((user) => (
            <article key={user.id} className={`admin-user-row ${user.isDeleted ? 'admin-user-row-deleted' : ''}`}>
              <div className="admin-user-main-cell">
                <div className="admin-user-title-row">
                  <div className="admin-user-email">{user.email}</div>
                  {user.isDeleted !== 1 && (
                    <button className="admin-primary-action admin-restore-action admin-user-detail-action" type="button" onClick={() => setSelectedUser(user)}>View details</button>
                  )}
                </div>
                <div className="admin-user-time-grid">
                  <div><strong>ID</strong><br />{user.id}</div>
                  <div><strong>Records</strong><br />{formatUserRecordTotals(user)}</div>
                  <div><strong>Created</strong><br />{adminUsersDisplayTime(user.createdTime)}</div>
                  <div><strong>Last Login</strong><br />{adminUsersDisplayTime(user.lastLoginTime)}</div>
                  <div><strong>Login Streak</strong><br />{user.consecutiveLoginDays} days</div>
                </div>
              </div>
              <div className="admin-user-action-cell">
                {user.isDeleted ? (
                  <button className="admin-primary-action admin-restore-action" type="button" onClick={() => restoreUser(user.id)}>Restore user</button>
                ) : (
                  <button className="admin-primary-action admin-danger-action" type="button" onClick={() => deleteUser(user.id)}>Delete user</button>
                )}
                <span className="admin-tiny">{user.isDeleted ? `Deleted ${adminUsersDisplayTime(user.deletedTime)}` : 'Can be restored after deletion'}</span>
              </div>
              <div className="admin-info-grid admin-user-inline-info">
                <AdminUserModuleMetric module="Reading" summary={getAdminUserModuleSummary(user, 'Reading')} />
                <AdminUserModuleMetric module="Listening" summary={getAdminUserModuleSummary(user, 'Listening')} />
                <AdminUserModuleMetric module="Writing" summary={getAdminUserModuleSummary(user, 'Writing')} />
                <AdminUserModuleMetric module="Speaking" summary={getAdminUserModuleSummary(user, 'Speaking')} />
              </div>
            </article>
          )) : <div className="admin-empty-zone">No users in this view.</div>}
        </div>
      </section>
    </div>
  );
}

function AdminUsersSectionHeader({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="admin-section-header admin-section-header-compact">
      <div>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

function AdminUsersKpi({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="admin-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function AdminUserModuleMetric({ module, summary }: { module: UserRecord['module']; summary: AdminUserModuleSummary }) {
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

function adminUsersDisplayTime(value?: string | null) {
  if (!value) return 'N/A';
  return value.replace('T', ' ').slice(0, 16);
}

function formatUserRecordTotals(user: AdminUserDetailUser) {
  const active = Number(user.totalActiveRecordCount) || 0;
  const deleted = Number(user.totalDeletedRecordCount) || 0;
  const total = active + deleted;

  if (total <= 0) {
    return 'No records';
  }

  return (
    <>
      Totals {total} <span className="admin-tiny">(active {active}, deleted {deleted})</span>
    </>
  );
}

function mergeUserRecordCounts(user: AdminUserDetailUser, records: AdminRecordRow[]): AdminUserDetailUser {
  const userRecords = records.filter((record) => Number(record.userId) === Number(user.id));
  if (!userRecords.length) return user;

  const moduleActiveCounts = {
    Reading: userRecords.filter((record) => record.module === 'Reading' && record.isDeleted !== 1).length,
    Listening: userRecords.filter((record) => record.module === 'Listening' && record.isDeleted !== 1).length,
    Writing: userRecords.filter((record) => record.module === 'Writing' && record.isDeleted !== 1).length,
    Speaking: userRecords.filter((record) => record.module === 'Speaking' && record.isDeleted !== 1).length,
  };
  const activeFromRecords = userRecords.filter((record) => record.isDeleted !== 1).length;
  const deletedFromRecords = userRecords.filter((record) => record.isDeleted === 1).length;

  return {
    ...user,
    readingActiveRecordCount: Math.max(user.readingActiveRecordCount || 0, moduleActiveCounts.Reading),
    listeningActiveRecordCount: Math.max(user.listeningActiveRecordCount || 0, moduleActiveCounts.Listening),
    writingActiveRecordCount: Math.max(user.writingActiveRecordCount || 0, moduleActiveCounts.Writing),
    speakingActiveRecordCount: Math.max(user.speakingActiveRecordCount || 0, moduleActiveCounts.Speaking),
    totalActiveRecordCount: Math.max(user.totalActiveRecordCount || 0, activeFromRecords),
    totalDeletedRecordCount: Math.max(user.totalDeletedRecordCount || 0, deletedFromRecords),
  };
}

